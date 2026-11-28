import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  authorizeFileUrls, isUnder, assertLocalFileUrlsAllowed, prismaRefLoader, normaliseFileUrl, fileUrlFingerprint, type Actor, type FileRefPrisma,
} from './file-access';
import { logger } from '../../utils/logger';

// Users: C1 owns the order, C2 is another customer, A is admin, V1 is the vendor
// of the purchase order, V2 is another vendor.
const C1: Actor = { userId: 'u-c1', role: 'CUSTOMER' };
const C2: Actor = { userId: 'u-c2', role: 'CUSTOMER' };
const ADMIN: Actor = { userId: 'u-admin', role: 'ADMIN' };
const V1: Actor = { userId: 'u-v1', role: 'VENDOR' };
const V2: Actor = { userId: 'u-v2', role: 'VENDOR' };
const ALL = [C1, C2, ADMIN, V1, V2];
const NAMES = ['C1 owner', 'C2 non-owner', 'admin', 'V1 linked vendor', 'V2 unlinked vendor'];

const F = {
  design: '/api/files/designs/d1/secret-logo-name.png',
  proof: '/api/files/approval-snapshots/r1/proof.pdf',
  print: '/api/files/approval-snapshots/r1/print.png', // approval snapshot and PO print file (same key)
  dieline: '/api/files/approval-snapshots/r1/dieline.svg',
  poDoc: '/api/files/purchase-orders/po1/po1.pdf',
  specs: '/api/files/purchase-orders/po1/specs1.pdf',
  samplePhoto: '/api/files/samples/prod1/photo.jpg',
  label: '/api/files/shipments/sh1/label1.pdf',
  receipt: '/api/files/settlements/st1/receipt1.pdf',
  reviewPhoto: '/api/files/reviews/rv1/p1.jpg',
  orphan: '/api/files/uploads/nobody.png',
};
const order = { customer: { userId: 'u-c1' } };

// Like Prisma, return only the fields the query's `select` asks for (nested too). A loader that forgets a
// field it needs (for example the approval request id) then sees undefined, as it would against a real database.
function project(row: any, select: any): any {
  if (!select || row === null || typeof row !== 'object') return row;
  if (Array.isArray(row)) return row.map((r) => project(r, select));
  const out: any = {};
  for (const [k, v] of Object.entries(select)) {
    if (v === true) out[k] = row[k];
    else if (v && typeof v === 'object' && (v as any).select) out[k] = row[k] == null ? row[k] : project(row[k], (v as any).select);
  }
  return out;
}
const sel = (rows: () => any[]) => ({ findMany: async (a: any) => rows().map((r) => project(r, a?.select)) });

function fakePrisma(extra: { designFiles?: any[]; reviews?: any[]; samples?: any[]; shipments?: any[]; settlements?: any[] } = {}): FileRefPrisma {
  // Returns every fixture row; the loader keeps only rows that match the requested URLs.
  return {
    designFile: sel(() => [{ fileUrl: F.design, design: { id: 'd1', ownerId: 'u-c1', order } }, ...(extra.designFiles ?? [])]),
    approvalRequest: sel(() => [{ id: 'r1', printSnapshotUrl: F.print, dielineSnapshotUrl: F.dieline, proofUrl: F.proof, order }]),
    purchaseOrder: sel(() => [{ id: 'po1', poDocumentUrl: F.poDoc, printFileUrl: F.print, dielineFileUrl: F.dieline, specsFileUrl: F.specs, vendor: { userId: 'u-v1' }, order: { approvalRequests: [{ id: 'r1', printSnapshotUrl: F.print, dielineSnapshotUrl: F.dieline }] } }]),
    sample: sel(() => [{ photoUrls: [F.samplePhoto], productionId: 'prod1', production: { vendor: { userId: 'u-v1' }, purchaseOrder: { order } } }, ...(extra.samples ?? [])]),
    shipment: sel(() => [{ id: 'sh1', labelUrl: F.label, order }, ...(extra.shipments ?? [])]),
    settlement: sel(() => [{ id: 'st1', receiptUrl: F.receipt }, ...(extra.settlements ?? [])]),
    review: sel(() => [{ id: 'rv1', photoUrls: [F.reviewPhoto], customer: { userId: 'u-c1' } }, ...(extra.reviews ?? [])]),
  };
}
const loader = (extra?: any) => prismaRefLoader(fakePrisma(extra));
const allowedFor = async (a: Actor, urls: string[], extra?: any) => [...(await authorizeFileUrls(a, urls, loader(extra))).allowed].sort();

