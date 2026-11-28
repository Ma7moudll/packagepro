import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  fetchStoredFile: vi.fn(),
  prisma: {} as any,
}));
vi.mock('../../lib/prisma', () => ({ prisma: h.prisma }));
vi.mock('../../services/email/email.service', () => ({ emailService: {} }));
vi.mock('../../services/file-upload/stored-file-fetch', async (orig) => ({
  ...(await orig<any>()),
  fetchStoredFile: h.fetchStoredFile,
}));

import { isStoredFileOfDesign } from './file-access';
import { approvalService } from '../orders/approval.service';
import { approvalContentHash } from '../orders/approval-snapshot';
import { prePressCheckService } from '../../services/pre-press-checker/prepress.service';

const D = 'dsg1';
const OWN = `/api/files/designs/${D}/a.png`;
const BAD: Array<[string, string]> = [
  ['legacy key outside designs/<id>/', '/api/files/uploads/legacy.png'],
  ['another design\'s folder', '/api/files/designs/dsg2/a.png'],
  ['a prefix of the id (dsg10 vs dsg1)', '/api/files/designs/dsg10/a.png'],
  ['approval snapshot folder', '/api/files/approval-snapshots/r1/print.png'],
  ['purchase order folder', '/api/files/purchase-orders/po1/po.pdf'],
  ['traversal out of the folder', `/api/files/designs/${D}/../dsg2/a.png`],
  ['traversal then back in', `/api/files/designs/${D}/../${D}/a.png`],
  ['dot segment', `/api/files/designs/${D}/./a.png`],
  ['empty segment', `/api/files/designs/${D}//a.png`],
  ['encoded dot segments', `/api/files/designs/${D}/%2e%2e/dsg2/a.png`],
  ['encoded slash', `/api/files/designs/${D}%2fa.png`],
  ['double encoded', `/api/files/designs/${D}/%252e%252e/a.png`],
  ['query that would hide another path', `/api/files/designs/dsg2/a.png?x=/api/files/designs/${D}/a.png`],
  ['query on an own key', `${OWN}?v=2`],
  ['fragment on an own key', `${OWN}#x`],
  ['query on a foreign key', '/api/files/designs/dsg2/a.png?v=2'],
  ['backslash', `/api/files/designs/${D}\\..\\a.png`],
  ['the folder itself (no file)', `/api/files/designs/${D}/`],
];

describe('isStoredFileOfDesign', () => {
  it('accepts a normal key under designs/<designId>/ and nested plain segments', () => {
    expect(isStoredFileOfDesign(OWN, D)).toBe(true);
    expect(isStoredFileOfDesign(`/api/files/designs/${D}/sub/b-1_2.png`, D)).toBe(true);
  });
  for (const [name, url] of BAD) it(`refuses ${name}`, () => expect(isStoredFileOfDesign(url, D)).toBe(false));
  it('refuses an empty design id', () => {
    expect(isStoredFileOfDesign('/api/files/designs//a.png', '')).toBe(false);
  });
  it('leaves non-local values to fetchStoredFile (unchanged behaviour)', () => {
    for (const u of ['https://cdn.example.com/x.png', 'http://localhost:3000/api/files/designs/dsg2/a.png', 'owner-authorized-review', '/api/filesx/a.png'])
      expect(isStoredFileOfDesign(u, D), u).toBe(true);
  });
});

// ---- approval: requestApproval ---------------------------------------------------------------
const baseDesign = { id: D, designData: { layers: [] }, productId: null, variantId: null, sku: null, designConfig: null };
const HASH = approvalContentHash(baseDesign);
const mkFile = (id: string, fileType: string, fileUrl: string) => ({ id, fileType, fileUrl, fileName: `${id}.png`, mimeType: 'image/png', metadata: { approvalContentHash: HASH } });
const STOP = new Error('PASSED_BINDING_STOP');

function setupApproval(files: any[]) {
  const design = { ...baseDesign, files };
  const tx: any = {
    $queryRaw: async () => [],
    order: { findUnique: async () => ({ id: 'o1', status: 'pending_review', design, items: [], customer: { user: {} } }) },
    design: { findUniqueOrThrow: async () => design },
    approvalRequest: { findFirst: async () => null, updateMany: async () => { throw STOP; }, create: async () => { throw STOP; } },
  };
  h.prisma.$transaction = async (cb: any) => cb(tx);
}
const request = (printId: string, dielineId: string | null) =>
  approvalService.requestApproval('o1', { role: 'ADMIN', id: 'a1' } as any, { printFileId: printId, dielineFileId: dielineId } as any);

