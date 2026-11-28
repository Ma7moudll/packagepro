import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// HTTP level: real routes, controllers, services, auth middleware and error handler. Fake: prisma (in memory),
// the JWT verifier (token = userId:ROLE; the role in the token is only a claim) and heavy collaborators.
const db = vi.hoisted(() => ({ users: {} as Record<string, string>, order: null as any, po: null as any, owners: {} as Record<string, string> }));
vi.mock('../../lib/redis', () => ({ getRedisClient: () => null }));
vi.mock('../auth/services/jwt.service', () => ({
  jwtService: { verifyAccessToken: (t: string) => { const [userId, role] = t.split(':'); if (!role) throw new Error('bad token'); return { userId, role, email: 'x@y.z' }; } },
}));
vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: async ({ where }: any) => (db.users[where.id] ? { id: where.id, role: db.users[where.id] } : null) },
    order: { findUnique: async () => db.order },
    purchaseOrder: { findUnique: async () => db.po },
    vendor: { findUnique: async ({ where }: any) => (where.userId === 'vend1' ? { id: 'V1' } : where.userId === 'vend2' ? { id: 'V2' } : null) },
  },
}));
vi.mock('../../services/pricing-engine/pricing.service', () => ({ pricingService: {} }));
vi.mock('../notifications/notifications.service', () => ({ notificationService: {} }));
vi.mock('../../services/file-upload/upload.service', () => ({ fileUploadService: {} }));
vi.mock('../../services/email/email.service', () => ({ emailService: {} }));
vi.mock('../../services/vendor-router/router.service', () => ({ vendorRouterService: {} }));
vi.mock('../handshakes/handshake.service', () => ({ handshakeService: {} }));
vi.mock('../settlements/settlement.service', () => ({ settleVendorForDeliveredOrder: async () => ({}) }));
vi.mock('./po-generator', () => ({ poGenerator: {} }));
vi.mock('./approval.service', () => ({ approvalService: {} }));
vi.mock('../../services/pre-press-checker/prepress.service', () => ({ prePressCheckService: { checkOrderDesign: vi.fn(async () => ({ ok: true })), getPrePressResults: vi.fn(async () => ({ r: 1 })) } }));

import { orderRoutes } from './order.routes';
import { poRoutes } from '../purchase-orders/po.routes';
import { prePressRoutes } from '../prepress/prepress.routes';
import { httpErrorHandler } from '../../utils/http-error-handler';
import { prePressCheckService } from '../../services/pre-press-checker/prepress.service';

const CUST = 'cust1:CUSTOMER', ADMIN = 'admin1:ADMIN', V1 = 'vend1:VENDOR', V2 = 'vend2:VENDOR', OTHER = 'cust2:CUSTOMER';
const STALE_ADMIN_CLAIM = 'vend2:ADMIN'; // DB says VENDOR (a demoted account's old token)

const fullOrder = () => ({
  id: 'O1', orderNumber: 'N-1', status: 'IN_PRODUCTION', currency: 'EGP', notes: 'handle with care',
  subtotal: '1000.00', tax: '140.00', shippingCost: '60.00', total: '1200.00', metadata: { shippingBreakdown: { x: 1 }, internal: 'META-SECRET' },
  shippingName: 'Recipient', shippingPhone: '+20100', shippingEmail: 'ship@x.y',
  shippingAddress: { name: 'Recipient', phone: '+20100', email: 'ship@x.y', street: '1 Main', city: 'Cairo', postalCode: '11', country: 'EG', accountEmail: 'acct@x.y', internalFlag: 'ADDR-SECRET' },
  createdAt: 'c', updatedAt: 'u', approvedAt: null, shippedAt: null, deliveredAt: null, completedAt: null, customerId: 'C1',
  items: [{ id: 'i1', orderId: 'O1', productType: 'box', quantity: 100, dimensions: { length: 1, width: 2, unit: 'cm' }, material: 'kraft', color: null, finish: null, productId: 'p', variantId: null, sku: 's', config: { a: 'b' }, designId: 'D1', unitPrice: '10.00', totalPrice: '1000.00' }],
  design: { id: 'D1', designData: { secret: 'LAYERS' }, files: [{ id: 'f1', fileName: 'art.png', fileUrl: 'https://cdn/art.png' }] },
  approvalRequests: [{ id: 'a1', status: 'approved', proofUrl: 'https://cdn/proof.png', contentHash: 'h' }],
  customer: { id: 'C1', userId: 'cust1', user: { id: 'cust1', email: 'acct@x.y', firstName: 'A', lastName: 'B' } },
  purchaseOrders: [
    { id: 'P1', vendorId: 'V1', vendorCost: '700.00', printFileUrl: 'https://cdn/print.pdf', dielineFileUrl: 'https://cdn/die.pdf', vendor: { id: 'V1', userId: 'vend1', companyName: 'One' } },
    { id: 'P2', vendorId: 'V2', vendorCost: '650.00', printFileUrl: 'https://cdn/other.pdf', dielineFileUrl: null, vendor: { id: 'V2', userId: 'vend2', email: 'v2@x.y', companyName: 'Two' } },
  ],
  shipment: { id: 'sh1', orderId: 'O1', status: 'created', dhlTrackingNumber: 'TRK1', labelUrl: 'https://cdn/label.pdf', podSignature: 'SIG', shippingMethod: 'standard', estimatedDeliveryDate: null, actualDeliveryDate: null },
  payment: { status: 'PAID', amount: '1200.00' },
  settlements: [{ id: 's1', amount: '10.00' }],
  reviews: [{ id: 'r1', rating: 5 }],
});