describe('policy matrix (customer owner / non-owner / admin / linked vendor / unlinked vendor)', () => {
  const urls = Object.values(F);
  const expected: Record<string, string[]> = {
    'C1 owner': [F.design, F.proof, F.print, F.dieline, F.samplePhoto, F.label, F.reviewPhoto],
    'C2 non-owner': [],
    admin: urls.filter((u) => u !== F.orphan),
    'V1 linked vendor': [F.print, F.dieline, F.poDoc, F.specs, F.samplePhoto],
    'V2 unlinked vendor': [],
  };
  ALL.forEach((actor, i) => {
    it(`${NAMES[i]} is entitled to exactly its set`, async () => {
      expect(await allowedFor(actor, urls)).toEqual([...expected[NAMES[i]]].sort());
    });
  });
  it('the linked vendor does not get the customer design file, proof, label, receipt or review photo', async () => {
    const got = await allowedFor(V1, urls);
    for (const u of [F.design, F.proof, F.label, F.receipt, F.reviewPhoto]) expect(got).not.toContain(u);
  });
  it('role is checked, not only the user id: a CUSTOMER carrying the vendor user id gets no PO files', async () => {
    const got = await allowedFor({ userId: 'u-v1', role: 'CUSTOMER' }, Object.values(F));
    for (const u of [F.poDoc, F.specs]) expect(got).not.toContain(u);
  });
  it('role is checked, not only the user id: a VENDOR carrying the customer user id gets no customer files', async () => {
    const got = await allowedFor({ userId: 'u-c1', role: 'VENDOR' }, Object.values(F));
    for (const u of [F.design, F.proof, F.label, F.reviewPhoto, F.samplePhoto]) expect(got).not.toContain(u);
  });
  it('a vendor role without any link gets nothing, even for the files of a customer design', async () => {
    expect(await allowedFor({ userId: 'u-v9', role: 'VENDOR' }, Object.values(F))).toEqual([]);
  });
  it('the customer does not get purchase-order documents (vendor cost) or the settlement receipt', async () => {
    const got = await allowedFor(C1, urls);
    for (const u of [F.poDoc, F.specs, F.receipt]) expect(got).not.toContain(u);
  });
  it('an unreferenced key is denied for everyone, admin included', async () => {
    for (const a of ALL) expect(await allowedFor(a, [F.orphan])).toEqual([]);
  });
  it('no actor, or an actor without an id, gets nothing', async () => {
    expect([...(await authorizeFileUrls(undefined, Object.values(F), loader())).allowed]).toEqual([]);
    expect([...(await authorizeFileUrls({ userId: '', role: 'ADMIN' }, Object.values(F), loader())).allowed]).toEqual([]);
  });
  it('an unknown role gets nothing', async () => {
    expect(await allowedFor({ userId: 'u-c1', role: 'GUEST' }, Object.values(F))).toEqual([]);
  });
});

