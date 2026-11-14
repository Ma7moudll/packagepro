import { Prisma, PrismaClient } from '@prisma/client';
import { STALE_PROCESSING_THRESHOLD_MS } from './settlement.service';

/**
 * SEC-03a — read-only settlement audit classifier.
 *
 * Purpose: pre/post gating for the per-vendor settlement rollout. All
 * classification is PURE (data in → findings out); `loadAuditData` does the
 * reads. Nothing here writes.
 *
 * Expectations:
 *  - orders with status 'delivered' are GATING: every vendor holding a
 *    confirmed PO must have exactly one settlement, and a pending settlement's
 *    amount/currency must equal the Prisma.Decimal sum of that vendor's
 *    confirmed PO costs;
 *  - orders with status 'completed' are MANUAL-REVIEW (reported, non-gating);
 *  - cancelled orders never expect settlements (MISSING suppressed);
 *  - every other order status has no MISSING expectation.
 *
 * Finding classes:
 *  MISSING_PRE_REPAIRABLE  — delivered order, exactly one expected vendor,
 *                            zero settlement rows (legacy single-PO gap a
 *                            backfill repairs). Blocks the PRE gate.
 *  MISSING_NEEDS_COMPOSITE — delivered order missing settlements for some/all
 *                            of several expected vendors (needs per-vendor
 *                            composite creation). Blocks the POST gate.
 *  PENDING_MISMATCH        — pending settlement whose amount/currency drifts
 *                            from its vendor's confirmed-PO Decimal sum.
 *                            Blocks the PRE gate (delivered orders); manual
 *                            elsewhere.
 *  AMBIGUOUS               — settlement row on a delivered/completed order
 *                            whose vendor holds NO confirmed PO (legacy
 *                            purchaseOrders[0] shape with drifted PO state).
 *                            Delivered → blocks the PRE gate; completed → manual.
 *  MISSING_COMPLETED       — completed order missing a settlement (manual).
 *  STUCK_PROCESSING        — settlement stuck in 'processing' older than
 *                            STALE_PROCESSING_THRESHOLD_MS (manual; shares
 *                            the recover route's constant).
 *
 * Gate definitions (matching scripts/audit-settlements.ts exit codes):
 *  PRE  blocks on: PENDING_MISMATCH(delivered) ∨ MISSING_PRE_REPAIRABLE
 *                  ∨ AMBIGUOUS(delivered)
 *  POST blocks on: all PRE conditions ∨ MISSING_NEEDS_COMPOSITE
 */

export interface AuditOrder {
  id: string;
  status: string;
  orderNumber: string;
  purchaseOrders: Array<{
    vendorId: string;
    status: string;
    vendorCost: Prisma.Decimal;
    currency: string;
  }>;
}

export interface AuditSettlement {
  id: string;
  orderId: string;
  vendorId: string;
  status: string;
  amount: Prisma.Decimal;
  currency: string;
  updatedAt: Date;
}

export type AuditFindingClass =
  | 'MISSING_PRE_REPAIRABLE'
  | 'MISSING_NEEDS_COMPOSITE'
  | 'MISSING_COMPLETED'
  | 'PENDING_MISMATCH'
  | 'AMBIGUOUS'
  | 'STUCK_PROCESSING';

export interface AuditFinding {
  /** blocking = affects gate exit codes; manual = reported, non-gating */
  severity: 'blocking' | 'manual';
  class: AuditFindingClass;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  vendorId: string | null;
  settlementId?: string;
  detail: string;
}

export interface AuditReport {
  generatedAt: string;
  ordersAudited: number;
  settlementsAudited: number;
  findings: AuditFinding[];
  counts: Record<AuditFindingClass, number>;
  gates: {
    /** pre-deployment gate: legacy gaps the rollout backfill repairs */
    pre: boolean;
    /** post-deployment gate: residual gaps needing manual composite repair */
    post: boolean;
  };
}

/** Read-only data load for the classifier. */
export async function loadAuditData(prisma: PrismaClient): Promise<{
  orders: AuditOrder[];
  settlements: AuditSettlement[];
}> {
  const [orders, settlements] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { status: { in: ['delivered', 'completed', 'cancelled'] } },
          { settlements: { some: {} } },
        ],
      },
      select: {
        id: true,
        status: true,
        orderNumber: true,
        purchaseOrders: {
          select: {
            vendorId: true,
            status: true,
            vendorCost: true,
            currency: true,
          },
        },
      },
    }),
    prisma.settlement.findMany({
      select: {
        id: true,
        orderId: true,
        vendorId: true,
        status: true,
        amount: true,
        currency: true,
        updatedAt: true,
      },
    }),
  ]);
  return { orders, settlements };
}

/**
 * Pure classifier: orders + settlements in, findings + gate booleans out.
 * Deterministic; no I/O.
 */
