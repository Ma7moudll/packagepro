import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

export async function handleDHLWebhook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const event = request.body as any;
    const trackingNumber = event.trackingNumber || event.shipmentTrackingNumber;

    if (!trackingNumber) {
      return reply.status(400).send({
        success: false,
        error: 'Missing tracking number',
      });
    }

    // Find shipment by tracking number
    const shipment = await prisma.shipment.findUnique({
      where: { dhlTrackingNumber: trackingNumber },
      include: {
        order: true,
      },
    });

    if (!shipment) {
      logger.warn(`Shipment not found for tracking number: ${trackingNumber}`);
      return reply.status(404).send({
        success: false,
        error: 'Shipment not found',
      });
    }

    // Update shipment status based on event
    const eventType = event.eventType || event.status;
    let newStatus = shipment.status;

    switch (eventType) {
      case 'picked_up':
      case 'PICKED_UP':
        newStatus = 'picked_up';
        break;
      case 'in_transit':
      case 'IN_TRANSIT':
        newStatus = 'in_transit';
        break;
      case 'out_for_delivery':
      case 'OUT_FOR_DELIVERY':
        newStatus = 'out_for_delivery';
        break;
      case 'delivered':
      case 'DELIVERED':
        newStatus = 'delivered';
        
        // Update order status
        await prisma.order.update({
          where: { id: shipment.orderId },
          data: {
            status: 'delivered',
            deliveredAt: new Date(),
          },
        });

        // Create settlement (72 hours later)
        await createSettlementForOrder(shipment.orderId);
        break;
    }

    // Update tracking events
    const trackingEvents = (shipment.trackingEvents as any) || [];
    trackingEvents.push({
      timestamp: new Date().toISOString(),
      status: eventType,
      location: event.location,
      description: event.description,
    });

    // Update shipment
    await prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: newStatus as any,
        trackingEvents,
        ...(newStatus === 'delivered' && {
          actualDeliveryDate: new Date(),
          podSignature: event.signature,
        }),
      },
    });

    logger.info(`Shipment ${trackingNumber} updated: ${newStatus}`);

    return reply.status(200).send({ received: true });
  } catch (error) {
    logger.error('Error handling DHL webhook', error);
    return reply.status(500).send({
      success: false,
      error: 'Error processing webhook',
    });
  }
}

async function createSettlementForOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      purchaseOrders: {
        include: {
          vendor: true,
        },
      },
    },
  });

  // 4a bridge: an order routes through one PO per vendor item-group once
  // multi-vendor splitting lands (4b); the first PO is the settlement vendor.
  const primaryPO = order?.purchaseOrders[0] ?? null;

  if (!order || !primaryPO) {
    return;
  }

  // Calculate 72 hours from now
  const verificationPeriodEndsAt = new Date();
  verificationPeriodEndsAt.setHours(verificationPeriodEndsAt.getHours() + 72);

  await prisma.settlement.create({
    data: {
      orderId,
      vendorId: primaryPO.vendorId,
      amount: primaryPO.vendorCost,
      currency: primaryPO.currency,
      verificationPeriodEndsAt,
      status: 'pending',
    },
  });
}
