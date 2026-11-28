import { createHash } from 'node:crypto';
import { logger } from '../../utils/logger';

/**
 * Who may be handed a signed URL for a stored local file (/api/files/<key>).
 * The check runs when the URL is issued. The signed URL itself stays a bearer
 * link for its 15 minutes, so this check is the control.
 *
 * Policy (approved by the user, WhatsApp 2026-11-28 16:47):
 *  - CUSTOMER: files of their own designs, approval snapshots/proofs, sample
 *    photos and shipment label of their own orders, and the photos of their own
 *    reviews.
 *    Not purchase-order documents (they carry vendor cost).
 *  - ADMIN: any file that a record references and the key is bound to (the app has one ADMIN role),
 *    including vendor settlement receipts, which no other role may open.
 *  - VENDOR: only the files needed to run and review their own production order:
 *    the four purchase-order files (PO document, print file, dieline, specs) of
 *    purchase orders addressed to that vendor, and the sample photos of their own
 *    productions. Never the customer's design files, proofs, labels, settlement
 *    receipts or reviews, and never another vendor's files.
 *  - A key no record references, or an unknown/anonymous requester: denied.
 *
 * Ownership proof. A record that merely names a key proves nothing, because
 * clients can write some of those fields (saved design files, review photos).
 * A reference grants access only when the key is bound to the record by the
 * server: every server upload goes to `<folder>/<record id>/<uuid>.<ext>`
 * (designs/<designId>, approval-snapshots/<requestId>, purchase-orders/<poId>,
 * samples/<productionId>, reviews/<reviewId>, shipments/<shipmentId>,
 * settlements/<settlementId>), and the folder is chosen by server code, never by the
 * client. A purchase order's print and dieline keys are the approval snapshots
 * of the same order. Review photos, shipment labels and settlement receipts have
 * no server upload path today, so in practice they only match once one exists. Insertion order and creation time play no part.
 */
export type FileRefKind =
  | 'design_file'
  | 'review_photo'
  | 'approval_file'
  | 'po_file'
  | 'sample_photo'
  | 'shipment_label'
  | 'settlement_receipt';

export interface FileRef {
  url: string; // normalised /api/files/<key>
  kind: FileRefKind;
  /** The key is bound to this record by a server-chosen storage path (see header). */
  bound: boolean;
  customerUserId?: string | null; // user id of the order's customer
  designOwnerUserId?: string | null;
  vendorUserId?: string | null; // user id of the vendor the record belongs to
}

export interface Actor {
  userId: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN' | string;
}

export type RefLoader = (urls: string[]) => Promise<FileRef[]>;

const PREFIX = '/api/files/';

export function normaliseFileUrl(value: string): string | null {
  if (!value.startsWith(PREFIX)) return null;
  const base = value.split('?')[0].split('#')[0];
  return base.length > PREFIX.length ? base : null;
}

/**
 * True when the key sits under `<folder>/<id>/` (the id is followed by a slash, so
 * designs/d1 never binds designs/d10) and every path segment is plain. The key must be
 * exactly what the file route and readLocalFile later consume, so nothing that either could
 * decode or normalise differently is accepted: every segment is non-empty, is not '.' or
 * '..', and uses only letters, digits, '.', '_', '-'. No '%', no backslash, no empty segment.
 */
export function isUnder(url: string, folderPath: string): boolean {
  if (!url.startsWith(`${PREFIX}${folderPath}/`)) return false;
  const rest = url.slice(PREFIX.length);
  if (rest.includes('..')) return false;
  const segments = rest.split('/');
  if (segments.length <= folderPath.split('/').length) return false;
  return segments.every((seg) => seg !== '' && seg !== '.' && seg !== '..' && /^[A-Za-z0-9._-]+$/.test(seg));
}

/**
 * Gate for the server-side readers of DesignFile.fileUrl (approval, pre-press). A local key is read only
 * when the exact stored string sits under designs/<this design's id>/ (isUnder: plain segments, no '?', '#',
 * '%', so the string checked is the string fetchStoredFile reads). Any other value, such as an allow-listed
 * https URL, is left to fetchStoredFile as before.
 */
export function isStoredFileOfDesign(fileUrl: string, designId: string): boolean {
  if (!fileUrl.startsWith(PREFIX)) return true;
  return !!designId && isUnder(fileUrl, `designs/${designId}`);
}

export function fileUrlFingerprint(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 12);
}