describe('ownership proof: a client-written reference never grants on its own', () => {
  const C2design = (fileUrl: string) => ({ fileUrl, design: { id: 'd2', ownerId: 'u-c2', order: null } });
  it('C2 registering C1\'s design key in C2\'s own design gets nothing (key is bound to design d1, not d2)', async () => {
    expect(await allowedFor(C2, [F.design], { designFiles: [C2design(F.design)] })).toEqual([]);
    expect(await allowedFor(C1, [F.design], { designFiles: [C2design(F.design)] })).toEqual([F.design]);
  });
  it('registering a key BEFORE the legitimate reference exists does not make the registrant the owner', async () => {
    // Only the attacker's row exists yet (legitimate row not written): still nothing, for every role but none is entitled.
    const only: FileRefPrisma = { ...fakePrisma(), designFile: { findMany: async () => [C2design(F.samplePhoto), C2design(F.design)] }, sample: { findMany: async () => [] }, review: { findMany: async () => [] } };
    const ld = prismaRefLoader(only);
    for (const url of [F.samplePhoto, F.design]) {
      expect([...(await authorizeFileUrls(C2, [url], ld)).allowed]).toEqual([]);
    }
  });
  it('a stored copy of a PO file or approval file in C2\'s design gives C2 nothing', async () => {
    for (const url of [F.poDoc, F.proof, F.print]) expect(await allowedFor(C2, [url], { designFiles: [C2design(url)] })).toEqual([]);
  });
  it('adding an existing file URL to a new Review gives the writer nothing', async () => {
    const rows = [{ id: 'rv2', photoUrls: [F.design, F.samplePhoto, F.poDoc], customer: { userId: 'u-c2' } }];
    for (const url of [F.design, F.samplePhoto, F.poDoc]) expect(await allowedFor(C2, [url], { reviews: rows })).toEqual([]);
    expect(await allowedFor(C2, [F.reviewPhoto], { reviews: [{ id: 'rv2', photoUrls: [F.reviewPhoto], customer: { userId: 'u-c2' } }] })).toEqual([]);
  });
  it('a key with several references, some bound and some not, is judged per reference: unbound ones add nothing', async () => {
    const rows = [C2design(F.design), { fileUrl: F.design, design: { id: 'd1', ownerId: 'u-c3', order: null } }];
    expect(await allowedFor(C2, [F.design], { designFiles: rows })).toEqual([]);
    expect(await allowedFor({ userId: 'u-c3', role: 'CUSTOMER' }, [F.design], { designFiles: rows })).toEqual([F.design]);
    expect(await allowedFor(C1, [F.design], { designFiles: rows })).toEqual([F.design]);
  });
  it('a design row whose key is not under its own design folder grants nothing, even to its owner', async () => {
    const odd = { fileUrl: '/api/files/uploads/x.png', design: { id: 'd9', ownerId: 'u-c2', order: null } };
    expect(await allowedFor(C2, ['/api/files/uploads/x.png'], { designFiles: [odd] })).toEqual([]);
    expect(await allowedFor(ADMIN, ['/api/files/uploads/x.png'], { designFiles: [odd] })).toEqual([]);
  });
  it('a sample row whose key is outside its production folder grants nothing', async () => {
    const odd = { photoUrls: [F.design], productionId: 'prod7', production: { vendor: { userId: 'u-v2' }, purchaseOrder: { order: null } } };
    expect(await allowedFor(V2, [F.design], { samples: [odd] })).toEqual([]);
  });
  it('vendor V2 cannot reach V1\'s files by knowing the URL, however many records V2 writes', async () => {
    const urls = [F.print, F.dieline, F.poDoc, F.specs, F.samplePhoto];
    expect(await allowedFor(V2, urls, { designFiles: urls.map(C2design) })).toEqual([]);
  });
  it('a PO print/dieline key that is not an approval snapshot of the same order does not grant', async () => {
    const forged: FileRefPrisma = { ...fakePrisma(), purchaseOrder: { findMany: async () => [{ id: 'po1', poDocumentUrl: null, printFileUrl: F.design, dielineFileUrl: null, specsFileUrl: null, vendor: { userId: 'u-v1' }, order: { approvalRequests: [{ id: 'r1', printSnapshotUrl: F.print, dielineSnapshotUrl: F.dieline }] } }] } };
    expect([...(await authorizeFileUrls(V1, [F.design], prismaRefLoader(forged))).allowed]).toEqual([]);
  });
});

