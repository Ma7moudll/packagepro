import { describe, it, expect, vi, beforeEach } from 'vitest';

const db = vi.hoisted(() => {
  const state: any = { orders: {}, designs: {}, creates: [], writes: 0, afterWrite: null, createError: null, claimWhere: null };
  // Minimal evaluator for the WHERE shapes the service emits, applied atomically
  // (like a row lock + re-check in Postgres).
  const match = (d: any, w: any): boolean =>
    Object.entries(w).every(([k, v]: [string, any]) => {
      if (k === 'OR') return v.some((c: any) => match(d, c));
      if (k === 'order') {
        const o = d.orderId ? state.orders[d.orderId] : null;
        return !!o && o.customer.userId === v.is.customer.is.userId;
      }
      return d[k] === v;
    });
  state.match = match;
  return state;
});
vi.mock('../../lib/redis', () => ({ getRedisClient: () => null }));
vi.mock('../../services/file-upload/upload.service', () => ({ fileUploadService: {} }));
vi.mock('../../services/pre-press-checker/prepress.service', () => ({ prePressCheckService: {} }));
vi.mock('../../lib/prisma', () => {
  const client:any = {
    $queryRaw:async()=>[],
    $executeRaw:async()=>0,
    order: { findUnique: async ({ where }: any) => db.orders[where.id] ?? null },
    design: {
      findUnique: async ({ where }: any) => {
        await new Promise((r) => setTimeout(r, 5)); // widen the check-to-write window
        const all: any[] = Object.values(db.designs);
        const d = where.id ? db.designs[where.id] : where.sessionId ? all.find((x) => x.sessionId === where.sessionId) : all.find((x) => x.orderId === where.orderId);
        if (!d) return null;
        return { ...d, files: [], order: d.orderId ? db.orders[d.orderId] ?? null : null };
      },
      create: async ({ data }: any) => {
        if (db.createError) throw Object.assign(new Error('fk'), { code: db.createError });
        if (data.orderId && Object.values(db.designs).some((x: any) => x.orderId === data.orderId)) {
          throw Object.assign(new Error('unique'), { code: 'P2002' });
        }
        if (data.sessionId && Object.values(db.designs).some((x: any) => x.sessionId === data.sessionId)) {
          throw Object.assign(new Error('unique'), { code: 'P2002' });
        }
        const row = { id: `d${Object.keys(db.designs).length + 1}`, lifecycleStatus: 'DRAFT', ownerId: null, orderId: null, ...data };
        db.designs[row.id] = row; db.creates.push(row); return { ...row, files: [] };
      },
      updateMany: async ({ where, data }: any) => {
        db.claimWhere = where;
        const hits: any[] = Object.values(db.designs).filter((d) => db.match(d, where));
        for (const d of hits) Object.assign(d, data);
        db.writes += hits.length;
        if (db.afterWrite) db.afterWrite();
        return { count: hits.length };
      },
    },
  };
  client.$transaction=async(cb:any)=>cb(client);
  return {prisma:client};
});

import { designService } from './design.service';
import { isDesignOwner, designOwnerMatches } from '../../middleware/auth.middleware';

const reset = () => {
  db.orders = {
    'order-A': { customer: { userId: 'userA' } },
    'order-B': { customer: { userId: 'userB' } },
  };
  db.designs = {}; db.creates = []; db.writes = 0; db.afterWrite = null; db.createError = null; db.claimWhere = null;
};
const addDesign = (id: string, d: any = {}) => {
  db.designs[id] = { id, ownerId: null, orderId: null, sessionId: `s-${id}`, lifecycleStatus: 'DRAFT', ...d };
};
// isDesignOwner reads through findUnique({select}) which the mock above serves in full shape.
const save = (sid: string, user?: string) => designService.saveDesign({ sessionId: sid, designData: { by: user } }, user);

