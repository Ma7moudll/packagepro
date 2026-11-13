// Step-4 Piece 4c — integration: order creation persists the per-group
// shipping split (metadata.shippingBreakdown) and serializeOrder surfaces it.
//
//   A  a mixed (box + bag) order stores a breakdown whose groups match the
//      productTypes and sum to order.shippingCost.
//   B  serializeOrder surfaces `shippingBreakdown` from metadata.
//   C  a single-productType order stores exactly one group.
//
// Real DB + real pricing engine (createOrder is self-contained: it writes a
// notification row, nothing else). No email is involved in createOrder.
// Marker-scoped cleanup: orders -> users (cascades customer + notifications).

import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { orderService } from './order.service';

describe('order shipping breakdown (createOrder + serializeOrder)', () => {
  const marker = `SHIPBRK-${Date.now().toString(36)}`;
  const emails: string[] = [];
  const orderIds: string[] = [];

  async function seedCustomer() {
    const email = `${marker.toLowerCase()}-${Math.random().toString(36).slice(2, 7)}@test.local`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'x', role: 'CUSTOMER', emailVerified: true },
    });
    emails.push(email);
    const customer = await prisma.customer.create({ data: { userId: user.id } });
    return { user, customer };
  }

  afterAll(async () => {
    // Child-first: orders (cascade items) under the test customers, then the
    // users (cascades customers + notifications). Email-marker scoped so a
    // previously crashed run also cleans up.
    if (emails.length > 0) {
      await prisma.order.deleteMany({
        where: { customer: { user: { email: { in: emails } } } },
      });
    }
    if (orderIds.length > 0) {
      await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    }
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('A: mixed order stores a per-group breakdown that sums to shippingCost', async () => {
    const { customer } = await seedCustomer();

    const order = await orderService.createOrder({
      customerId: customer.id,
      items: [
        { productType: 'box', quantity: 100, dimensions: { length: 20, width: 15, height: 10, unit: 'cm' } },
        { productType: 'bag', quantity: 200, dimensions: { length: 30, width: 20, height: 12, unit: 'cm' } },
      ],
      shippingAddress: {
        name: 'ShipBrk Test',
        phone: '+200000000',
        street: '1 Test St',
        city: 'Cairo',
        state: 'C',
        postalCode: '00000',
        country: 'EG',
      },
    });

    orderIds.push(order.id);

    const breakdown = (order as any).shippingBreakdown as Array<{
      productType: string;
      shipping: number;
    }>;

    expect(breakdown).toHaveLength(2);
    expect(breakdown.map((g) => g.productType)).toEqual(['box', 'bag']);

    const sum = breakdown.reduce((acc, g) => acc + g.shipping, 0);
    expect(sum).toBeCloseTo(Number(order.shippingCost), 2);
    expect(sum).toBeGreaterThan(0); // sanity: real engine produced estimates
  });

  it('B: serializeOrder surfaces the breakdown from metadata', async () => {
    const { customer } = await seedCustomer();

    const order = await orderService.createOrder({
      customerId: customer.id,
      items: [
        { productType: 'box', quantity: 50, dimensions: { length: 20, width: 15, height: 10, unit: 'cm' } },
      ],
      shippingAddress: {
        name: 'ShipBrk Test',
        phone: '+200000000',
        street: '1 Test St',
        city: 'Cairo',
        state: 'C',
        postalCode: '00000',
        country: 'EG',
      },
    });

    orderIds.push(order.id);

    const stored = await prisma.order.findUnique({
      where: { id: order.id },
      select: { metadata: true, shippingCost: true },
    });
    const fromMetadata = (stored?.metadata as any)?.shippingBreakdown;
    expect(Array.isArray(fromMetadata)).toBe(true);
    expect((order as any).shippingBreakdown).toEqual(fromMetadata);
  });

  it('C: single-productType order stores exactly one group', async () => {
    const { customer } = await seedCustomer();

    const order = await orderService.createOrder({
      customerId: customer.id,
      items: [
        { productType: 'label', quantity: 500, dimensions: { length: 100, width: 50, height: 1, unit: 'mm' } },
      ],
      shippingAddress: {
        name: 'ShipBrk Test',
        phone: '+200000000',
        street: '1 Test St',
        city: 'Cairo',
        state: 'C',
        postalCode: '00000',
        country: 'EG',
      },
    });

    orderIds.push(order.id);

    const breakdown = (order as any).shippingBreakdown;
    expect(breakdown).toHaveLength(1);
    expect(breakdown[0].productType).toBe('label');
    expect(breakdown[0].shipping).toBeCloseTo(Number(order.shippingCost), 2);
  });
});
