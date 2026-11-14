import { prisma } from '../../lib/prisma';
import {
  NotFoundError,
  ValidationError,
  InternalServerError,
} from '../../utils/errors';
import { logger } from '../../utils/logger';
import { notificationService } from '../notifications/notifications.service';
import { Prisma, OrderStatus } from '@prisma/client';
import axios from 'axios';

/** SEC-03a — bounded FX provider wait; failures are loud, never silently converted. */
export const FX_TIMEOUT_MS = 10_000;

/**
 * SEC-03a — runtime injection point for the timeout (tests shorten it
 * deterministically); defaults to the approved FX_TIMEOUT_MS.
 */
export const FX_RUNTIME = { timeoutMs: FX_TIMEOUT_MS };

/**
 * SEC-03a — a `processing` settlement older than this is considered stuck
 * (crashed processor). Shared by the admin recover route and the settlement
 * audit classifier. The age is a NECESSARY but not sufficient crash signal —
 * see the recover route's operational verification checklist.
 */
export const STALE_PROCESSING_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** 72h customer verification window before a settlement may be processed. */
export const VERIFICATION_PERIOD_MS = 72 * 60 * 60 * 1000;

/**
 * SEC-03a — order statuses a settlement-creating transition must never
 * overwrite.
 */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  'delivered',
  'completed',
  'cancelled',
];

/**
 * SEC-03a — append an audit-trail entry to a settlement notes text. Every
 * runtime mutation of a settlement records why.
 */
export function appendNote(
  existing: string | null | undefined,
  entry: string
): string {
  const line = `[${new Date().toISOString()}] ${entry}`.slice(0, 500);
  return existing ? `${existing}\n${line}` : line;
}

/**
 * SEC-03a — fetch the USD→EGP rate. Only a successfully retrieved, finite,
 * positive rate is ever returned. NO hard-coded fallback: a provider failure,
 * timeout, or invalid payload must never produce a financial record — the
 * caller rolls the settlement back to pending and surfaces a clear error.
 */
export async function fetchUsdEgpRate(
  timeoutMs: number = FX_RUNTIME.timeoutMs
): Promise<number> {
  const res = await axios.get(`${process.env.EXCHANGE_RATE_API_URL}/latest/USD`, {
    params: {
      base: 'USD',
      symbols: 'EGP',
    },
    timeout: timeoutMs,
  });
  const rate = res?.data?.rates?.EGP;
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new InternalServerError(
      `FX provider returned invalid rate: ${String(rate)}`
    );
  }
  return rate;
}

/**
 * SEC-03a — ensure the (order, vendor) settlement reflects delivery.
 *
 * Callers: the DHL webhook delivery path, confirmPO, and acceptHandshake —
 * anywhere a vendor's POs become confirmed on a delivered order. MUST run
 * inside the caller's transaction; the gate's order-row updateMany is the
 * serialization point that closes the PO-confirmation race with the webhook.
 *
 * Gate: the order must be status='delivered' (idempotent updateMany — takes
 * the order row lock, no-ops otherwise, so cancelled/completed orders never
 * settle and undelivered orders defer settlement to their delivery event).
 *
 * Eligibility: only POs with status='confirmed'. Amount: Prisma.Decimal sum
 * of the vendor's confirmed PO costs, grouped per currency; mixed currencies
 * for one vendor are a stop-condition (skip + critical log — no settlement is
 * ever created from a mixed group).
 *
 * Guarded-write policy — runtime NEVER rewrites a non-pending settlement:
 *   absent                          → create pending (verification window from now)
 *   pending + amount/currency drift → conditional updateMany correction + notes
 *   processing/completed/failed     → never rewritten (critical log)
 */
