import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

vi.mock('./upload.service', () => ({ fileUploadService: { readLocalFile: async () => null } }));

import { fetchStoredFile, isPublicAddress, createGuardedLookup, StoredFileFetchError, MAX_STORED_FILE_BYTES } from './stored-file-fetch';

const codeOf = async (p: Promise<unknown>) => {
  try { await p; } catch (e) { return e instanceof StoredFileFetchError ? e.code : `other:${String(e)}`; }
  return 'resolved';
};

describe('address classification (ipaddr.js ranges)', () => {
  it('rejects every non-global address class', () => {
    for (const a of [
      '0.0.0.0', '127.0.0.1', '10.0.0.5', '172.16.1.1', '172.31.255.255', '192.168.0.1', '169.254.169.254', '100.64.0.1',
      '192.0.0.1', '192.0.2.1', '198.18.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '240.0.0.1', '255.255.255.255',
      '::', '::1', 'fc00::1', 'fd00::1', 'fe80::1', 'fe81::1', 'fe90::1', 'febf::1', 'fec0::1', 'ff02::1',
      '::ffff:127.0.0.1', '::ffff:7f00:1', '0:0:0:0:0:ffff:a00:1', '::ffff:169.254.169.254', '2001:db8::1', '64:ff9b::1', '2002:7f00:1::', '2001::1', 'not-an-ip', '',
    ]) expect(isPublicAddress(a), a).toBe(false);
  });
  it('accepts ordinary public addresses', () => {
    for (const a of ['93.184.216.34', '8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8']) expect(isPublicAddress(a), a).toBe(true);
  });
});

describe('guarded lookup (the address the socket uses is the one validated)', () => {
  const run = (resolver: any, allowPrivate = false, all = false) =>
    new Promise<{ err: any; address?: any }>((resolve) =>
      createGuardedLookup(allowPrivate, resolver)('h.example', { all } as any, (err, address) => resolve({ err, address })));

  it('returns a validated public address', async () => {
    const r = await run(async () => [{ address: '93.184.216.34', family: 4 }]);
    expect(r.err).toBeNull();
    expect(r.address).toBe('93.184.216.34');
  });
  it('resolves exactly once per connection and returns only what it checked (rebinding cannot swap it)', async () => {
    let calls = 0;
    const resolver = async () => (++calls === 1 ? [{ address: '93.184.216.34', family: 4 }] : [{ address: '10.0.0.1', family: 4 }]);
    const r = await run(resolver);
    expect(calls).toBe(1);
    expect(r.address).toBe('93.184.216.34');
  });
  it('rejects private, mixed and empty answers', async () => {
    expect((await run(async () => [{ address: '10.1.2.3', family: 4 }])).err?.code).toBe('EBLOCKEDADDR');
    expect((await run(async () => [{ address: '93.184.216.34', family: 4 }, { address: '127.0.0.1', family: 4 }])).err?.code).toBe('EBLOCKEDADDR');
    expect((await run(async () => [])).err?.code).toBe('EBLOCKEDADDR');
    expect((await run(async () => [{ address: '::ffff:10.0.0.1', family: 6 }])).err?.code).toBe('EBLOCKEDADDR');
  });
  it('propagates resolver failure', async () => {
    expect((await run(async () => { throw new Error('nx'); })).err).toBeTruthy();
  });
  it('allowPrivate (exact S3_ENDPOINT origin only) permits a private address', async () => {
    expect((await run(async () => [{ address: '10.0.0.9', family: 4 }], true)).address).toBe('10.0.0.9');
  });
  it('supports all:true', async () => {
    const r = await run(async () => [{ address: '8.8.8.8', family: 4 }], false, true);
    expect(r.address).toEqual([{ address: '8.8.8.8', family: 4 }]);
  });
});

