// Step-4 Piece 4a — integration: multi-vendor PurchaseOrder schema.
//
//   A  one order accepts SEVERAL PurchaseOrders (one per vendor item-group) —
//      the `purchase_orders.orderId` unique constraint is gone (migration
//      spec029_multi_vendor_pos).
//   B  the serialized order payload keeps the legacy singular `purchaseOrder`
//      (first PO) so existing consumers keep working during the transition.
//
// Modeled after rbac.test.ts: real DB rows, marker-scoped cleanup, child-first.

import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { serializeOrder } from './order.service';

describe('multi-vendor PurchaseOrder schema', () => {
  const marker = `MPO-${Date.now().toString(36)}`;
  const emails: string[] = [];

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

  afterAll(async () => {
    // Child-first, marker-scoped (idempotent after a previously failed run).
    await prisma.settlement.deleteMany({
      where: { order: { orderNumber: { startsWith: marker } } },
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
    await prisma.vendor.deleteMany({
      where: { id: { in: vendors.map((v) => v.id) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: vendors.map((v) => v.userId) }, email: { contains: '@test.local' } },
    });
  });

  it('A: one order accepts two PurchaseOrders from two vendors', async () => {
    const customerUser = await seedUser('CUSTOMER');
    const customer = await prisma.customer.create({ data: { userId: customerUser.id } });
    const [vendorA, vendorB] = await Promise.all([seedVendor('A'), seedVendor('B')]);

    const order = await prisma.order.create({
      data: {
        orderNumber: `${marker}-ORDER`,
        customerId: customer.id,
        status: 'in_production',
        subtotal: 20,
        tax: 0,
        shippingCost: 0,
        total: 20,
        shippingAddress: { street: '1 Test St', city: 'Cairo', country: 'EG' },
        shippingName: 'MPO Test',
        shippingPhone: '+200000000',
      },
    });

    await Promise.all([
      prisma.purchaseOrder.create({
        data: {
          orderId: order.id,
          vendorId: vendorA.id,
          poNumber: `${marker}-PO-A`,
          status: 'confirmed',
          vendorCost: 7,
        },
      }),
      prisma.purchaseOrder.create({
        data: {
          orderId: order.id,
          vendorId: vendorB.id,
          poNumber: `${marker}-PO-B`,
          status: 'pending',
          vendorCost: 5,
        },
      }),
    ]);

    const fetched = await prisma.order.findUnique({
      where: { id: order.id },
      include: { purchaseOrders: true },
    });

    expect(fetched?.purchaseOrders).toHaveLength(2);
    expect(fetched!.purchaseOrders.map((po) => po.vendorId).sort()).toEqual(
      [vendorA.id, vendorB.id].sort()
    );
  });

  it('B: serialized order exposes the legacy singular as the FIRST PO', () => {
    const raw = {
      id: 'o1',
      purchaseOrders: [
        { id: 'po1', poNumber: 'MPO-PO-A' },
        { id: 'po2', poNumber: 'MPO-PO-B' },
      ],
    };

    const view = serializeOrder(raw);

    expect(view.purchaseOrders).toHaveLength(2);
    expect(view.purchaseOrder?.id).toBe('po1');
  });
});
