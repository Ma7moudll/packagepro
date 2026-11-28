import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// Real routes, controller, service and error handler. Fake: prisma (in memory, evaluates the WHERE shapes
// the service emits), the JWT verifier (token = userId:ROLE) and redis (absent).
const db = vi.hoisted(() => {
  const state: any = { orders: {}, designs: {}, users: {}, creates: [], writes: 0 };
  const match = (d: any, w: any): boolean =>
    Object.entries(w).every(([k, v]: [string, any]) => {
      if (k === 'OR') return v.some((c: any) => match(d, c));
      if (k === 'order') { const o = d.orderId ? state.orders[d.orderId] : null; return !!o && o.customer.userId === v.is.customer.is.userId; }
      return d[k] === v;
    });
  state.match = match;
  return state;
});
vi.mock('../../lib/redis', () => ({ getRedisClient: () => null }));
vi.mock('../../services/file-upload/upload.service', () => ({ fileUploadService: {} }));
vi.mock('../../services/pre-press-checker/prepress.service', () => ({ prePressCheckService: {} }));
vi.mock('../auth/services/jwt.service', () => ({
  jwtService: { verifyAccessToken: (t: string) => { const [userId, role] = t.split(':'); if (!role) throw new Error('bad token'); return { userId, role, email: 'x@y.z' }; } },
}));
vi.mock('../../lib/prisma', () => {
  const client: any = {
    $queryRaw: async () => [], $executeRaw: async () => 0,
    user: { findUnique: async ({ where }: any) => (db.users[where.id] ? { role: db.users[where.id] } : null) },
    order: { findUnique: async ({ where }: any) => db.orders[where.id] ?? null },
    design: {
      findUnique: async ({ where }: any) => {
        const all: any[] = Object.values(db.designs);
        const d = where.id ? db.designs[where.id] : where.sessionId ? all.find((x) => x.sessionId === where.sessionId) : all.find((x) => x.orderId === where.orderId);
        return d ? { ...d, files: [], order: d.orderId ? db.orders[d.orderId] ?? null : null } : null;
      },
      create: async ({ data }: any) => {
        const row = { id: `n${Object.keys(db.designs).length + 1}`, lifecycleStatus: 'DRAFT', ownerId: null, orderId: null, ...data };
        db.designs[row.id] = row; db.creates.push(row); return { ...row, files: [] };
      },
      updateMany: async ({ where, data }: any) => {
        const hits: any[] = Object.values(db.designs).filter((d) => db.match(d, where));
        for (const d of hits) Object.assign(d, data);
        db.writes += hits.length; return { count: hits.length };
      },
    },
  };
  client.$transaction = async (cb: any) => cb(client);
  return { prisma: client };
});

import { designRoutes } from './design.routes';
import { httpErrorHandler } from '../../utils/http-error-handler';

const A = 'uA:CUSTOMER', B = 'uB:CUSTOMER', ADMIN = 'uAdmin:ADMIN', V = 'uV:VENDOR', FORGED = 'uB:ADMIN';
const mk = (id: string, over: any = {}) => ({ id, ownerId: null, orderId: null, sessionId: `s-${id}`, lifecycleStatus: 'DRAFT', name: 'SECRET-NAME', description: 'd', status: 'saved', createdAt: 'c', updatedAt: 'u', designData: { note: 'SECRET-DATA' }, ...over });
const snap = () => JSON.stringify(db.designs);

beforeEach(() => {
  db.users = { uA: 'CUSTOMER', uB: 'CUSTOMER', uAdmin: 'ADMIN', uV: 'VENDOR' };
  db.orders = { oA: { customer: { userId: 'uA' } } };
  db.designs = {
    dA: mk('dA', { ownerId: 'uA' }),
    dB: mk('dB', { ownerId: 'uB' }),
    dN: mk('dN'),                                   // ownerless legacy draft
    dO: mk('dO', { orderId: 'oA' }),                // ownerless, bound to uA's order
  };
  db.creates = []; db.writes = 0;
});

const call = async (token: string | undefined, method: 'GET' | 'POST', url: string, payload?: any) => {
  const a = Fastify(); a.setErrorHandler(httpErrorHandler); await a.register(designRoutes, { prefix: '/api' });
  const r = await a.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload });
  let body: any = null; try { body = r.json(); } catch { /* not json */ }
  return { status: r.statusCode, body, text: r.body };
};
const strip = (b: any) => { const { requestId, ...rest } = b ?? {}; return rest; };
const save = (tok: string | undefined, sessionId: string, extra: any = {}) => call(tok, 'POST', '/api/designs/save', { sessionId, designData: { layers: ['mine'] }, ...extra });