describe('approval: the stored file must sit under the design\'s own folder before it is read', () => {
  beforeEach(() => { h.fetchStoredFile.mockReset(); process.env.FRONTEND_URL = 'http://localhost:3000'; });

  it('a normal designs/<id>/ print and dieline pass the binding (the run then reaches the next step)', async () => {
    setupApproval([mkFile('p', 'print_file', OWN), mkFile('d', 'dieline', `/api/files/designs/${D}/d.svg`)]);
    await expect(request('p', 'd')).rejects.toBe(STOP);
  });
  for (const [name, url] of BAD) {
    it(`print file with ${name} is refused with a validation error and nothing is read`, async () => {
      setupApproval([mkFile('p', 'print_file', url)]);
      await expect(request('p', null)).rejects.toMatchObject({ statusCode: 400, message: 'Selected file is not stored under this design' });
      expect(h.fetchStoredFile).not.toHaveBeenCalled();
    });
  }
  it('a bad dieline is refused even when the print file is fine', async () => {
    setupApproval([mkFile('p', 'print_file', OWN), mkFile('d', 'dieline', '/api/files/designs/dsg2/d.svg')]);
    await expect(request('p', 'd')).rejects.toMatchObject({ statusCode: 400, message: 'Selected file is not stored under this design' });
    expect(h.fetchStoredFile).not.toHaveBeenCalled();
  });
  it('an allow-listed https URL is not stopped by the binding', async () => {
    setupApproval([mkFile('p', 'print_file', 'https://cdn.example.com/x.png')]);
    await expect(request('p', null)).rejects.toBe(STOP);
  });
});

// ---- pre-press: checkOrderDesign -------------------------------------------------------------
function setupPrepress(files: any[]) {
  h.prisma.order = { findUnique: async () => ({ id: 'o1', design: { id: D, designData: { layers: [] }, files } }) };
  h.prisma.prePressCheck = { upsert: async (a: any) => ({ ...a.update, designId: D }) };
}
const pf = (fileType: string, fileUrl: string, fileName = 'f.png') => ({ fileType, fileUrl, fileName, mimeType: 'image/png' });

describe('pre-press: the stored file must sit under the design\'s own folder before it is read', () => {
  beforeEach(() => { h.fetchStoredFile.mockReset(); h.fetchStoredFile.mockResolvedValue(Buffer.from('not an image')); });

  it('a normal designs/<id>/ key is read as before', async () => {
    setupPrepress([pf('print_file', OWN)]);
    await prePressCheckService.checkOrderDesign('o1');
    expect(h.fetchStoredFile).toHaveBeenCalledTimes(1);
    expect(h.fetchStoredFile).toHaveBeenCalledWith(OWN);
  });
  for (const [name, url] of BAD) {
    it(`${name}: never read; a file_access error is recorded`, async () => {
      setupPrepress([pf('print_file', url, 'victim.png')]);
      const r = await prePressCheckService.checkOrderDesign('o1');
      expect(h.fetchStoredFile).not.toHaveBeenCalled();
      expect(r.issues.filter((i) => i.type === 'file_access')).toEqual([
        { type: 'file_access', severity: 'error', message: 'Failed to download file victim.png: NOT_UNDER_DESIGN' },
      ]);
      expect(r.passed).toBe(false);
    });
  }
  it('a preview file is gated the same way; other file types are not read at all', async () => {
    setupPrepress([pf('preview', '/api/files/designs/dsg2/p.png'), pf('dieline', '/api/files/designs/dsg2/d.svg'), pf('proof', '/api/files/x/y.pdf')]);
    const r = await prePressCheckService.checkOrderDesign('o1');
    expect(h.fetchStoredFile).not.toHaveBeenCalled();
    expect(r.issues.filter((i) => i.type === 'file_access')).toHaveLength(1);
  });
  it('a bad file does not stop the good one from being read', async () => {
    setupPrepress([pf('print_file', '/api/files/uploads/legacy.png'), pf('print_file', OWN)]);
    await prePressCheckService.checkOrderDesign('o1');
    expect(h.fetchStoredFile).toHaveBeenCalledTimes(1);
    expect(h.fetchStoredFile).toHaveBeenCalledWith(OWN);
  });
  it('an allow-listed https URL still goes to fetchStoredFile, which keeps its own origin checks', async () => {
    setupPrepress([pf('print_file', 'https://cdn.example.com/x.png')]);
    await prePressCheckService.checkOrderDesign('o1');
    expect(h.fetchStoredFile).toHaveBeenCalledWith('https://cdn.example.com/x.png');
  });
});
