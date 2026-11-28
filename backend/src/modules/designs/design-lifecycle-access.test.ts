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


import { designService } from './design.service';

const ACTIONS = [
  ['submit', (tok: string | undefined, id: string) => call(tok, 'POST', `/api/designs/${id}/submit`, {})],
  ['recall', (tok: string | undefined, id: string) => call(tok, 'POST', `/api/designs/${id}/recall`, {})],
  ['export', (tok: string | undefined, id: string) => call(tok, 'POST', `/api/designs/${id}/export`, { format: 'png' })],
] as const;

describe('submit, recall and export: a design that is not yours looks the same as one that does not exist', () => {
  beforeEach(() => {
    vi.spyOn(designService, 'submitDesign').mockResolvedValue({ id: 'dA', ok: 'submit' } as any);
    vi.spyOn(designService, 'recallDesign').mockResolvedValue({ id: 'dA', ok: 'recall' } as any);
    vi.spyOn(designService, 'exportDesign').mockResolvedValue({ id: 'dA', ok: 'export' } as any);
  });
  for (const [name, act] of ACTIONS) {
    describe(name, () => {
      it('another customer, a vendor and a forged ADMIN claim get the exact 404 a missing design gets, and the service is never reached', async () => {
        const missing = await act(B, 'nope');
        expect(missing.status).toBe(404);
        for (const tok of [B, V, FORGED]) {
          const r = await act(tok, 'dA');
          expect(r.status, tok).toBe(404);
          expect(strip(r.body), tok).toEqual(strip(missing.body));
          for (const needle of ['SECRET', 'owner', 'dA']) expect(r.text).not.toContain(needle);
        }
        for (const m of ['submitDesign', 'recallDesign', 'exportDesign'] as const) expect((designService as any)[m]).not.toHaveBeenCalled();
      });
      it('no token is 401', async () => { expect((await act(undefined, 'dA')).status).toBe(401); });
      it('the owner still reaches the service', async () => {
        const r = await act(A, 'dA');
        expect(r.status).toBeLessThan(300);
      });
    });
  }
  it('an admin who is not the owner still reaches the service (which keeps its own owner rule)', async () => {
    expect((await ACTIONS[0][1](ADMIN, 'dA')).status).toBeLessThan(300);
  });
});
