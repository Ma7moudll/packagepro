import { describe, it, expect, vi, beforeEach } from 'vitest';

// Real order.service getOrder, po.service getPO, prepress controller and export worker guards. Fake: prisma (in
// memory, returns the include shape the services ask for), auth middleware and heavy collaborators.
const db = vi.hoisted(() => ({ users: {} as Record<string, string>, order: null as any, po: null as any, owner: {} as Record<string, string> }));
vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: async ({ where }: any) => (db.users[where.id] ? { id: where.id, role: db.users[where.id] } : null) },
    order: { findUnique: async () => db.order },
    purchaseOrder: { findUnique: async () => db.po },
    vendor: { findUnique: async ({ where }: any) => (where.userId === 'vend1' ? { id: 'V1' } : where.userId === 'vend2' ? { id: 'V2' } : null) },
    design: { findUnique: async () => null },
  },
}));
vi.mock('../../middleware/auth.middleware', () => ({
  authenticate: async (req: any) => { req.user = req.__user; },
  isDesignOwner: async (u: string, d: string) => db.owner[d] === u,
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
vi.mock('bullmq', () => ({ Queue: class {}, Worker: class {}, Job: class {} }));
vi.mock('ioredis', () => ({ Redis: class {} }));

import { orderService } from './order.service';
import { vendorOrderView } from './vendor-order-view';
import { poService } from '../purchase-orders/po.service';
import { prePressController } from '../prepress/prepress.controller';
import { assertExportRequester, canSeeExportJob } from '../../workers/export-queue/export.worker';
import { prePressCheckService } from '../../services/pre-press-checker/prepress.service';

const fullOrder = () => ({
  id: 'O1', status: 'IN_PRODUCTION', shippingEmail: 'ship@x.y', currency: 'EGP',
  items: [{ id: 'i1', designId: 'D1' }],
  design: { id: 'D1', designData: { secret: 'layers' }, files: [{ id: 'f1', fileName: 'art.png', fileUrl: 'https://cdn/art.png', metadata: { m: 1 } }] },
  approvalRequests: [{ id: 'a1', status: 'approved', contentHash: 'h', proofUrl: 'https://cdn/proof.png', proofFileId: 'f1' }],
  customer: { id: 'C1', userId: 'cust1', user: { id: 'cust1', email: 'c@x.y', firstName: 'A', lastName: 'B' } },
  purchaseOrders: [{ id: 'P1', vendorId: 'V1', printFileUrl: 'https://cdn/print.pdf', dielineFileUrl: 'https://cdn/die.pdf', vendor: { userId: 'vend1' } }],
  shipment: null,
  payment: { status: 'PAID', amount: 100 },
  settlements: [{ id: 's1', amount: 10 }],
  reviews: [{ id: 'r1', rating: 5 }],
});

beforeEach(() => {
  db.users = { admin1: 'ADMIN', cust1: 'CUSTOMER', cust2: 'CUSTOMER', vend1: 'VENDOR', vend2: 'VENDOR' };
  db.order = fullOrder();
  db.owner = { D1: 'cust1' };
  const o = fullOrder();
  db.po = { id: 'P1', vendorId: 'V1', printFileUrl: 'https://cdn/print.pdf', dielineFileUrl: 'https://cdn/die.pdf', order: { ...o, payment: undefined }, vendor: { id: 'V1' }, handshake: null, production: { id: 'pr1' } };
});

describe('getOrder by caller', () => {
  it('customer and admin keep the full order', async () => {
    for (const u of ['cust1', 'admin1']) {
      const o = await orderService.getOrder('O1', u);
      expect(o.design.files[0].fileUrl).toBe('https://cdn/art.png');
      expect(o.currentApprovalRequest.proofUrl).toBe('https://cdn/proof.png');
      expect(o.customer.user.email).toBe('c@x.y');
      expect(o.payment).toBeTruthy();
      expect(o.settlements).toHaveLength(1);
      expect(o.reviews).toHaveLength(1);
    }
  });
  it('a vendor with a PO sees the order and its PO files, not the design side', async () => {
    const o = await orderService.getOrder('O1', 'vend1');
    expect(o.id).toBe('O1');
    expect(o.status).toBe('IN_PRODUCTION');
    expect(o.shippingEmail).toBe('ship@x.y');
    expect(o.items).toHaveLength(1);
    expect(o.purchaseOrders[0].printFileUrl).toBe('https://cdn/print.pdf');
    expect(o.purchaseOrders[0].dielineFileUrl).toBe('https://cdn/die.pdf');
    for (const k of ['design', 'currentApprovalRequest', 'customer', 'payment', 'settlements', 'reviews', 'paymentStatus']) expect(o, k).not.toHaveProperty(k);
    const wire = JSON.stringify(o);
    for (const s of ['art.png', 'proof.png', 'c@x.y', 'layers', 'cust1']) expect(wire).not.toContain(s);
  });
  it('a vendor sees only its own POs, not another vendor\'s PO or vendor row', async () => {
    db.order.purchaseOrders.push({ id: 'P2', vendorId: 'V2', printFileUrl: 'https://cdn/other.pdf', vendor: { userId: 'vend2', email: 'v2@x.y' } });
    const o = await orderService.getOrder('O1', 'vend1');
    expect(o.purchaseOrders.map((p: any) => p.id)).toEqual(['P1']);
    expect(o.purchaseOrder.id).toBe('P1');
    expect(JSON.stringify(o)).not.toContain('other.pdf');
    expect(JSON.stringify(o)).not.toContain('v2@x.y');
    const o2 = await orderService.getOrder('O1', 'vend2');
    expect(o2.purchaseOrders.map((p: any) => p.id)).toEqual(['P2']);
    const adm = await orderService.getOrder('O1', 'admin1');
    expect(adm.purchaseOrders).toHaveLength(2);
    const cust = await orderService.getOrder('O1', 'cust1');
    expect(cust.purchaseOrders).toHaveLength(2);
  });
  it('a stranger still gets Access denied', async () => {
    await expect(orderService.getOrder('O1', 'vend2')).rejects.toThrow('Access denied');
    await expect(orderService.getOrder('O1', 'cust2')).rejects.toThrow('Access denied');
  });
});

describe('getPO', () => {
  it('owning vendor gets PO files but no design', async () => {
    const po = await poService.getPO('P1', { userId: 'vend1', role: 'VENDOR' as any });
    expect(po.printFileUrl).toBe('https://cdn/print.pdf');
    expect(po.order).not.toHaveProperty('design');
    expect(JSON.stringify(po)).not.toContain('art.png');
    expect(JSON.stringify(po)).not.toContain('c@x.y');
  });
  it('other vendor is refused; admin keeps the design', async () => {
    await expect(poService.getPO('P1', { userId: 'vend2', role: 'VENDOR' as any })).rejects.toThrow('do not own');
    const po = await poService.getPO('P1', { userId: 'admin1', role: 'ADMIN' as any });
    expect(po.order.design.files[0].fileUrl).toBe('https://cdn/art.png');
  });
});

describe('pre-press check and results', () => {
  const call = (m: 'checkOrder' | 'getResults', userId: string) => {
    const reply: any = { send: vi.fn((x: any) => x), status: () => reply };
    return prePressController[m]({ __user: { userId, role: 'ADMIN' }, params: { id: 'O1' } } as any, reply);
  };
  beforeEach(() => vi.mocked(prePressCheckService.checkOrderDesign).mockClear());
  it('customer and admin pass', async () => {
    await call('checkOrder', 'cust1');
    await call('getResults', 'admin1');
    expect(prePressCheckService.checkOrderDesign).toHaveBeenCalledTimes(1);
  });
  it('a vendor with a PO is refused before any check runs, even with an ADMIN token claim', async () => {
    await expect(call('checkOrder', 'vend1')).rejects.toThrow('Access denied');
    await expect(call('getResults', 'vend1')).rejects.toThrow('Access denied');
    expect(prePressCheckService.checkOrderDesign).not.toHaveBeenCalled();
  });
  it('a stranger is refused', async () => {
    await expect(call('checkOrder', 'cust2')).rejects.toThrow('Access denied');
  });
});

describe('export worker guards', () => {
  it('owner and admin may export; others and a missing requester are refused', async () => {
    await expect(assertExportRequester({ designId: 'D1', requestedBy: 'cust1' })).resolves.toBeUndefined();
    await expect(assertExportRequester({ designId: 'D1', requestedBy: 'admin1' })).resolves.toBeUndefined();
    await expect(assertExportRequester({ designId: 'D1', requestedBy: 'cust2' })).rejects.toThrow();
    await expect(assertExportRequester({ designId: 'D1', requestedBy: 'vend1' })).rejects.toThrow();
    await expect(assertExportRequester({ designId: 'D1' })).rejects.toThrow('no requester');
  });
  it('job status is visible to the requester and admins only', async () => {
    expect(await canSeeExportJob({ requestedBy: 'cust1' }, 'cust1')).toBe(true);
    expect(await canSeeExportJob({ requestedBy: 'cust1' }, 'admin1')).toBe(true);
    expect(await canSeeExportJob({ requestedBy: 'cust1' }, 'cust2')).toBe(false);
    expect(await canSeeExportJob({ requestedBy: 'cust1' }, undefined)).toBe(false);
    expect(await canSeeExportJob({}, 'cust2')).toBe(false);
  });
});

describe('vendorOrderView', () => {
  it('does not mutate its input and leaves other fields', () => {
    const o = fullOrder();
    const v = vendorOrderView(o);
    expect(o.design).toBeTruthy();
    expect(v.shippingEmail).toBe('ship@x.y');
    expect(v).not.toHaveProperty('design');
  });
});