const get = async (token: string | undefined, url: string, method: 'GET' | 'POST' = 'GET') => {
  const a = Fastify(); a.setErrorHandler(httpErrorHandler);
  await a.register(orderRoutes, { prefix: '/api' }); await a.register(poRoutes, { prefix: '/api' }); await a.register(prePressRoutes, { prefix: '/api' });
  const r = await a.inject({ method, url: `/api${url}`, headers: token ? { authorization: `Bearer ${token}` } : {} });
  let body: any = null; try { body = r.json(); } catch { /* not json */ }
  return { status: r.statusCode, body, text: r.body };
};

const ORDER_KEYS = ['approvedAt', 'completedAt', 'createdAt', 'currency', 'deliveredAt', 'id', 'items', 'notes', 'orderNumber', 'purchaseOrder', 'purchaseOrders', 'shipment', 'shippedAt', 'shippingAddress', 'shippingEmail', 'shippingName', 'shippingPhone', 'status', 'trackingNumber', 'updatedAt'];
const FORBIDDEN = ['LAYERS', 'art.png', 'proof.png', 'acct@x.y', 'META-SECRET', 'ADDR-SECRET', 'other.pdf', 'v2@x.y', 'label.pdf', 'SIG', '1000.00', '140.00', '60.00', '1200.00', '650.00', 'cust1', 'PAID'];

beforeEach(() => {
  db.users = { admin1: 'ADMIN', cust1: 'CUSTOMER', cust2: 'CUSTOMER', vend1: 'VENDOR', vend2: 'VENDOR' };
  db.order = fullOrder();
  db.po = { id: 'P1', vendorId: 'V1', vendorCost: '700.00', printFileUrl: 'https://cdn/print.pdf', dielineFileUrl: 'https://cdn/die.pdf', order: { ...fullOrder(), purchaseOrders: undefined, payment: undefined }, vendor: { id: 'V1' }, handshake: null, production: { id: 'pr1' } };
  vi.mocked(prePressCheckService.checkOrderDesign).mockClear();
  vi.mocked(prePressCheckService.getPrePressResults).mockClear();
});

