import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import {
  settleVendorForDeliveredOrder,
  TERMINAL_ORDER_STATUSES,
} from '../settlements/settlement.service';

export class HandshakeService {
  /**
   * Create handshake request
   */
  async createHandshake(poId: string, vendorId: string): Promise<any> {
    // Verify PO exists
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
    });

    if (!po) {
      throw new NotFoundError('Purchase Order');
    }

    // Create handshake with 4-hour expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4);

    const handshake = await prisma.handshake.create({
      data: {
        poId,
        vendorId,
        status: 'pending',
        expiresAt,
      },
      include: {
        purchaseOrder: {
          include: {
            order: true,
          },
        },
        vendor: true,
      },
    });

    return handshake;
  }

  /**
   * Accept handshake.
   *
   * SEC-03a: wrapped in a transaction; the order's vendor_confirmed
   * transition is guarded so terminal states (delivered/completed/cancelled)
   * are never overwritten; and if the order is already delivered, the
   * vendor's settlement is ensured in the same transaction (the helper's
   * order-row gate closes the late-confirmation race with the DHL webhook).
   */
  async acceptHandshake(handshakeId: string): Promise<any> {
    const handshake = await prisma.handshake.findUnique({
      where: { id: handshakeId },
    });

    if (!handshake) {
      throw new NotFoundError('Handshake');
    }

    if (handshake.status !== 'pending') {
      throw new Error('Handshake is no longer pending');
    }

    if (new Date() > handshake.expiresAt) {
      throw new Error('Handshake has expired');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.handshake.update({
        where: { id: handshakeId },
        data: {
          status: 'accepted',
          acceptedAt: new Date(),
        },
      });

      const po = await tx.purchaseOrder.findUnique({
        where: { id: handshake.poId },
      });

      if (po) {
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: {
            status: 'confirmed',
            confirmedAt: new Date(),
          },
        });

        // Guarded transition — a delivered/completed/cancelled order is never
        // moved to vendor_confirmed.
        await tx.order.updateMany({
          where: {
            id: po.orderId,
            status: { notIn: TERMINAL_ORDER_STATUSES },
          },
          data: { status: 'vendor_confirmed' },
        });

        await settleVendorForDeliveredOrder(
          tx,
          po.orderId,
          po.vendorId,
          'handshake-accepted',
          logger
        );
      }

      return updated;
    });
  }

  /**
   * Reject handshake
   */
  async rejectHandshake(handshakeId: string, reason?: string): Promise<any> {
    const handshake = await prisma.handshake.findUnique({
      where: { id: handshakeId },
    });

    if (!handshake) {
      throw new NotFoundError('Handshake');
    }

    const updated = await prisma.handshake.update({
      where: { id: handshakeId },
      data: {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: reason,
      },
    });

    return updated;
  }
}

export const handshakeService = new HandshakeService();