describe('isDesignOwner identity model', () => {
  beforeEach(reset);
  it('fresh editor draft belongs to its creator only', async () => {
    addDesign('d1', { ownerId: 'userA' });
    expect(await isDesignOwner('userA', 'd1')).toBe(true);
    expect(await isDesignOwner('userB', 'd1')).toBe(false);
  });
  it('legacy order-only design belongs to the order customer USER', async () => {
    addDesign('d2', { orderId: 'order-A' });
    expect(await isDesignOwner('userA', 'd2')).toBe(true);
    expect(await isDesignOwner('userB', 'd2')).toBe(false);
  });
  it('conflicting ownerId and order owner fails closed for both', async () => {
    addDesign('d4', { ownerId: 'userB', orderId: 'order-A' });
    expect(await isDesignOwner('userA', 'd4')).toBe(false);
    expect(await isDesignOwner('userB', 'd4')).toBe(false);
    addDesign('d3', { ownerId: 'userA', orderId: 'order-A' });
    expect(await isDesignOwner('userA', 'd3')).toBe(true);
  });
  it('unowned, missing, empty user', async () => {
    addDesign('d5');
    expect(await isDesignOwner('userA', 'd5')).toBe(false);
    expect(await isDesignOwner('userA', 'nope')).toBe(false);
    expect(designOwnerMatches('userA', null, '')).toBe(false);
  });
});

describe('createSession order binding', () => {
  beforeEach(reset);
  it('order owner creates a bound, owned design', async () => {
    await designService.createSession({ orderId: 'order-A' }, 'userA');
    expect(db.creates[0]).toMatchObject({ orderId: 'order-A', ownerId: 'userA' });
  });
  it('foreign and unknown orders: same 403, nothing written', async () => {
    await expect(designService.createSession({ orderId: 'order-B' }, 'userA')).rejects.toMatchObject({ statusCode: 403 });
    await expect(designService.createSession({ orderId: 'nope' }, 'userA')).rejects.toMatchObject({ statusCode: 403, message: 'You do not have access to this order' });
    expect(db.creates.length).toBe(0);
  });
  it('re-opening your own order design reuses it and rotates the session', async () => {
    const first = await designService.createSession({ orderId: 'order-A' }, 'userA');
    const second = await designService.createSession({ orderId: 'order-A' }, 'userA');
    expect(second.design.sessionId).toBe(second.sessionId);
    expect(second.sessionId).not.toBe(first.sessionId);
    expect(db.creates.length).toBe(1);
  });
  it('an existing design on the order owned by another user (conflict) is not taken over', async () => {
    addDesign('dc', { orderId: 'order-A', ownerId: 'userB', sessionId: 'victim' });
    await expect(designService.createSession({ orderId: 'order-A' }, 'userA')).rejects.toMatchObject({ statusCode: 403 });
    expect(db.designs.dc.sessionId).toBe('victim');
    expect(db.designs.dc.ownerId).toBe('userB');
  });
  it('concurrent createSession by the order owner and a non-owner: only the owner binds', async () => {
    const r = await Promise.allSettled([
      designService.createSession({ orderId: 'order-A' }, 'userA'),
      designService.createSession({ orderId: 'order-A' }, 'userB'),
      designService.createSession({ orderId: 'order-A' }, 'userA'),
    ]);
    expect(r[1].status).toBe('rejected');
    expect(Object.values(db.designs).filter((d: any) => d.orderId === 'order-A').length).toBe(1);
    expect((Object.values(db.designs)[0] as any).ownerId).toBe('userA');
  });
  it('sessions without an order are unaffected', async () => {
    await designService.createSession({ name: 'x' }, 'userA');
    expect(db.creates[0].ownerId).toBe('userA');
  });
});

