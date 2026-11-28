import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

// Real routes, controller, service, auth middleware and error handler. Fake: prisma (in memory, writes counted)
// and the JWT verifier (token = userId:ROLE; the role in the token is only a claim, which requireAdmin reads).
const db = vi.hoisted(() => ({ templates: {} as Record<string, any>, writes: 0 }));
vi.mock('../../lib/redis', () => ({ getRedisClient: () => null }));
vi.mock('../auth/services/jwt.service', () => ({
  jwtService: { verifyAccessToken: (t: string) => { const [userId, role] = t.split(':'); if (!role) throw new Error('bad token'); return { userId, role, email: 'x@y.z' }; } },
}));
vi.mock('../../lib/prisma', () => ({
  prisma: {
    template: {
      findUnique: async ({ where }: any) => db.templates[where.id] ?? null,
      create: async ({ data }: any) => { db.writes++; const row = { id: 't9', ...data }; db.templates.t9 = row; return row; },
      update: async ({ where, data }: any) => { db.writes++; Object.assign(db.templates[where.id], data); return db.templates[where.id]; },
      delete: async ({ where }: any) => { db.writes++; delete db.templates[where.id]; return {}; },
    },
  },
}));

import { templateRoutes } from './template.routes';
import { httpErrorHandler } from '../../utils/http-error-handler';

const call = async (token: string | undefined, method: 'POST' | 'PATCH' | 'DELETE', url: string, payload?: any) => {
  const a = Fastify(); a.setErrorHandler(httpErrorHandler); await a.register(templateRoutes, { prefix: '/api' });
  const r = await a.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload });
  return { status: r.statusCode, text: r.body };
};

beforeEach(() => { db.templates = { mine: { id: 'mine', name: 'SECRET', designData: {}, createdBy: 'cust1' } }; db.writes = 0; });

const WRITES = [
  ['create', (t?: string) => call(t, 'POST', '/api/templates', { name: 'n', category: 'c', designData: {} })],
  ['update', (t?: string) => call(t, 'PATCH', '/api/templates/mine', { name: 'hijacked' })],
  ['delete', (t?: string) => call(t, 'DELETE', '/api/templates/mine')],
] as const;

// Known limit (documented, not changed): requireAdmin and requireRoles (middleware/rbac.ts) read the role claim in
// the token, not the database role. A signed token that said ADMIN keeps passing these gates until it expires,
// even after the account is demoted. This also applies to the approval request/reopen, order status and sample
// approve/reject routes. A token issued to a vendor or customer cannot pass them.
describe('template create, update and delete are admin routes', () => {
  for (const [name, act] of WRITES) {
    it(`${name}: a vendor, a customer (even the creator) and no token are refused with no write`, async () => {
      expect((await act('vend1:VENDOR')).status).toBe(403);
      expect((await act('cust1:CUSTOMER')).status).toBe(403);
      expect((await act(undefined)).status).toBe(401);
      expect(db.writes).toBe(0);
      expect(db.templates.mine.name).toBe('SECRET');
    });
  }
  it('an admin token passes the gate', async () => {
    for (const [, act] of WRITES) expect((await act('admin1:ADMIN')).status).toBe(200);
    expect(db.writes).toBeGreaterThanOrEqual(3);
  });
});
