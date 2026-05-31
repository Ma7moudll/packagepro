import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';

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
   * Accept handshake
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

    // Update handshake
    const updated = await prisma.handshake.update({
      where: { id: handshakeId },
      data: {
        status: 'accepted',
        acceptedAt: new Date(),
      },
    });

    // Update PO status
    await prisma.purchaseOrder.update({
      where: { id: handshake.poId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    });

    // Update order status
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: handshake.poId },
    });

    if (po) {
      await prisma.order.update({
        where: { id: po.orderId },
        data: {
          status: 'vendor_confirmed',
        },
      });
    }

    return updated;
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