describe('saveDesign: ownership is decided by the guarded write', () => {
  beforeEach(reset);
  it('owner saves', async () => {
    addDesign('d1', { ownerId: 'userA' });
    const d = await save('s-d1', 'userA');
    expect(d.designData).toEqual({ by: 'userA' });
  });
  it('another user with the sessionId: 403, data and owner untouched', async () => {
    addDesign('d1', { ownerId: 'userA', designData: { keep: true } });
    await expect(save('s-d1', 'userB')).rejects.toMatchObject({ statusCode: 403 });
    expect(db.designs.d1).toMatchObject({ ownerId: 'userA', designData: { keep: true } });
  });
  it("design on another user's order: 403 even when ownerId is empty", async () => {
    addDesign('d2', { orderId: 'order-B' });
    await expect(save('s-d2', 'userA')).rejects.toMatchObject({ statusCode: 403 });
    expect(db.designs.d2.ownerId).toBeNull();
  });
  it('unauthenticated cannot write an owned design, but can write an unowned one', async () => {
    addDesign('d1', { ownerId: 'userA' });
    await expect(save('s-d1')).rejects.toMatchObject({ statusCode: 403 });
    addDesign('d3');
    await expect(save('s-d3')).resolves.toBeTruthy();
  });
  it('RACE: two authenticated users save the same ownerless session simultaneously: exactly one wins, loser never overwrites', async () => {
    for (let i = 0; i < 25; i++) {
      reset();
      addDesign('d9');
      const r = await Promise.allSettled([save('s-d9', 'userA'), save('s-d9', 'userB')]);
      expect(r.filter((x) => x.status === 'fulfilled').length).toBe(1);
      const winner = db.designs.d9.ownerId;
      expect(['userA', 'userB']).toContain(winner);
      expect(db.designs.d9.designData).toEqual({ by: winner });
      expect(db.writes).toBe(1);
    }
  });
  it('RACE: submit-state change between check and write is not overwritten', async () => {
    addDesign('d1', { ownerId: 'userA' });
    const p = save('s-d1', 'userA');
    db.designs.d1.lifecycleStatus = 'SUBMITTED'; // flips while findUnique is in flight
    await expect(p).rejects.toMatchObject({ statusCode: 400 });
    expect(db.designs.d1.designData).toBeUndefined();
  });
});

describe('lifecycle and DB-level edge cases (operator/DB-writer boundary, not an ordinary-user path)', () => {
  beforeEach(reset);
  it('claim re-checks order membership in the SAME guarded write', async () => {
    addDesign('dm', { orderId: 'order-A', ownerId: null, sessionId: 'old' });
    await designService.createSession({ orderId: 'order-A' }, 'userA');
    expect(db.claimWhere.order).toEqual({ is: { customer: { is: { userId: 'userA' } } } });
  });
  it('order reassigned to another customer after the initial read: claim matches 0 rows, nobody is silently handed the design', async () => {
    addDesign('dm', { orderId: 'order-A', ownerId: null, sessionId: 'old' });
    const p = designService.createSession({ orderId: 'order-A' }, 'userA');
    db.orders['order-A'] = { customer: { userId: 'userB' } }; // forced DB-level reassignment mid-flight
    await expect(p).rejects.toMatchObject({ statusCode: 403 });
    expect(db.designs.dm.sessionId).toBe('old');
    expect(db.designs.dm.ownerId).toBeNull();
  });
  it('order deleted before the insert: 403, not a raw database error', async () => {
    db.createError = 'P2003';
    await expect(designService.createSession({ orderId: 'order-A' }, 'userA')).rejects.toMatchObject({ statusCode: 403 });
  });
  it('design deleted right after the claim: 409, never success with a null design', async () => {
    addDesign('dm', { orderId: 'order-A', sessionId: 'old' });
    db.afterWrite = () => { delete db.designs.dm; };
    await expect(designService.createSession({ orderId: 'order-A' }, 'userA')).rejects.toMatchObject({ statusCode: 409 });
  });
  it('saveDesign: design deleted right after the guarded write: 409, never success with null', async () => {
    addDesign('d1', { ownerId: 'userA' });
    db.afterWrite = () => { delete db.designs.d1; };
    await expect(save('s-d1', 'userA')).rejects.toMatchObject({ statusCode: 409 });
  });
  it('saveDesign first-save with a vanished order: 409, not a raw error', async () => {
    db.createError = 'P2003';
    await expect(save('s-new', 'userA')).rejects.toMatchObject({ statusCode: 409 });
  });
});
