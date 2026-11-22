import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Real filesystem, real upload service: LOCAL_UPLOAD_DIR = <cwd>/.data/uploads.
let tmp: string;
let outside: string;
let fetchStoredFile: any;
let StoredFileFetchError: any;
const origCwd = process.cwd();

beforeAll(async () => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'spf-'));
  outside = fs.mkdtempSync(path.join(os.tmpdir(), 'spf-out-'));
  const root = path.join(tmp, '.data/uploads');
  fs.mkdirSync(path.join(root, 'designs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'designs/a.jpg'), 'local-bytes');
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'secret');
  fs.symlinkSync(path.join(outside, 'secret.txt'), path.join(root, 'designs/link.txt'));
  fs.symlinkSync(outside, path.join(root, 'linkdir'));
  fs.writeFileSync(path.join(root, 'designs/big.bin'), Buffer.alloc(50 * 1024 * 1024 + 1));
  process.chdir(tmp);
  vi.resetModules();
  ({ fetchStoredFile, StoredFileFetchError } = await import('./stored-file-fetch'));
});
afterAll(() => { process.chdir(origCwd); fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(outside, { recursive: true, force: true }); });

const codeOf = async (p: Promise<unknown>) => {
  try { await p; } catch (e: any) { return e.code ?? String(e); }
  return 'resolved';
};

describe('local /api/files reads on a real filesystem', () => {
  it('reads a contained file (also with a query string)', async () => {
    expect((await fetchStoredFile('/api/files/designs/a.jpg')).toString()).toBe('local-bytes');
    expect((await fetchStoredFile('/api/files/designs/a.jpg?x=1')).toString()).toBe('local-bytes');
  });
  it('refuses lexical traversal, encoded traversal and empty keys', async () => {
    fs.writeFileSync(path.join(tmp, '.data/escape.txt'), 'x');
    for (const u of ['/api/files/../escape.txt', '/api/files/designs/../../escape.txt', '/api/files/%2e%2e/escape.txt', '/api/files/', '/api/files/%zz'])
      expect(await codeOf(fetchStoredFile(u)), u).toBe('LOCAL_FILE_NOT_FOUND');
  });
  it('refuses a symlink file and a symlinked directory that point outside the root', async () => {
    expect(await codeOf(fetchStoredFile('/api/files/designs/link.txt'))).toBe('LOCAL_FILE_NOT_FOUND');
    expect(await codeOf(fetchStoredFile('/api/files/linkdir/secret.txt'))).toBe('LOCAL_FILE_NOT_FOUND');
  });
  it('a file over the cap is refused through the descriptor path (small cap)', async () => {
    const { fileUploadService } = await import('./upload.service');
    const f = path.join(tmp, '.data/uploads/designs/grow.bin');
    fs.writeFileSync(f, Buffer.alloc(10));
    expect(await fileUploadService.readLocalFile('designs/grow.bin', { maxBytes: 16 })).not.toBeNull();
    fs.writeFileSync(f, Buffer.alloc(17));
    expect(await fileUploadService.readLocalFile('designs/grow.bin', { maxBytes: 16 })).toBeNull();
  });
  it('enforces the 50MB cap and refuses directories and missing files', async () => {
    expect(await codeOf(fetchStoredFile('/api/files/designs/big.bin'))).toBe('LOCAL_FILE_NOT_FOUND');
    expect(await codeOf(fetchStoredFile('/api/files/designs'))).toBe('LOCAL_FILE_NOT_FOUND');
    expect(await codeOf(fetchStoredFile('/api/files/designs/none.jpg'))).toBe('LOCAL_FILE_NOT_FOUND');
  });
});
