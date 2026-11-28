import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Fastify from 'fastify';

// Real filesystem, real upload service and file route: what isUnder validates must be what is read.
let tmp: string;
let readLocalFile: (k: string) => Promise<{ buffer: Buffer } | null>;
let fetchStoredFile: (u: string) => Promise<Buffer>;
let isUnder: (u: string, f: string) => boolean;
let createSignedFileUrl: (u: string, o: { ttlSeconds: number }) => string;
let fileRoutes: any;
const origCwd = process.cwd();
const SECRET = 'test-signing-secret-0123456789abcdef-xyz';

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rc-'));
  const root = path.join(tmp, '.data/uploads');
  fs.mkdirSync(path.join(root, 'designs/d1'), { recursive: true });
  fs.writeFileSync(path.join(root, 'designs/d1/a.png'), 'A-bytes');
  fs.writeFileSync(path.join(root, 'designs/b.png'), 'B-bytes');
  process.chdir(tmp);
  process.env.FILE_URL_SIGNING_SECRET = SECRET;
  vi.resetModules();
  ({ fileUploadService: { readLocalFile } } = (await import('../../services/file-upload/upload.service')) as any);
  ({ fetchStoredFile } = (await import('../../services/file-upload/stored-file-fetch')) as any);
  ({ isUnder } = (await import('./file-access')) as any);
  ({ createSignedFileUrl } = (await import('./signed-url')) as any);
  ({ fileRoutes } = (await import('./files.routes')) as any);
});
afterAll(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); delete process.env.FILE_URL_SIGNING_SECRET; });

const read = async (key: string) => (await readLocalFile(key))?.buffer.toString() ?? null;

describe('what is validated is what is read', () => {
  it('a key isUnder accepts is read verbatim: the same file the string names', async () => {
    expect(isUnder('/api/files/designs/d1/a.png', 'designs/d1')).toBe(true);
    expect(await read('designs/d1/a.png')).toBe('A-bytes');
  });
  it('readLocalFile normalises dot segments (so "./" would silently read another path): isUnder refuses them', async () => {
    expect(await read('designs/d1/./a.png')).toBe('A-bytes'); // same file via normalisation
    expect(await read('designs/d1/../b.png')).toBe('B-bytes'); // a different file, still inside the root
    expect(isUnder('/api/files/designs/d1/./a.png', 'designs/d1')).toBe(false);
    expect(isUnder('/api/files/designs/d1/../b.png', 'designs/d1')).toBe(false);
  });
  it('readLocalFile does not decode percent escapes; fetchStoredFile decodes once. isUnder refuses any "%" so the two cannot disagree', async () => {
    expect(await read('designs/d1/%2e%2e/b.png')).toBeNull(); // literal, no such path
    expect((await fetchStoredFile('/api/files/designs/d1/%2e%2e/b.png')).toString()).toBe('B-bytes'); // decoded once into a dot-dot
    expect(isUnder('/api/files/designs/d1/%2e%2e/b.png', 'designs/d1')).toBe(false);
    expect(isUnder('/api/files/designs/d1/a%2Fb.png', 'designs/d1')).toBe(false);
  });
  it('double-encoded keys are decoded only once by fetchStoredFile, and are refused by isUnder', async () => {
    await expect(fetchStoredFile('/api/files/designs/d1/%252e%252e/b.png')).rejects.toBeTruthy();
    expect(isUnder('/api/files/designs/d1/%252e%252e/b.png', 'designs/d1')).toBe(false);
  });
  it('keys that escape the upload root read nothing', async () => {
    expect(await read('../escape.txt')).toBeNull();
    expect(await read('/etc/passwd')).toBeNull();
    expect(await read('designs/d1/a.png\u0000.txt')).toBeNull();
  });
});

describe('the file route consumes the same string that was signed', () => {
  const app = async () => { const a = Fastify(); await a.register(fileRoutes, { prefix: '/api' }); return a; };
  it('serves a signed plain key', async () => {
    const r = await (await app()).inject({ method: 'GET', url: createSignedFileUrl('/api/files/designs/d1/a.png', { ttlSeconds: 60 }) });
    expect(r.statusCode).toBe(200);
    expect(r.body).toBe('A-bytes');
  });
  it('a signed URL whose key holds a literal %2e%2e segment is refused: the route decodes the path once, so the signature no longer matches', async () => {
    const url = createSignedFileUrl('/api/files/designs/d1/%2e%2e/b.png', { ttlSeconds: 60 });
    const r = await (await app()).inject({ method: 'GET', url });
    expect(r.statusCode).toBe(401);
    expect(r.body).not.toContain('B-bytes');
  });
  it('the signer refuses dot, dot-dot and empty segments outright', () => {
    for (const k of ['designs/d1/./a.png', 'designs/d1/../b.png', 'designs//a.png']) expect(() => createSignedFileUrl(`/api/files/${k}`, { ttlSeconds: 60 })).toThrow();
  });
});
