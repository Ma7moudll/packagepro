import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

const h = vi.hoisted(() => ({ rows: {} as Record<string, any>, update: vi.fn(), prisma: {} as any, users: {} as Record<string, string> }));
vi.mock('../../lib/prisma', () => ({ prisma: h.prisma }));
vi.mock('../../lib/redis', () => ({ getRedisClient: () => null }));
vi.mock('../auth/services/jwt.service', () => ({
  jwtService: { verifyAccessToken: (t: string) => { const [userId, role] = t.split(':'); if (!role) throw new Error('bad token'); return { userId, role, email: 'x@y.z' }; } },
}));

import { designRoutes } from './design.routes';
import { httpErrorHandler } from '../../utils/http-error-handler';
import { assertCanReadDesign, assertAdmin } from './design-access';

const SECRET = 'SECRET-DESIGN-DATA';
const mkDesign = (id: string, over: any = {}) => ({
  id, ownerId: null, orderId: null, sessionId: `s-${id}`, name: 'SECRET-NAME', description: 'd', status: 'saved', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z', lifecycleStatus: 'SUBMITTED', designData: { note: SECRET },
  order: null, files: [{ id: 'f1', fileName: 'secret-file-name.png', fileUrl: `/api/files/designs/${id}/secret.png`, metadata: { note: 'SECRET-META' } }], ...over,
});
const C1 = 'u-c1:CUSTOMER', C2 = 'u-c2:CUSTOMER', ADMIN = 'u-admin:ADMIN', V1 = 'u-v1:VENDOR', V_AS_C1 = 'u-c2:ADMIN';

beforeEach(() => {
  h.rows = {
    d1: mkDesign('d1', { ownerId: 'u-c1' }),
    d2: mkDesign('d2', { order: { id: 'o2', orderNumber: 'N', status: 'x', customer: { userId: 'u-c1' } } }), // legacy: order only
    d3: mkDesign('d3'),                                                                                         // unowned draft
    d4: mkDesign('d4', { ownerId: 'u-c2', order: { id: 'o4', orderNumber: 'N', status: 'x', customer: { userId: 'u-c1' } } }), // conflict
    d5: mkDesign('d5', { ownerId: 'u-c1', lifecycleStatus: 'IN_REVIEW' }),
  };
  h.users = { 'u-c1': 'CUSTOMER', 'u-c2': 'CUSTOMER', 'u-admin': 'ADMIN', 'u-v1': 'VENDOR' };
  h.update.mockReset();
  h.update.mockImplementation(async (a: any) => ({ ...h.rows[a.where.id], ...a.data }));
  h.prisma.design = {
    findUnique: async (a: any) => (a.where.id ? h.rows[a.where.id] ?? null : Object.values(h.rows).find((r: any) => r.sessionId === a.where.sessionId) ?? null),
    update: h.update,
  };
  h.prisma.user = { findUnique: async (a: any) => (h.users[a.where.id] ? { role: h.users[a.where.id] } : null) };
});

async function app() {
  const a = Fastify();
  a.setErrorHandler(httpErrorHandler);
  await a.register(designRoutes, { prefix: '/api' });
  return a;
}
const call = async (token: string | undefined, method: 'GET' | 'POST', url: string, payload?: any) => {
  const r = await (await app()).inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload });
  let body: any = null; try { body = r.json(); } catch { /* not json */ }
  return { status: r.statusCode, body, text: r.body };
};
const strip = (b: any) => { const { requestId, ...rest } = b ?? {}; return rest; };

const READS = (id: string) => [`/api/designs/${id}`, `/api/designs/${id}/files`, `/api/designs/${id}/review`];

