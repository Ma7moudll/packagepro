import {fenceDispatchWriter} from '../consolidation/dispatch-writer-fence';
import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import {
  settleVendorForDeliveredOrder,
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

    const poLookup = await prisma.purchaseOrder.findUnique({
      where: { id: handshake.poId }, select: { orderId: true },
    });
    return prisma.$transaction(async (tx) => {
      // Follow the production/receipt order-first lock order before touching a PO.
      if (poLookup) await tx.$queryRaw`SELECT id FROM orders WHERE id=${poLookup.orderId} FOR UPDATE`;
      const fresh=await tx.handshake.findUniqueOrThrow({where:{id:handshakeId}});
      if(fresh.status!=='pending'||fresh.expiresAt<new Date())throw new Error('Handshake is no longer pending or has expired');
      if(poLookup)await fenceDispatchWriter(tx,poLookup.orderId,'handshake_accepted_before_start');
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

        // First acceptance may advance routing, never regress later production/fulfillment.
        await tx.order.updateMany({
          where: {
            id: po.orderId,
            status: 'ready_for_routing',
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
