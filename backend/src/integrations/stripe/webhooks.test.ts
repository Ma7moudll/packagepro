// SEC-03b — Stripe webhook signature verification.
//
// Production bug: the /webhooks/stripe route never opted into fastify-raw-body
// (registered with `global: false` in src/index.ts), so `request.rawBody` was
// `undefined` and `constructEvent(undefined, …)` threw for EVERY delivery —
// valid ones included. The fix is the route-level opt-in
// `{ config: { rawBody: true }, bodyLimit: 2MB }` in payment.routes.ts.
//
// These tests boot a REAL Fastify app with the EXACT production rawBody plugin
// options (src/index.ts:25-30) and exercise REAL HMAC signature verification
// against the installed stripe SDK — constructEvent is NOT mocked.
//
// NOTE: webhooks.ts captures STRIPE_WEBHOOK_SECRET at module load (line 10), so
// the test secret is set at the top of this file BEFORE any dynamic import of
// that module chain — static imports are hoisted and would evaluate first.

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import crypto from 'crypto';
import Fastify, { FastifyInstance } from 'fastify';
import rawBody from 'fastify-raw-body';

const TEST_SECRET = 'whsec_test_sec03b_vitest_dummy';
const ORIGINAL_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
process.env.STRIPE_WEBHOOK_SECRET = TEST_SECRET;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Mirrors Stripe's documented scheme (the same algorithm the SDK verifies):
// HMAC-SHA256 over `${timestamp}.${payload}`, header `t=…,v1=…`.
function signatureHeader(payload: string, secret = TEST_SECRET): string {
  const ts = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', secret).update(`${ts}.${payload}`).digest('hex');
  return `t=${ts},v1=${sig}`;
}

// Realistic Stripe event shape as raw bytes.
function eventPayload(dataObject: Record<string, unknown> = {}): string {
  return JSON.stringify({
    id: 'evt_test_sec03b',
    object: 'event',
    api_version: '2023-10-16',
    created: 1700000000,
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_test_sec03b', object: 'payment_intent', ...dataObject } },
  });
}

// Sized-event builder for the bodyLimit tests: a real event shape with a filler
// `blob` field, hand-assembled so the byte length is exact (ASCII-only, so
// string length === byte length).
const BIG_HEAD =
  '{"id":"evt_big","object":"event","api_version":"2023-10-16","created":1700000000,' +
  '"type":"payment_intent.succeeded","data":{"object":{"id":"pi_big","object":"payment_intent","blob":"';
const BIG_TAIL = '"}}}';
function sizedEvent(target: number): string {
  const payload = BIG_HEAD + 'x'.repeat(target - BIG_HEAD.length - BIG_TAIL.length) + BIG_TAIL;
  expect(payload.length).toBe(target); // byte-exactness guard
  return payload;
}