describe('reads by id: owner and admin only, everyone else gets the same 404 as a missing design', () => {
  for (const path of ['', '/files', '/review']) {
    describe(`GET /designs/:id${path}`, () => {
      it('the owning customer gets the design', async () => {
        for (const id of ['d1', 'd2']) { const r = await call(C1, 'GET', `/api/designs/${id}${path}`); expect(r.status, id).toBe(200); expect(r.text).toContain(path === '/files' ? 'secret-file-name' : SECRET); }
      });
      it('an admin gets any design', async () => {
        for (const id of ['d1', 'd2', 'd3', 'd4']) expect((await call(ADMIN, 'GET', `/api/designs/${id}${path}`)).status, id).toBe(200);
      });
      it('another customer, a vendor, a token that claims ADMIN but the database says CUSTOMER, and no token get nothing', async () => {
        const missing = await call(C1, 'GET', `/api/designs/nope${path}`);
        expect(missing.status).toBe(404);
        for (const [who, tok] of [['other customer', C2], ['vendor', V1], ['token claiming ADMIN, database role CUSTOMER', V_AS_C1]] as const) {
          const r = await call(tok, 'GET', `/api/designs/d1${path}`);
          expect(r.status, who).toBe(404);
          expect(strip(r.body), who).toEqual(strip(missing.body));
          expect(r.text, who).not.toMatch(/SECRET|secret-file|designData|\/api\/files|metadata/i);
        }
        expect((await call(undefined, 'GET', `/api/designs/d1${path}`)).status).toBe(401);
      });
      it('unowned drafts, and a design whose owner and order disagree, are admin-only here', async () => {
        for (const id of ['d3', 'd4']) { const r = await call(C1, 'GET', `/api/designs/${id}${path}`); expect(r.status, id).toBe(404); expect(r.text).not.toMatch(/SECRET/); }
      });
      it('a denied caller never reaches the service (no design data is read)', async () => {
        const spy = vi.spyOn(h.prisma.design, 'findUnique');
        await call(C2, 'GET', `/api/designs/d1${path}`);
        // only the ownership lookup (select) ran; no include/full read
        for (const [a] of spy.mock.calls as any[]) expect((a as any).include).toBeUndefined();
      });
    });
  }
});

describe('GET /designs/:id/review does not flip the state for anyone but an admin reviewer', () => {
  it('a non-owner is refused and the state is untouched', async () => {
    for (const tok of [C2, V1, V_AS_C1]) { await call(tok, 'GET', '/api/designs/d1/review'); }
    expect(h.update).not.toHaveBeenCalled();
  });
  it('the owner can read it but it stays SUBMITTED', async () => {
    const r = await call(C1, 'GET', '/api/designs/d1/review');
    expect(r.status).toBe(200); expect(r.body.data.lifecycleStatus).toBe('SUBMITTED');
    expect(h.update).not.toHaveBeenCalled();
  });
  it('an admin moves SUBMITTED to IN_REVIEW', async () => {
    const r = await call(ADMIN, 'GET', '/api/designs/d1/review');
    expect(r.status).toBe(200);
    expect(h.update).toHaveBeenCalledTimes(1);
    expect(h.update.mock.calls[0][0].data).toEqual({ lifecycleStatus: 'IN_REVIEW' });
  });
});

describe('approve, reject, request-changes: admin only, and the caller is no longer ignored', () => {
  const ACTIONS: Array<[string, any]> = [['approve', { notes: 'ok' }], ['reject', { reason: 'bad' }], ['request-changes', { changes: ['a'] }]];
  for (const [action, payload] of ACTIONS) {
    it(`${action}: owner, other customer, vendor and a token that claims ADMIN but the database says CUSTOMER get 403 and nothing changes`, async () => {
      for (const tok of [C1, C2, V1, V_AS_C1]) {
        const r = await call(tok, 'POST', `/api/designs/d5/review/${action}`, payload);
        expect(r.status, tok).toBe(403);
        expect(r.text).not.toMatch(/SECRET|designData/);
      }
      expect(h.update).not.toHaveBeenCalled();
    });
    it(`${action}: no token gets 401`, async () => {
      expect((await call(undefined, 'POST', `/api/designs/d5/review/${action}`, payload)).status).toBe(401);
    });
  }
  it('an admin can approve and reject a design that is in review', async () => {
    expect((await call(ADMIN, 'POST', '/api/designs/d5/review/approve', { notes: 'ok' })).status).toBe(200);
    expect(h.update.mock.calls[0][0].data.lifecycleStatus).toBe('APPROVED');
    expect((await call(ADMIN, 'POST', '/api/designs/d5/review/reject', { reason: 'bad' })).status).toBe(200);
    expect(h.update.mock.calls[1][0].data.lifecycleStatus).toBe('REJECTED');
  });
  it('an admin request-changes keeps the design in review', async () => {
    expect((await call(ADMIN, 'POST', '/api/designs/d5/review/request-changes', { changes: ['x'] })).status).toBe(200);
  });
});