describe('PO print and dieline: the same snapshot, under that snapshot\'s own approval request id', () => {
  const po = (print: string | null, dieline: string | null, approvals: any[]): FileRefPrisma => ({
    ...fakePrisma(),
    purchaseOrder: sel(() => [{ id: 'po1', poDocumentUrl: null, printFileUrl: print, dielineFileUrl: dieline, specsFileUrl: null, vendor: { userId: 'u-v1' }, order: { approvalRequests: approvals } }]),
  });
  const wrongId = '/api/files/approval-snapshots/wrong-id/file.png';
  it('a snapshot URL present in the same order but under a wrong id is denied for the linked vendor', async () => {
    const p = po(wrongId, wrongId, [{ id: 'r1', printSnapshotUrl: wrongId, dielineSnapshotUrl: wrongId }]);
    expect([...(await authorizeFileUrls(V1, [wrongId], prismaRefLoader(p))).allowed]).toEqual([]);
    expect([...(await authorizeFileUrls(ADMIN, [wrongId], prismaRefLoader(p))).allowed]).toEqual([]);
  });
  it('the key must belong to the folder of the approval request that holds it, not of another request of the order', async () => {
    // r1 holds the print snapshot, but the key sits under r2's folder (r2 holds a different file)
    const key = '/api/files/approval-snapshots/r2/print.png';
    const p = po(key, null, [{ id: 'r1', printSnapshotUrl: key, dielineSnapshotUrl: null }, { id: 'r2', printSnapshotUrl: '/api/files/approval-snapshots/r2/other.png', dielineSnapshotUrl: null }]);
    expect([...(await authorizeFileUrls(V1, [key], prismaRefLoader(p))).allowed]).toEqual([]);
  });
  it('the right id works for the linked vendor and not for the unlinked vendor', async () => {
    expect(await allowedFor(V1, [F.print, F.dieline])).toEqual([F.dieline, F.print].sort());
    expect(await allowedFor(V2, [F.print, F.dieline])).toEqual([]);
  });
  it('a snapshot of a different order does not bind (approvals are read from the PO\'s own order only)', async () => {
    const p = po(F.print, null, []);
    expect([...(await authorizeFileUrls(V1, [F.print], prismaRefLoader(p))).allowed]).toEqual([]);
  });
  it('the loader asks for the approval request id (a loader that omits it would see undefined and deny everything)', async () => {
    const selects: any[] = [];
    const spy: FileRefPrisma = { ...fakePrisma(), purchaseOrder: { findMany: async (a: any) => { selects.push(a.select); return []; } } };
    await prismaRefLoader(spy)([F.print]);
    expect(selects[0].order.select.approvalRequests.select.id).toBe(true);
  });
});

describe('folder binding of server-written references', () => {
  const stray = '/api/files/approval-snapshots/rOther/proof.pdf';
  it('an approval row whose key is under another request folder grants nothing', async () => {
    const p: FileRefPrisma = { ...fakePrisma(), approvalRequest: { findMany: async () => [{ id: 'r1', printSnapshotUrl: null, dielineSnapshotUrl: null, proofUrl: stray, order }] } };
    expect([...(await authorizeFileUrls(C1, [stray], prismaRefLoader(p))).allowed]).toEqual([]);
    expect([...(await authorizeFileUrls(ADMIN, [stray], prismaRefLoader(p))).allowed]).toEqual([]);
  });
  it('a purchase-order document or specs key under another PO folder grants nothing', async () => {
    const doc = '/api/files/purchase-orders/po9/x.pdf';
    const p: FileRefPrisma = { ...fakePrisma(), purchaseOrder: { findMany: async () => [{ id: 'po1', poDocumentUrl: doc, printFileUrl: null, dielineFileUrl: null, specsFileUrl: doc, vendor: { userId: 'u-v1' }, order: { approvalRequests: [] } }] } };
    expect([...(await authorizeFileUrls(V1, [doc], prismaRefLoader(p))).allowed]).toEqual([]);
  });
  it('a row without an id binds nothing', async () => {
    const p: FileRefPrisma = { ...fakePrisma(), designFile: { findMany: async () => [{ fileUrl: '/api/files/designs/undefined/x.png', design: { ownerId: 'u-c2', order: null } }] } };
    expect([...(await authorizeFileUrls(C2, ['/api/files/designs/undefined/x.png'], prismaRefLoader(p))).allowed]).toEqual([]);
  });
});