function refEntitles(actor: Actor, ref: FileRef): boolean {
  if (actor.role === 'ADMIN') return true;
  const uid = actor.userId;
  if (!uid) return false;
  switch (ref.kind) {
    case 'design_file':
      return actor.role === 'CUSTOMER' && (ref.designOwnerUserId === uid || ref.customerUserId === uid);
    case 'approval_file':
    case 'shipment_label':
    case 'review_photo': // the review's own customer, or admin (above); never a vendor or another customer
      return actor.role === 'CUSTOMER' && ref.customerUserId === uid;
    case 'settlement_receipt':
      return false; // vendor payout receipt: admin only
    case 'po_file':
      return actor.role === 'VENDOR' && ref.vendorUserId === uid;
    case 'sample_photo':
      return (
        (actor.role === 'VENDOR' && ref.vendorUserId === uid) ||
        (actor.role === 'CUSTOMER' && ref.customerUserId === uid)
      );
    default:
      return false;
  }
}

/**
 * Pure decision. Only references whose key is bound to the record by the server
 * count (see header). A reference a client wrote never grants on its own, and
 * several references to one key never combine into a grant: each is judged alone.
 */
export function entitledUrls(actor: Actor | undefined, urls: string[], refs: FileRef[]): Set<string> {
  const allowed = new Set<string>();
  if (!actor || !actor.userId) return allowed;
  const byUrl = new Map<string, FileRef[]>();
  for (const r of refs) {
    const list = byUrl.get(r.url) ?? [];
    list.push(r);
    byUrl.set(r.url, list);
  }
  for (const url of urls) {
    const list = byUrl.get(url);
    if (!list || list.length === 0) continue;
    if (list.some((r) => r.bound && refEntitles(actor, r))) allowed.add(url);
  }
  return allowed;
}

export async function authorizeFileUrls(
  actor: Actor | undefined,
  urls: string[],
  load: RefLoader
): Promise<{ allowed: Set<string>; denied: string[] }> {
  const unique = [...new Set(urls)];
  if (!actor || !actor.userId || unique.length === 0) return { allowed: new Set(), denied: unique };
  const refs = await load(unique);
  const allowed = entitledUrls(actor, unique, refs);
  return { allowed, denied: unique.filter((u) => !allowed.has(u)) };
}

/** Log a denial without file names, paths or URLs: only a short hash per file. */
export function logDeniedFileAccess(actor: Actor | undefined, denied: string[], where: string): void {
  if (denied.length === 0) return;
  logger.warn('file access denied', {
    where,
    userId: actor?.userId ?? null,
    role: actor?.role ?? null,
    count: denied.length,
    files: denied.slice(0, 10).map(fileUrlFingerprint),
  });
}

/** Minimal Prisma surface used by the loader (also what tests fake). */
export interface FileRefPrisma {
  designFile: { findMany(a: any): Promise<any[]> };
  approvalRequest: { findMany(a: any): Promise<any[]> };
  purchaseOrder: { findMany(a: any): Promise<any[]> };
  sample: { findMany(a: any): Promise<any[]> };
  shipment: { findMany(a: any): Promise<any[]> };
  settlement: { findMany(a: any): Promise<any[]> };
  review: { findMany(a: any): Promise<any[]> };
}