describe('review comment (stub) follows the read rule', () => {
  it('owner and admin can comment; others get the 404', async () => {
    expect((await call(C1, 'POST', '/api/designs/d1/review/comment', { commentText: 'hi' })).status).toBe(201);
    expect((await call(ADMIN, 'POST', '/api/designs/d1/review/comment', { commentText: 'hi' })).status).toBe(201);
    for (const tok of [C2, V1]) expect((await call(tok, 'POST', '/api/designs/d1/review/comment', { commentText: 'hi' })).status).toBe(404);
  });
});

describe('GET /designs/session/:sessionId follows the same owner/admin rule (see design-session-access.test.ts)', () => {
  it('owner and admin get the session; another customer, a vendor and no token do not', async () => {
    expect((await call(C1, 'GET', '/api/designs/session/s-d1')).status).toBe(200);
    expect((await call(ADMIN, 'GET', '/api/designs/session/s-d1')).status).toBe(200);
    for (const tok of [C2, V1]) expect((await call(tok, 'GET', '/api/designs/session/s-d1')).status, tok).toBe(404);
    expect((await call(undefined, 'GET', '/api/designs/session/s-d1')).status).toBe(401);
  });
  it('what an allowed caller gets back is unchanged: ids, name, designData, status, files', async () => {
    const r = await call(C1, 'GET', '/api/designs/session/s-d1');
    expect(Object.keys(r.body.data).sort()).toEqual(['createdAt', 'description', 'designData', 'designId', 'files', 'name', 'orderId', 'sessionId', 'status', 'updatedAt'].sort());
  });
});