describe('review photos: the review\'s own customer and admin, under reviews/<reviewId>/', () => {
  it('owner customer and admin are issued the photo; another customer and both vendors are not', async () => {
    expect(await allowedFor(C1, [F.reviewPhoto])).toEqual([F.reviewPhoto]);
    expect(await allowedFor(ADMIN, [F.reviewPhoto])).toEqual([F.reviewPhoto]);
    for (const [a, name] of [[C2, 'other customer'], [V1, 'linked vendor'], [V2, 'other vendor']] as const) expect(await allowedFor(a, [F.reviewPhoto]), name).toEqual([]);
  });
  it('a CUSTOMER-role actor must own the review; a vendor carrying the owner\'s user id is still denied', async () => {
    expect(await allowedFor({ userId: 'u-c1', role: 'VENDOR' }, [F.reviewPhoto])).toEqual([]);
  });
  it('a key outside the review\'s own folder grants nothing to anyone, owner and admin included', async () => {
    const stray = '/api/files/reviews/rvX/p.jpg';
    const other = '/api/files/designs/d1/secret-logo-name.png';
    const rows = [{ id: 'rv1', photoUrls: [stray, other], customer: { userId: 'u-c1' } }];
    for (const a of [C1, ADMIN]) expect(await allowedFor(a, [stray], { reviews: rows })).toEqual([]);
    expect(await allowedFor(C2, [other], { reviews: [{ id: 'rv2', photoUrls: [other], customer: { userId: 'u-c2' } }] })).toEqual([]);
  });
});

describe('sample photos: a vendor reaches only the photos of samples that vendor produced', () => {
  const P2 = '/api/files/samples/prod2/photo2.jpg'; // another vendor's sample, other order
  const order2 = { customer: { userId: 'u-c2' } };
  const other = { samples: [{ photoUrls: [P2], productionId: 'prod2', production: { vendor: { userId: 'u-v2' }, purchaseOrder: { order: order2 } } }] };
  it('V1 gets its own sample photo and not V2\'s; V2 the reverse', async () => {
    expect(await allowedFor(V1, [F.samplePhoto, P2], other)).toEqual([F.samplePhoto]);
    expect(await allowedFor(V2, [F.samplePhoto, P2], other)).toEqual([P2]);
  });
  it('a CUSTOMER-role actor carrying a vendor\'s user id gets neither photo', async () => {
    for (const uid of ['u-v1', 'u-v2']) expect(await allowedFor({ userId: uid, role: 'CUSTOMER' }, [F.samplePhoto, P2], other), uid).toEqual([]);
  });
  it('a vendor does not get another customer\'s sample photo through an unrelated order, and only its own folder-bound key counts', async () => {
    const wrongFolder = { samples: [{ photoUrls: ['/api/files/samples/prodZ/x.jpg'], productionId: 'prod2', production: { vendor: { userId: 'u-v2' }, purchaseOrder: { order: order2 } } }] };
    expect(await allowedFor(V2, ['/api/files/samples/prodZ/x.jpg'], wrongFolder)).toEqual([]);
    expect(await allowedFor(V1, ['/api/files/samples/prodZ/x.jpg'], wrongFolder)).toEqual([]);
  });
  it('the order customers see their own sample photos only; the other customer and an unrelated actor do not', async () => {
    expect(await allowedFor(C1, [F.samplePhoto, P2], other)).toEqual([F.samplePhoto]);
    expect(await allowedFor(C2, [F.samplePhoto, P2], other)).toEqual([P2]);
    expect(await allowedFor({ userId: 'u-x', role: 'VENDOR' }, [F.samplePhoto, P2], other)).toEqual([]);
  });
  it('the vendor\'s sample access does not extend to any other kind of file', async () => {
    const got = await allowedFor(V2, [F.design, F.proof, F.label, F.receipt, F.reviewPhoto, F.poDoc, F.specs, F.print, F.dieline], other);
    expect(got).toEqual([]);
  });
});

