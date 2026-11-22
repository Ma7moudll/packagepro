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
import { vi } from 'vitest';

// Force the stale-read interleavings that found the original ownership bug.
// Reads and writes below still run against PostgreSQL, not an in-memory DB.
async function synchronizedSaves(sessionId: string, a: string, b: string) {
  const read = prisma.design.findUnique.bind(prisma.design);
  let reads = 0;
  let release!: () => void;
  const bothRead = new Promise<void>((resolve) => { release = resolve; });
  const spy = vi.spyOn(prisma.design, 'findUnique').mockImplementation((async (args: any) => {
    const row = await read(args);
    if (args.where.sessionId === sessionId) {
      reads++;
      if (reads === 2) release();
      await bothRead;
    }
    return row;
  }) as any);
  try {
    return await Promise.allSettled([
      designService.saveDesign({ sessionId, designData: { by: a } }, a),
      designService.saveDesign({ sessionId, designData: { by: b } }, b),
    ]);
  } finally {
    spy.mockRestore();
  }
}

describe('ownership deterministic PostgreSQL interleavings', () => {
  it('two stale reads of one ownerless draft cannot both claim or overwrite it', async () => {
    const a = await user('sync-a'); const b = await user('sync-b');
    const sid = `${marker}-sync-existing`; sessionIds.push(sid);
    await prisma.design.create({ data: { sessionId: sid } });
    const results = await synchronizedSaves(sid, a.userId, b.userId);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({ statusCode: 403 });
    const row = await prisma.design.findUniqueOrThrow({ where: { sessionId: sid } });
    expect([a.userId, b.userId]).toContain(row.ownerId);
    expect(row.designData).toEqual({ by: row.ownerId });
  });

  it('two first saves after synchronized missing-row reads return one success and one 409', async () => {
    const a = await user('first-a'); const b = await user('first-b');
    const sid = `${marker}-sync-new`; sessionIds.push(sid);
    const results = await synchronizedSaves(sid, a.userId, b.userId);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const failure = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(failure.reason).toMatchObject({ statusCode: 409 });
    const rows = await prisma.design.findMany({ where: { sessionId: sid } });
    expect(rows).toHaveLength(1);
    expect(rows[0].designData).toEqual({ by: rows[0].ownerId });
  });

  it('a submission after the initial draft read prevents the save write', async () => {
    const a = await user('state-a');
    const sid = `${marker}-state`; sessionIds.push(sid);
    const d = await prisma.design.create({ data: { sessionId: sid, ownerId: a.userId, designData: { keep: true } } });
    const read = prisma.design.findUnique.bind(prisma.design);
    let injected = false;
    const spy = vi.spyOn(prisma.design, 'findUnique').mockImplementation((async (args: any) => {
      const row = await read(args);
      if (!injected && args.where.sessionId === sid) {
        injected = true;
        await prisma.design.update({ where: { id: d.id }, data: { lifecycleStatus: 'SUBMITTED' } });
      }
      return row;
    }) as any);
    try {
      await expect(designService.saveDesign({ sessionId: sid, designData: { forbidden: true } }, a.userId)).rejects.toMatchObject({ statusCode: 400 });
    } finally { spy.mockRestore(); }
    expect((await prisma.design.findUniqueOrThrow({ where: { id: d.id } })).designData).toEqual({ keep: true });
  });

  it('operator reassignment after the order read cannot claim an existing legacy design', async () => {
    const a = await user('move-a'); const b = await user('move-b');
    const o = await order(a.customerId, 'move-order');
    const sid = `${marker}-move`; sessionIds.push(sid);
    const d = await prisma.design.create({ data: { orderId: o.id, sessionId: sid } });
    const read = prisma.order.findUnique.bind(prisma.order);
    let injected = false;
    const spy = vi.spyOn(prisma.order, 'findUnique').mockImplementation((async (args: any) => {
      const row = await read(args);
      if (!injected && args.where.id === o.id) {
        injected = true;
        await prisma.order.update({ where: { id: o.id }, data: { customerId: b.customerId } });
      }
      return row;
    }) as any);
    try {
      await expect(designService.createSession({ orderId: o.id }, a.userId)).rejects.toMatchObject({ statusCode: 403 });
    } finally { spy.mockRestore(); }
    expect(await prisma.design.findUniqueOrThrow({ where: { id: d.id } })).toMatchObject({ ownerId: null, sessionId: sid });
  });

  it('order deletion after the ownership read returns 403 instead of a raw foreign-key failure', async () => {
    const a = await user('delete-before-a');
    const o = await order(a.customerId, 'delete-before');
    const read = prisma.order.findUnique.bind(prisma.order);
    let injected = false;
    const spy = vi.spyOn(prisma.order, 'findUnique').mockImplementation((async (args: any) => {
      const row = await read(args);
      if (!injected && args.where.id === o.id) {
        injected = true;
        await prisma.order.delete({ where: { id: o.id } });
      }
      return row;
    }) as any);
    try {
      await expect(designService.createSession({ orderId: o.id }, a.userId)).rejects.toMatchObject({ statusCode: 403 });
    } finally { spy.mockRestore(); }
    expect(await prisma.design.count({ where: { orderId: o.id } })).toBe(0);
  });

  it('order deletion after an existing-design claim returns 409, never success with a null design', async () => {
    const a = await user('delete-claim-a');
    const o = await order(a.customerId, 'delete-claim');
    await prisma.design.create({ data: { orderId: o.id, ownerId: a.userId, sessionId: `${marker}-delete-claim` } });
    const update = prisma.design.updateMany.bind(prisma.design);
    let injected = false;
    const spy = vi.spyOn(prisma.design, 'updateMany').mockImplementation((async (args: any) => {
      const result = await update(args);
      if (!injected && args.where.orderId === o.id) {
        injected = true;
        await prisma.order.delete({ where: { id: o.id } });
      }
      return result;
    }) as any);
    try {
      await expect(designService.createSession({ orderId: o.id }, a.userId)).rejects.toMatchObject({ statusCode: 409 });
    } finally { spy.mockRestore(); }
  });

  it('design deletion after a save write returns 409, never success with a null design', async () => {
    const a = await user('delete-save-a');
    const sid = `${marker}-delete-save`; sessionIds.push(sid);
    const d = await prisma.design.create({ data: { ownerId: a.userId, sessionId: sid } });
    const update = prisma.design.updateMany.bind(prisma.design);
    let injected = false;
    const spy = vi.spyOn(prisma.design, 'updateMany').mockImplementation((async (args: any) => {
      const result = await update(args);
      if (!injected && args.where.id === d.id) {
        injected = true;
        await prisma.design.delete({ where: { id: d.id } });
      }
      return result;
    }) as any);
    try {
      await expect(designService.saveDesign({ sessionId: sid, designData: {} }, a.userId)).rejects.toMatchObject({ statusCode: 409 });
    } finally { spy.mockRestore(); }
  });
});