describe('GET /designs/session/:sessionId', () => {
  it('owner and admin read it', async () => {
    expect((await call(A, 'GET', '/api/designs/session/s-dA')).status).toBe(200);
    expect((await call(ADMIN, 'GET', '/api/designs/session/s-dA')).status).toBe(200);
  });
  it('user A and user B: neither reads the other\'s session', async () => {
    expect((await call(B, 'GET', '/api/designs/session/s-dA')).status).toBe(404);
    expect((await call(A, 'GET', '/api/designs/session/s-dB')).status).toBe(404);
  });
  it('vendor, forged ADMIN claim and no token get nothing', async () => {
    expect((await call(V, 'GET', '/api/designs/session/s-dA')).status).toBe(404);
    expect((await call(FORGED, 'GET', '/api/designs/session/s-dA')).status).toBe(404);
    expect((await call(undefined, 'GET', '/api/designs/session/s-dA')).status).toBe(401);
  });
  it('an ownerless draft is admin only (the creator is not recorded)', async () => {
    expect((await call(A, 'GET', '/api/designs/session/s-dN')).status).toBe(404);
    expect((await call(B, 'GET', '/api/designs/session/s-dN')).status).toBe(404);
    expect((await call(ADMIN, 'GET', '/api/designs/session/s-dN')).status).toBe(200);
  });
  it('an ownerless draft bound to the caller\'s order is readable by that order\'s customer only', async () => {
    expect((await call(A, 'GET', '/api/designs/session/s-dO')).status).toBe(200);
    expect((await call(B, 'GET', '/api/designs/session/s-dO')).status).toBe(404);
  });
  it('denial leaks nothing and is identical to an unknown session id', async () => {
    const unknown = await call(B, 'GET', '/api/designs/session/does-not-exist');
    const denied = await call(B, 'GET', '/api/designs/session/s-dA');
    expect(unknown.status).toBe(404);
    expect(strip(denied.body)).toEqual(strip(unknown.body));
    for (const r of [denied, unknown]) for (const needle of ['SECRET-NAME', 'SECRET-DATA', 'dA', 'files']) expect(r.text).not.toContain(needle);
  });
});

describe('POST /designs/save with a client-chosen session id', () => {
  it('an unknown session id is refused and creates nothing', async () => {
    const before = snap();
    for (const tok of [A, ADMIN]) { const r = await save(tok, 'client-chosen-id'); expect(r.status, tok).toBe(404); }
    expect(db.creates).toHaveLength(0); expect(snap()).toBe(before);
  });
  it('a session made by createSession can be saved by its creator', async () => {
    const created = await call(A, 'POST', '/api/designs/session', { name: 'mine' });
    expect(created.status).toBe(200);
    const sid = created.body.data.sessionId;
    expect(sid).toMatch(/^[0-9a-f-]{36}$/);
    expect((await save(A, sid)).status).toBe(200);
    expect((await call(B, 'GET', `/api/designs/session/${sid}`)).status).toBe(404);
    expect((await save(B, sid)).status).toBe(403);
  });
  it('the owner saves their own existing session', async () => {
    expect((await save(A, 's-dA')).status).toBe(200);
    expect(db.designs.dA.designData).toEqual({ layers: ['mine'] });
  });
  it('user B cannot save over user A\'s session, and nothing changes', async () => {
    const before = snap();
    expect((await save(B, 's-dA')).status).toBe(403);
    expect(snap()).toBe(before);
  });
});

describe('ownerless drafts are not claimed by the first saver', () => {
  it('a plain user and an admin are refused, the draft stays ownerless and unchanged', async () => {
    const before = snap();
    for (const tok of [A, B, ADMIN, FORGED]) expect((await save(tok, 's-dN')).status, tok).toBe(403);
    expect(snap()).toBe(before);
    expect(db.designs.dN.ownerId).toBeNull();
    expect(db.writes).toBe(0);
  });
  it('an ownerless draft bound to a user\'s own order is still saved by that order\'s customer, not by others', async () => {
    expect((await save(B, 's-dO')).status).toBe(403);
    expect(db.writes).toBe(0);
    expect((await save(A, 's-dO')).status).toBe(200);
  });
});
