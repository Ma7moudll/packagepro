import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';
import { readFileSync } from 'node:fs';
import { createSignedFileUrlResponses, collectFileUrls, mapFileUrls, SIGNED_RESPONSE_TTL_SECONDS } from './signed-response';
import { verifyFileSignature } from './signed-url';
import { logger } from '../../utils/logger';
import type { FileRef, Actor } from './file-access';

const SECRET = 'test-signing-secret-0123456789abcdef-xyz';
const OWN = '/api/files/designs/a.png';
const OTHER = '/api/files/designs/b.png';
const refs: FileRef[] = [
  { url: OWN, kind: 'design_file', bound: true, designOwnerUserId: 'u1' },
  { url: OTHER, kind: 'design_file', bound: true, designOwnerUserId: 'u2' },
];
let loadCalls = 0;
const loader = vi.fn(() => async () => { loadCalls++; return refs; });

async function app(user: Actor | undefined, body: unknown, failLoad = false) {
  const a = Fastify();
  a.addHook('preHandler', async (req) => { (req as any).user = user; });
  await a.register(createSignedFileUrlResponses({ loader: failLoad ? () => async () => { throw new Error('db down'); } : loader }));
  await a.register(async (c) => { c.get('/x', async () => body); }, { prefix: '/api' });
  return a;
}
const get = async (user: Actor | undefined, body: unknown, failLoad = false) => (await (await app(user, body, failLoad)).inject({ method: 'GET', url: '/api/x' })).json();
const U1: Actor = { userId: 'u1', role: 'CUSTOMER' };

beforeEach(() => { process.env.FILE_URL_SIGNING_SECRET = SECRET; loadCalls = 0; });
afterEach(() => { delete process.env.FILE_URL_SIGNING_SECRET; vi.restoreAllMocks(); });

const check = (url: string, key: string) => {
  const u = new URL(url, 'http://x');
  expect(u.pathname).toBe(`/api/files/${key}`);
  expect(verifyFileSignature(key, u.searchParams.get('exp')!, u.searchParams.get('sig'))).toBe(true);
  return Number(u.searchParams.get('exp'));
};

describe('issuance: only entitled files are signed, the rest are null', () => {
  it('signs the entitled file and nulls the other one, nested', async () => {
    const r = await get(U1, { data: { files: [{ fileUrl: OWN }, { fileUrl: OTHER }], note: 'keep', ext: 'https://cdn.example.com/a.png' } });
    check(r.data.files[0].fileUrl, 'designs/a.png');
    expect(r.data.files[1].fileUrl).toBeNull();
    expect(r.data.note).toBe('keep');
    expect(r.data.ext).toBe('https://cdn.example.com/a.png');
  });
  it('never returns a raw /api/files/ value, whatever the outcome', async () => {
    for (const user of [U1, undefined, { userId: 'u9', role: 'VENDOR' } as Actor]) {
      const text = JSON.stringify(await get(user, { a: OWN, b: OTHER, c: [OWN] }));
      expect(text).not.toMatch(/"\/api\/files\/[^"?]*"/);
    }
  });
  it('an unauthenticated response gets null for every file URL', async () => {
    expect(await get(undefined, { a: OWN })).toEqual({ a: null });
  });
  it('the signed URL lives exactly 15 minutes', async () => {
    const before = Math.floor(Date.now() / 1000);
    const r = await get(U1, { a: OWN });
    const exp = check(r.a, 'designs/a.png');
    const after = Math.floor(Date.now() / 1000);
    expect(SIGNED_RESPONSE_TTL_SECONDS).toBe(900);
    expect(exp - 900).toBeGreaterThanOrEqual(before);
    expect(exp - 900).toBeLessThanOrEqual(after);
  });
  it('fails closed when the entitlement lookup fails', async () => {
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    expect(await get(U1, { a: OWN }, true)).toEqual({ a: null });
  });
  it('withholds every file URL when no signing secret is configured', async () => {
    delete process.env.FILE_URL_SIGNING_SECRET;
    vi.spyOn(logger, 'error').mockImplementation(() => {});
    expect(await get(U1, { a: OWN })).toEqual({ a: null });
  });
  it('does not touch the database when a response has no file URLs', async () => {
    expect(await get(U1, { a: 'plain', b: ['x'] })).toEqual({ a: 'plain', b: ['x'] });
    expect(loadCalls).toBe(0);
  });
  it('logs nothing when every file is allowed', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    await get(U1, { a: OWN });
    expect(warn).not.toHaveBeenCalled();
  });
  it('logs the denied file by hash only', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    await get(U1, { a: OTHER });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('designs/b.png');
  });
});

