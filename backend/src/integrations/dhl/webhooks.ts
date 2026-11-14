import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { dhlService } from './dhl.service';
import { ShipmentStatus } from '@prisma/client';
import {
  settleVendorForDeliveredOrder,
  TERMINAL_ORDER_STATUSES,
} from '../../modules/settlements/settlement.service';

/**
 * SEC-03a — shipment lifecycle rank. Provider-confirmed transitions are
 * applied forward-only so a stale carrier response can never regress state.
 */
const SHIPMENT_STATUS_RANK: Record<string, number> = {
  created: 0,
  label_generated: 1,
  picked_up: 2,
  in_transit: 3,
  out_for_delivery: 4,
  delivered: 5,
};

/** Map a webhook event type to a ShipmentStatus claim, or null when unknown. */
function mapEventType(eventType: string | undefined): ShipmentStatus | null {
  if (!eventType) return null;
  const normalized = eventType.trim().toLowerCase().replace(/[\s-]+/g, '_');
  switch (normalized) {
    case 'picked_up':
      return 'picked_up';
    case 'in_transit':
      return 'in_transit';
    case 'out_for_delivery':
      return 'out_for_delivery';
    case 'delivered':
      return 'delivered';
    default:
      return null;
  }
}

/**
 * SEC-03a — DHL webhook handler.
 *
 * This endpoint is unauthenticated by nature (carrier push), so NO event JSON
 * is trusted. Every event for a known shipment triggers an independent Track
 * API query using the shipment's STORED tracking number (outside any
 * transaction), and only the provider's answer may change authoritative
 * state:
 *
 *  - a `delivered` claim must be unambiguously confirmed by the carrier
 *    before the financial transition (order delivered + per-vendor
 *    settlements). A definitive carrier "not delivered" refuses the event
 *    with HTTP 200 and ZERO database writes; an API error, timeout, malformed
 *    response, or inconclusive status answers HTTP 500 so DHL retries — also
 *    with zero writes. Missing DHL credentials fail explicitly (no silent
 *    bypass).
 *  - non-delivered claims never move authoritative state from raw JSON: they
 *    act as refresh hints, and only provider-confirmed, forward-only facts
 *    are applied. If the carrier reports delivered on a refresh, the
 *    provider's state wins (settlement eligibility included).
 *  - unknown tracking numbers get a uniform 200 (no existence oracle).
 *  - failed shipments refuse further events.
 */
export async function handleDHLWebhook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const event = request.body as any;
  const trackingNumber = event?.trackingNumber || event?.shipmentTrackingNumber;

  if (!trackingNumber) {
    return reply.status(400).send({
      success: false,
      error: 'Missing tracking number',
    });
  }

  try {
    const shipment = await prisma.shipment.findUnique({
      where: { dhlTrackingNumber: trackingNumber },
    });

    // Unknown tracking → uniform 200 (no existence oracle for attackers).
    if (!shipment) {
      logger.warn(
        `DHL webhook: no shipment for tracking number ${trackingNumber}`
      );
      return reply.status(200).send({ received: true });
    }

    // Failed shipments refuse further events (label/creation failed upstream).
    if (shipment.status === 'failed') {
      logger.warn(
        `DHL webhook: shipment ${shipment.id} is failed — event refused`
      );
      return reply.status(200).send({ received: true });
    }

    const claimedStatus = mapEventType(event.eventType || event.status);
    const storedTracking = shipment.dhlTrackingNumber as string;

    // ---- Independent carrier verification (OUTSIDE any transaction) ----
    if (claimedStatus === 'delivered') {
      let confirmed: boolean;
      try {
        confirmed = await dhlService.isConfirmedDelivered(storedTracking);
      } catch (verifyError) {
        // API error / timeout / malformed / inconclusive → 500 so DHL
        // retries later. Zero database writes.
        logger.error(
          `DHL delivered-verification failed for ${storedTracking}: ${String(
            verifyError
          )}`
        );
        return reply.status(500).send({
          success: false,
          error: 'Delivery verification unavailable',
        });
      }

      if (!confirmed) {
        // Carrier definitively reports a non-delivered state → untrusted
        // event: refuse with zero writes.
        logger.error(
          `UNTRUSTED delivered event refused for ${storedTracking}: carrier does not confirm delivery`
        );
        return reply.status(200).send({ received: true });
      }

      return await applyVerifiedState(shipment.id, 'delivered', reply);
    }

    // Non-delivered (or unknown) claims: refresh-hint semantics.
    const verified = await dhlService.fetchVerifiedShipmentState(
      storedTracking
    );
    // Throws on API error/timeout/malformed → outer catch → 500, zero writes.

    if (verified.delivered) {
      // Provider source of truth: a delivered state settles regardless of
      // which event triggered the refresh.
      return await applyVerifiedState(shipment.id, 'delivered', reply);
    }

    if (
      verified.status &&
      (SHIPMENT_STATUS_RANK[verified.status] ?? -1) >
        (SHIPMENT_STATUS_RANK[shipment.status] ?? -1)
    ) {
      // Provider-confirmed, forward-only transition.
      return await applyVerifiedState(shipment.id, verified.status, reply);
    }

    // Nothing verifiable to apply (inconclusive carrier status, or a state
    // not ahead of ours) → leave authoritative state unchanged, zero writes.
    if (verified.status === null) {
      logger.warn(
        `DHL webhook: inconclusive carrier status "${verified.rawStatus}" for ${storedTracking} — event not applied`
      );
    }
    return reply.status(200).send({ received: true });
  } catch (error) {
    logger.error('Error handling DHL webhook', error);
    return reply.status(500).send({
      success: false,
      error: 'Error processing webhook',
    });
  }
}

