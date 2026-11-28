import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';
import { PDFDocument } from 'pdf-lib';

// A vendor token against every route that can read or change design, design file or approval state.
// Real routes, controllers, design service, access guards and error handler. Fake: prisma (in memory; every
// write is counted), the JWT verifier (token = userId:ROLE), approval and sample services (spies that must
// never be reached), redis (absent).
const db = vi.hoisted(() => {
  const state: any = { users: {}, designs: {}, orders: {}, writes: 0, fileCreates: 0 };
  state.match = (d: any, w: any): boolean =>
    Object.entries(w).every(([k, v]: [string, any]) => {
      if (k === 'OR') return v.some((c: any) => state.match(d, c));
      if (k === 'order') { const o = d.orderId ? state.orders[d.orderId] : null; return !!o && o.customer.userId === v.is.customer.is.userId; }
      return d[k] === v;
    });
  return state;
});
vi.mock('../../lib/redis', () => ({ getRedisClient: () => null }));
vi.mock('../../services/file-upload/upload.service', () => ({ fileUploadService: {} }));
vi.mock('../../services/pre-press-checker/prepress.service', () => ({ prePressCheckService: {} }));
vi.mock('../auth/services/jwt.service', () => ({
  jwtService: { verifyAccessToken: (t: string) => { const [userId, role] = t.split(':'); if (!role) throw new Error('bad token'); return { userId, role, email: 'x@y.z' }; } },
}));
vi.mock('../orders/approval.service', () => ({ approvalService: { requestApproval: vi.fn(), reopenApproval: vi.fn(), approveOrder: vi.fn() } }));
vi.mock('../orders/order.service', () => ({ orderService: { updateOrderStatus: vi.fn(), getOrder: vi.fn() } }));
vi.mock('../samples/sample.service', () => ({ sampleService: { approveSample: vi.fn(), rejectSample: vi.fn(), getSample: vi.fn(), uploadSamples: vi.fn() } }));
vi.mock('../../lib/prisma', () => {
  const client: any = {
    $queryRaw: async () => [], $executeRaw: async () => 0,
    user: { findUnique: async ({ where }: any) => (db.users[where.id] ? { role: db.users[where.id] } : null) },
    order: { findUnique: async ({ where }: any) => db.orders[where.id] ?? null },
    designFile: { create: async () => { db.fileCreates++; db.writes++; return {}; }, count: async () => 0 },
    design: {
      findUnique: async ({ where }: any) => {
        const all: any[] = Object.values(db.designs);
        const d = where.id ? db.designs[where.id] : where.sessionId ? all.find((x) => x.sessionId === where.sessionId) : null;
        return d ? { ...d, files: [], order: d.orderId ? db.orders[d.orderId] ?? null : null } : null;
      },
      create: async ({ data }: any) => { const row = { id: `n${Object.keys(db.designs).length + 1}`, lifecycleStatus: 'DRAFT', ownerId: null, orderId: null, ...data }; db.designs[row.id] = row; db.writes++; return { ...row, files: [] }; },
      updateMany: async ({ where, data }: any) => { const hits: any[] = Object.values(db.designs).filter((d) => db.match(d, where)); for (const d of hits) Object.assign(d, data); db.writes += hits.length; return { count: hits.length }; },
      update: async () => { db.writes++; return {}; },
    },
  };
  client.$transaction = async (cb: any) => cb(client);
  return { prisma: client };
});

import { designRoutes } from './design.routes';
import { approvalRoutes, orderRoutes } from '../orders/order.routes';
import { sampleRoutes } from '../samples/sample.routes';
import { httpErrorHandler } from '../../utils/http-error-handler';
import { approvalService } from '../orders/approval.service';
import { orderService } from '../orders/order.service';
import { sampleService } from '../samples/sample.service';
import { designService } from './design.service';

const V = 'vend1:VENDOR';
const HASH = 'a'.repeat(64);
// A review PDF that passes every stateless check (page size, subject), so the only thing left to refuse it is the owner check.
async function reviewPdfBase64(): Promise<string> {
  const pdf = await PDFDocument.create(); pdf.addPage([(390 * 72) / 25.4, (218 * 72) / 25.4]); pdf.setSubject(`f42-artwork-review-v1:${HASH}`);
  return Buffer.from(await pdf.save()).toString('base64');
}
const mk = (id: string, over: any = {}) => ({ id, ownerId: null, orderId: null, sessionId: `s-${id}`, lifecycleStatus: 'DRAFT', name: 'SECRET-NAME', designData: { note: 'SECRET-DATA' }, createdAt: 'c', updatedAt: 'u', ...over });
const snap = () => JSON.stringify(db.designs);

beforeEach(() => {
  db.users = { cust1: 'CUSTOMER', vend1: 'VENDOR', admin1: 'ADMIN' };
  db.orders = { o1: { customer: { userId: 'cust1' } } };
  db.designs = { d1: mk('d1', { ownerId: 'cust1' }), d2: mk('d2', { orderId: 'o1' }), d3: mk('d3', { lifecycleStatus: 'SUBMITTED', ownerId: 'cust1' }), dN: mk('dN') };
  db.writes = 0; db.fileCreates = 0;
  for (const svc of [approvalService, orderService, sampleService] as any[]) for (const f of Object.values(svc)) (f as any).mockClear?.();
  for (const m of ['submitDesign', 'recallDesign', 'exportDesign', 'addCommentToDesign', 'approveDesign', 'rejectDesign', 'requestChanges'] as const) vi.spyOn(designService as any, m).mockResolvedValue({ ok: true } as any);
});

