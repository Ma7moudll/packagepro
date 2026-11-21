import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { prisma } from '../../lib/prisma';
import { jwtService } from '../auth/services/jwt.service';
import { shipmentService } from '../shipments/shipment.service';
import { approvalService } from '../orders/approval.service';
import { poService } from '../purchase-orders/po.service';
import { stripeService } from '../../integrations/stripe/stripe.service';
import { dhlService } from '../../integrations/dhl/dhl.service';
import { emailService } from '../../services/email/email.service';
import { proofGeneratorService } from '../../services/pre-press-checker/proof-generator';

const stripeState = vi.hoisted(() => ({ intent: {} as any, creates: [] as any[] }));
vi.mock('stripe', () => ({ default: class {
  paymentIntents = {
    retrieve: vi.fn(async () => stripeState.intent),
    create: vi.fn(async (data: any, options: any) => {
      stripeState.creates.push({ data, options });
      return { id: `pi_security_${Date.now()}`, client_secret: 'not-a-real-secret', ...data };
    }),
  };
} }));
vi.mock('../../services/email/email.service', () => ({
  emailService: { sendEmail: vi.fn(async () => {}), sendApprovalRequest: vi.fn(async () => {}) },
}));
vi.mock('../../services/pre-press-checker/proof-generator', () => ({
  proofGeneratorService: { generateProof: vi.fn(async () => ({ approvalToken: 'test-proof' })) },
}));