export async function settleVendorForDeliveredOrder(
  tx: Prisma.TransactionClient,
  orderId: string,
  vendorId: string,
  reason: string,
  log: typeof logger = logger
): Promise<void> {
  // Gate + row lock: only a delivered order settles; every settlement creator
  // serializes on this updateMany.
  const gate = await tx.order.updateMany({
    where: { id: orderId, status: 'delivered' },
    data: { status: 'delivered' },
  });
  if (gate.count === 0) {
    return; // not delivered (or cancelled/completed) — nothing to settle
  }

  const pos = await tx.purchaseOrder.findMany({
    where: { orderId, vendorId },
  });
  const eligible = pos.filter((po) => po.status === 'confirmed');
  if (eligible.length === 0) {
    log.debug(
      `settle: vendor ${vendorId} has no confirmed POs on order ${orderId} — skipped (${reason})`
    );
    return;
  }

  const currencies = new Set(eligible.map((po) => po.currency));
  if (currencies.size > 1) {
    log.error(
      `CRITICAL: vendor ${vendorId} has mixed-currency confirmed POs on order ${orderId} — settlement skipped, manual finance review required (${reason})`
    );
    return;
  }
  const currency = eligible[0].currency;
  const amount = eligible.reduce<Prisma.Decimal>(
    (sum, po) => sum.plus(po.vendorCost),
    new Prisma.Decimal(0)
  );

  const existing = await tx.settlement.findUnique({
    where: { orderId_vendorId: { orderId, vendorId } },
  });

  if (!existing) {
    await tx.settlement.create({
      data: {
        orderId,
        vendorId,
        amount,
        currency,
        status: 'pending',
        verificationPeriodEndsAt: new Date(Date.now() + VERIFICATION_PERIOD_MS),
      },
    });
    log.info(
      `settlement created for vendor ${vendorId} on order ${orderId} (${reason})`
    );
    return;
  }

  if (existing.status === 'pending') {
    const unchanged =
      existing.currency === currency && existing.amount.equals(amount);
    if (unchanged) return;

    // Conditional correction — pending rows only. count 0 means a processing
    // claim landed between the read and the write; the amount that claim froze
    // wins and the correction is dropped (critical log).
    const corrected = await tx.settlement.updateMany({
      where: { orderId, vendorId, status: 'pending' },
      data: {
        amount,
        currency,
        notes: appendNote(
          existing.notes,
          `${reason}: corrected pending settlement to ${amount.toString()} ${currency}`
        ),
      },
    });
    if (corrected.count === 0) {
      const reread = await tx.settlement.findUnique({
        where: { orderId_vendorId: { orderId, vendorId } },
      });
      log.error(
        `CRITICAL: pending settlement correction lost for order ${orderId} vendor ${vendorId} — settlement is now '${reread?.status}'; runtime never rewrites a claimed settlement`
      );
    }
    return;
  }

  log.error(
    `CRITICAL: settlement ${existing.id} for order ${orderId} vendor ${vendorId} is '${existing.status}' — runtime never rewrites non-pending settlements (requested: ${amount.toString()} ${currency}, reason: ${reason})`
  );
}

export class SettlementService {
  /**
   * SEC-03a — the ONE processing implementation shared by the admin route and
   * the settlement worker: identical financial record and notification from
   * either entry point.
   *
   * Protocol:
   *  1. read-only probe (existence + verification window);
   *  2. ATOMIC claim pending→processing — one statement enforces 'pending'
   *     AND takes the row lock; exactly one caller wins, the rest reject;
   *  3. frozen post-claim read — pending-only corrections can no longer
   *     touch the row, so the amount cannot drift after the claim;
   *  4. FX (USD only) — only a finite positive retrieved rate; any failure
   *     throws BEFORE completion/notification (no financial record from an
   *     unverified rate);
   *  5. conditional completion updateMany where status='processing' —
   *     count 0 ⇒ the claim is no longer ours ⇒ abort without notification;
   *  6. in-app notification BEFORE email (sendEmail rethrows; the in-app
   *     notification is dedupe-idempotent).
   *
   * catch → compensating rollback processing→pending + notes + rethrow.
   *
   * ROLLBACK INVARIANT — valid ONLY while the post-claim sequence contains
   * zero external side effects (today: simulated sleep, no bank API). Once a
   * real bank transfer is initiated between claim and completion, automatic
   * rollback to pending is FORBIDDEN: recovery must first verify the
   * provider's transfer state (verify-then-resume), never an automatic retry.
   */
  async processSettlement(settlementId: string): Promise<any> {
    // Phase 1 — read-only probe.
    const probe = await prisma.settlement.findUnique({
      where: { id: settlementId },
    });
    if (!probe) {
      throw new NotFoundError('Settlement');
    }
    if (new Date() < probe.verificationPeriodEndsAt) {
      throw new ValidationError('Verification period has not ended yet');
    }

    // Phase 2 — atomic claim (replaces the read-then-write status check).
    const claim = await prisma.settlement.updateMany({
      where: { id: settlementId, status: 'pending' },
      data: { status: 'processing' },
    });
    if (claim.count === 0) {
      throw new ValidationError('Settlement is not in pending status');
    }

    try {
      // Phase 3 — frozen post-claim read.
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: {
          order: {
            include: {
              purchaseOrders: {
                include: {
                  vendor: true,
                },
              },
            },
          },
        },
      });
      if (!settlement) {
        throw new NotFoundError('Settlement');
      }

      // Phase 4 — FX: USD converts through a verified retrieved rate only.
      let convertedAmount = Number(settlement.amount);
      let exchangeRate = 1;

      if (settlement.currency === 'USD') {
        exchangeRate = await fetchUsdEgpRate();
        convertedAmount = Number(settlement.amount) * exchangeRate;
      }

