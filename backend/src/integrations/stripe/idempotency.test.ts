// SEC-03c — Stripe webhook idempotency (event ledger + transactional transitions).
//
// Covers the approved matrix: event-ledger dedupe (sequential replay,
// concurrent duplicate via Promise.all, duplicate → 200, non-duplicate DB
// failure → retryable 500, mid-transaction rollback → retryable), transition
// guards (no order regression, no captured→failed clobber, exactly-once
// effects across different event IDs for the same PaymentIntent), the manual
// /api/payments/confirm path (idempotent without an event ID, concurrent
// manual+webhook race), and notification/realtime-hub safety (persisted row
// commits atomically; hub publish strictly after commit; publish failure
// never undoes the commit).
//
// IMPORTANT (SEC-03c blocker): the webhook-path tests (T-1…T-4, T-6, T-7)
// require the `processed_stripe_events` table, i.e. the migration
// 20261115120000_stripe_event_ledger must be APPLIED first. Until then they
// fail with Prisma P2021 (table does not exist) — do NOT apply the migration
// without separate approval.
//
// Harness notes:
// - The module-private Stripe client inside stripe.service.ts is replaced by
//   a vi.mock subclass so paymentIntents.retrieve is controllable per test
//   while webhooks.constructEvent stays REAL (HTTP tests exercise real HMAC
//   signature verification over exact raw bytes, as in SEC-03b).
// - webhooks.ts captures STRIPE_WEBHOOK_SECRET at module load, so the test
//   secret is set BEFORE the dynamic import of the payment.routes chain.

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import crypto from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import rawBody from 'fastify-raw-body';
import { prisma } from '../../lib/prisma';
import { notificationHub } from '../../modules/notifications/notification-hub';
import { notificationService } from '../../modules/notifications/notifications.service';
import { stripeService, isEventIdUniqueViolation } from './stripe.service';

const stripeMock = vi.hoisted(() => ({
  retrieveImpl: undefined as ((...args: any[]) => any) | undefined,
}));

vi.mock('stripe', async (importOriginal) => {
  const actual: any = await importOriginal();
  const RealStripe = actual.default;
  class StripeWithStubbedRetrieve extends RealStripe {
    constructor(...args: any[]) {
      super(...args);
      const pi: any = (this as any).paymentIntents;
      const realRetrieve = pi.retrieve.bind(pi);
      pi.retrieve = (...args: any[]) =>
        stripeMock.retrieveImpl ? stripeMock.retrieveImpl(...args) : realRetrieve(...args);
    }
  }
  return { ...actual, default: StripeWithStubbedRetrieve };
});

// Controllable, Stripe-authoritative PaymentIntent state per test.
function retrieveReturns(status: string): void {
  stripeMock.retrieveImpl = async (piId: string) => ({
    id: piId,
    object: 'payment_intent',
    status,
    amount: 2000,
    amount_received: status === 'succeeded' ? 2000 : 0,
    metadata: { orderId: (await prisma.payment.findUnique({ where: { stripePaymentIntentId: piId } }))?.orderId },
    currency: 'usd',
  });
}

const TEST_SECRET = 'whsec_test_sec03c_vitest_dummy';
const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
process.env.STRIPE_WEBHOOK_SECRET = TEST_SECRET;

// Mirrors Stripe's documented scheme (same algorithm the SDK verifies):
// HMAC-SHA256 over `${timestamp}.${payload}`, header `t=…,v1=…`.
function signatureHeader(payload: string, secret = TEST_SECRET): string {
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
  return `t=${ts},v1=${sig}`;
}