describe('shipment label and settlement receipt are bound to their own record folder', () => {
  it('a label under shipments/<its id>/ is issued to the order customer and admin only; a stray key is not issued to anyone', async () => {
    expect(await allowedFor(C1, [F.label])).toEqual([F.label]);
    expect(await allowedFor(ADMIN, [F.label])).toEqual([F.label]);
    for (const a of [C2, V1, V2]) expect(await allowedFor(a, [F.label])).toEqual([]);
    const stray = '/api/files/shipments/shX/label.pdf';
    const stray2 = '/api/files/designs/d1/secret-logo-name.png';
    const sh = [{ id: 'sh1', labelUrl: stray, order }, { id: 'sh1', labelUrl: stray2, order }];
    expect(await allowedFor(C1, [stray, stray2], { shipments: sh })).toEqual([F.design]);
    expect(await allowedFor(ADMIN, [stray], { shipments: sh })).toEqual([]);
  });
  it('a receipt under settlements/<its id>/ is admin only; a stray key or a provider URL is not issued', async () => {
    expect(await allowedFor(ADMIN, [F.receipt])).toEqual([F.receipt]);
    for (const a of [C1, C2, V1, V2]) expect(await allowedFor(a, [F.receipt])).toEqual([]);
    const stray = '/api/files/settlements/stX/r.pdf';
    expect(await allowedFor(ADMIN, [stray], { settlements: [{ id: 'st1', receiptUrl: stray }] })).toEqual([]);
  });
});

describe('folder binding is exact', () => {
  it('requires the id to be followed by a slash: designs/d1 does not bind designs/d10', () => {
    expect(isUnder('/api/files/designs/d10/a.png', 'designs/d1')).toBe(false);
    expect(isUnder('/api/files/designs/d1x/a.png', 'designs/d1')).toBe(false);
    expect(isUnder('/api/files/designs/d1/a.png', 'designs/d1')).toBe(true);
  });
  it('rejects dot-dot, empty segments, backslashes and encoded dots or slashes', () => {
    for (const k of [
      'designs/d1/../d2/a.png', 'designs/d1/..%2fd2/a.png', 'designs/d1/%2e%2e/d2/a.png', 'designs/d1/%2E%2E/a.png',
      'designs/d1//a.png', 'designs/d1/a%2Fb.png', 'designs/d1/a\\b.png', 'designs/d1/a%5cb.png', 'designs/d1/./../a.png',
    ]) expect(isUnder(`/api/files/${k}`, 'designs/d1'), k).toBe(false);
  });
  it('rejects a dot segment and other invalid segments: ./ ../ empty, spaces, unicode, NUL, colon', () => {
    expect(isUnder('/api/files/designs/d1/./file.png', 'designs/d1')).toBe(false);
    expect(isUnder('/api/files/designs/d1/a/./file.png', 'designs/d1')).toBe(false);
    expect(isUnder('/api/files/designs/./d1/file.png', 'designs/d1')).toBe(false);
    for (const bad of ['a b.png', 'a%41.png', 'é.png', 'a\u0000.png', 'a:b.png', 'a;b.png', 'a?b.png']) {
      expect(isUnder(`/api/files/designs/d1/${bad}`, 'designs/d1'), bad).toBe(false);
    }
    expect(isUnder('/api/files/designs/d1/sub/dir/ok-1_2.PNG', 'designs/d1')).toBe(true);
    expect(isUnder('/api/files/designs/d1/a/', 'designs/d1')).toBe(false);
  });
  it('rejects the bare folder and a different prefix', () => {
    expect(isUnder('/api/files/designs/d1/', 'designs/d1')).toBe(false);
    expect(isUnder('/api/files/samples/d1/a.png', 'designs/d1')).toBe(false);
    expect(isUnder('designs/d1/a.png', 'designs/d1')).toBe(false);
  });
  it('through the loader: a traversal key in a row, a d1 key on design d10, and a PO dieline that is not an approval snapshot of the same order grant nothing', async () => {
    const trav = '/api/files/designs/d1/../d2/a.png';
    const d10 = '/api/files/designs/d10/a.png';
    const dl = '/api/files/approval-snapshots/rZ/dieline.svg';
    const p: FileRefPrisma = {
      ...fakePrisma(),
      designFile: { findMany: async () => [{ fileUrl: trav, design: { id: 'd1', ownerId: 'u-c2', order: null } }, { fileUrl: d10, design: { id: 'd1', ownerId: 'u-c2', order: null } }] },
      purchaseOrder: { findMany: async () => [{ id: 'po1', poDocumentUrl: null, printFileUrl: F.print, dielineFileUrl: dl, specsFileUrl: null, vendor: { userId: 'u-v1' }, order: { approvalRequests: [{ id: 'r1', printSnapshotUrl: F.print, dielineSnapshotUrl: F.dieline }] } }] },
    };
    const ld = prismaRefLoader(p);
    expect([...(await authorizeFileUrls(C2, [trav, d10], ld)).allowed]).toEqual([]);
    expect([...(await authorizeFileUrls(V1, [dl], ld)).allowed]).toEqual([]);
    expect([...(await authorizeFileUrls(V1, [F.print], ld)).allowed]).toEqual([F.print]);
  });
});