export function prismaRefLoader(prisma: FileRefPrisma): RefLoader {
  return async (urls) => {
    const want = new Set(urls);
    const refs: FileRef[] = [];
    const orderCust = { select: { customer: { select: { userId: true } } } };

    const [dfs, ars, pos, samples, shipments, settlements, reviews] = await Promise.all([
      prisma.designFile.findMany({
        where: { fileUrl: { in: urls } },
        select: { fileUrl: true, design: { select: { id: true, ownerId: true, order: orderCust } } },
      }),
      prisma.approvalRequest.findMany({
        where: { OR: [{ printSnapshotUrl: { in: urls } }, { dielineSnapshotUrl: { in: urls } }, { proofUrl: { in: urls } }] },
        select: { id: true, printSnapshotUrl: true, dielineSnapshotUrl: true, proofUrl: true, order: orderCust },
      }),
      prisma.purchaseOrder.findMany({
        where: { OR: [{ poDocumentUrl: { in: urls } }, { printFileUrl: { in: urls } }, { dielineFileUrl: { in: urls } }, { specsFileUrl: { in: urls } }] },
        select: {
          id: true, poDocumentUrl: true, printFileUrl: true, dielineFileUrl: true, specsFileUrl: true,
          vendor: { select: { userId: true } },
          order: { select: { approvalRequests: { select: { id: true, printSnapshotUrl: true, dielineSnapshotUrl: true } } } },
        },
      }),
      prisma.sample.findMany({
        where: { photoUrls: { hasSome: urls } },
        select: { photoUrls: true, productionId: true, production: { select: { vendor: { select: { userId: true } }, purchaseOrder: { select: { order: orderCust } } } } },
      }),
      prisma.shipment.findMany({ where: { labelUrl: { in: urls } }, select: { id: true, labelUrl: true, order: orderCust } }),
      prisma.settlement.findMany({ where: { receiptUrl: { in: urls } }, select: { id: true, receiptUrl: true } }),
      prisma.review.findMany({
        where: { photoUrls: { hasSome: urls } },
        select: { id: true, photoUrls: true, customer: { select: { userId: true } } },
      }),
    ]);

    const cu = (o: any): string | null => o?.customer?.userId ?? null;
    const under = (u: string, folder: string, id?: string | null) => !!id && isUnder(u, `${folder}/${id}`);
    for (const r of dfs) if (want.has(r.fileUrl)) refs.push({ url: r.fileUrl, kind: 'design_file', bound: under(r.fileUrl, 'designs', r.design?.id), designOwnerUserId: r.design?.ownerId ?? null, customerUserId: cu(r.design?.order) });
    for (const r of ars) for (const u of [r.printSnapshotUrl, r.dielineSnapshotUrl, r.proofUrl]) if (u && want.has(u)) refs.push({ url: u, kind: 'approval_file', bound: under(u, 'approval-snapshots', r.id), customerUserId: cu(r.order) });
    for (const r of pos) {
      const own = (u: string) => under(u, 'purchase-orders', r.id);
      // Print and dieline are the approval snapshots of this PO's order: the key must be that very snapshot of an
      // approval request of the same order AND sit under approval-snapshots/<that request's id>/.
      const fromApproval = (u: string) =>
        (r.order?.approvalRequests ?? []).some(
          (a: any) => (u === a.printSnapshotUrl || u === a.dielineSnapshotUrl) && under(u, 'approval-snapshots', a.id)
        );
      const checks: Array<[string | null | undefined, (u: string) => boolean]> = [
        [r.poDocumentUrl, own], [r.specsFileUrl, own], [r.printFileUrl, fromApproval], [r.dielineFileUrl, fromApproval],
      ];
      for (const [u, ok] of checks) if (u && want.has(u)) refs.push({ url: u, kind: 'po_file', bound: ok(u), vendorUserId: r.vendor?.userId ?? null });
    }
    for (const r of samples) for (const u of r.photoUrls ?? []) if (want.has(u)) refs.push({ url: u, kind: 'sample_photo', bound: under(u, 'samples', r.productionId), vendorUserId: r.production?.vendor?.userId ?? null, customerUserId: cu(r.production?.purchaseOrder?.order) });
    // Labels and receipts come from the carrier / receipt generator as external URLs today. A local key counts only under shipments/<id>/ or settlements/<id>/ of that same record.
    for (const r of shipments) if (r.labelUrl && want.has(r.labelUrl)) refs.push({ url: r.labelUrl, kind: 'shipment_label', bound: under(r.labelUrl, 'shipments', r.id), customerUserId: cu(r.order) });
    for (const r of settlements) if (r.receiptUrl && want.has(r.receiptUrl)) refs.push({ url: r.receiptUrl, kind: 'settlement_receipt', bound: under(r.receiptUrl, 'settlements', r.id) });
    // Review photos: no upload path writes them today. A key counts only under reviews/<reviewId>/ of that review; the review's own customer and admin may be issued it.
    for (const r of reviews) for (const u of r.photoUrls ?? []) if (want.has(u)) refs.push({ url: u, kind: 'review_photo', bound: under(u, 'reviews', r.id), customerUserId: r.customer?.userId ?? null });
    return refs;
  };
}

/**
 * Write-side guard. A client field that names a local file (/api/files/...) is
 * accepted only if the writer is entitled to that file now. Without this, a user
 * could store another user's file URL on their own record. Other URLs pass.
 */
export async function assertLocalFileUrlsAllowed(
  actor: Actor,
  urls: string[],
  load: RefLoader,
  where: string
): Promise<void> {
  const local = urls.map((u) => normaliseFileUrl(u)).filter((u): u is string => !!u);
  if (local.length === 0) return;
  const { denied } = await authorizeFileUrls(actor, local, load);
  if (denied.length > 0) {
    logDeniedFileAccess(actor, denied, where);
    const { AppError } = await import('../../utils/errors');
    throw new AppError(403, 'One or more files are not available to you', 'FILE_NOT_ALLOWED');
  }
}
