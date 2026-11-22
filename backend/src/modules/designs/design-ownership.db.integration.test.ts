import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { designService } from './design.service';
import { isDesignOwner } from '../../middleware/auth.middleware';

/**
 * Real-Postgres concurrency tests for design ownership (needs DATABASE_URL, like
 * the other *.integration tests). Creates and removes only its own rows.
 */
const marker = `own-${Date.now()}`;
const userIds: string[] = [];
const orderIds: string[] = [];
const sessionIds: string[] = [];

async function user(tag: string) {
  const u = await prisma.user.create({
    data: { email: `${marker}-${tag}@test.local`, passwordHash: 'local-test', role: 'CUSTOMER', customer: { create: {} } },
    include: { customer: true },
  });
  userIds.push(u.id);
  return { userId: u.id, customerId: u.customer!.id };
}
async function order(customerId: string, tag: string) {
  const o = await prisma.order.create({
    data: { orderNumber: `${marker}-${tag}`, customerId, subtotal: 1, total: 1, tax: 0, shippingCost: 0, shippingAddress: {}, shippingName: 'Local QA', shippingPhone: 'test-only' },
  });
  orderIds.push(o.id);
  return o;
}

afterAll(async () => {
  await prisma.design.deleteMany({ where: { OR: [{ sessionId: { in: sessionIds } }, { orderId: { in: orderIds } }] } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe('design ownership on real Postgres', () => {
  it('fresh draft creator passes isDesignOwner; another user does not', async () => {
    const a = await user('a1'); const b = await user('b1');
    const { sessionId, design } = await designService.createSession({ name: 'x' }, a.userId);
    sessionIds.push(sessionId);
    expect(await isDesignOwner(a.userId, design.id)).toBe(true);
    expect(await isDesignOwner(b.userId, design.id)).toBe(false);
  });

  it('RACE x20: two users save the same ownerless session at once: exactly one wins, data matches the winner', async () => {
    const a = await user('a2'); const b = await user('b2');
    for (let i = 0; i < 20; i++) {
      const sid = `${marker}-race-${i}`;
      sessionIds.push(sid);
      await prisma.design.create({ data: { sessionId: sid } });
      const r = await Promise.allSettled([
        designService.saveDesign({ sessionId: sid, designData: { by: a.userId } }, a.userId),
        designService.saveDesign({ sessionId: sid, designData: { by: b.userId } }, b.userId),
      ]);
      expect(r.filter((x) => x.status === 'fulfilled').length).toBe(1);
      const row = await prisma.design.findUnique({ where: { sessionId: sid } });
      expect([a.userId, b.userId]).toContain(row!.ownerId);
      expect((row!.designData as any).by).toBe(row!.ownerId);
    }
  });

  it('order-bound: owner can bind, other user cannot; owned order design is not taken over, concurrently either', async () => {
    const a = await user('a3'); const b = await user('b3');
    const o = await order(a.customerId, 'o3');
    const r = await Promise.allSettled([
      designService.createSession({ orderId: o.id }, a.userId),
      designService.createSession({ orderId: o.id }, b.userId),
      designService.createSession({ orderId: o.id }, a.userId),
      designService.createSession({ orderId: o.id }, b.userId),
    ]);
    expect(r[1].status).toBe('rejected');
    expect(r[3].status).toBe('rejected');
    const rows = await prisma.design.findMany({ where: { orderId: o.id } });
    expect(rows.length).toBe(1);
    expect(rows[0].ownerId).toBe(a.userId);
    const sid = rows[0].sessionId!;
    expect(await isDesignOwner(a.userId, rows[0].id)).toBe(true);
    expect(await isDesignOwner(b.userId, rows[0].id)).toBe(false);
    await expect(designService.saveDesign({ sessionId: sid, designData: { x: 1 } }, b.userId)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('conflicting ownerId vs order owner fails closed', async () => {
    const a = await user('a4'); const b = await user('b4');
    const o = await order(a.customerId, 'o4');
    const sid = `${marker}-conflict`;
    sessionIds.push(sid);
    const d = await prisma.design.create({ data: { sessionId: sid, orderId: o.id, ownerId: b.userId } });
    expect(await isDesignOwner(a.userId, d.id)).toBe(false);
    expect(await isDesignOwner(b.userId, d.id)).toBe(false);
    await expect(designService.createSession({ orderId: o.id }, a.userId)).rejects.toMatchObject({ statusCode: 403 });
  });
});