describe('assertCanReadDesign / assertAdmin directly', () => {
  it('rules', async () => {
    await expect(assertCanReadDesign({ userId: 'u-admin', role: 'ADMIN' }, 'missing')).resolves.toBeUndefined();
    await expect(assertCanReadDesign({ userId: 'u-c1', role: 'CUSTOMER' }, 'd1')).resolves.toBeUndefined();
    await expect(assertCanReadDesign({ userId: 'u-c1', role: 'CUSTOMER' }, 'missing')).rejects.toMatchObject({ statusCode: 404 });
    await expect(assertCanReadDesign({ userId: 'u-v1', role: 'CUSTOMER' }, 'd1')).rejects.toMatchObject({ statusCode: 404 });
    await expect(assertCanReadDesign({ role: 'CUSTOMER' }, 'd1')).rejects.toMatchObject({ statusCode: 404 });
    await expect(assertCanReadDesign(undefined, 'd1')).rejects.toMatchObject({ statusCode: 404 });
    await expect(assertAdmin({ userId: 'u-admin', role: 'CUSTOMER' })).resolves.toBe('u-admin');
    for (const a of [undefined, { userId: 'u-c1', role: 'ADMIN' }, { userId: 'u-v1', role: 'ADMIN' }, { userId: 'ghost', role: 'ADMIN' }, { role: 'ADMIN' }]) await expect(assertAdmin(a as any)).rejects.toMatchObject({ statusCode: 403 });
    h.prisma.user = { findUnique: async () => { throw new Error('db down'); } };
    await expect(assertAdmin({ userId: 'u-admin', role: 'ADMIN' })).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe('role comes from the database, the real actor is recorded, failures change nothing', () => {
  it('a token claiming ADMIN for a customer or vendor cannot approve, reject, request changes or read', async () => {
    for (const tok of ['u-c1:ADMIN', 'u-v1:ADMIN']) {
      for (const [u, b] of [['approve', {}], ['reject', { reason: 'x' }], ['request-changes', { changes: ['x'] }]] as const) {
        expect((await call(tok, 'POST', `/api/designs/d5/review/${u}`, b)).status, `${tok} ${u}`).toBe(403);
      }
      expect((await call(tok, 'GET', '/api/designs/d3')).status).toBe(404);
    }
    expect(h.update).not.toHaveBeenCalled();
  });
  it('a token claiming CUSTOMER for the real admin still works as admin', async () => {
    expect((await call('u-admin:CUSTOMER', 'GET', '/api/designs/d3')).status).toBe(200);
  });
  it('an admin approval passes the verified admin id to the service, and a plain user approval touches nothing', async () => {
    const { designService } = await import('./design.service');
    const spy = vi.spyOn(designService, 'approveDesign').mockResolvedValue({ id: 'd5' } as any);
    expect((await call(C1, 'POST', '/api/designs/d5/review/approve', {})).status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
    expect((await call('u-admin:ADMIN', 'POST', '/api/designs/d5/review/approve', {})).status).toBe(200);
    expect(spy).toHaveBeenCalledWith('d5', 'u-admin', undefined);
    spy.mockRestore();
  });
  it('the service logs the real actor for approve and reject', async () => {
    const { logger } = await import('../../utils/logger');
    const spy = vi.spyOn(logger, 'info').mockImplementation((() => undefined) as any);
    const { designService } = await import('./design.service');
    await designService.approveDesign('d5', 'u-admin');
    await designService.rejectDesign('d5', 'u-admin', 'r');
    expect(spy).toHaveBeenCalledWith('design review decision', { designId: 'd5', actorId: 'u-admin', decision: 'approved' });
    expect(spy).toHaveBeenCalledWith('design review decision', { designId: 'd5', actorId: 'u-admin', decision: 'rejected' });
    spy.mockRestore();
  });
});

describe('a vendor account that is recorded as a design owner is still denied', () => {
  it('reads 404 on every read route', async () => {
    h.rows.d6 = mkDesign('d6', { ownerId: 'u-v1' });
    for (const path of ['', '/files', '/review']) expect((await call(V1, 'GET', `/api/designs/d6${path}`)).status, path).toBe(404);
  });
});

describe('BJ9b: review start uses the database role, and the admin check runs before the body is parsed', () => {
  it('a customer who owns the design and carries a forged ADMIN claim can read it but does not move it to IN_REVIEW', async () => {
    const r = await call('u-c1:ADMIN', 'GET', '/api/designs/d1/review');
    expect(r.status).toBe(200);
    expect(r.body.data.lifecycleStatus).toBe('SUBMITTED');
    expect(h.update).not.toHaveBeenCalled();
  });
  it('the same forged claim on a vendor account also leaves the state alone and is refused', async () => {
    expect((await call('u-v1:ADMIN', 'GET', '/api/designs/d1/review')).status).toBe(404);
    expect(h.update).not.toHaveBeenCalled();
  });
  const BAD = [['approve', { notes: 123 }], ['reject', {}], ['request-changes', {}]] as const;
  it('an invalid body fails body validation for a real admin, with a non-403 error (so the bodies below really are invalid)', async () => {
    for (const [u, b] of BAD) { const st = (await call(ADMIN, 'POST', `/api/designs/d5/review/${u}`, b)).status; expect(st, u).toBeGreaterThanOrEqual(400); expect(st, u).not.toBe(403); }
  });
  it('a non-admin with an invalid body gets 403, not 400: the role check is first', async () => {
    for (const tok of [C1, C2, V1, 'u-c1:ADMIN']) {
      for (const [u, b] of BAD) expect((await call(tok, 'POST', `/api/designs/d5/review/${u}`, b)).status, `${tok} ${u}`).toBe(403);
    }
    expect(h.update).not.toHaveBeenCalled();
  });
});