describe('GET /orders/:id', () => {
  it('no token is 401; a stranger customer and a vendor without a PO are refused with no order data', async () => {
    expect((await get(undefined, '/orders/O1')).status).toBe(401);
    db.order.purchaseOrders = [db.order.purchaseOrders[0]];
    for (const tok of [OTHER, V2]) {
      const r = await get(tok, '/orders/O1');
      expect(r.status, tok).toBe(400);
      for (const n of ['1200.00', 'Recipient', 'art.png', 'N-1']) expect(r.text).not.toContain(n);
    }
  });
  it('a vendor gets exactly the allow-listed keys, only its own PO, limited address fields, and none of the customer money or design', async () => {
    const r = await get(V1, '/orders/O1');
    expect(r.status).toBe(200);
    const o = r.body.data;
    expect(Object.keys(o).sort()).toEqual(ORDER_KEYS);
    expect(o.purchaseOrders.map((p: any) => p.id)).toEqual(['P1']);
    expect(o.purchaseOrders[0].vendorCost).toBe('700.00');
    expect(o.purchaseOrders[0].printFileUrl).toBe('https://cdn/print.pdf');
    expect(o.purchaseOrders[0].dielineFileUrl).toBe('https://cdn/die.pdf');
    expect(Object.keys(o.shippingAddress).sort()).toEqual(['city', 'country', 'email', 'name', 'phone', 'postalCode', 'street']);
    expect(o.items[0]).not.toHaveProperty('unitPrice');
    expect(o.items[0]).not.toHaveProperty('totalPrice');
    expect(o.items[0]).not.toHaveProperty('designId');
    expect(Object.keys(o.shipment).sort()).toEqual(['actualDeliveryDate', 'dhlTrackingNumber', 'estimatedDeliveryDate', 'id', 'orderId', 'shippingMethod', 'status']);
    expect(o.trackingNumber).toBe('TRK1');
    for (const n of FORBIDDEN) expect(r.text, n).not.toContain(n);
  });
  it('a vendor on a PO sees only its own PO (the other vendor gets the mirror image)', async () => {
    const o = (await get(V2, '/orders/O1')).body.data;
    expect(o.purchaseOrders.map((p: any) => p.id)).toEqual(['P2']);
    expect((await get(V2, '/orders/O1')).text).not.toContain('print.pdf');
  });
  it('customer and admin keep the full order', async () => {
    for (const tok of [CUST, ADMIN]) {
      const o = (await get(tok, '/orders/O1')).body.data;
      expect(o.total).toBe('1200.00');
      expect(o.design.files[0].fileUrl).toBe('https://cdn/art.png');
      expect(o.purchaseOrders).toHaveLength(2);
    }
  });
  it('a stale ADMIN claim in a vendor token does not widen the view (role is read from the database)', async () => {
    const o = (await get(STALE_ADMIN_CLAIM, '/orders/O1')).body.data;
    expect(Object.keys(o).sort()).toEqual(ORDER_KEYS);
    expect(o.purchaseOrders.map((p: any) => p.id)).toEqual(['P2']);
  });
});

describe('GET /purchase-orders/:id', () => {
  it('the owning vendor gets the PO and an allow-listed order, no customer money or design', async () => {
    const r = await get(V1, '/purchase-orders/P1');
    expect(r.status).toBe(200);
    const po = r.body.data;
    expect(po.vendorCost).toBe('700.00');
    expect(po.printFileUrl).toBe('https://cdn/print.pdf');
    expect(Object.keys(po.order).sort()).toEqual(['approvedAt', 'completedAt', 'createdAt', 'currency', 'deliveredAt', 'id', 'items', 'notes', 'orderNumber', 'shipment', 'shippedAt', 'shippingAddress', 'shippingEmail', 'shippingName', 'shippingPhone', 'status', 'updatedAt']);
    for (const n of ['LAYERS', 'art.png', 'proof.png', 'acct@x.y', 'META-SECRET', 'ADDR-SECRET', '1000.00', '1200.00', '140.00']) expect(r.text, n).not.toContain(n);
  });
  it('another vendor, a customer and a stale ADMIN claim are refused by the backend; no token is 401', async () => {
    expect((await get(undefined, '/purchase-orders/P1')).status).toBe(401);
    for (const tok of [V2, CUST, STALE_ADMIN_CLAIM]) {
      const r = await get(tok, '/purchase-orders/P1');
      expect(r.status, tok).toBe(403);
      for (const n of ['700.00', 'print.pdf', 'Recipient']) expect(r.text).not.toContain(n);
    }
  });
  it('admin keeps the full PO', async () => {
    const po = (await get(ADMIN, '/purchase-orders/P1')).body.data;
    expect(po.order.design.files[0].fileUrl).toBe('https://cdn/art.png');
  });
});

describe('pre-press routes', () => {
  const routes = [['POST', '/orders/O1/prepress-check'], ['GET', '/orders/O1/prepress-results']] as const;
  it('a vendor with a PO, another vendor and a stranger are refused and no check or read runs; no token is 401', async () => {
    for (const [m, u] of routes) {
      expect((await get(undefined, u, m)).status).toBe(401);
      for (const tok of [V1, V2, OTHER, STALE_ADMIN_CLAIM]) expect((await get(tok, u, m)).status, `${m} ${tok}`).toBe(400);
    }
    expect(prePressCheckService.checkOrderDesign).not.toHaveBeenCalled();
    expect(prePressCheckService.getPrePressResults).not.toHaveBeenCalled();
  });
  it('the order customer and an admin pass', async () => {
    expect((await get(CUST, routes[0][1], 'POST')).status).toBe(200);
    expect((await get(ADMIN, routes[1][1], 'GET')).status).toBe(200);
    expect(prePressCheckService.checkOrderDesign).toHaveBeenCalledTimes(1);
  });
});
