// M8-J — Certified dieline delivery receipt (pure, database-free).
//
// The DHL/dieline geometry lives exclusively in the frontend canonical pipeline
// (resolveDieline -> buildDieline -> serializeSVG). This module owns NO geometry
// and NO prepress checking: it maps the *persisted* M8-I prepress result (the
// same row the existing GET /orders/:id/prepress-results returns) to an explicit
// delivery receipt for the existing `POST /designs/:id/export` route.
//
// Three facts make the receipt deterministic and auditable without a second
// engine:
//   1. file name — deterministic dieline-<boxType>.svg, never timestamps/UUIDs
//   2. certification — current iff the last check covers the persisted design
//      (passed) and is not stale (checkedAt >= design.updatedAt)
//   3. UNVERIFIABLE verdicts (a real M8-I outcome) are never marketed as a pass
//
// The FE remains the byte authority for delivery: the client re-derives the
// canonical artifact through serializeSVG and requires byte-identity with the
// certified snapshot before downloading. This module records the corroborating
// server-side receipt so the delivery has a lifecycle-anchored audit trail.
//
// Pure module (no DB / no network): unit-tested with vitest.

export type DeliveryCertificationStatus = 'CERTIFIED' | 'UNVERIFIABLE' | 'FAILED' | 'NOT_CERTIFIED';

export interface DeliveryIssueLike {
  type?: string;
  severity?: string;
  message?: string;
}

export interface DeliveryPrePressResult {
  passed?: boolean | null;
  checkedAt?: Date | string | null;
  issues?: DeliveryIssueLike[] | null;
}

export interface CertifiedDielineReceipt {
  format: 'svg';
  dieline: boolean;
  status: 'delivered' | 'blocked_certification' | 'unavailable';
  certificationStatus: DeliveryCertificationStatus;
  reason: string;
  detail?: string;
  fileName?: string;
  checkedAt?: string | null;
}

export interface DeliveryInput {
  /** Order id on the design; null when the session has no linked order. */
  orderId: string | null | undefined;
  designUpdatedAt: Date | string | null | undefined;
  /** Persisted result from prePressCheckService.getPrePressResults (or null). */
  prepress: DeliveryPrePressResult | null | undefined;
  boxType?: string | null;
}

/** Deterministic dieline export file name (mm SVG). */
export function dielineDeliveryFileName(boxType?: string | null): string {
  const slug =
    (boxType ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'dieline';
  return `dieline-${slug}.svg`;
}

/** M8-I demotes every UNVERIFIABLE verdict to a warning; it never fakes a pass. */
export function hasUnverifiableVerdict(prepress: DeliveryPrePressResult | null | undefined): boolean {
  return !!prepress?.issues?.some((i) => /unverifiable/i.test(i.message ?? ''));
}

/**
 * Map the persisted M8-I result to an explicit delivery receipt. Byte-identity
 * between the live editor artifact and the certified snapshot is enforced on the
 * frontend; this receipt is corroborating and lifecycle-anchored.
 */
export function certifiedDielineReceipt(input: DeliveryInput): CertifiedDielineReceipt {
  const { orderId, designUpdatedAt, prepress, boxType } = input;
  const fileName = dielineDeliveryFileName(boxType);

  if (!orderId) {
    return {
      format: 'svg',
      dieline: true,
      status: 'unavailable',
      certificationStatus: 'NOT_CERTIFIED',
      reason: 'Design has no linked order — prepress certification is impossible',
    };
  }

  if (!prepress) {
    return {
      format: 'svg',
      dieline: true,
      status: 'blocked_certification',
      certificationStatus: 'NOT_CERTIFIED',
      reason: 'No prepress certification is on record for this design',
      fileName,
    };
  }

  const checkedAt = prepress.checkedAt ? new Date(prepress.checkedAt) : null;
  const updatedAt = designUpdatedAt ? new Date(designUpdatedAt) : null;
  const stale = !!checkedAt && !!updatedAt && updatedAt.getTime() > checkedAt.getTime();

  if (stale) {
    return {
      format: 'svg',
      dieline: true,
      status: 'blocked_certification',
      certificationStatus: 'NOT_CERTIFIED',
      reason: 'Certification is stale — the design changed after the last prepress check',
      detail: `design.updatedAt (${updatedAt?.toISOString()}) is newer than checkedAt (${checkedAt?.toISOString()})`,
      fileName,
      checkedAt: checkedAt?.toISOString() ?? null,
    };
  }

  if (prepress.passed === false) {
    return {
      format: 'svg',
      dieline: true,
      status: 'blocked_certification',
      certificationStatus: 'FAILED',
      reason: 'Prepress certification failed — delivery is blocked',
      fileName,
      checkedAt: checkedAt?.toISOString() ?? null,
    };
  }

  if (hasUnverifiableVerdict(prepress)) {
    return {
      format: 'svg',
      dieline: true,
      status: 'blocked_certification',
      certificationStatus: 'UNVERIFIABLE',
      reason: 'Prepress results are unverifiable — delivery cannot be certified',
      fileName,
      checkedAt: checkedAt?.toISOString() ?? null,
    };
  }

  return {
    format: 'svg',
    dieline: true,
    status: 'delivered',
    certificationStatus: 'CERTIFIED',
    reason: 'Certified dieline delivery — client assembles the canonical serializeSVG artifact',
    fileName,
    checkedAt: checkedAt?.toISOString() ?? null,
  };
}