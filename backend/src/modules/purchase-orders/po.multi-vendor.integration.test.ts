// Step-4 Piece 4b — integration: multi-vendor PO splitting on the real DB.
//
//   A  a 2-productType (box + bag) order in ready_for_routing produces TWO
//      purchase orders, one per group, each recording its productType, with
//      suffixed poNumbers and per-group vendor costs summing to 60% of total.
//   B  the response keeps the legacy singular `purchaseOrder` (first PO).
//   C  a single-productType order keeps the legacy behavior: exactly one PO
//      with a plain (unsuffixed) poNumber.
//
// Email is mocked (sendEmail rethrows under a dummy SMTP config); PDF
// generation and the local-disk file upload run for real.
// Modeled after rbac.test.ts — marker-scoped, child-first cleanup.

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../../lib/prisma';
import {approvalContentHash,approvalBytesHash} from '../orders/approval-snapshot';
import {fileUploadService} from '../../services/file-upload/upload.service';
import { poService } from './po.service';

vi.mock('../../services/email/email.service', () => ({
  emailService: {
    sendEmail: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('multi-vendor PO splitting (poService.createPO)', () => {
  const marker = `MVPO-${Date.now().toString(36)}`;
  const emails: string[] = [];
  const eligibleVendorIds: string[] = [];
  let foreignVendorId: string;
  const vendorDelegate = prisma.vendor as any;
  const originalFindMany = vendorDelegate.findMany.bind(vendorDelegate);
  beforeAll(async () => {
    // A deliberately attractive active vendor outside this suite's eligible
    // fixture set. The real router still scores/query-filters owned vendors.
    const user = await seedUser('VENDOR');
    const foreign = await prisma.vendor.create({data:{userId:user.id,companyName:`${marker} foreign sentinel`,address:'x',city:'y',country:'z',isActive:true,latitude:30,longitude:31,qualityRating:0,averageLeadTime:1}});
    foreignVendorId = foreign.id;
    vendorDelegate.findMany = (args: any = {}) => originalFindMany({...args,where:{AND:[args.where ?? {},{id:{in:eligibleVendorIds}}]}});
  });

  function assertFixtureOwnership(pos: Array<{vendorId:string}>) {
    expect(pos.length).toBeGreaterThan(0);
    for (const po of pos) {
      expect(eligibleVendorIds).toContain(po.vendorId);
      expect(po.vendorId).not.toBe(foreignVendorId);
    }
  }

  async function seedUser(role: 'CUSTOMER' | 'VENDOR'): Promise<any> {
    const email = `${marker.toLowerCase()}-${role.toLowerCase()}-${Math.random()
      .toString(36)
      .slice(2, 7)}@test.local`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'x', role, emailVerified: true },
    });
    emails.push(email);
    return user;
  }

  async function seedVendor(name: string) {
    const user = await seedUser('VENDOR');
    const vendor = await prisma.vendor.create({
      data: {
        userId: user.id,
        companyName: `${marker} ${name}`,
        address: 'x',
        city: 'y',
        country: 'z',
      },
    });
    eligibleVendorIds.push(vendor.id);
    return vendor;
  }

  let orderSeq = 0;

  async function seedOrder(productTypes: string[], status: 'ready_for_routing' = 'ready_for_routing') {
    const user = await seedUser('CUSTOMER');
    const customer = await prisma.customer.create({ data: { userId: user.id } });
    const order = await prisma.order.create({
      data: {
        orderNumber: `${marker}-${++orderSeq}-${productTypes.join('-')}`,
        customerId: customer.id,
        status,
        subtotal: 20,
        tax: 0,
        shippingCost: 0,
        total: 20,
        shippingAddress: { street: '1 Test St', city: 'Cairo', country: 'EG' },
        shippingName: 'MVPO Test',
        shippingPhone: '+200000000',
        items: {
          create: productTypes.map((productType, i) => ({
            productType,
            quantity: i + 2,
            dimensions: { length: 20, width: 30, height: 10, unit: 'cm' },
            unitPrice: '4.00',
            totalPrice: productType === 'box' ? '8.00' : '12.00',
            material: null,
          })),
        },
      },
      include: { items: true },
    });
    // Explicit approved snapshot fixture. Legacy/unbound orders must fail closed.
    const design=await prisma.design.create({data:{orderId:order.id,sessionId:`${marker}-design-${orderSeq}`,ownerId:user.id,designData:{layers:[]}}});
    const bytes=Buffer.from('test-only approved input');const file=await fileUploadService.uploadFile(bytes,'fixture.txt','text/plain','test-approval');
    await prisma.approvalRequest.create({data:{orderId:order.id,designId:design.id,status:'approved',contentHash:approvalContentHash(design),designSnapshot:{designData:design.designData} as any,printFileId:'explicit-fixture',printSha256:approvalBytesHash(bytes),printSnapshotUrl:file.fileUrl,expiresAt:new Date(Date.now()+86400000),approvedAt:new Date()}});
    return order;
  }

  afterAll(async () => {
    vendorDelegate.findMany = originalFindMany;
    // Child-first: POs (cascades handshakes) -> orders -> users (cascades
    // vendors + customers). Marker-scoped so a previously failed run cleans.
    await prisma.purchaseOrder.deleteMany({
      // only the POs this run created: orders under the marker
      where: { order: { orderNumber: { startsWith: marker } } },
    });
    await prisma.design.deleteMany({where:{order:{orderNumber:{startsWith:marker}}}});
    await prisma.order.deleteMany({ where: { orderNumber: { startsWith: marker } } });
    await prisma.user.deleteMany({
      where: { email: { in: emails } },
    });
  });

  it('A: box + bag order splits into two POs, one per group', async () => {
    await seedVendor('A');
    const order = await seedOrder(['box', 'bag']);

    const result = await poService.createPO(order.id);

    assertFixtureOwnership(result.purchaseOrders);
    expect(result.count).toBe(2);
    expect(result.purchaseOrders).toHaveLength(2);
    expect(result.purchaseOrders.map((po: any) => po.productType)).toEqual(['box', 'bag']);

    const poNumbers = result.purchaseOrders.map((po: any) => po.poNumber as string);
    expect(poNumbers[0]).toContain('-BOX-1');
    expect(poNumbers[1]).toContain('-BAG-2');

    // Per-group cost: 60% of each group's subtotal (box: 0.6*8, bag: 0.6*12)
    const costSum = result.purchaseOrders.reduce(
      (sum: number, po: any) => sum + Number(po.vendorCost),
      0
    );
    expect(costSum).toBeCloseTo(12, 2);

    // Both POs persisted under the same order
    const persisted = await prisma.purchaseOrder.findMany({
      where: { orderId: order.id },
    });
    expect(persisted).toHaveLength(2);
  });

  it('B: response bridges the legacy singular as the first PO', async () => {
    await seedVendor('B');
    const order = await seedOrder(['box', 'bag']);

    const result = await poService.createPO(order.id);

    assertFixtureOwnership(result.purchaseOrders);
    expect(result.purchaseOrder).toBeTruthy();
    expect(result.purchaseOrder.poNumber).toBe(result.purchaseOrders[0].poNumber);
  });

  it('C: single-productType order keeps the legacy one-PO behavior', async () => {
    await seedVendor('C');
    const order = await seedOrder(['box']);

    const result = await poService.createPO(order.id);

    assertFixtureOwnership(result.purchaseOrders);
    expect(result.count).toBe(1);
    expect(String(result.purchaseOrders[0].poNumber)).not.toContain('-BOX');
    expect(result.purchaseOrders[0].productType).toBe('box');

    const cost = Number(result.purchaseOrders[0].vendorCost);
    expect(cost).toBeCloseTo(4.8, 2); // 60% of the box group subtotal (8.00)
  });
});
