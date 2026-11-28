import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';

const readLocalFile = vi.hoisted(() => vi.fn());
vi.mock('../../services/file-upload/upload.service', () => ({ fileUploadService: { readLocalFile } }));

import { fileRoutes } from './files.routes';
import { createSignedFileUrl, verifyFileSignature, MAX_SIGNED_URL_TTL_SECONDS } from './signed-url';

const SECRET = 'test-signing-secret-0123456789abcdef-xyz';
const KEY = 'samples/p1/abc.png';
const NOW = 1_800_000_000;

async function app() {
  const a = Fastify();
  await a.register(fileRoutes, { prefix: '/api' });
  return a;
}
const get = async (url: string) => (await app()).inject({ method: 'GET', url });

beforeEach(() => {
  process.env.FILE_URL_SIGNING_SECRET = SECRET;
  readLocalFile.mockReset();
  readLocalFile.mockResolvedValue({ buffer: Buffer.from('bytes'), extension: 'png' });
});
afterEach(() => { delete process.env.FILE_URL_SIGNING_SECRET; vi.useRealTimers(); });

describe('/api/files/* requires a signed, expiring URL', () => {
  it('rejects an unsigned URL and never reads the file', async () => {
    const r = await get(`/api/files/${KEY}`);
    expect(r.statusCode).toBe(401);
    expect(readLocalFile).not.toHaveBeenCalled();
  });
  it('serves a freshly signed URL', async () => {
    const url = createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: 300 });
    const r = await get(url);
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).not.toMatch(/public/);
    expect(readLocalFile).toHaveBeenCalledWith(KEY);
  });
  it('rejects an expired URL', async () => {
    const url = createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: 60, nowSeconds: Math.floor(Date.now() / 1000) - 120 });
    expect((await get(url)).statusCode).toBe(401);
    expect(readLocalFile).not.toHaveBeenCalled();
  });
  it('rejects a signature made for another key', async () => {
    const other = createSignedFileUrl('/api/files/samples/p1/other.png', { ttlSeconds: 300 });
    const q = other.slice(other.indexOf('?'));
    expect((await get(`/api/files/${KEY}${q}`)).statusCode).toBe(401);
  });
  it('rejects a tampered expiry and a tampered signature', async () => {
    const url = createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: 300 });
    const u = new URL(url, 'http://x');
    const exp = Number(u.searchParams.get('exp'));
    const sig = u.searchParams.get('sig')!;
    expect((await get(`/api/files/${KEY}?exp=${exp + 3600}&sig=${sig}`)).statusCode).toBe(401);
    expect((await get(`/api/files/${KEY}?exp=${exp}&sig=${sig.slice(0, -1)}${sig.endsWith('0') ? '1' : '0'}`)).statusCode).toBe(401);
    expect((await get(`/api/files/${KEY}?exp=abc&sig=${sig}`)).statusCode).toBe(401);
    expect((await get(`/api/files/${KEY}?exp=${exp}`)).statusCode).toBe(401);
    expect(readLocalFile).not.toHaveBeenCalled();
  });
  it('fails closed (503) when no signing secret is configured, even for a well-formed query', async () => {
    const url = createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: 300 });
    delete process.env.FILE_URL_SIGNING_SECRET;
    const r = await get(url);
    expect(r.statusCode).toBe(503);
    expect(readLocalFile).not.toHaveBeenCalled();
  });
  it('refuses a short secret', () => {
    process.env.FILE_URL_SIGNING_SECRET = 'short';
    expect(() => createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: 60 })).toThrow();
  });
});

describe('signing rules', () => {
  it('caps the lifetime and requires a positive ttl', () => {
    expect(() => createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: MAX_SIGNED_URL_TTL_SECONDS + 1 })).toThrow();
    expect(() => createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: 0 })).toThrow();
    expect(() => createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: -5 })).toThrow();
  });
  it('rejects a URL that is not an /api/files/ path', () => {
    expect(() => createSignedFileUrl('https://example.com/a.png', { ttlSeconds: 60 })).toThrow();
    expect(() => createSignedFileUrl('/api/files/../x.png', { ttlSeconds: 60 })).toThrow();
  });
  it('verifies at the exact boundary: valid until exp, invalid after', () => {
    const url = createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: 100, nowSeconds: NOW });
    const u = new URL(url, 'http://x');
    const exp = u.searchParams.get('exp')!, sig = u.searchParams.get('sig')!;
    expect(exp).toBe(String(NOW + 100));
    expect(verifyFileSignature(KEY, exp, sig, NOW + 100)).toBe(true);
    expect(verifyFileSignature(KEY, exp, sig, NOW + 101)).toBe(false);
  });
  it('rejects an exp further out than the cap, even if correctly signed', () => {
    const url = createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: MAX_SIGNED_URL_TTL_SECONDS, nowSeconds: NOW });
    const u = new URL(url, 'http://x');
    expect(verifyFileSignature(KEY, u.searchParams.get('exp')!, u.searchParams.get('sig')!, NOW - 10)).toBe(false);
  });
});