describe('write guard for client fields that name local files', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('accepts own file, other URLs and no URLs', async () => {
    await expect(assertLocalFileUrlsAllowed(C1, [F.design, 'https://cdn.example.com/a.png'], loader(), 't')).resolves.toBeUndefined();
    await expect(assertLocalFileUrlsAllowed(C1, [], loader(), 't')).resolves.toBeUndefined();
  });
  it('rejects another user\'s file and an unreferenced key with 403 FILE_NOT_ALLOWED, without file data in the message', async () => {
    for (const url of [F.design, F.orphan]) {
      const err: any = await assertLocalFileUrlsAllowed(C2, [url], loader(), 'POST x').catch((e) => e);
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FILE_NOT_ALLOWED');
      expect(String(err.message)).not.toContain('secret-logo-name');
      expect(String(err.message)).not.toContain('/api/files');
    }
  });
  it('rejects a mix if any one URL is not allowed', async () => {
    await expect(assertLocalFileUrlsAllowed(C1, [F.design, F.poDoc], loader(), 't')).rejects.toMatchObject({ code: 'FILE_NOT_ALLOWED' });
  });
});

describe('denied attempts are logged without file data', () => {
  it('logs user id, role, count and a short hash only', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    await assertLocalFileUrlsAllowed(C2, [F.design], loader(), 'POST saveDesign').catch(() => {});
    expect(warn).toHaveBeenCalledTimes(1);
    const [msg, meta] = warn.mock.calls[0] as [string, any];
    expect(msg).toBe('file access denied');
    expect(meta).toMatchObject({ where: 'POST saveDesign', userId: 'u-c2', role: 'CUSTOMER', count: 1 });
    expect(meta.files).toEqual([fileUrlFingerprint(F.design)]);
    const text = JSON.stringify(warn.mock.calls);
    expect(text).not.toContain('secret-logo-name');
    expect(text).not.toContain('/api/files');
    expect(fileUrlFingerprint(F.design)).toMatch(/^[0-9a-f]{12}$/);
    warn.mockRestore();
  });
});

describe('url normalisation', () => {
  it('strips query and fragment and refuses non-file paths', () => {
    expect(normaliseFileUrl('/api/files/a/b.png?exp=1&sig=2#x')).toBe('/api/files/a/b.png');
    expect(normaliseFileUrl('/api/files/')).toBeNull();
    expect(normaliseFileUrl('https://x/api/files/a.png')).toBeNull();
    expect(normaliseFileUrl('/api/filesx/a.png')).toBeNull();
  });
});