// Real PostgreSQL constraints and real JWT authentication. Stripe, carrier and
// outbound email are test doubles: these tests cannot charge or message anyone.
describe('security report regressions, real database', () => {
  const app = Fastify();
  const marker = `security-${Date.now()}`;
  const ids: string[] = [];
  let seq = 0;
  const admin = { userId: 'test-admin', role: 'ADMIN' };
  let owner: any, stranger: any;

  beforeAll(async () => {
    const { paymentRoutes } = await import('./payment.routes');
    const { shipmentRoutes } = await import('../shipments/shipment.routes');
    const { approvalRoutes } = await import('../orders/order.routes');
    const { poRoutes } = await import('../purchase-orders/po.routes');
    app.setErrorHandler((err: any, _req, reply) => reply.status(err.statusCode || 500).send({ error: err.message }));
    await app.register(paymentRoutes, { prefix: '/api' });
    await app.register(shipmentRoutes, { prefix: '/api' });
    await app.register(approvalRoutes, { prefix: '/api' });
    await app.register(poRoutes, { prefix: '/api' });
    await app.ready();
    for (const label of ['owner', 'stranger']) {
      const user = await prisma.user.create({ data: { email: `${marker}-${label}@test.local`, passwordHash: 'unused', role: 'CUSTOMER', emailVerified: true } });
      ids.push(user.id);
      const customer = await prisma.customer.create({ data: { userId: user.id } });
      const actor = { ...user, userId: user.id, customerId: customer.id };
      if (label === 'owner') owner = actor; else stranger = actor;
    }
  });
  afterAll(async () => {
    await app.close();
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.purchaseOrder.deleteMany({ where: { order: { customerId: owner.customerId } } });
    await prisma.order.deleteMany({ where: { customerId: owner.customerId } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  });
  beforeEach(() => {
    vi.clearAllMocks(); stripeState.creates.length = 0;
    process.env.DEFAULT_CURRENCY = 'usd';
    vi.spyOn(dhlService, 'createShipment').mockResolvedValue({ trackingNumber: `${marker}-${++seq}`, labelUrl: 'https://example.invalid/label', estimatedDeliveryDate: new Date() } as any);
    vi.spyOn(dhlService, 'trackShipment').mockResolvedValue({ events: [] } as any);
  });
  async function order(status: any = 'pending_review') {
    return prisma.order.create({ data: { orderNumber: `${marker}-${++seq}`, customerId: owner.customerId, status, subtotal: 20, total: 20, tax: 0, shippingCost: 0, shippingAddress: {}, shippingName: 'Private Test', shippingPhone: 'test-only' } });
  }
  async function paid(status: any = 'pending_review') {
    const o = await order(status);
    const p = await prisma.payment.create({ data: { orderId: o.id, amount: 20, currency: 'USD', stripePaymentIntentId: `${marker}-${++seq}`, status: status === 'awaiting_approval' ? 'captured' : 'pending' } });
    stripeState.intent = { id: p.stripePaymentIntentId, status: 'succeeded', amount: 2000, amount_received: 2000, currency: 'usd', metadata: { orderId: o.id } };
    return { o, p };
  }
  const headers = (actor: any) => ({ authorization: `Bearer ${jwtService.generateAccessToken(actor.userId, actor.email || 'admin@test.local', actor.role)}` });
  it('manual confirmation rejects another customer before querying Stripe or changing state', async () => {
    const { o, p } = await paid();
    const res = await app.inject({ method: 'POST', url: '/api/payments/confirm', headers: headers(stranger), payload: { paymentIntentId: p.stripePaymentIntentId } });
    expect(res.statusCode).toBe(403);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('pending_review');
  });
  it('owner can confirm a matching captured payment', async () => {
    const { o, p } = await paid();
    const res = await app.inject({ method: 'POST', url: '/api/payments/confirm', headers: headers(owner), payload: { paymentIntentId: p.stripePaymentIntentId } });
    expect(res.statusCode).toBe(200);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('awaiting_approval');
  });
  it.each(['amount', 'amount_received', 'currency', 'metadata'])('mismatched Stripe %s blocks confirmation and state changes', async field => {
    const { o, p } = await paid();
    stripeState.intent[field] = field === 'currency' ? 'egp' : field === 'metadata' ? { orderId: 'unrelated' } : 1;
    await expect(stripeService.confirmPayment(p.stripePaymentIntentId!)).rejects.toThrow('does not match');
    expect((await prisma.order.findUniqueOrThrow({ where: { id: o.id } })).status).toBe('pending_review');
  });
  it('mismatched local payment amount blocks confirmation', async () => {
    const { p } = await paid();
    await prisma.payment.update({ where: { id: p.id }, data: { amount: 1 } });
    await expect(stripeService.confirmPayment(p.stripePaymentIntentId!)).rejects.toThrow('does not match');
  });
  it('creation ignores malicious amount/currency and uses stable provider idempotency', async () => {
    const o = await order();
    process.env.DEFAULT_CURRENCY = 'egp';
    await stripeService.createPaymentIntent({ orderId: o.id, amount: 0.01, currency: 'usd' });
    expect(stripeState.creates[0].data.amount).toBe(2000);
    expect(stripeState.creates[0].data.currency).toBe('egp');
    expect(stripeState.creates[0].options.idempotencyKey).toContain(o.id);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { orderId: o.id } });
    expect(Number(payment.amount)).toBe(20); expect(payment.currency).toBe('egp');
  });
  it('HTTP creation ignores client currency', async () => {
    const o = await order();
    const res = await app.inject({ method: 'POST', url: '/api/payments/create-intent', headers: headers(owner), payload: { orderId: o.id, currency: 'jpy' } });
    expect(res.statusCode, res.body).toBe(200); expect(stripeState.creates[0].data.currency).toBe('usd');
  });
  it.each(['CUSTOMER', 'VENDOR'])('non-admin %s cannot purchase a shipment label', async role => {
    const o = await order('ready_to_ship');
    await expect(shipmentService.createShipment(o.id, { userId: owner.userId, role })).rejects.toMatchObject({ statusCode: 403 });
    expect(dhlService.createShipment).not.toHaveBeenCalled();
  });
  it('concurrent shipment requests produce one carrier call and one database row', async () => {
    const o = await order('ready_to_ship');
    const results = await Promise.allSettled([shipmentService.createShipment(o.id, admin), shipmentService.createShipment(o.id, admin)]);
    expect(results.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect(dhlService.createShipment).toHaveBeenCalledTimes(1);
    expect(await prisma.shipment.count({ where: { orderId: o.id } })).toBe(1);
  });
  it('ambiguous carrier error retains reservation and refuses blind retry', async () => {
    const o = await order('ready_to_ship');
    vi.mocked(dhlService.createShipment).mockRejectedValueOnce(new Error('timeout'));
    await expect(shipmentService.createShipment(o.id, admin)).rejects.toThrow('timeout');
    await expect(shipmentService.createShipment(o.id, admin)).rejects.toThrow('already exists');
    expect(dhlService.createShipment).toHaveBeenCalledTimes(1);
    expect((await prisma.shipment.findUniqueOrThrow({ where: { orderId: o.id } })).status).toBe('failed');
  });
  it('shipment reads require customer ownership or admin and refuse before carrier lookup', async () => {
    const o = await order();
    const s = await prisma.shipment.create({ data: { orderId: o.id, dhlTrackingNumber: `${marker}-${++seq}` } });
    await expect(shipmentService.getTracking(s.id, stranger)).rejects.toMatchObject({ statusCode: 403 });
    await expect(shipmentService.getShipmentByOrder(o.id, stranger)).rejects.toMatchObject({ statusCode: 403 });
    expect(dhlService.trackShipment).not.toHaveBeenCalled();
    expect((await shipmentService.getShipmentByOrder(o.id, owner)).id).toBe(s.id);
    expect((await shipmentService.getShipmentByOrder(o.id, admin)).id).toBe(s.id);
  });
  it('HTTP shipment authorization rejects anonymous/non-admin creation and foreign reads', async () => {
    const o=await order('ready_to_ship');
    const s=await prisma.shipment.create({data:{orderId:o.id,dhlTrackingNumber:`${marker}-${++seq}`}});
    expect((await app.inject({method:'POST',url:`/api/shipments/create/${o.id}`})).statusCode).toBe(401);
    expect((await app.inject({method:'POST',url:`/api/shipments/create/${o.id}`,headers:headers(owner)})).statusCode).toBe(403);
    for (const url of [`/api/shipments/${s.id}/tracking`,`/api/orders/${o.id}/shipment`]) {
      expect((await app.inject({method:'GET',url,headers:headers(stranger)})).statusCode).toBe(403);
    }
    expect(dhlService.createShipment).not.toHaveBeenCalled();
    expect(dhlService.trackShipment).not.toHaveBeenCalled();
    expect((await app.inject({method:'GET',url:`/api/orders/${o.id}/shipment`,headers:headers(owner)})).statusCode).toBe(200);
  });
  it('anonymous approval request is rejected', async () => {
    const o = await order();
    const res = await app.inject({ method: 'POST', url: `/api/orders/${o.id}/request-approval` });
    expect(res.statusCode).toBe(401); expect(proofGeneratorService.generateProof).not.toHaveBeenCalled();
  });
  it('customer approval request is rejected before proof or email', async () => {
    const o = await order();
    const res = await app.inject({ method: 'POST', url: `/api/orders/${o.id}/request-approval`, headers: headers(owner) });
    expect(res.statusCode).toBe(403); expect(proofGeneratorService.generateProof).not.toHaveBeenCalled();
  });
  it('canceled order approval cannot progress even for admin', async () => {
    const o = await order('cancelled');
    await expect(approvalService.requestApproval(o.id, admin)).rejects.toMatchObject({ statusCode: 400 });
    expect(emailService.sendApprovalRequest).not.toHaveBeenCalled();
  });
  it('failed proof/token persistence cannot send approval email and retains duplicate claim', async () => {
    const o=await order();
    vi.mocked(proofGeneratorService.generateProof).mockRejectedValueOnce(new Error('durable token storage unavailable'));
    await expect(approvalService.requestApproval(o.id,admin)).rejects.toThrow('durable token storage unavailable');
    expect(emailService.sendApprovalRequest).not.toHaveBeenCalled();
    await expect(approvalService.requestApproval(o.id,admin)).rejects.toMatchObject({statusCode:409});
    expect(proofGeneratorService.generateProof).toHaveBeenCalledTimes(1);
  });
  it('concurrent admin approval requests send at most one proof/email', async () => {
    const { o } = await paid('awaiting_approval');
    const results = await Promise.allSettled([approvalService.requestApproval(o.id, admin), approvalService.requestApproval(o.id, admin)]);
    expect(results.filter(x => x.status === 'fulfilled')).toHaveLength(1);
    expect(proofGeneratorService.generateProof).toHaveBeenCalledTimes(1);
    expect(emailService.sendApprovalRequest).toHaveBeenCalledTimes(1);
  });
  it('PO reads reject customers and unrelated vendors, allow owning vendor and admin', async () => {
    const vu = await prisma.user.create({ data: { email: `${marker}-vendor@test.local`, passwordHash: 'unused', role: 'VENDOR' } }); ids.push(vu.id);
    const vendor = await prisma.vendor.create({ data: { userId: vu.id, companyName: 'Test', address: 'Test', city: 'Cairo', country: 'EG', phone: 'test', postalCode: 'test' } as any });
    const o = await order();
    const po = await prisma.purchaseOrder.create({ data: { orderId: o.id, vendorId: vendor.id, poNumber: `${marker}-po`, vendorCost: 1 } });
    await expect(poService.getPO(po.id, owner)).rejects.toMatchObject({ statusCode: 403 });
    await expect(poService.getPO(po.id, { userId: stranger.userId, role: 'VENDOR' })).rejects.toMatchObject({ statusCode: 403 });
    expect((await poService.getPO(po.id, { userId: vu.id, role: 'VENDOR' })).id).toBe(po.id);
    expect((await poService.getPO(po.id, admin as any)).id).toBe(po.id);
    const url=`/api/purchase-orders/${po.id}`;
    expect((await app.inject({method:'GET',url})).statusCode).toBe(401);
    for(const actor of [owner,{userId:stranger.userId,role:'VENDOR'}]) expect((await app.inject({method:'GET',url,headers:headers(actor)})).statusCode).toBe(403);
    for(const actor of [{...vu,userId:vu.id},admin]) expect((await app.inject({method:'GET',url,headers:headers(actor)})).statusCode).toBe(200);
  });
});
