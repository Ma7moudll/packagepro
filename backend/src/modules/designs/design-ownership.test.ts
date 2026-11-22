import { describe, it, expect, vi, beforeEach } from 'vitest';

type Row = { id: string; ownerId: string | null; orderId: string | null; sessionId: string; lifecycleStatus: string; files: any[] };
const db = vi.hoisted(() => ({
  // Customer.id and User.id are deliberately different ids, as in the real schema.
  orders: {} as Record<string, { customer: { userId: string }; design: { ownerId: string | null } | null }>,
  designs: {} as Record<string, any>,
  upserts: [] as any[],
  updates: [] as any[],
  creates: [] as any[],
}));
vi.mock('../../lib/redis', () => ({ getRedisClient: () => null }));
vi.mock('../../services/file-upload/upload.service', () => ({ fileUploadService: {} }));
vi.mock('../../services/pre-press-checker/prepress.service', () => ({ prePressCheckService: {} }));
vi.mock('../../lib/prisma', () => ({
  prisma: {
    order: { findUnique: async ({ where }: any) => db.orders[where.id] ?? null },
    design: {
      findUnique: async ({ where }: any) =>
        where.id ? db.designs[where.id] ?? null : Object.values(db.designs).find((d: any) => d.sessionId === where.sessionId) ?? null,
      upsert: async (a: any) => { db.upserts.push(a); return { id: 'dx', ...a.create }; },
      create: async (a: any) => { db.creates.push(a); return { id: 'dn', files: [], ...a.data }; },
      update: async (a: any) => { db.updates.push(a); return { id: a.where.id, files: [], ...a.data }; },
    },
  },
}));

import { designService } from './design.service';
import { isDesignOwner, designOwnerMatches } from '../../middleware/auth.middleware';

const reset = () => {
  db.orders = {
    'order-A': { customer: { userId: 'userA' }, design: null },
    'order-B': { customer: { userId: 'userB' }, design: { ownerId: 'userB' } },
    'order-conflict': { customer: { userId: 'userA' }, design: { ownerId: 'userB' } },
  };
  db.designs = {};
  db.upserts = []; db.updates = []; db.creates = [];
};
const addDesign = (id: string, d: Partial<Row> & { order?: any }) => {
  db.designs[id] = { id, ownerId: null, orderId: null, sessionId: `s-${id}`, lifecycleStatus: 'DRAFT', files: [], order: null, ...d };
};

describe('isDesignOwner identity model', () => {
  beforeEach(reset);
  it('fresh editor draft (ownerId, no order) belongs to its creator only', async () => {
    addDesign('d1', { ownerId: 'userA' });
    expect(await isDesignOwner('userA', 'd1')).toBe(true);
    expect(await isDesignOwner('userB', 'd1')).toBe(false);
  });
  it('order-bound design with no ownerId (legacy) belongs to the order customer USER, not Customer.id', async () => {
    addDesign('d2', { orderId: 'order-A', order: { customer: { userId: 'userA' } } });
    expect(await isDesignOwner('userA', 'd2')).toBe(true);
    expect(await isDesignOwner('userB', 'd2')).toBe(false);
  });
  it('agreeing ownerId and order owner passes; a conflict fails closed for both users', async () => {
    addDesign('d3', { ownerId: 'userA', orderId: 'order-A', order: { customer: { userId: 'userA' } } });
    expect(await isDesignOwner('userA', 'd3')).toBe(true);
    addDesign('d4', { ownerId: 'userB', orderId: 'order-A', order: { customer: { userId: 'userA' } } });
    expect(await isDesignOwner('userA', 'd4')).toBe(false);
    expect(await isDesignOwner('userB', 'd4')).toBe(false);
  });
  it('unowned, missing and empty-user cases are refused', async () => {
    addDesign('d5', {});
    expect(await isDesignOwner('userA', 'd5')).toBe(false);
    expect(await isDesignOwner('userA', 'nope')).toBe(false);
    expect(designOwnerMatches('userA', null, '')).toBe(false);
  });
});

describe('createSession order binding', () => {
  beforeEach(reset);
  it('owner of the order can bind a session to it, and the design is stamped with ownerId', async () => {
    await designService.createSession({ orderId: 'order-A' }, 'userA');
    expect(db.upserts[0].create.ownerId).toBe('userA');
    expect(db.upserts[0].update.ownerId).toBe('userA');
  });
  it("another user's order is refused and nothing is written", async () => {
    await expect(designService.createSession({ orderId: 'order-B' }, 'userA')).rejects.toMatchObject({ statusCode: 403 });
    expect(db.upserts.length + db.creates.length).toBe(0);
  });
  it('unknown orders are refused with the same error (no existence oracle)', async () => {
    await expect(designService.createSession({ orderId: 'nope' }, 'userA')).rejects.toMatchObject({ statusCode: 403, message: 'You do not have access to this order' });
  });
  it('an existing design on the order owned by someone else (conflict) fails closed', async () => {
    await expect(designService.createSession({ orderId: 'order-conflict' }, 'userA')).rejects.toMatchObject({ statusCode: 403 });
    expect(db.upserts.length).toBe(0);
  });
  it('sessions without an order are unaffected', async () => {
    await designService.createSession({ name: 'x' }, 'userA');
    expect(db.creates[0].data.ownerId).toBe('userA');
  });
});

describe('saveDesign cannot hijack or reassign', () => {
  beforeEach(reset);
  it('owner saves; ownerId unchanged', async () => {
    addDesign('d1', { ownerId: 'userA' });
    await designService.saveDesign({ sessionId: 's-d1', designData: {} }, 'userA');
    expect(db.updates.length).toBe(1);
  });
  it("another user holding the sessionId is refused and cannot take over ownerId", async () => {
    addDesign('d1', { ownerId: 'userA' });
    await expect(designService.saveDesign({ sessionId: 's-d1', designData: {} }, 'userB')).rejects.toMatchObject({ statusCode: 403 });
    expect(db.updates.length).toBe(0);
  });
  it('a design bound to another user\'s order is refused even when ownerId is empty', async () => {
    addDesign('d2', { orderId: 'order-B' });
    await expect(designService.saveDesign({ sessionId: 's-d2', designData: {} }, 'userA')).rejects.toMatchObject({ statusCode: 403 });
  });
  it('an unauthenticated save cannot write an owned design', async () => {
    addDesign('d1', { ownerId: 'userA' });
    await expect(designService.saveDesign({ sessionId: 's-d1', designData: {} })).rejects.toMatchObject({ statusCode: 403 });
  });
  it('an unowned legacy anonymous draft can still be saved and claimed by the first authenticated saver', async () => {
    addDesign('d3', {});
    await designService.saveDesign({ sessionId: 's-d3', designData: {} }, 'userA');
    expect(db.updates[0].data.ownerId).toBe('userA');
  });
});
