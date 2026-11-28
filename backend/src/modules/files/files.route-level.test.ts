import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';

const readLocalFile = vi.hoisted(() => vi.fn());
vi.mock('../../services/file-upload/upload.service', () => ({ fileUploadService: { readLocalFile } }));

import { fileRoutes } from './files.routes';
import { createSignedFileUrlResponses } from './signed-response';
import { prismaRefLoader, type Actor, type FileRefPrisma } from './file-access';
import { verifyFileSignature } from './signed-url';

// A real Fastify instance: the response hook, a data route and the file route registered the way index.ts does.
const SECRET = 'test-signing-secret-0123456789abcdef-xyz';
const MINE = '/api/files/designs/d1/mine.png';
const THEIRS = '/api/files/designs/d2/theirs.png';
const prisma: FileRefPrisma = {
  designFile: { findMany: async () => [
    { fileUrl: MINE, design: { id: 'd1', ownerId: 'u1', order: null } },
    { fileUrl: THEIRS, design: { id: 'd2', ownerId: 'u2', order: null } },
    // u1 also registers u2's key in a design of their own
    { fileUrl: THEIRS, design: { id: 'd1', ownerId: 'u1', order: null } },
  ] },
  approvalRequest: { findMany: async () => [] }, purchaseOrder: { findMany: async () => [] }, sample: { findMany: async () => [] },
  shipment: { findMany: async () => [] }, settlement: { findMany: async () => [] }, review: { findMany: async () => [] },
};

async function build(user?: Actor) {
  const a = Fastify();
  a.addHook('preHandler', async (req) => { (req as any).user = user; });
  await a.register(createSignedFileUrlResponses({ loader: () => prismaRefLoader(prisma) }));
  await a.register(fileRoutes, { prefix: '/api' });
  await a.register(async (c) => { c.get('/designs/1', async () => ({ success: true, data: { files: [{ fileUrl: MINE }, { fileUrl: THEIRS }] } })); }, { prefix: '/api' });
  return a;
}

beforeEach(() => { readLocalFile.mockReset(); readLocalFile.mockResolvedValue({ buffer: Buffer.from('bytes'), extension: 'png' }); });
afterEach(() => { delete process.env.FILE_URL_SIGNING_SECRET; });

describe('route level, secret set', () => {
  beforeEach(() => { process.env.FILE_URL_SIGNING_SECRET = SECRET; });
  it('the owner gets a signed URL for own file, null for another user\'s file even if registered on own design', async () => {
    const r = (await (await build({ userId: 'u1', role: 'CUSTOMER' })).inject({ method: 'GET', url: '/api/designs/1' })).json();
    expect(r.data.files[1].fileUrl).toBeNull();
    const u = new URL(r.data.files[0].fileUrl, 'http://x');
    expect(verifyFileSignature('designs/d1/mine.png', u.searchParams.get('exp')!, u.searchParams.get('sig'))).toBe(true);
    const file = await (await build()).inject({ method: 'GET', url: u.pathname + u.search });
    expect(file.statusCode).toBe(200);
  });
  it('an anonymous caller and another customer get null for both files; the raw URL never appears', async () => {
    for (const user of [undefined, { userId: 'u3', role: 'CUSTOMER' } as Actor, { userId: 'v1', role: 'VENDOR' } as Actor]) {
      const res = await (await build(user)).inject({ method: 'GET', url: '/api/designs/1' });
      expect(res.json().data.files).toEqual([{ fileUrl: null }, { fileUrl: null }]);
      expect(res.body).not.toContain('/api/files/');
    }
  });
  it('an unsigned or tampered file URL is refused and the file is never read', async () => {
    const app = await build();
    expect((await app.inject({ method: 'GET', url: '/api/files/designs/d1/mine.png' })).statusCode).toBe(401);
    expect((await app.inject({ method: 'GET', url: '/api/files/designs/d1/mine.png?exp=9999999999&sig=abc' })).statusCode).toBe(401);
    expect(readLocalFile).not.toHaveBeenCalled();
  });
});

describe('route level, secret missing', () => {
  it('the data route returns null for every file URL and the file route answers 503', async () => {
    const app = await build({ userId: 'u1', role: 'CUSTOMER' });
    const res = await app.inject({ method: 'GET', url: '/api/designs/1' });
    expect(res.json().data.files).toEqual([{ fileUrl: null }, { fileUrl: null }]);
    expect(res.body).not.toContain('/api/files/');
    expect((await app.inject({ method: 'GET', url: '/api/files/designs/d1/mine.png' })).statusCode).toBe(503);
    expect(readLocalFile).not.toHaveBeenCalled();
  });
  it('a secret shorter than 32 characters counts as missing', async () => {
    process.env.FILE_URL_SIGNING_SECRET = 'short';
    const res = await (await build({ userId: 'u1', role: 'CUSTOMER' })).inject({ method: 'GET', url: '/api/designs/1' });
    expect(res.json().data.files).toEqual([{ fileUrl: null }, { fileUrl: null }]);
  });
});