export function classifySettlementAudit(
  orders: AuditOrder[],
  settlements: AuditSettlement[],
  now: Date = new Date()
): AuditReport {
  const findings: AuditFinding[] = [];
  const settlementsByOrder = new Map<string, AuditSettlement[]>();
  for (const s of settlements) {
    const list = settlementsByOrder.get(s.orderId) ?? [];
    list.push(s);
    settlementsByOrder.set(s.orderId, list);
  }

  const staleBefore = new Date(now.getTime() - STALE_PROCESSING_THRESHOLD_MS);

  for (const order of orders) {
    const rows = settlementsByOrder.get(order.id) ?? [];
    const gating = order.status === 'delivered';
    const completed = order.status === 'completed';
    const cancelled = order.status === 'cancelled';

    // STUCK_PROCESSING — any status, non-gating (ops visibility).
    for (const row of rows) {
      if (row.status === 'processing' && row.updatedAt < staleBefore) {
        findings.push({
          severity: 'manual',
          class: 'STUCK_PROCESSING',
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          vendorId: row.vendorId,
          settlementId: row.id,
          detail: `processing since ${row.updatedAt.toISOString()} (older than the 24h staleness threshold)`,
        });
      }
    }

    if (cancelled) continue; // cancelled orders never expect settlements

    const expectedVendors = [
      ...new Set(
        order.purchaseOrders
          .filter((po) => po.status === 'confirmed')
          .map((po) => po.vendorId)
      ),
    ];

    // AMBIGUOUS — rows whose vendor holds no confirmed PO on this order.
    for (const row of rows) {
      if (!expectedVendors.includes(row.vendorId)) {
        findings.push({
          severity: gating ? 'blocking' : 'manual',
          class: 'AMBIGUOUS',
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          vendorId: row.vendorId,
          settlementId: row.id,
          detail: `settlement for vendor without a confirmed PO (row status '${row.status}')`,
        });
      }
    }

    if (!gating && !completed) continue; // no MISSING / mismatch expectation

    const severity: AuditFinding['severity'] = gating ? 'blocking' : 'manual';

    for (const vendorId of expectedVendors) {
      const vendorRows = rows.filter((r) => r.vendorId === vendorId);
      const confirmedPOs = order.purchaseOrders.filter(
        (po) => po.vendorId === vendorId && po.status === 'confirmed'
      );

      if (vendorRows.length === 0) {
        if (gating) {
          const preRepairable = rows.length === 0 && expectedVendors.length === 1;
          findings.push({
            severity: 'blocking',
            class: preRepairable
              ? 'MISSING_PRE_REPAIRABLE'
              : 'MISSING_NEEDS_COMPOSITE',
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            vendorId,
            detail: preRepairable
              ? 'delivered order with a single expected vendor and no settlement (legacy single-PO gap; backfill repairs)'
              : 'delivered order missing a per-vendor settlement among several expected vendors (needs composite creation)',
          });
        } else {
          findings.push({
            severity: 'manual',
            class: 'MISSING_COMPLETED',
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            vendorId,
            detail: 'completed order missing an expected settlement',
          });
        }
        continue;
      }

      // PENDING_MISMATCH — pending rows must equal the Decimal PO sum.
      for (const row of vendorRows) {
        if (row.status !== 'pending') continue;
        const currencies = new Set(confirmedPOs.map((po) => po.currency));
        if (currencies.size > 1) {
          findings.push({
            severity,
            class: 'PENDING_MISMATCH',
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            vendorId,
            settlementId: row.id,
            detail: `vendor has mixed-currency confirmed POs [${[...currencies].join(', ')}] — settlement cannot be validated`,
          });
          continue;
        }
        const currency = confirmedPOs[0].currency;
        const expectedAmount = confirmedPOs.reduce<Prisma.Decimal>(
          (sum, po) => sum.plus(po.vendorCost),
          new Prisma.Decimal(0)
        );
        const mismatched =
          row.currency !== currency || !row.amount.equals(expectedAmount);
        if (mismatched) {
          findings.push({
            severity,
            class: 'PENDING_MISMATCH',
            orderId: order.id,
            orderNumber: order.orderNumber,
            orderStatus: order.status,
            vendorId,
            settlementId: row.id,
            detail: `pending settlement ${row.amount.toString()} ${row.currency} != confirmed-PO sum ${expectedAmount.toString()} ${currency}`,
          });
        }
      }
    }
  }

  const counts = Object.fromEntries(
    (
      [
        'MISSING_PRE_REPAIRABLE',
        'MISSING_NEEDS_COMPOSITE',
        'MISSING_COMPLETED',
        'PENDING_MISMATCH',
        'AMBIGUOUS',
        'STUCK_PROCESSING',
      ] as AuditFindingClass[]
    ).map((c) => [c, findings.filter((f) => f.class === c).length])
  ) as Record<AuditFindingClass, number>;

  const preBlocking = findings.some(
    (f) =>
      f.severity === 'blocking' &&
      (f.class === 'PENDING_MISMATCH' ||
        f.class === 'MISSING_PRE_REPAIRABLE' ||
        f.class === 'AMBIGUOUS')
  );
  const postBlocking =
    preBlocking ||
    findings.some((f) => f.class === 'MISSING_NEEDS_COMPOSITE');

  return {
    generatedAt: now.toISOString(),
    ordersAudited: orders.length,
    settlementsAudited: settlements.length,
    findings,
    counts,
    gates: { pre: preBlocking, post: postBlocking },
  };
}