describe('origin allowlist (production, fail closed)', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });
  const prod = () => { process.env.NODE_ENV = 'production'; delete process.env.CDN_URL; delete process.env.S3_ENDPOINT; delete process.env.STORED_FILE_ALLOWED_HOSTS; delete process.env.S3_BUCKET_NAME; };

  it('nothing is allowed when storage is not configured, including the old default bucket host', async () => {
    prod();
    expect(await codeOf(fetchStoredFile('https://packagepro-files.s3.amazonaws.com/a.jpg'))).toBe('HOST_NOT_ALLOWED');
    process.env.S3_BUCKET_NAME = 'packagepro-files';
    expect(await codeOf(fetchStoredFile('https://packagepro-files.s3.amazonaws.com/a.jpg'))).toBe('HOST_NOT_ALLOWED');
  });
  it('plain http, credentials, bad urls and loopback are refused', async () => {
    prod();
    process.env.CDN_URL = 'https://cdn.example.com';
    expect(await codeOf(fetchStoredFile('http://cdn.example.com/a.jpg'))).toBe('HTTPS_REQUIRED');
    expect(await codeOf(fetchStoredFile('http://127.0.0.1:1/a.jpg'))).toBe('HTTPS_REQUIRED');
    expect(await codeOf(fetchStoredFile('https://127.0.0.1/a.jpg'))).toBe('HOST_NOT_ALLOWED');
    expect(await codeOf(fetchStoredFile('https://u:p@cdn.example.com/a.jpg'))).toBe('CREDENTIALS_IN_URL');
    expect(await codeOf(fetchStoredFile('nope'))).toBe('INVALID_URL');
    expect(await codeOf(fetchStoredFile('file:///etc/passwd'))).toBe('HTTPS_REQUIRED');
  });
  it('ports are part of the origin: an allowlisted host does not open other ports', async () => {
    prod();
    process.env.CDN_URL = 'https://cdn.example.com';
    process.env.STORED_FILE_ALLOWED_HOSTS = 'files.example.com, alt.example.com:8443';
    expect(await codeOf(fetchStoredFile('https://cdn.example.com:8443/a.jpg'))).toBe('HOST_NOT_ALLOWED');
    expect(await codeOf(fetchStoredFile('https://files.example.com:6379/a.jpg'))).toBe('HOST_NOT_ALLOWED');
    expect(await codeOf(fetchStoredFile('https://alt.example.com/a.jpg'))).toBe('HOST_NOT_ALLOWED');
    expect(await codeOf(fetchStoredFile('https://alt.example.com:9999/a.jpg'))).toBe('HOST_NOT_ALLOWED');
  });
  it('an allowlisted IP literal that is non-public is refused; private is only for the exact S3_ENDPOINT origin', async () => {
    prod();
    process.env.STORED_FILE_ALLOWED_HOSTS = '10.0.0.5, [fe81::1]';
    expect(await codeOf(fetchStoredFile('https://10.0.0.5/a.jpg'))).toBe('PRIVATE_ADDRESS');
    expect(await codeOf(fetchStoredFile('https://[fe81::1]/a.jpg'))).toBe('PRIVATE_ADDRESS');
    process.env.S3_ENDPOINT = 'https://10.0.0.7:9000';
    // Same private host on another port is not allowed at all.
    expect(await codeOf(fetchStoredFile('https://10.0.0.7:9001/a.jpg'))).toBe('HOST_NOT_ALLOWED');
    // Exact endpoint passes the policy and fails only at connect (nothing listens): download error, not policy error.
    expect(await codeOf(fetchStoredFile('https://10.0.0.7:9000/a.jpg', { timeoutMs: 500 }))).toBe('DOWNLOAD_FAILED');
  });
});

describe('real HTTP behaviour (non-production loopback)', () => {
  const env = { ...process.env };
  let server: http.Server;
  let base = '';
  let secretHits = 0;
  beforeAll(async () => {
    const secret = http.createServer((_q, r) => { secretHits += 1; r.end('secret'); });
    await new Promise<void>((r) => secret.listen(0, '127.0.0.1', r));
    const secretPort = (secret.address() as AddressInfo).port;
    server = http.createServer((req, res) => {
      if (req.url === '/redirect') { res.writeHead(302, { Location: `http://127.0.0.1:${secretPort}/s` }); res.end(); return; }
      if (req.url === '/big') {
        res.writeHead(200, { 'Content-Length': String(MAX_STORED_FILE_BYTES + 1024) });
        res.write(Buffer.alloc(MAX_STORED_FILE_BYTES + 1024));
        res.end();
        return;
      }
      if (req.url === '/hang') { return; }
      if (req.url === '/err') { res.writeHead(500); res.end('internal detail 10.0.0.1'); return; }
      res.writeHead(200); res.end('bytes');
    });
    await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    (server as any)._secret = secret;
  });
  afterAll(() => { (server as any)._secret.close(); server.closeAllConnections?.(); server.close(); });
  afterEach(() => { process.env = { ...env }; });

  it('fetches a loopback file outside production', async () => {
    process.env.NODE_ENV = 'test';
    expect((await fetchStoredFile(`${base}/ok`)).toString()).toBe('bytes');
  });
  it('loopback is refused in production', async () => {
    process.env.NODE_ENV = 'production';
    expect(await codeOf(fetchStoredFile(`${base}/ok`))).toBe('HTTPS_REQUIRED');
  });
  it('does not follow redirects', async () => {
    process.env.NODE_ENV = 'test';
    expect(await codeOf(fetchStoredFile(`${base}/redirect`))).toBe('DOWNLOAD_FAILED');
    expect(secretHits).toBe(0);
  });
  it('enforces the size cap', async () => {
    process.env.NODE_ENV = 'test';
    expect(await codeOf(fetchStoredFile(`${base}/big`))).toBe('DOWNLOAD_FAILED');
  }, 30000);
  it('enforces the timeout', async () => {
    process.env.NODE_ENV = 'test';
    expect(await codeOf(fetchStoredFile(`${base}/hang`, { timeoutMs: 300 }))).toBe('DOWNLOAD_FAILED');
  });
  it('upstream error text is not exposed', async () => {
    process.env.NODE_ENV = 'test';
    const e: any = await fetchStoredFile(`${base}/err`).catch((x) => x);
    expect(e).toBeInstanceOf(StoredFileFetchError);
    expect(e.message).not.toMatch(/internal detail|10\.0\.0\.1/);
  });
  it('ignores HTTP(S)_PROXY environment variables', async () => {
    process.env.NODE_ENV = 'test';
    process.env.HTTP_PROXY = 'http://127.0.0.1:1';
    process.env.http_proxy = 'http://127.0.0.1:1';
    expect((await fetchStoredFile(`${base}/ok`)).toString()).toBe('bytes');
  });
});
