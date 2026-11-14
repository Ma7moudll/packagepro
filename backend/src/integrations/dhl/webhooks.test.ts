// SEC-03a — DHL webhook trust + per-vendor settlement protection.
//
// Covers the approved test matrix: delivery scenarios (D), carrier-verification
// trust gate (T), non-delivered refresh semantics (N), settlement financial
// safety (S), financial-concurrency (FC), processing unification (PU), FX
// provider policy (FX), stale-processing recovery (RV), the read-only audit
// classifier (AU), tracking-event cap, podSignature prohibition, and the
// webhook rate limit (RL).
//
// Modeled on order.multi-po.integration.test.ts: real DB rows, marker-scoped
// cleanup, child-first. External HTTP (DHL Track API, FX provider, email) is
// always stubbed.

import { describe, it, expect, afterAll, afterEach, beforeEach, vi } from 'vitest';
import axios from 'axios';
import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { handleDHLWebhook } from './webhooks';
import { DHL_VERIFY_RUNTIME } from './dhl.service';
import {
  settlementService,
  settleVendorForDeliveredOrder,
  appendNote,
  FX_RUNTIME,
} from '../../modules/settlements/settlement.service';
import * as settlementModule from '../../modules/settlements/settlement.service';
import { runSettlementJob } from '../../workers/settlement-queue/settlement.worker';
import { poService } from '../../modules/purchase-orders/po.service';
import { handshakeService } from '../../modules/handshakes/handshake.service';
import { notificationService } from '../../modules/notifications/notifications.service';
import { emailService } from '../../services/email/email.service';
import {
  loadAuditData,
  classifySettlementAudit,
  AuditOrder,
  AuditSettlement,
} from '../../modules/settlements/settlement-audit';

const Decimal = Prisma.Decimal;

const HOUR = 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Seed helpers (marker-scoped, child-first cleanup)
// ---------------------------------------------------------------------------