describe('SEC-03b Stripe webhook signature verification', () => {
  let app: FastifyInstance;
  // Spy on the exported singleton — webhooks.ts calls
  // stripeService.handleWebhook(event) on this same object.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let handleWebhookSpy: any;

  beforeAll(async () => {
    // Dynamic imports ONLY for the module chain that captures env at load
    // (payment.routes → payment.controller → webhooks.ts).
    const { paymentRoutes } = await import('../../modules/payments/payment.routes');
    const { stripeService } = await import('./stripe.service');

    // Must mock (not call through): the real handleWebhook performs Prisma
    // reads/writes (confirmPayment) — these tests verify signature transport,
    // not payment processing (that is SEC-03c territory).
    handleWebhookSpy = vi.spyOn(stripeService, 'handleWebhook').mockResolvedValue(undefined);

    app = Fastify({ logger: false });
    // EXACT production rawBody options (src/index.ts:25-30).
    await app.register(rawBody, { field: 'rawBody', global: false, encoding: false, runFirst: true });
    // Same registration shape as production (src/index.ts:244).
    await app.register(paymentRoutes, { prefix: '/api' });
    // Non-opted probe route: proves the rawBody opt-in is strictly per-route
    // and normal JSON parsing is unaffected for every other route.
    app.post('/probe/no-rawbody', async (request) => ({
      hasRawBody: (request as any).rawBody !== undefined,
      echoed: request.body,
    }));
    await app.ready();
  });

  beforeEach(() => {
    handleWebhookSpy?.mockClear();
  });

  afterAll(async () => {
    await app?.close();
    if (ORIGINAL_SECRET === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = ORIGINAL_SECRET;
  });

  async function postStripeWebhook(
    payload: string,
    opts: { sig?: string | null; secret?: string } = {}
  ) {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (opts.sig !== null) {
      headers['stripe-signature'] = opts.sig ?? signatureHeader(payload, opts.secret);
    }
    // light-my-request sends a string payload byte-exact — the signature must
    // therefore be computed over exactly this string.
    return app.inject({ method: 'POST', url: '/api/webhooks/stripe', payload, headers });
  }

  // -----------------------------------------------------------------------
  // Signature verification (valid path)
  // -----------------------------------------------------------------------

  it('T-1: valid HMAC-signed event → 200, reaches stripeService.handleWebhook with the parsed event', async () => {
    const payload = eventPayload({ amount: 2000, currency: 'usd', status: 'succeeded' });
    const res = await postStripeWebhook(payload);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });
    expect(handleWebhookSpy).toHaveBeenCalledTimes(1);
    const event = handleWebhookSpy.mock.calls[0][0];
    expect(event.type).toBe('payment_intent.succeeded');
    expect(event.data.object.id).toBe('pi_test_sec03b');
    expect(event.data.object.amount).toBe(2000);
  });

  it('T-2: exact raw-byte preservation — bytes that cannot survive a JSON round-trip still verify', async () => {
    // Hand-built raw bytes: leading whitespace is dropped and `1.00` collapses
    // to `1` by any parse→stringify round-trip. If the handler verified against
    // JSON.stringify(request.body) instead of the raw Buffer, this would 400.
    const payload =
      '  {"id":"evt_rawbytes","object":"event","api_version":"2023-10-16","created":1700000000,' +
      '"type":"payment_intent.succeeded","data":{"object":{"id":"pi_rawbytes","object":"payment_intent",' +
      '"amount":1.00,"note":"café ☕"}}}';
    const res = await postStripeWebhook(payload);

    expect(res.statusCode).toBe(200);
    expect(handleWebhookSpy).toHaveBeenCalledTimes(1);
    const event = handleWebhookSpy.mock.calls[0][0];
    // Parsed from the ORIGINAL bytes.
    expect(event.data.object.amount).toBe(1);
    expect(event.data.object.note).toBe('café ☕');
  });

  // -----------------------------------------------------------------------
  // Signature verification (rejection paths — handler must never run)
  // -----------------------------------------------------------------------

  it('T-3: tampered payload + valid signature → 400, handler NOT called', async () => {
    const payload = eventPayload();
    const tampered = payload.replace('evt_test_sec03b', 'evt_evil');
    expect(tampered).not.toBe(payload);

    const res = await postStripeWebhook(tampered, { sig: signatureHeader(payload) });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Webhook signature verification failed');
    expect(handleWebhookSpy).not.toHaveBeenCalled();
  });

  it('T-4: signature signed with the wrong secret → 400, handler NOT called', async () => {
    const res = await postStripeWebhook(eventPayload(), { secret: 'whsec_attacker_dummy' });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Webhook signature verification failed');
    expect(handleWebhookSpy).not.toHaveBeenCalled();
  });

  it('T-5: missing stripe-signature header → 400, handler NOT called', async () => {
    const res = await postStripeWebhook(eventPayload(), { sig: null });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe('Missing stripe-signature header');
    expect(handleWebhookSpy).not.toHaveBeenCalled();
  });

  it('T-6: malformed (non-JSON) payload with a matching signature → 400, handler NOT called', async () => {
    // The signature IS valid over these exact bytes — the JSON body parser
    // rejects the request before the handler ever runs.
    const res = await postStripeWebhook('not-json{{{');

    expect(res.statusCode).toBe(400);
    expect(handleWebhookSpy).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // RawBody opt-in scope
  // -----------------------------------------------------------------------

  it('T-7: non-opted route parses normally and has NO rawBody (opt-in is per-route)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/probe/no-rawbody',
      payload: { hello: 'world' },
      headers: { 'content-type': 'application/json' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ hasRawBody: false, echoed: { hello: 'world' } });
    expect(handleWebhookSpy).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // 2 MB route bodyLimit
  // -----------------------------------------------------------------------

  it('T-8: signed event just under the 2 MB route limit → 200, handler called', async () => {
    const payload = sizedEvent(2 * 1024 * 1024 - 1024);

    const res = await postStripeWebhook(payload);

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ received: true });
    expect(handleWebhookSpy).toHaveBeenCalledTimes(1);
    expect(handleWebhookSpy.mock.calls[0][0].data.object.id).toBe('pi_big');
  });

  it('T-9: payload over the 2 MB route limit → 413 FST_ERR_CTP_BODY_TOO_LARGE, handler NOT called', async () => {
    const payload = sizedEvent(2 * 1024 * 1024 + 1024);

    const res = await postStripeWebhook(payload);

    expect(res.statusCode).toBe(413);
    expect(res.json().code).toBe('FST_ERR_CTP_BODY_TOO_LARGE');
    expect(handleWebhookSpy).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Fail-closed secret handling
  // -----------------------------------------------------------------------

  // LAST TEST: vi.resetModules() poisons later dynamic imports in the same file
  // (SEC-03a lesson) — safe here because nothing follows it.
  it('T-10: missing/empty webhook secret fails closed → 400 even with a VALID signature', async () => {
    vi.resetModules();
    delete process.env.STRIPE_WEBHOOK_SECRET; // module captures '' at load
    const fresh = await import('./webhooks');

    const payload = Buffer.from(eventPayload());
    const state: { statusCode?: number; body?: any } = {};
    const reply: any = {
      status: (code: number) => ({
        send: (body: unknown) => {
          state.statusCode = code;
          state.body = body;
        },
      }),
    };

    await fresh.handleStripeWebhook(
      {
        headers: { 'stripe-signature': signatureHeader(payload.toString()) },
        rawBody: payload,
      } as any,
      reply
    );

    expect(state.statusCode).toBe(400);
    expect(state.body.error).toBe('Webhook signature verification failed');
  });
});