      // In production, integrate with bank API for actual transfer.
      // For now, simulate processing (internal records only — no external
      // side effects, which is what keeps the compensating rollback valid).
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Generate receipt PDF (simplified)
      const receiptUrl = await this.generateReceipt(settlement);

      // Phase 5 — conditional completion: only while our claim still holds.
      const completed = await prisma.settlement.updateMany({
        where: { id: settlementId, status: 'processing' },
        data: {
          status: 'completed',
          processedAt: new Date(),
          convertedAmount,
          exchangeRate,
          receiptUrl,
        },
      });
      if (completed.count === 0) {
        throw new Error('CLAIM_REVOKED');
      }

      const updated = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: {
          order: {
            include: {
              purchaseOrders: {
                include: {
                  vendor: true,
                },
              },
            },
          },
        },
      });

      // Phase 6 — notification with the fresh, frozen record.
      await this.sendSettlementNotification(updated ?? settlement);

      return updated;
    } catch (error) {
      // Compensating rollback — targets ONLY processing rows, so a settlement
      // that already completed (e.g. email failed after completion) is never
      // reverted, and rows owned by nobody are untouched. Fresh notes read
      // keeps any concurrent audit-trail entry intact.
      const current = await prisma.settlement.findUnique({
        where: { id: settlementId },
        select: { notes: true },
      });
      await prisma.settlement.updateMany({
        where: { id: settlementId, status: 'processing' },
        data: {
          status: 'pending',
          notes: appendNote(
            current?.notes ?? null,
            `claim reverted after failure: ${String(error).slice(0, 200)}`
          ),
        },
      });
      throw error;
    }
  }

  /**
   * SEC-03a — recover a settlement stuck in 'processing' (crashed processor).
   * The 24h age predicate is INSIDE the atomic updateMany, so a live claim
   * (whose updatedAt was just bumped by the claim itself) can never be
   * reverted. Age is a NECESSARY but not sufficient crash signal — the
   * invoking admin route documents the full operational verification
   * checklist that must precede any recovery call.
   */
  async recoverStaleSettlement(
    settlementId: string,
    adminUserId: string
  ): Promise<void> {
    const prior = await prisma.settlement.findUnique({
      where: { id: settlementId },
      select: { notes: true },
    });
    if (!prior) {
      throw new NotFoundError('Settlement');
    }

    const reverted = await prisma.settlement.updateMany({
      where: {
        id: settlementId,
        status: 'processing',
        updatedAt: { lt: new Date(Date.now() - STALE_PROCESSING_THRESHOLD_MS) },
      },
      data: {
        status: 'pending',
        notes: appendNote(
          prior.notes,
          `recovered from stale processing by admin ${adminUserId} at ${new Date().toISOString()}`
        ),
      },
    });
    if (reverted.count === 0) {
      throw new ValidationError(
        'Settlement is not recoverable (not processing, or not older than the staleness threshold)'
      );
    }
  }

  /**
   * Get settlement by ID
   */
  async getSettlement(settlementId: string): Promise<any> {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        order: {
          include: {
            purchaseOrders: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundError('Settlement');
    }

    return settlement;
  }

  /**
   * Get vendor payments
   */
  async getVendorPayments(
    vendorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where: { vendorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.settlement.count({ where: { vendorId } }),
    ]);

    return {
      data: settlements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Generate receipt PDF (simplified)
   */
  private async generateReceipt(settlement: any): Promise<string> {
    // In production, use PDF generator
    return `https://receipts.packagepro.com/${settlement.id}.pdf`;
  }

  /**
   * SEC-03a — notify the settlement's OWN vendor (resolved via
   * settlement.vendorId — not purchaseOrders[0], which can belong to a
   * different vendor under multi-PO orders). In-app first (idempotent), email
   * second: sendEmail rethrows, and an email failure must never revert the
   * completed settlement.
   */
  private async sendSettlementNotification(settlement: any): Promise<void> {
    const { emailService } = await import('../../services/email/email.service');

    const vendor = await prisma.vendor.findUnique({
      where: { id: settlement.vendorId },
      include: { user: true },
    });

    if (vendor?.user?.id) {
      await notificationService.createIfUnseen(
        vendor.user.id,
        { entityType: 'settlement', entityId: settlement.id },
        {
          type: 'settlement_completed',
          title: `Settlement completed for ${settlement.order.orderNumber}`,
          message: `Your settlement for ${settlement.order.orderNumber} has been completed.`,
        }
      );
    }

    if (vendor?.user?.email) {
      await emailService.sendEmail({
        to: vendor.user.email,
        subject: `Payment Received - ${settlement.order.orderNumber}`,
        template: 'settlement-notification',
        templateData: { settlement },
      });
    } else {
      logger.warn(
        `Settlement ${settlement.id}: vendor has no user/email — settlement email skipped`
      );
    }
  }
}

export const settlementService = new SettlementService();