describe('SEC-03a DHL webhook + settlement protection', () => {
  const marker = `WH-${Date.now().toString(36)}`;
  let seq = 0;

  async function seedUser(role: 'CUSTOMER' | 'VENDOR') {
    const email = `${marker.toLowerCase()}-${role.toLowerCase()}-${(seq++).toString(36)}@test.local`;
    return prisma.user.create({
      data: { email, passwordHash: 'x', role, emailVerified: true },
    });
  }

  async function seedVendor(name: string) {
    const user = await seedUser('VENDOR');
    return prisma.vendor.create({
      data: {
        userId: user.id,
        companyName: `${marker} ${name}`,
        address: 'x',
        city: 'y',
        country: 'z',
      },
    });
  }

  async function seedOrder(status: string, extra: Record<string, any> = {}) {
    const customerUser = await seedUser('CUSTOMER');
    const customer = await prisma.customer.create({ data: { userId: customerUser.id } });
    return prisma.order.create({
      data: {
        orderNumber: `${marker}-O${(seq++).toString(36)}`,
        customerId: customer.id,
        status,
        subtotal: 20,
        tax: 0,
        shippingCost: 0,
        total: 20,
        shippingAddress: { street: '1 Test St', city: 'Cairo', country: 'EG' },
        shippingName: 'WH Test',
        shippingPhone: '+200000000',
        ...extra,
      },
    });
  }

  async function seedPO(
    orderId: string,
    vendorId: string,
    status: string,
    vendorCost: any,
    currency = 'USD'
  ) {
    return prisma.purchaseOrder.create({
      data: {
        orderId,
        vendorId,
        poNumber: `${marker}-P${(seq++).toString(36)}`,
        status,
        vendorCost,
        currency,
      },
    });
  }

  async function seedShipment(
    orderId: string,
    status: string,
    trackingEvents: any[] | null = null,
    extra: Record<string, any> = {}
  ) {
    const tracking = `WHTRK${(seq++).toString(36)}`;
    return prisma.shipment.create({
      data: {
        orderId,
        dhlTrackingNumber: tracking,
        status,
        ...(trackingEvents !== null ? { trackingEvents: trackingEvents as any } : {}),
        ...extra,
      },
    });
  }

  async function seedSettlement(data: {
    orderId: string;
    vendorId: string;
    amount: any;
    currency?: string;
    status?: string;
    verificationPeriodEndsAt?: Date;
    notes?: string;
  }) {
    return prisma.settlement.create({
      data: {
        orderId: data.orderId,
        vendorId: data.vendorId,
        amount: data.amount,
        currency: data.currency ?? 'USD',
        status: data.status ?? 'pending',
        verificationPeriodEndsAt:
          data.verificationPeriodEndsAt ?? new Date(Date.now() - 1000),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });
  }

  function makeReply() {
    const state: any = { statusCode: 0, payload: null };
    const reply: any = {
      status(code: number) {
        state.statusCode = code;
        return reply;
      },
      send(payload: any) {
        state.payload = payload;
        return reply;
      },
    };
    return { reply: reply as any, state };
  }

  // ---------------------------------------------------------------------------
  // External-call stubs
  // ---------------------------------------------------------------------------

  /** Stub the DHL Track API (auth POST + tracking GET). */
  function stubDhl(
    status: string | null,
    opts: {
      failPost?: boolean;
      failGet?: boolean;
      malformed?: boolean;
      mismatched?: boolean;
      neverResolve?: boolean;
    } = {}
  ) {
    const postSpy = vi
      .spyOn(axios, 'post')
      .mockImplementation(async () => {
        if (opts.failPost) throw new Error('auth failed');
        return { data: { access_token: 'test-token' } } as any;
      });
    const getSpy = vi
      .spyOn(axios, 'get')
      .mockImplementation(async (_url: any, config: any) => {
        if (opts.neverResolve) {
          return new Promise((_resolve, reject) => {
            setTimeout(() => reject(new Error('timeout')), config?.timeout ?? 10_000);
          });
        }
        if (opts.failGet) throw new Error('track api down');
        if (opts.malformed) return { data: {} } as any;
        const tracking = config?.params?.trackingNumber;
        return {
          data: {
            shipments: [
              opts.mismatched
                ? { shipmentTrackingNumber: `${tracking}-OTHER`, status: status ?? 'delivered' }
                : { shipmentTrackingNumber: tracking, status: status ?? 'delivered' },
            ],
          },
        } as any;
      });
    return { postSpy, getSpy };
  }

  /** Stub the FX provider (axios.get — only used by settlement processing). */
  function stubFx(rate: any, opts: { reject?: boolean; timeout?: boolean } = {}) {
    return vi
      .spyOn(axios, 'get')
      .mockImplementation(async (_url: any, config: any) => {
        if (opts.timeout) {
          return new Promise((_resolve, reject) => {
            setTimeout(() => reject(new Error('timeout')), config?.timeout ?? 10_000);
          });
        }
        if (opts.reject) throw new Error('fx provider down');
        return { data: { rates: { EGP: rate } } } as any;
      });
  }

  const spyEmail = () => vi.spyOn(emailService, 'sendEmail').mockResolvedValue(null as any);
  const spyInApp = () => vi.spyOn(notificationService, 'createIfUnseen').mockResolvedValue(undefined as any);

  afterEach(async () => {
    vi.restoreAllMocks();
    FX_RUNTIME.timeoutMs = 10_000;
    DHL_VERIFY_RUNTIME.timeoutMs = 10_000;
  });

  afterAll(async () => {
    // Child-first, marker-scoped (idempotent after a previously failed run).
    await prisma.settlement.deleteMany({
      where: { order: { orderNumber: { startsWith: marker } } },
    });
    await prisma.shipment.deleteMany({
      where: { order: { orderNumber: { startsWith: marker } } },
    });
    await prisma.handshake.deleteMany({
      where: { purchaseOrder: { poNumber: { startsWith: marker } } },
    });
    await prisma.purchaseOrder.deleteMany({
      where: { poNumber: { startsWith: marker } },
    });
    await prisma.order.deleteMany({
      where: { orderNumber: { startsWith: marker } },
    });
    const vendors = await prisma.vendor.findMany({
      where: { companyName: { startsWith: marker } },
      select: { id: true, userId: true },
    });
    await prisma.vendor.deleteMany({ where: { id: { in: vendors.map((v) => v.id) } } });
    await prisma.user.deleteMany({
      where: { id: { in: vendors.map((v) => v.userId) }, email: { contains: '@test.local' } },
    });
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // D — delivery scenarios
  // ---------------------------------------------------------------------------

  describe('delivery scenarios', () => {
    it('D-1: verified delivered event → full transition, settlement created, podSignature never written', async () => {
      const vendor = await seedVendor('D1');
      const order = await seedOrder('shipped');
      const po = await seedPO(order.id, vendor.id, 'confirmed', '12.34');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(s!.status).toBe('delivered');
      expect(s!.actualDeliveryDate).toBeTruthy();
      expect(s!.podSignature).toBeNull();
      const lastEvent = (s!.trackingEvents as any[]).slice(-1)[0];
      expect(lastEvent.status).toBe('delivered');
      expect(lastEvent.verified).toBe(true);
      expect(lastEvent.source).toBe('dhl-track-api');

      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('delivered');
      expect(o!.deliveredAt).toBeTruthy();

      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(1);
      expect(settlements[0].vendorId).toBe(vendor.id);
      expect(settlements[0].status).toBe('pending');
      expect(settlements[0].currency).toBe('USD');
      expect(new Decimal(settlements[0].amount.toString()).equals('12.34')).toBe(true);
      const window = settlements[0].verificationPeriodEndsAt.getTime() - Date.now();
      expect(window).toBeGreaterThan(71 * HOUR);
      expect(window).toBeLessThan(73 * HOUR);
      void po;
    });

    it('D-2: unconfirmed PO → order delivered but NO settlement', async () => {
      const vendor = await seedVendor('D2');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'pending', '10');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(0);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('delivered');
    });

    it('D-3: two confirmed vendors → two settlements; unconfirmed third vendor gets none', async () => {
      const va = await seedVendor('D3A');
      const vb = await seedVendor('D3B');
      const vc = await seedVendor('D3C');
      const order = await seedOrder('shipped');
      await seedPO(order.id, va.id, 'confirmed', '10');
      await seedPO(order.id, vb.id, 'confirmed', '20');
      await seedPO(order.id, vc.id, 'pending', '30');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements.map((s) => s.vendorId).sort()).toEqual([va.id, vb.id].sort());
      const amounts = settlements.map((s) => s.amount.toString()).sort();
      expect(amounts).toEqual(['10', '20'].sort());
    });

    it('D-4: Decimal aggregation — two POs 0.10 + 0.20 → exactly 0.30 (no float drift)', async () => {
      const vendor = await seedVendor('D4');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '0.10');
      await seedPO(order.id, vendor.id, 'confirmed', '0.20');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.settlement.findFirstOrThrow({ where: { orderId: order.id } });
      expect(s.currency).toBe('USD');
      expect(new Decimal(s.amount.toString()).equals('0.30')).toBe(true);
    });

    it('D-5: mixed currency per vendor → stop-condition, settlement skipped + critical log', async () => {
      const va = await seedVendor('D5A');
      const vb = await seedVendor('D5B');
      const order = await seedOrder('shipped');
      await seedPO(order.id, va.id, 'confirmed', '10', 'USD');
      await seedPO(order.id, va.id, 'confirmed', '50', 'EGP');
      await seedPO(order.id, vb.id, 'confirmed', '20', 'USD');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const errorSpy = vi.spyOn(logger, 'error');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(1);
      expect(settlements[0].vendorId).toBe(vb.id);
      expect(errorSpy).toHaveBeenCalled();
      expect(String(errorSpy.mock.calls[0][0])).toContain('mixed-currency');
    });

    it('D-6: duplicate delivered event → idempotent, no duplicate settlement', async () => {
      const vendor = await seedVendor('D6');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);
      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(1);
      expect(new Decimal(settlements[0].amount.toString()).equals('10')).toBe(true);
    });

    it('D-7: settlement deleted then duplicate delivered event → ensured again (exactly one)', async () => {
      const vendor = await seedVendor('D7');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);
      await prisma.settlement.deleteMany({ where: { orderId: order.id } });
      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(1);
    });

    it('D-8: delivered event on cancelled order → shipment reflects carrier truth, order untouched, no settlement', async () => {
      const vendor = await seedVendor('D8');
      const order = await seedOrder('cancelled');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('cancelled');
      expect(o!.deliveredAt).toBeNull();
      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(0);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(s!.status).toBe('delivered');
    });

    it('D-9: delivered event on completed order → order stays completed, no new settlement, existing untouched', async () => {
      const vendor = await seedVendor('D9');
      const order = await seedOrder('completed');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      const seeded = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '10' });
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('completed');
      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(1);
      expect(settlements[0].id).toBe(seeded.id);
      expect(new Decimal(settlements[0].amount.toString()).equals('10')).toBe(true);
      expect(settlements[0].status).toBe('pending');
    });

    it('D-10: late confirmPO after delivery → vendor settlement created at confirmation', async () => {
      const va = await seedVendor('D10A');
      const vb = await seedVendor('D10B');
      const order = await seedOrder('shipped');
      const poA = await seedPO(order.id, va.id, 'confirmed', '10');
      const poB = await seedPO(order.id, vb.id, 'pending', '20');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);
      expect((await prisma.settlement.findMany({ where: { orderId: order.id } }))).toHaveLength(1);

      await poService.confirmPO(poB.id);

      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(2);
      const b = settlements.find((s) => s.vendorId === vb.id)!;
      expect(new Decimal(b.amount.toString()).equals('20')).toBe(true);
      const poAfter = await prisma.purchaseOrder.findUnique({ where: { id: poA.id } });
      expect(poAfter!.status).toBe('confirmed');
    });

    it('D-11: late acceptHandshake after delivery → order guard holds, settlement created', async () => {
      const vendor = await seedVendor('D11');
      const order = await seedOrder('shipped');
      const po = await seedPO(order.id, vendor.id, 'pending', '10');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);
      expect((await prisma.settlement.findMany({ where: { orderId: order.id } }))).toHaveLength(0);

      const handshake = await prisma.handshake.create({
        data: {
          poId: po.id,
          vendorId: vendor.id,
          status: 'pending',
          expiresAt: new Date(Date.now() + HOUR),
        },
      });
      await handshakeService.acceptHandshake(handshake.id);

      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('delivered'); // never clobbered to vendor_confirmed
      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(1);
      expect(settlements[0].vendorId).toBe(vendor.id);
    });

    it('D-12: acceptHandshake before delivery → vendor_confirmed, no settlement; delivery then settles', async () => {
      const vendor = await seedVendor('D12');
      const order = await seedOrder('ready_to_ship');
      const po = await seedPO(order.id, vendor.id, 'pending', '10');
      const handshake = await prisma.handshake.create({
        data: {
          poId: po.id,
          vendorId: vendor.id,
          status: 'pending',
          expiresAt: new Date(Date.now() + HOUR),
        },
      });

      await handshakeService.acceptHandshake(handshake.id);

      let o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('vendor_confirmed');
      expect(await prisma.settlement.findMany({ where: { orderId: order.id } })).toHaveLength(0);

      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();
      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('delivered');
      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(1);
      expect(new Decimal(settlements[0].amount.toString()).equals('10')).toBe(true);
    });

    it('D-13: legacy pending settlement with stale amount → corrected by delivery event with notes trail', async () => {
      const vendor = await seedVendor('D13');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      await seedPO(order.id, vendor.id, 'confirmed', '150');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      const legacy = await seedSettlement({
        orderId: order.id,
        vendorId: vendor.id,
        amount: '100',
        notes: 'legacy row',
      });
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.settlement.findUniqueOrThrow({ where: { id: legacy.id } });
      expect(new Decimal(s.amount.toString()).equals('250')).toBe(true);
      expect(s.notes).toContain('legacy row');
      expect(s.notes).toContain('corrected pending settlement to 250 USD');
      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // T — carrier-verification trust gate
  // ---------------------------------------------------------------------------

  describe('trust gate (delivered events)', () => {
    it('T-1: forged delivered (carrier says in_transit) → 200, ZERO writes', async () => {
      const vendor = await seedVendor('T1');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'in_transit');
      stubDhl('in_transit');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('shipped');
      expect(o!.deliveredAt).toBeNull();
      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(0);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(s!.status).toBe('in_transit');
      expect(s!.trackingEvents).toBeNull();
    });

    it('T-2: malformed carrier response → 500, ZERO writes', async () => {
      const vendor = await seedVendor('T2');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'in_transit');
      stubDhl('delivered', { malformed: true });
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(500);
      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(0);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('shipped');
    });

    it('T-3: carrier response for a different tracking number → 500, ZERO writes', async () => {
      const vendor = await seedVendor('T3');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'in_transit');
      stubDhl('delivered', { mismatched: true });
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(500);
      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(0);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('shipped');
    });

    it('T-4: verification timeout → 500, ZERO writes, injected DHL_VERIFY_RUNTIME timeout reaches the carrier call', async () => {
      const vendor = await seedVendor('T4');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'in_transit');
      const { postSpy, getSpy } = stubDhl('delivered', { neverResolve: true });
      DHL_VERIFY_RUNTIME.timeoutMs = 50;
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(500);
      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(0);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('shipped');

      // The delivered-verification path must propagate the INJECTED timeout
      // (not the module constant) to the independent carrier calls — the stub
      // rejects exactly at config.timeout, so a 10s constant would hang here.
      expect(postSpy.mock.calls[0][2].timeout).toBe(50); // auth call
      expect(getSpy.mock.calls[0][1].timeout).toBe(50); // track call rejects at it
    });

    it('T-5: DHL auth failure → 500, ZERO writes', async () => {
      const vendor = await seedVendor('T5');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'in_transit');
      stubDhl('delivered', { failPost: true });
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(500);
      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(0);
    });

    it('T-6: missing DHL credentials fail explicitly (500, ZERO writes, no silent bypass)', async () => {
      const vendor = await seedVendor('T6');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'in_transit');

      // Credentials are read at call time (see fetchVerifiedShipmentState),
      // so deleting the env vars is sufficient — no module reset, which
      // would poison the shared module graph for the rest of the suite.
      const prevKey = process.env.DHL_API_KEY;
      const prevSecret = process.env.DHL_API_SECRET;
      delete process.env.DHL_API_KEY;
      delete process.env.DHL_API_SECRET;
      try {
        const { reply, state } = makeReply();
        await handleDHLWebhook(
          { body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any,
          reply
        );
        expect(state.statusCode).toBe(500);
      } finally {
        if (prevKey !== undefined) process.env.DHL_API_KEY = prevKey;
        if (prevSecret !== undefined) process.env.DHL_API_SECRET = prevSecret;
      }

      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(0);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('shipped');
    });

    it('T-7: unknown tracking number → uniform 200, no carrier call, no oracle', async () => {
      const { postSpy, getSpy } = stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: `${marker}-NOPE`, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      expect(state.payload).toEqual({ received: true });
      expect(postSpy).not.toHaveBeenCalled();
      expect(getSpy).not.toHaveBeenCalled();
    });

    it('T-8: missing tracking number → 400, zero writes', async () => {
      const { reply, state } = makeReply();
      await handleDHLWebhook({ body: {} } as any, reply);
      expect(state.statusCode).toBe(400);
    });

    it('T-9: failed shipment → event refused (200, zero writes, no carrier call)', async () => {
      const vendor = await seedVendor('T9');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'failed');
      const { postSpy, getSpy } = stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      expect(postSpy).not.toHaveBeenCalled();
      expect(getSpy).not.toHaveBeenCalled();
      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(0);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('shipped');
    });

    it('T-10: duplicate delivered event with an already-completed settlement → untouched (never rewritten)', async () => {
      const vendor = await seedVendor('T10');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      const settled = await seedSettlement({
        orderId: order.id,
        vendorId: vendor.id,
        amount: '10',
        status: 'completed',
      });
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.settlement.findUniqueOrThrow({ where: { id: settled.id } });
      expect(s.status).toBe('completed');
      expect(s.notes).toBeNull();
      expect(new Decimal(s.amount.toString()).equals('10')).toBe(true);
      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(1);
    });
  });

  // ---------------------------------------------------------------------------
  // N — non-delivered events (refresh hints, provider-confirmed facts only)
  // ---------------------------------------------------------------------------

  describe('non-delivered events', () => {
    it('N-1: picked_up claim, carrier says in_transit → forward transition + verified entry, no settlement', async () => {
      const vendor = await seedVendor('N1');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'picked_up');
      stubDhl('in_transit');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'picked_up' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(s!.status).toBe('in_transit');
      expect((s!.trackingEvents as any[]).slice(-1)[0].status).toBe('in_transit');
      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(0);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('shipped');
    });

    it('N-2: carrier state equals ours → no transition, no append, 200', async () => {
      const vendor = await seedVendor('N2');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'picked_up');
      stubDhl('picked_up');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'picked_up' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(s!.status).toBe('picked_up');
      expect(s!.trackingEvents).toBeNull();
    });

    it('N-3: carrier state behind ours (pre_transit) → no regression, 200', async () => {
      const vendor = await seedVendor('N3');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'in_transit');
      stubDhl('pre_transit');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'in_transit' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(s!.status).toBe('in_transit');
      expect(s!.trackingEvents).toBeNull();
    });

    it('N-4: carrier ahead (out_for_delivery) → forward transition + verified entry', async () => {
      const vendor = await seedVendor('N4');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'picked_up');
      stubDhl('out_for_delivery');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'out_for_delivery' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(s!.status).toBe('out_for_delivery');
      expect((s!.trackingEvents as any[]).slice(-1)[0].status).toBe('out_for_delivery');
    });

    it('N-5: carrier reports delivered on a refresh → full delivered treatment incl. settlements', async () => {
      const vendor = await seedVendor('N5');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'in_transit');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'in_transit' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('delivered');
      const settlements = await prisma.settlement.findMany({ where: { orderId: order.id } });
      expect(settlements).toHaveLength(1);
      expect(new Decimal(settlements[0].amount.toString()).equals('10')).toBe(true);
    });

    it('N-6: unknown event type acts as a refresh hint (provider state applied)', async () => {
      const vendor = await seedVendor('N6');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'created');
      stubDhl('in_transit');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'carrier_stuff' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(s!.status).toBe('in_transit');
    });

    it('N-7: non-delivered event + carrier API error → 500, zero writes', async () => {
      const vendor = await seedVendor('N7');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'picked_up');
      stubDhl('in_transit', { failGet: true });
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'picked_up' } } as any, reply);

      expect(state.statusCode).toBe(500);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(s!.status).toBe('picked_up');
      expect(s!.trackingEvents).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // S — settlement financial safety through the webhook path
  // ---------------------------------------------------------------------------

  describe('settlement financial safety', () => {
    it('S-1: amount overflow (60M + 50M > DECIMAL(10,2)) → P2020 aborts tx → 500 and NO partial writes', async () => {
      const vendor = await seedVendor('S1');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '60000000');
      await seedPO(order.id, vendor.id, 'confirmed', '50000000');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(500);
      // Whole transaction rolled back — atomicity proven.
      const o = await prisma.order.findUnique({ where: { id: order.id } });
      expect(o!.status).toBe('shipped');
      expect(o!.deliveredAt).toBeNull();
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      expect(s!.status).toBe('out_for_delivery');
      expect(s!.trackingEvents).toBeNull();
      expect(await prisma.settlement.count({ where: { orderId: order.id } })).toBe(0);
    });

    it('S-2: non-USD PO → settlement created with EGP currency (no FX at creation)', async () => {
      const vendor = await seedVendor('S2');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '500', 'EGP');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.settlement.findFirstOrThrow({ where: { orderId: order.id } });
      expect(s.currency).toBe('EGP');
      expect(new Decimal(s.amount.toString()).equals('500')).toBe(true);
    });

    it('S-3: verificationPeriodEndsAt is now + 72h', async () => {
      const vendor = await seedVendor('S3');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const shipment = await seedShipment(order.id, 'out_for_delivery');
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.settlement.findFirstOrThrow({ where: { orderId: order.id } });
      const window = s.verificationPeriodEndsAt.getTime() - Date.now();
      expect(window).toBeGreaterThan(71 * HOUR);
      expect(window).toBeLessThan(73 * HOUR);
    });
  });

  // ---------------------------------------------------------------------------
  // Cap + entry validation
  // ---------------------------------------------------------------------------

  describe('tracking-event cap', () => {
    it('CAP-1: 99 existing + 1 appended → exactly 100 kept', async () => {
      const vendor = await seedVendor('CAP1');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const existing = Array.from({ length: 99 }, (_, i) => ({
        timestamp: new Date(Date.now() - 100_000 + i * 100).toISOString(),
        status: 'in_transit',
      }));
      const shipment = await seedShipment(order.id, 'out_for_delivery', existing);
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      const events = s!.trackingEvents as any[];
      expect(events).toHaveLength(100);
      expect(events[99].status).toBe('delivered');
      expect(events[0].status).toBe('in_transit');
    });

    it('CAP-2: 100 existing + 1 appended → ring buffer keeps newest 100, oldest dropped', async () => {
      const vendor = await seedVendor('CAP2');
      const order = await seedOrder('shipped');
      await seedPO(order.id, vendor.id, 'confirmed', '10');
      const existing = Array.from({ length: 100 }, (_, i) => ({
        timestamp: new Date(Date.now() - 100_000 + i * 100).toISOString(),
        status: 'in_transit',
      }));
      const shipment = await seedShipment(order.id, 'out_for_delivery', existing);
      stubDhl('delivered');
      const { reply, state } = makeReply();

      await handleDHLWebhook({ body: { trackingNumber: shipment.dhlTrackingNumber, eventType: 'delivered' } } as any, reply);

      expect(state.statusCode).toBe(200);
      const s = await prisma.shipment.findUnique({ where: { id: shipment.id } });
      const events = s!.trackingEvents as any[];
      expect(events).toHaveLength(100);
      expect(events[99].status).toBe('delivered');
      // The first seeded entry was dropped by the ring buffer.
      expect(new Date(events[0].timestamp).getTime()).toBeGreaterThan(
        new Date(existing[0].timestamp).getTime()
      );
    });
  });

  // ---------------------------------------------------------------------------
  // FC — financial concurrency (correction vs processing claim)
  // ---------------------------------------------------------------------------

  describe('financial concurrency', () => {
    it('FC-1: correction wins before the claim → processor pays the corrected amount', async () => {
      const vendor = await seedVendor('FC1');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      await seedPO(order.id, vendor.id, 'confirmed', '150');
      const legacy = await seedSettlement({
        orderId: order.id,
        vendorId: vendor.id,
        amount: '100',
      });
      stubFx(2);
      spyEmail();

      // Correction path (the confirmPO helper, order already delivered).
      await prisma.$transaction(async (tx) => {
        await settleVendorForDeliveredOrder(tx, order.id, vendor.id, 'test-correction');
      });
      const corrected = await prisma.settlement.findUniqueOrThrow({ where: { id: legacy.id } });
      expect(new Decimal(corrected.amount.toString()).equals('250')).toBe(true);

      // Processor claims AFTER the correction → uses the frozen, corrected amount.
      const processed = await settlementService.processSettlement(legacy.id);
      expect(processed.status).toBe('completed');
      expect(Number(processed.convertedAmount)).toBe(500); // 250 × 2
      expect(Number(processed.exchangeRate)).toBe(2);
    });

    it('FC-2: processing claim wins first → helper cannot change the amount; processor rejects later', async () => {
      const vendor = await seedVendor('FC2');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '250');
      const claimed = await seedSettlement({
        orderId: order.id,
        vendorId: vendor.id,
        amount: '100',
      });
      await prisma.settlement.update({ where: { id: claimed.id }, data: { status: 'processing' } });

      const errorSpy = vi.spyOn(logger, 'error');
      await prisma.$transaction(async (tx) => {
        await settleVendorForDeliveredOrder(tx, order.id, vendor.id, 'test-too-late');
      });

      const s = await prisma.settlement.findUniqueOrThrow({ where: { id: claimed.id } });
      expect(new Decimal(s.amount.toString()).equals('100')).toBe(true); // byte-identical
      expect(s.status).toBe('processing');
      expect(errorSpy).toHaveBeenCalled();
      expect(String(errorSpy.mock.calls[0][0])).toContain('never rewrites non-pending');

      await expect(settlementService.processSettlement(claimed.id)).rejects.toThrow(
        'Settlement is not in pending status'
      );
    });
  });

  // ---------------------------------------------------------------------------
  // PU — processing unification (manual route and worker produce identical results)
  // ---------------------------------------------------------------------------

  describe('processing unification', () => {
    it('PU-1: manual path and worker path produce identical financial records + one notification each', async () => {
      const vendor = await seedVendor('PU1');
      const orderA = await seedOrder('delivered', { deliveredAt: new Date() });
      const orderB = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(orderA.id, vendor.id, 'confirmed', '100');
      await seedPO(orderB.id, vendor.id, 'confirmed', '100');
      const a = await seedSettlement({ orderId: orderA.id, vendorId: vendor.id, amount: '100' });
      const b = await seedSettlement({ orderId: orderB.id, vendorId: vendor.id, amount: '100' });

      stubFx(2);
      const emailSpy = spyEmail();
      const inAppSpy = spyInApp();

      const manual = await settlementService.processSettlement(a.id);
      await runSettlementJob(b.id);

      const workerDone = await prisma.settlement.findUniqueOrThrow({ where: { id: b.id } });
      expect(workerDone.status).toBe(manual.status);
      expect(Number(workerDone.convertedAmount)).toBe(Number(manual.convertedAmount));
      expect(Number(workerDone.exchangeRate)).toBe(Number(manual.exchangeRate));
      expect(workerDone.receiptUrl).toBeTruthy();
      expect(workerDone.processedAt).toBeTruthy();
      expect(emailSpy).toHaveBeenCalledTimes(2); // one per settlement
      expect(inAppSpy).toHaveBeenCalledTimes(2);
    });

    it('PU-2: concurrent manual and worker processing of the same settlement → one winner, one notification', async () => {
      const vendor = await seedVendor('PU2');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });

      stubFx(2);
      const emailSpy = spyEmail();
      spyInApp();

      await Promise.allSettled([
        settlementService.processSettlement(s.id),
        runSettlementJob(s.id),
      ]);

      const row = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(row.status).toBe('completed');
      expect(row.convertedAmount).toBeTruthy();
      expect(row.exchangeRate).toBeTruthy();
      expect(row.receiptUrl).toBeTruthy();
      expect(row.processedAt).toBeTruthy();
      expect(emailSpy).toHaveBeenCalledTimes(1);
    });

    it('PU-3: worker path alone completes the FULL financial record (divergent body is gone)', async () => {
      const vendor = await seedVendor('PU3');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });

      stubFx(2);
      const emailSpy = spyEmail();
      spyInApp();

      await runSettlementJob(s.id);

      const row = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(row.status).toBe('completed');
      expect(Number(row.convertedAmount)).toBe(200);
      expect(Number(row.exchangeRate)).toBe(2);
      expect(row.receiptUrl).toBeTruthy();
      expect(row.processedAt).toBeTruthy();
      expect(emailSpy).toHaveBeenCalledTimes(1);
    });

    it('PU-5: DB failure at completion → compensating rollback to pending; retry completes exactly once', async () => {
      const vendor = await seedVendor('PU5');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });

      stubFx(2);
      const emailSpy = spyEmail();
      spyInApp();

      // Manual monkey-patch (NOT vi.spyOn): restoring a vitest spy on a
      // Prisma delegate leaves the method undefined and breaks every later
      // test. Save/assign/restore keeps the delegate intact.
      const target = prisma.settlement as any;
      const origUpdateMany = target.updateMany.bind(target);
      target.updateMany = async (args: any) => {
        if (args?.data?.status === 'completed') throw new Error('simulated db failure');
        return origUpdateMany(args);
      };
      try {
        await expect(settlementService.processSettlement(s.id)).rejects.toThrow('simulated db failure');

        const rolledBack = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
        expect(rolledBack.status).toBe('pending');
        expect(rolledBack.notes).toContain('claim reverted after failure');
        expect(emailSpy).not.toHaveBeenCalled();
      } finally {
        target.updateMany = origUpdateMany;
      }

      await settlementService.processSettlement(s.id);

      const done = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(done.status).toBe('completed');
      expect(emailSpy).toHaveBeenCalledTimes(1); // across BOTH attempts
    });

    it('PU-6: retry/re-entry after completion cannot duplicate completion or notifications', async () => {
      const vendor = await seedVendor('PU6');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });

      stubFx(2);
      const emailSpy = spyEmail();
      const inAppSpy = spyInApp();

      await settlementService.processSettlement(s.id);
      const first = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });

      await expect(settlementService.processSettlement(s.id)).rejects.toThrow(
        'Settlement is not in pending status'
      );
      await runSettlementJob(s.id); // skip, no throw

      const after = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(after.status).toBe('completed');
      expect(after.processedAt!.getTime()).toBe(first.processedAt!.getTime());
      expect(emailSpy).toHaveBeenCalledTimes(1);
      expect(inAppSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // FX — provider policy (no unverified fallback)
  // ---------------------------------------------------------------------------

  describe('FX provider policy', () => {
    it('FX-1: FX timeout → rollback to pending with notes; retry with a valid rate completes', async () => {
      const vendor = await seedVendor('FX1');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });

      const emailSpy = spyEmail();
      spyInApp();
      stubFx('never', { timeout: true });
      FX_RUNTIME.timeoutMs = 50;

      await expect(settlementService.processSettlement(s.id)).rejects.toThrow();

      const rolled = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(rolled.status).toBe('pending');
      expect(rolled.notes).toContain('claim reverted after failure');
      expect(rolled.convertedAmount).toBeNull();
      expect(emailSpy).not.toHaveBeenCalled();

      stubFx(2);
      await settlementService.processSettlement(s.id);
      const done = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(done.status).toBe('completed');
      expect(Number(done.exchangeRate)).toBe(2);
    });

    it('FX-2: FX provider error → rollback to pending, error propagates, no completion', async () => {
      const vendor = await seedVendor('FX2');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });

      spyEmail();
      spyInApp();
      stubFx(null, { reject: true });

      await expect(settlementService.processSettlement(s.id)).rejects.toThrow('fx provider down');

      const rolled = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(rolled.status).toBe('pending');
      expect(rolled.convertedAmount).toBeNull();
      expect(rolled.receiptUrl).toBeNull();
    });

    it.each([0, -1, NaN, undefined, '42.5'])(
      'FX-3: invalid rate %p → rollback to pending, no completion writes',
      async (rate) => {
        const vendor = await seedVendor('FX3');
        const order = await seedOrder('delivered', { deliveredAt: new Date() });
        await seedPO(order.id, vendor.id, 'confirmed', '100');
        const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });

        spyEmail();
        spyInApp();
        stubFx(rate as any);

        await expect(settlementService.processSettlement(s.id)).rejects.toThrow(
          /invalid rate|fetch failed/i
        );

        const rolled = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
        expect(rolled.status).toBe('pending');
        expect(rolled.convertedAmount).toBeNull();
        expect(rolled.receiptUrl).toBeNull();
      }
    );

    it('FX-4: valid rate 42.5 → completes with exchanged financial record + notification', async () => {
      const vendor = await seedVendor('FX4');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });

      stubFx(42.5);
      const emailSpy = spyEmail();
      const inAppSpy = spyInApp();

      const done = await settlementService.processSettlement(s.id);

      expect(done.status).toBe('completed');
      expect(Number(done.exchangeRate)).toBe(42.5);
      expect(Number(done.convertedAmount)).toBe(4250);
      expect(emailSpy).toHaveBeenCalledTimes(1);
      expect(inAppSpy).toHaveBeenCalledTimes(1);
    });

    it('FX-5: non-USD settlement → no FX call, rate 1, convertedAmount = amount', async () => {
      const vendor = await seedVendor('FX5');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '500', 'EGP');
      const s = await seedSettlement({
        orderId: order.id,
        vendorId: vendor.id,
        amount: '500',
        currency: 'EGP',
      });

      const getSpy = stubFx(2); // would poison the result if called
      const emailSpy = spyEmail();
      spyInApp();

      const done = await settlementService.processSettlement(s.id);

      expect(getSpy).not.toHaveBeenCalled();
      expect(done.status).toBe('completed');
      expect(Number(done.exchangeRate)).toBe(1);
      expect(Number(done.convertedAmount)).toBe(500);
      expect(emailSpy).toHaveBeenCalledTimes(1);
    });

    it('FX-6: email failure after completion → completed row stands, in-app notification exists', async () => {
      const vendor = await seedVendor('FX6');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });

      stubFx(2);
      const emailSpy = vi.spyOn(emailService, 'sendEmail').mockRejectedValue(new Error('smtp down'));
      const inAppSpy = spyInApp();

      await expect(settlementService.processSettlement(s.id)).rejects.toThrow('smtp down');

      const row = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(row.status).toBe('completed'); // never reverted
      expect(Number(row.convertedAmount)).toBe(200);
      expect(inAppSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // RV — stale-processing recovery
  // ---------------------------------------------------------------------------

  describe('stale-processing recovery', () => {
    it('RV-1: a freshly claimed (processing) row CANNOT be recovered', async () => {
      const vendor = await seedVendor('RV1');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });
      await prisma.settlement.update({ where: { id: s.id }, data: { status: 'processing' } });

      await expect(
        settlementService.recoverStaleSettlement(s.id, 'admin-user-1')
      ).rejects.toThrow(/not recoverable/);

      const row = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(row.status).toBe('processing');
      expect(row.notes).toBeNull();
    });

    it('RV-2: a 25h-old processing row is recoverable; reprocessing then completes once', async () => {
      const vendor = await seedVendor('RV2');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });
      await prisma.settlement.update({ where: { id: s.id }, data: { status: 'processing' } });
      await prisma.$executeRaw`UPDATE "settlements" SET "updatedAt" = (NOW() AT TIME ZONE 'utc') - INTERVAL '25 hours' WHERE id = ${s.id}`;

      await settlementService.recoverStaleSettlement(s.id, 'admin-user-2');

      const recovered = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(recovered.status).toBe('pending');
      expect(recovered.notes).toContain('recovered from stale processing by admin admin-user-2');

      stubFx(2);
      spyEmail();
      spyInApp();
      await settlementService.processSettlement(s.id);

      const done = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(done.status).toBe('completed');
      // The recovery note survives the processing cycle's notes append.
      expect(done.notes).toContain('recovered from stale processing');
    });

    it('RV-3: recovery never completes and never notifies', async () => {
      const vendor = await seedVendor('RV3');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '100');
      const s = await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '100' });
      await prisma.settlement.update({ where: { id: s.id }, data: { status: 'processing' } });
      await prisma.$executeRaw`UPDATE "settlements" SET "updatedAt" = (NOW() AT TIME ZONE 'utc') - INTERVAL '25 hours' WHERE id = ${s.id}`;

      const emailSpy = vi.spyOn(emailService, 'sendEmail');
      const inAppSpy = spyInApp();

      await settlementService.recoverStaleSettlement(s.id, 'admin-user-3');

      const row = await prisma.settlement.findUniqueOrThrow({ where: { id: s.id } });
      expect(row.status).toBe('pending');
      expect(emailSpy).not.toHaveBeenCalled();
      expect(inAppSpy).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // AU — read-only audit classifier (pure, synthetic fixtures)
  // ---------------------------------------------------------------------------

  describe('settlement audit classifier', () => {
    const now = new Date();

    function mkOrder(
      id: string,
      status: string,
      pos: Array<{ vendorId: string; status: string; vendorCost: string; currency: string }>
    ): AuditOrder {
      return {
        id,
        status,
        orderNumber: id,
        purchaseOrders: pos.map((p) => ({
          vendorId: p.vendorId,
          status: p.status,
          vendorCost: new Prisma.Decimal(p.vendorCost),
          currency: p.currency,
        })),
      };
    }

    function mkSettlement(
      id: string,
      orderId: string,
      vendorId: string,
      status: string,
      amount: string,
      currency = 'USD',
      updatedAt = now
    ): AuditSettlement {
      return {
        id,
        orderId,
        vendorId,
        status,
        amount: new Prisma.Decimal(amount),
        currency,
        updatedAt,
      };
    }

    it('AU-1: delivered order with matching settlements → clean, both gates open', () => {
      const report = classifySettlementAudit(
        [mkOrder('o1', 'delivered', [{ vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' }])],
        [mkSettlement('s1', 'o1', 'v1', 'pending', '100')]
      );
      expect(report.gates.pre).toBe(false);
      expect(report.gates.post).toBe(false);
      expect(report.findings).toHaveLength(0);
    });

    it('AU-2: delivered order, one vendor, zero rows → MISSING_PRE_REPAIRABLE blocks pre AND post', () => {
      const report = classifySettlementAudit(
        [mkOrder('o1', 'delivered', [{ vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' }])],
        []
      );
      expect(report.counts.MISSING_PRE_REPAIRABLE).toBe(1);
      expect(report.gates.pre).toBe(true);
      expect(report.gates.post).toBe(true);
    });

    it('AU-3: delivered order, two vendors, zero rows → MISSING_NEEDS_COMPOSITE blocks post only', () => {
      const report = classifySettlementAudit(
        [
          mkOrder('o1', 'delivered', [
            { vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' },
            { vendorId: 'v2', status: 'confirmed', vendorCost: '50', currency: 'USD' },
          ]),
        ],
        []
      );
      expect(report.counts.MISSING_NEEDS_COMPOSITE).toBe(2);
      expect(report.counts.MISSING_PRE_REPAIRABLE).toBe(0);
      expect(report.gates.pre).toBe(false);
      expect(report.gates.post).toBe(true);
    });

    it('AU-4: delivered order, partial rows among two vendors → MISSING_NEEDS_COMPOSITE blocks post only', () => {
      const report = classifySettlementAudit(
        [
          mkOrder('o1', 'delivered', [
            { vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' },
            { vendorId: 'v2', status: 'confirmed', vendorCost: '50', currency: 'USD' },
          ]),
        ],
        [mkSettlement('s1', 'o1', 'v1', 'pending', '100')]
      );
      expect(report.counts.MISSING_NEEDS_COMPOSITE).toBe(1);
      expect(report.gates.pre).toBe(false);
      expect(report.gates.post).toBe(true);
    });

    it('AU-5: pending amount drift → PENDING_MISMATCH blocks pre and post', () => {
      const report = classifySettlementAudit(
        [mkOrder('o1', 'delivered', [{ vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' }])],
        [mkSettlement('s1', 'o1', 'v1', 'pending', '90')]
      );
      expect(report.counts.PENDING_MISMATCH).toBe(1);
      expect(report.gates.pre).toBe(true);
      expect(report.gates.post).toBe(true);
    });

    it('AU-6: pending currency drift → PENDING_MISMATCH blocks pre', () => {
      const report = classifySettlementAudit(
        [mkOrder('o1', 'delivered', [{ vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' }])],
        [mkSettlement('s1', 'o1', 'v1', 'pending', '100', 'EGP')]
      );
      expect(report.counts.PENDING_MISMATCH).toBe(1);
      expect(report.gates.pre).toBe(true);
    });

    it('AU-7: settlement for a vendor without a confirmed PO → AMBIGUOUS blocks pre (delivered)', () => {
      const report = classifySettlementAudit(
        [mkOrder('o1', 'delivered', [{ vendorId: 'v1', status: 'pending', vendorCost: '100', currency: 'USD' }])],
        [mkSettlement('s1', 'o1', 'v1', 'pending', '100')]
      );
      expect(report.counts.AMBIGUOUS).toBe(1);
      expect(report.gates.pre).toBe(true);
    });

    it('AU-8: completed order missing settlement → MISSING_COMPLETED, manual, gates open', () => {
      const report = classifySettlementAudit(
        [mkOrder('o1', 'completed', [{ vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' }])],
        []
      );
      expect(report.counts.MISSING_COMPLETED).toBe(1);
      expect(report.gates.pre).toBe(false);
      expect(report.gates.post).toBe(false);
    });

    it('AU-9: cancelled order → MISSING suppressed entirely', () => {
      const report = classifySettlementAudit(
        [mkOrder('o1', 'cancelled', [{ vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' }])],
        []
      );
      expect(report.findings).toHaveLength(0);
      expect(report.gates.pre).toBe(false);
      expect(report.gates.post).toBe(false);
    });

    it('AU-10: undelivered order → no MISSING expectation', () => {
      const report = classifySettlementAudit(
        [mkOrder('o1', 'in_production', [{ vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' }])],
        []
      );
      expect(report.findings).toHaveLength(0);
    });

    it('AU-11: 25h-old processing row → STUCK_PROCESSING, manual, gates open', () => {
      const stale = new Date(now.getTime() - 25 * HOUR);
      const report = classifySettlementAudit(
        [mkOrder('o1', 'delivered', [{ vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' }])],
        [mkSettlement('s1', 'o1', 'v1', 'processing', '100', 'USD', stale)]
      );
      expect(report.counts.STUCK_PROCESSING).toBe(1);
      expect(report.findings[0].severity).toBe('manual');
      expect(report.gates.pre).toBe(false);
      expect(report.gates.post).toBe(false);
    });

    it('AU-12: fresh (1h) processing row → not stuck', () => {
      const fresh = new Date(now.getTime() - 1 * HOUR);
      const report = classifySettlementAudit(
        [mkOrder('o1', 'delivered', [{ vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' }])],
        [mkSettlement('s1', 'o1', 'v1', 'processing', '100', 'USD', fresh)]
      );
      expect(report.counts.STUCK_PROCESSING).toBe(0);
      expect(report.gates.pre).toBe(false);
    });

    it('AU-13: non-pending rows are never amount-mismatch gated', () => {
      const report = classifySettlementAudit(
        [mkOrder('o1', 'delivered', [{ vendorId: 'v1', status: 'confirmed', vendorCost: '100', currency: 'USD' }])],
        [mkSettlement('s1', 'o1', 'v1', 'completed', '50')]
      );
      expect(report.counts.PENDING_MISMATCH).toBe(0);
      expect(report.gates.pre).toBe(false);
      expect(report.gates.post).toBe(false);
    });

    it('AU-14: loadAuditData + classifier round-trip on real rows (read-only)', async () => {
      const vendor = await seedVendor('AU14');
      const order = await seedOrder('delivered', { deliveredAt: new Date() });
      await seedPO(order.id, vendor.id, 'confirmed', '120');
      await seedSettlement({ orderId: order.id, vendorId: vendor.id, amount: '120' });

      // Scope to THIS order only — the suite's shared marker prefix would
      // otherwise pull in every other test's delivered orders.
      const data = await loadAuditData(prisma);
      const scoped = {
        orders: data.orders.filter((o) => o.id === order.id),
        settlements: data.settlements.filter((s) => s.orderId === order.id),
      };
      const report = classifySettlementAudit(scoped.orders, scoped.settlements);
      expect(report.gates.pre).toBe(false);
      expect(report.gates.post).toBe(false);
      expect(report.findings).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Helper unit checks
  // ---------------------------------------------------------------------------

  describe('appendNote + Decimal semantics', () => {
    it('appends timestamped entries and preserves prior text', () => {
      const out = appendNote('prior', 'test entry');
      expect(out.startsWith('prior\n[')).toBe(true);
      expect(out).toContain('test entry');
      expect(appendNote(null, 'first')).toMatch(/^\[.*\] first$/);
    });

    it('settlementModule exposes the approved constants', () => {
      expect(settlementModule.FX_TIMEOUT_MS).toBe(10_000);
      expect(settlementModule.STALE_PROCESSING_THRESHOLD_MS).toBe(24 * HOUR);
      expect(settlementModule.VERIFICATION_PERIOD_MS).toBe(72 * HOUR);
      expect(settlementModule.TERMINAL_ORDER_STATUSES).toEqual([
        'delivered',
        'completed',
        'cancelled',
      ]);
    });
  });

  // ---------------------------------------------------------------------------
  // RL — webhook rate limit
  // ---------------------------------------------------------------------------

  describe('webhook rate limit', () => {
    it('RL-1: POST /webhooks/dhl allows 30/min — the 31st forged request is throttled (429)', async () => {
      const Fastify = (await import('fastify')).default;
      const rateLimit = (await import('@fastify/rate-limit')).default;
      const { shipmentRoutes } = await import('../../modules/shipments/shipment.routes');

      const app = Fastify({ logger: false });
      await app.register(rateLimit, {
        max: 100,
        timeWindow: '1 minute',
        redis: null,
      });
      await app.register(shipmentRoutes);

      const codes: number[] = [];
      for (let i = 0; i < 31; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/webhooks/dhl',
          payload: { trackingNumber: `${marker}-RL-${i}` },
        });
        codes.push(res.statusCode);
      }
      expect(codes.slice(0, 30).every((c) => c === 200)).toBe(true);
      expect(codes[30]).toBe(429);
      await app.close();
    });
  });
});