describe('walking', () => {
  it('signs a value that is shared in two places, not only the first (shared reference is not a cycle)', async () => {
    const shared = { fileUrl: OWN };
    const r = await get(U1, { a: shared, b: shared, list: [shared, shared] });
    for (const v of [r.a.fileUrl, r.b.fileUrl, r.list[0].fileUrl, r.list[1].fileUrl]) check(v, 'designs/a.png');
  });
  it('a true cycle does not loop, and the back-reference is withheld (null) rather than passed through', () => {
    const a: any = { u: OWN }; a.self = a;
    const out: any = mapFileUrls(a, () => 'X');
    expect(out.u).toBe('X');
    expect(out.self).toBeNull();
    const arr: any[] = [OWN]; arr.push(arr);
    const o2: any = mapFileUrls(arr, () => 'X');
    expect(o2[0]).toBe('X');
    expect(o2[1]).toBeNull();
  });
  it('depth limit: 10 levels are handled, 40 are left as stored in the collector', () => {
    let shallow: any = { u: OWN }; for (let i = 0; i < 10; i++) shallow = { n: shallow };
    expect(collectFileUrls(shallow)).toEqual([OWN]);
    let deep: any = { u: OWN }; for (let i = 0; i < 40; i++) deep = { n: deep };
    expect(collectFileUrls(deep)).toEqual([]);
  });
  it('strips a query before the lookup and leaves lookalikes alone', () => {
    expect(collectFileUrls({ a: `${OWN}?exp=1&sig=zz`, b: '/api/files-not/here', c: 'https://x/api/files/a.png', d: new Date() })).toEqual([OWN]);
  });
});

describe('wiring', () => {
  const src = readFileSync(new URL('../../index.ts', import.meta.url), 'utf8');
  it('is registered in index.ts before the route plugins', () => {
    const reg = src.indexOf('server.register(signedFileUrlResponses)');
    expect(reg).toBeGreaterThan(-1);
    expect(reg).toBeLessThan(src.indexOf("server.register(authRoutes, { prefix: '/api' })"));
    expect(src).toContain("import('./modules/files/signed-response')");
  });
  it('refuses to boot in production without a signing secret', () => {
    expect(src).toMatch(/NODE_ENV === 'production' && !isFileSigningConfigured\(\)/);
    expect(src).toContain('FILE_URL_SIGNING_SECRET (32+ characters) must be set in production');
  });
  it('the write paths and docker-compose carry the new controls', () => {
    expect(readFileSync(new URL('../designs/design.controller.ts', import.meta.url), 'utf8')).toContain("'POST saveDesign'");
    expect(readFileSync(new URL('../reviews/review.controller.ts', import.meta.url), 'utf8')).toContain("'POST createReview'");
    expect(readFileSync(new URL('../../../../docker-compose.yml', import.meta.url), 'utf8')).toContain('FILE_URL_SIGNING_SECRET: ${FILE_URL_SIGNING_SECRET:?');
  });
});

describe('walk limits fail closed', () => {
  it('a file URL deeper than the depth limit is withheld, not returned raw', async () => {
    let deep: any = { u: OWN };
    for (let i = 0; i < 30; i++) deep = { n: deep };
    const text = JSON.stringify(await get(U1, deep));
    expect(text).not.toContain('/api/files/');
  });
  it('a value with toJSON is walked: its file URL is signed or nulled, never raw', async () => {
    class Box { toJSON() { return { u: OTHER, v: OWN }; } }
    const r = await get(U1, { b: new Box() });
    expect(r.b.u).toBeNull();
    check(r.b.v, 'designs/a.png');
  });
});

describe('an unsignable URL never becomes a 500', () => {
  it('a key the signer refuses (dot segment, empty segment) comes back null, not an error', async () => {
    const bad = ['/api/files/designs/d1/./a.png', '/api/files/designs//a.png', '/api/files/designs/d1/../a.png'];
    const badRefs: FileRef[] = bad.map((url) => ({ url, kind: 'design_file', bound: true, designOwnerUserId: 'u1' }));
    const a = Fastify();
    a.addHook('preHandler', async (req) => { (req as any).user = U1; });
    await a.register(createSignedFileUrlResponses({ loader: () => async () => badRefs }));
    await a.register(async (c) => { c.get('/x', async () => ({ list: bad, ok: 1 })); }, { prefix: '/api' });
    const res = await a.inject({ method: 'GET', url: '/api/x' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ list: [null, null, null], ok: 1 });
  });
});