/**
 * SEC-03a — apply a PROVIDER-CONFIRMED shipment state in one transaction:
 * shipment-row FOR UPDATE lock first (serializes concurrent webhook events
 * for one shipment, and makes tracking-event appends read-modify-write safe)
 * → fresh in-tx reads → verified tracking event append (ring buffer, cap 100)
 * → status transition → on delivered: guarded order transition (terminal
 * states never overwritten) and settlements written LAST via the shared
 * per-vendor helper. `podSignature` is never written from webhook JSON.
 */
async function applyVerifiedState(
  shipmentId: string,
  verifiedStatus: string,
  reply: FastifyReply
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Row lock FIRST — no catches inside interactive transactions; any
    // statement error aborts the whole transaction (atomic event).
    await tx.$executeRaw`SELECT id FROM "shipments" WHERE id = ${shipmentId} FOR UPDATE`;

    const fresh = await tx.shipment.findUnique({ where: { id: shipmentId } });
    if (!fresh) {
      throw new Error('Shipment row disappeared during webhook transaction');
    }
    // Defense-in-depth: a failure landing between the pre-check read and this
    // in-transaction read still blocks the whole event.
    if (fresh.status === 'failed') {
      throw new Error(
        `Shipment ${shipmentId} is failed — refusing tracking event`
      );
    }

    const isDelivered = verifiedStatus === 'delivered';
    const events = ((fresh.trackingEvents as any[]) ?? []).slice();
    events.push({
      timestamp: new Date().toISOString(),
      status: verifiedStatus,
      verified: true,
      source: 'dhl-track-api',
    });
    // Ring buffer: keep the newest 100 entries.
    const appended = events.slice(-100);

    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        trackingEvents: appended as any,
        ...(isDelivered &&
          fresh.status !== 'delivered' && {
            status: 'delivered',
            actualDeliveryDate: new Date(),
          }),
        ...(!isDelivered &&
          verifiedStatus !== fresh.status && {
            status: verifiedStatus as ShipmentStatus,
          }),
      },
    });

    if (!isDelivered) return;

    // Guarded order transition — terminal states are never overwritten.
    await tx.order.updateMany({
      where: {
        id: fresh.orderId,
        status: { notIn: TERMINAL_ORDER_STATUSES },
      },
      data: { status: 'delivered', deliveredAt: new Date() },
    });

    // Settlements LAST: one pending settlement per vendor holding a
    // confirmed PO (Decimal sum, mixed-currency stop-condition inside).
    const confirmedPOs = await tx.purchaseOrder.findMany({
      where: { orderId: fresh.orderId, status: 'confirmed' },
      select: { vendorId: true },
    });
    const vendorIds = [...new Set(confirmedPOs.map((po) => po.vendorId))];
    for (const vendorId of vendorIds) {
      await settleVendorForDeliveredOrder(
        tx,
        fresh.orderId,
        vendorId,
        'dhl-webhook-delivered',
        logger
      );
    }
  });

  return reply.status(200).send({ received: true });
}