describe('SEC-03c Stripe webhook idempotency', () => {
  let app: FastifyInstance;
  const marker = `IDC-${Date.now().toString(36)}`;
  let seq = 0;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // Dynamic import ONLY for the chain that captures env at load
    // (payment.routes → payment.controller → webhooks.ts).
    const { paymentRoutes } = await import('../../modules/payments/payment.routes');

    app = Fastify({ logger: false });
    // EXACT production rawBody options (src/index.ts:25-30).
    await app.register(rawBody, { field: 'rawBody', global: false, encoding: false, runFirst: true });
    await app.register(paymentRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    await app?.close();
    if (ORIGINAL_SECRET === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  afterEach(async () => {
    // Child-first marker-scoped cleanup.
    await prisma.notification.deleteMany({ where: { userId: { in: createdUserIds } } });
    const customers = await prisma.customer.findMany({
      where: { userId: { in: createdUserIds } },
      select: { id: true },
    });
    const customerIds = customers.map((c) => c.id);
    // Order deletion cascades Payment (onDelete: Cascade) and OrderItems.
    await prisma.order.deleteMany({ where: { customerId: { in: customerIds } } });
    await prisma.customer.deleteMany({ where: { userId: { in: createdUserIds } } });
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;

    try {
      await prisma.processedStripeEvent.deleteMany({ where: { eventId: { startsWith: 'evt_idc' } } });
    } catch {
      // Ledger table not applied yet (SEC-03c blocker state) — nothing to clean.
    }

    stripeMock.retrieveImpl = undefined;
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------
  // Seed helpers
  // ---------------------------------------------------------------------

  async function seedUser() {
    const user = await prisma.user.create({
      data: {
        email: `${marker.toLowerCase()}-u${(seq++).toString(36)}@test.local`,
        passwordHash: 'x',
        role: 'CUSTOMER',
        emailVerified: true,
      },
    });
    createdUserIds.push(user.id);
    return user;
  }

  async function seedOrderWithPayment(opts: {
    piId: string;
    orderStatus?: string;
    paymentStatus?: string;
  }) {
    const user = await seedUser();
    const customer = await prisma.customer.create({ data: { userId: user.id } });
    const order = await prisma.order.create({
      data: {
        orderNumber: `${marker}-O${(seq++).toString(36)}`,
        customerId: customer.id,
        status: (opts.orderStatus ?? 'pending_review') as any,
        subtotal: 20,
        tax: 0,
        shippingCost: 0,
        total: 20,
        shippingAddress: { street: '1 Test St', city: 'Cairo', country: 'EG' },
        shippingName: 'IDC Test',
        shippingPhone: '+200000000',
      },
    });
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        stripePaymentIntentId: opts.piId,
        amount: 20,
        currency: 'USD',
        status: (opts.paymentStatus ?? 'pending') as any,
      },
    });
    return { user, customer, order, payment };
  }

  function succeededEvent(piId: string, eventId: string) {
    return {
      id: eventId,
      object: 'event',
      api_version: '2023-10-16',
      created: 1700000000,
      type: 'payment_intent.succeeded',
      data: { object: { id: piId, object: 'payment_intent', amount: 2000, currency: 'usd' } },
    };
  }

  async function postStripeWebhook(event: object) {
    const payload = JSON.stringify(event);
    // light-my-request sends a string payload byte-exact.
    return app.inject({
      method: 'POST',
      url: '/api/webhooks/stripe',
      payload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signatureHeader(payload),
      },
    });
  }

  // ---------------------------------------------------------------------
  // Manual /api/payments/confirm path — transition guards (no ledger needed)
  // ---------------------------------------------------------------------

  it('T-M1: manual confirmation twice → one effective transition, ONE notification, hub published once', async () => {
    const piId = 'pi_idc_manual';
    const { order, user } = await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');
    const hubSpy = vi.spyOn(notificationHub, 'publish');

    await stripeService.confirmPayment(piId);
    await stripeService.confirmPayment(piId); // repeat call: guarded no-op

    expect((await prisma.payment.findUnique({ where: { stripePaymentIntentId: piId } }))!.status).toBe('captured');
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('awaiting_approval');
    const notifs = await prisma.notification.findMany({ where: { userId: user.id } });
    expect(notifs.length).toBe(1);
    expect(notifs[0].type).toBe('payment_received');
    expect(hubSpy.mock.calls.filter((c) => (c[1] as any)?.type === 'payment_received').length).toBe(1);
  });

  it('T-M2: manual confirmation after order advanced → NO regression, no notification', async () => {
    const piId = 'pi_idc_advanced';
    const { order, user } = await seedOrderWithPayment({ orderStatus: 'shipped', piId });
    retrieveReturns('succeeded');

    await stripeService.confirmPayment(piId);

    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('shipped');
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(0);
  });

  it('T-M3: concurrent manual confirmations (Promise.all) → exactly one transition + one notification', async () => {
    const piId = 'pi_idc_race';
    const { order, user } = await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');

    await Promise.all([stripeService.confirmPayment(piId), stripeService.confirmPayment(piId)]);

    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('awaiting_approval');
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(1);
  });

  it('T-M4: realtime publish failure after commit → payment, order and notification remain', async () => {
    const piId = 'pi_idc_pubfail';
    const { order, user } = await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');
    vi.spyOn(notificationHub, 'publish').mockImplementation(() => {
      throw new Error('hub down');
    });

    await expect(stripeService.confirmPayment(piId)).resolves.toBeUndefined();

    expect((await prisma.payment.findUnique({ where: { stripePaymentIntentId: piId } }))!.status).toBe('captured');
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('awaiting_approval');
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(1);
  });

  it('T-M5: realtime publication happens only AFTER the transaction commits', async () => {
    const piId = 'pi_idc_order';
    await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');

    let probePromise: Promise<any> | null = null;
    vi.spyOn(notificationHub, 'publish').mockImplementation(() => {
      // Read issued AT PUBLISH TIME: under READ COMMITTED, a pre-commit
      // publication would not see the uncommitted 'captured' write.
      probePromise = prisma.payment.findUnique({ where: { stripePaymentIntentId: piId } });
    });

    await stripeService.confirmPayment(piId);

    expect(probePromise).not.toBeNull();
    const probed = await probePromise;
    expect(probed!.status).toBe('captured');
  });

  it('T-M6: failure state after capture (manual re-confirm) → payment STAYS captured', async () => {
    const piId = 'pi_idc_latefail';
    const { order } = await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');
    await stripeService.confirmPayment(piId); // capture

    retrieveReturns('payment_failed'); // authoritative state now failed
    await stripeService.confirmPayment(piId); // guarded transition must not clobber

    expect((await prisma.payment.findUnique({ where: { stripePaymentIntentId: piId } }))!.status).toBe('captured');
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('awaiting_approval');
  });

  it('T-5: eventId unique-violation discrimination — unrelated P2002/other errors are NOT duplicates', () => {
    // mkErr takes the meta.target VALUE directly and wraps it once, mirroring
    // what Prisma actually throws ({ name, code, meta: { target } }).
    const mkErr = (code: string, target?: unknown) =>
      Object.assign(new Error('test'), {
        name: 'PrismaClientKnownRequestError',
        code,
        meta: target === undefined ? undefined : { target },
      });

    expect(isEventIdUniqueViolation(mkErr('P2002', ['eventId']))).toBe(true);
    expect(isEventIdUniqueViolation(mkErr('P2002', 'processed_stripe_events_eventId_key'))).toBe(true);
    expect(isEventIdUniqueViolation(mkErr('P2002', ['email']))).toBe(false); // unrelated unique
    expect(isEventIdUniqueViolation(mkErr('P2002', ['orderId', 'vendorId']))).toBe(false);
    expect(isEventIdUniqueViolation(mkErr('P2002'))).toBe(false); // P2002 without a target
    expect(isEventIdUniqueViolation(mkErr('P2025', ['eventId']))).toBe(false); // not P2002
    expect(isEventIdUniqueViolation(new Error('plain error'))).toBe(false);
  });

  // ---------------------------------------------------------------------
  // Webhook event-ledger path — BLOCKED until migration
  // 20261115120000_stripe_event_ledger is applied (P2021: table missing).
  // ---------------------------------------------------------------------

  it('T-1: same signed success event replayed → effects exactly once (both 200)', async () => {
    const piId = 'pi_idc_replay';
    const { order, user } = await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');
    const event = succeededEvent(piId, 'evt_idc_replay');

    const r1 = await postStripeWebhook(event);
    const r2 = await postStripeWebhook(event); // identical redelivery

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200); // duplicate acked, NOT reprocessed
    expect(r2.json()).toEqual({ received: true });
    expect(await prisma.processedStripeEvent.count({ where: { eventId: 'evt_idc_replay' } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(1);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('awaiting_approval');
  });

  it('T-2: concurrent duplicate deliveries (Promise.all) → one processing winner, both safely acked', async () => {
    const piId = 'pi_idc_concurrent';
    const { order, user } = await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');
    const event = succeededEvent(piId, 'evt_idc_concurrent');

    const [r1, r2] = await Promise.all([postStripeWebhook(event), postStripeWebhook(event)]);

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(await prisma.processedStripeEvent.count({ where: { eventId: 'evt_idc_concurrent' } })).toBe(1);
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(1);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('awaiting_approval');
  });

  it('T-3: non-duplicate DB failure mid-transaction → retryable 500, full rollback, retry succeeds', async () => {
    const piId = 'pi_idc_dbfail';
    const { order, user } = await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');
    const event = succeededEvent(piId, 'evt_idc_dbfail');

    // Unrelated failure at the LAST transactional step → whole tx rolls back.
    const txSpy = vi
      .spyOn(notificationService, 'createIfUnseenInTx')
      .mockRejectedValue(new Error('db exploded'));

    const res = await postStripeWebhook(event);
    expect(res.statusCode).toBe(500); // Stripe retries

    // Everything rolled back: no ledger marker, payment/order untouched.
    expect(await prisma.processedStripeEvent.count({ where: { eventId: 'evt_idc_dbfail' } })).toBe(0);
    expect((await prisma.payment.findUnique({ where: { stripePaymentIntentId: piId } }))!.status).toBe('pending');
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('pending_review');
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(0);

    // Stripe redelivers the same event → processes fully now.
    txSpy.mockRestore();
    const retry = await postStripeWebhook(event);
    expect(retry.statusCode).toBe(200);
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(1);
  });

  it('T-4: different event IDs for the same PaymentIntent → business effects exactly once', async () => {
    const piId = 'pi_idc_multievt';
    const { order, user } = await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');

    const r1 = await postStripeWebhook(succeededEvent(piId, 'evt_idc_multi_a'));
    const r2 = await postStripeWebhook(succeededEvent(piId, 'evt_idc_multi_b'));

    expect(r1.statusCode).toBe(200);
    expect(r2.statusCode).toBe(200);
    expect(
      await prisma.processedStripeEvent.count({ where: { eventId: { startsWith: 'evt_idc_multi' } } })
    ).toBe(2);
    // The transition (and therefore the notification) happened exactly once.
    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(1);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('awaiting_approval');
  });

  it('T-6: late payment_failed via webhook after capture → payment stays captured', async () => {
    const piId = 'pi_idc_latewebhook';
    const { order } = await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');
    await postStripeWebhook(succeededEvent(piId, 'evt_idc_lw_success'));

    retrieveReturns('payment_failed');
    const res = await postStripeWebhook({
      id: 'evt_idc_lw_fail',
      object: 'event',
      api_version: '2023-10-16',
      created: 1700000000,
      type: 'payment_intent.payment_failed',
      data: { object: { id: piId, object: 'payment_intent' } },
    });

    expect(res.statusCode).toBe(200);
    expect((await prisma.payment.findUnique({ where: { stripePaymentIntentId: piId } }))!.status).toBe('captured');
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('awaiting_approval');
  });

  it('T-7: manual confirm racing webhook success (different event IDs) → exactly one transition', async () => {
    const piId = 'pi_idc_cross';
    const { order, user } = await seedOrderWithPayment({ piId });
    retrieveReturns('succeeded');

    const [, webhookRes] = await Promise.all([
      stripeService.confirmPayment(piId), // manual, no event ID
      postStripeWebhook(succeededEvent(piId, 'evt_idc_cross_w')),
    ]);
    expect(webhookRes.statusCode).toBe(200);

    expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(1);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))!.status).toBe('awaiting_approval');
  });
});
