import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';

const readLocalFile = vi.hoisted(() => vi.fn());
vi.mock('../../services/file-upload/upload.service', () => ({ fileUploadService: { readLocalFile } }));

import { fileRoutes } from './files.routes';
import { createSignedFileUrl, verifyFileSignature, isFileSigningConfigured, MAX_SIGNED_URL_TTL_SECONDS } from './signed-url';

const KEY = 'samples/p1/abc.png';
const NOW = 1_800_000_000;
afterEach(() => { delete process.env.FILE_URL_SIGNING_SECRET; });

describe('secret length boundary', () => {
  it('31 characters is refused, 32 is accepted', () => {
    process.env.FILE_URL_SIGNING_SECRET = 'a'.repeat(31);
    expect(isFileSigningConfigured()).toBe(false);
    expect(() => createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: 60 })).toThrow();
    process.env.FILE_URL_SIGNING_SECRET = 'a'.repeat(32);
    expect(isFileSigningConfigured()).toBe(true);
    expect(() => createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: 60 })).not.toThrow();
  });
});

describe('lifetime cap boundary', () => {
  beforeEach(() => { process.env.FILE_URL_SIGNING_SECRET = 'a'.repeat(32); });
  it('a URL signed for exactly the cap is valid; one second beyond the cap is not', () => {
    const u = new URL(createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: MAX_SIGNED_URL_TTL_SECONDS, nowSeconds: NOW }), 'http://x');
    const exp = u.searchParams.get('exp')!, sig = u.searchParams.get('sig')!;
    expect(exp).toBe(String(NOW + MAX_SIGNED_URL_TTL_SECONDS));
    expect(verifyFileSignature(KEY, exp, sig, NOW)).toBe(true);
    expect(verifyFileSignature(KEY, exp, sig, NOW - 1)).toBe(false);
    expect(MAX_SIGNED_URL_TTL_SECONDS).toBe(86400);
  });
});

describe('served response headers', () => {
  beforeEach(() => { process.env.FILE_URL_SIGNING_SECRET = 'a'.repeat(32); readLocalFile.mockResolvedValue({ buffer: Buffer.from('b'), extension: 'png' }); });
  it('pins the full Cache-Control, nosniff and content type for a served image', async () => {
    const a = Fastify(); await a.register(fileRoutes, { prefix: '/api' });
    const r = await a.inject({ method: 'GET', url: createSignedFileUrl(`/api/files/${KEY}`, { ttlSeconds: 60 }) });
    expect(r.statusCode).toBe(200);
    expect(r.headers['cache-control']).toBe('private, max-age=60');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['content-type']).toBe('image/png');
  });
  it('svg is a download and carries no cache header from this route', async () => {
    readLocalFile.mockResolvedValue({ buffer: Buffer.from('<svg/>'), extension: 'svg' });
    const a = Fastify(); await a.register(fileRoutes, { prefix: '/api' });
    const r = await a.inject({ method: 'GET', url: createSignedFileUrl('/api/files/s/a.svg', { ttlSeconds: 60 }) });
    expect(r.headers['content-disposition']).toBe('attachment');
    expect(r.headers['cache-control']).toBeUndefined();
  });
});