const call = async (token: string | undefined, method: 'GET' | 'POST' | 'PATCH', url: string, payload?: any) => {
  const a = Fastify(); a.setErrorHandler(httpErrorHandler);
  await a.register(designRoutes, { prefix: '/api' }); await a.register(orderRoutes, { prefix: '/api' }); await a.register(approvalRoutes, { prefix: '/api' }); await a.register(sampleRoutes, { prefix: '/api' });
  const r = await a.inject({ method, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload });
  return { status: r.statusCode, text: r.body };
};

// Every route a vendor-role token can reach that touches design, design file or approval state.
const ROUTES: Array<[string, 'GET' | 'POST' | 'PATCH', string, any, number]> = [
  ['read design', 'GET', '/api/designs/d1', undefined, 404],
  ['read design files', 'GET', '/api/designs/d1/files', undefined, 404],
  ['read design by session', 'GET', '/api/designs/session/s-d1', undefined, 404],
  ['read review', 'GET', '/api/designs/d3/review', undefined, 404],
  ['read artwork review', 'GET', '/api/designs/d1/artwork-reviews/f1', undefined, 403],
  ['create artwork review', 'POST', '/api/designs/d1/artwork-reviews', { snapshotHash: HASH, pdfBase64: '__PDF__' }, 403],
  ['submit', 'POST', '/api/designs/d1/submit', {}, 404],
  ['recall', 'POST', '/api/designs/d3/recall', {}, 404],
  ['export', 'POST', '/api/designs/d1/export', { format: 'png' }, 404],
  ['review comment', 'POST', '/api/designs/d3/review/comment', { commentText: 'hi' }, 404],
  ['review approve', 'POST', '/api/designs/d3/review/approve', {}, 403],
  ['review reject', 'POST', '/api/designs/d3/review/reject', { reason: 'no' }, 403],
  ['review request changes', 'POST', '/api/designs/d3/review/request-changes', { comments: 'no' }, 403],
  ['save into a customer session', 'POST', '/api/designs/save', { sessionId: 's-d1', designData: { layers: ['vendor'] } }, 403],
  ['save into an order-bound session', 'POST', '/api/designs/save', { sessionId: 's-d2', designData: { layers: ['vendor'] } }, 403],
  ['save into an ownerless legacy draft', 'POST', '/api/designs/save', { sessionId: 's-dN', designData: { layers: ['vendor'] } }, 403],
  ['request approval', 'POST', '/api/orders/o1/request-approval', { printFileId: 'f', dielineFileId: null }, 403],
  ['reopen approval', 'POST', '/api/orders/o1/reopen-approval', { reason: 'long enough reason' }, 403],
  ['set order status', 'PATCH', '/api/orders/o1/status', { status: 'in_production' }, 403],
  ['approve a sample', 'POST', '/api/samples/s1/approve', {}, 403],
  ['reject a sample', 'POST', '/api/samples/s1/reject', { revisionNotes: 'x', submissionId: '8f14e45f-ceea-467a-9575-6e1d2f8d0e1b' }, 403],
];

describe('a vendor token cannot read or change design, design file or approval state', () => {
  for (const [name, method, url, payload, want] of ROUTES) {
    it(`${name}: ${method} ${url} -> ${want}`, async () => {
      const before = snap();
      const body = payload && payload.pdfBase64 === '__PDF__' ? { ...payload, pdfBase64: await reviewPdfBase64() } : payload;
      const r = await call(V, method, url, body);
      expect(r.status, name).toBe(want);
      expect(r.text).not.toContain('SECRET');
      expect(snap()).toBe(before);
      expect(db.writes).toBe(0);
      for (const svc of [approvalService, orderService, sampleService] as any[]) for (const f of Object.values(svc)) expect((f as any).mock.calls.length).toBe(0);
      for (const m of ['submitDesign', 'recallDesign', 'exportDesign', 'addCommentToDesign', 'approveDesign', 'rejectDesign', 'requestChanges'] as const) expect((designService as any)[m]).not.toHaveBeenCalled();
    });
  }
  it('control: the owning customer is not refused on the same harness', async () => {
    expect((await call('cust1:CUSTOMER', 'GET', '/api/designs/d1')).status).toBe(200);
    expect((await call('cust1:CUSTOMER', 'POST', '/api/designs/save', { sessionId: 's-d1', designData: { layers: ['mine'] } })).status).toBeLessThan(300);
    expect(db.writes).toBeGreaterThan(0);
  });
  it('a vendor can only create and write a design it owns (session create is not a write to anyone else)', async () => {
    const created = await call(V, 'POST', '/api/designs/session', { productType: 'box' });
    const own = Object.values(db.designs).filter((d: any) => d.ownerId === 'vend1');
    expect(created.status).toBeLessThan(300);
    expect(own.length).toBe(1);
    expect(Object.values(db.designs).filter((d: any) => d.ownerId === 'cust1').length).toBe(2);
    expect((db.designs.d1 as any).designData).toEqual({ note: 'SECRET-DATA' });
  });
});
