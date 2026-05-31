import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { dhlService } from '../../integrations/dhl/dhl.service';
import { emailService } from '../../services/email/email.service';

export class ShipmentService {
  /**
   * Create shipment for an order
   */
  async createShipment(orderId: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        purchaseOrder: {
          include: {
            vendor: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.status !== 'ready_to_ship') {
      throw new ValidationError('Order is not ready to ship');
    }

    // Check if shipment already exists
    const existingShipment = await prisma.shipment.findUnique({
      where: { orderId },
    });

    if (existingShipment) {
      throw new ValidationError('Shipment already exists for this order');
    }

    // Calculate weight and dimensions from order items (simplified)
    const weight = 1.0; // kg (calculate from items)
    const dimensions = {
      length: 30,
      width: 20,
      height: 10,
    };

    // Create DHL shipment
    const dhlResult = await dhlService.createShipment({
      orderId,
      pickupAddress: {
        name: order.purchaseOrder?.vendor?.companyName || '',
        address: order.purchaseOrder?.vendor?.address || '',
        city: order.purchaseOrder?.vendor?.city || '',
        postalCode: order.purchaseOrder?.vendor?.postalCode || '',
        country: order.purchaseOrder?.vendor?.country || '',
        phone: order.purchaseOrder?.vendor?.phone || '',
      },
      deliveryAddress: order.shippingAddress as any,
      weight,
      dimensions,
      shippingMethod: 'express',
    });

    // Create shipment record
    const shipment = await prisma.shipment.create({
      data: {
        orderId,
        dhlTrackingNumber: dhlResult.trackingNumber,
        status: 'label_generated',
        labelUrl: dhlResult.labelUrl,
        weight,
        dimensions: dimensions as any,
        estimatedDeliveryDate: dhlResult.estimatedDeliveryDate,
        shippingMethod: 'express',
      },
      include: {
        order: {
          include: {
            customer: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'shipped',
        shippedAt: new Date(),
      },
    });

    // Send label to vendor
    if (order.purchaseOrder?.vendor?.user?.email) {
      await emailService.sendEmail({
        to: order.purchaseOrder.vendor.user.email,
        subject: `Shipping Label for Order ${order.orderNumber}`,
        template: 'shipping-label',
        templateData: {
          order,
          shipment,
          labelUrl: dhlResult.labelUrl,
        },
      });
    }

    // Notify customer
    await emailService.sendEmail({
      to: shipment.order.customer.user.email,
      subject: `Your Order ${order.orderNumber} Has Shipped`,
      template: 'order-shipped',
      templateData: {
        order,
        shipment,
        trackingNumber: dhlResult.trackingNumber,
      },
    });

    return shipment;
  }

  /**
   * Get shipment tracking
   */
  async getTracking(shipmentId: string): Promise<any> {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: true,
      },
    });

    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    if (!shipment.dhlTrackingNumber) {
      throw new ValidationError('Tracking number not available');
    }

    // Get latest tracking from DHL
    const trackingData = await dhlService.trackShipment(shipment.dhlTrackingNumber);

    return {
      ...shipment,
      trackingData,
    };
  }

  /**
   * Get shipment by order ID
   */
  async getShipmentByOrder(orderId: string): Promise<any> {
    const shipment = await prisma.shipment.findUnique({
      where: { orderId },
      include: {
        order: true,
      },
    });

    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    return shipment;
  }
}

export const shipmentService = new ShipmentService();
