import { prisma } from '../../lib/prisma';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { getShippingProvider } from '../../integrations/shipping/registry';
import { emailService } from '../../services/email/email.service';
import { notificationService } from '../notifications/notifications.service';

export class ShipmentService {
  /**
   * Create shipment for an order
   */
  async createShipment(orderId: string, actor: { userId: string; role: string }): Promise<any> {
    // Shipment creation buys a carrier label: restrict this operational action to admins.
    if (actor.role !== 'ADMIN') throw new AuthorizationError('Only admins may create shipments');
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        purchaseOrders: {
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

    // Reserve the unique orderId BEFORE contacting the carrier. Never delete this
    // claim on errors: a timeout may mean the carrier created a billable label.
    // Failed/ambiguous reservations require admin reconciliation, not a blind retry.
    let reservation;
    try {
      reservation = await prisma.shipment.create({ data: { orderId, status: 'created', weight, dimensions, shippingMethod: 'express' } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') throw new ConflictError('Shipment already reserved for this order');
      throw error;
    }

    // Create DHL shipment
    // 4a bridge: shipments are PO-scoped once splitting lands; until 4b the
    // vendor of the first PO ships the whole order.
    const poVendor = order.purchaseOrders[0]?.vendor;
    let dhlResult;
    try {
      dhlResult = await getShippingProvider().createShipment({
      orderId,
      pickupAddress: {
        name: poVendor?.companyName || '',
        address: poVendor?.address || '',
        city: poVendor?.city || '',
        postalCode: poVendor?.postalCode || '',
        country: poVendor?.country || '',
        phone: poVendor?.phone || '',
      },
      deliveryAddress: order.shippingAddress as any,
      weight,
      dimensions,
      shippingMethod: 'express',
    });

    } catch (error) {
      await prisma.shipment.update({ where: { id: reservation.id }, data: { status: 'failed' } });
      throw error;
    }

    // Finalize the reserved record. A DB failure retains the claim for reconciliation.
    const shipment = await prisma.shipment.update({
      where: { id: reservation.id },
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
    if (poVendor?.user?.email) {
      await emailService.sendEmail({
        to: poVendor.user.email,
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

    if (shipment.order.customer.user.id) {
      await notificationService.createIfUnseen(
        shipment.order.customer.user.id,
        { entityType: 'shipment', entityId: shipment.id },
        {
          type: 'shipment_created',
          title: `Your order ${order.orderNumber} has shipped`,
          message: `Tracking: ${dhlResult.trackingNumber}`,
          link: `/orders/${order.id}`,
        }
      );
    }

    return shipment;
  }

  /**
   * Get shipment tracking
   */
  async getTracking(shipmentId: string, actor: { userId: string; role: string }): Promise<any> {
    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        order: { include: { customer: true } },
      },
    });

    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    this.assertReadAccess(shipment.order.customer.userId, actor);

    if (!shipment.dhlTrackingNumber) {
      throw new ValidationError('Tracking number not available');
    }

    // Get latest tracking from the configured carrier
    const trackingData = await getShippingProvider().trackShipment(shipment.dhlTrackingNumber);

    return {
      ...shipment,
      trackingData,
    };
  }

  /**
   * Get shipment by order ID
   */
  async getShipmentByOrder(orderId: string, actor: { userId: string; role: string }): Promise<any> {
    const shipment = await prisma.shipment.findUnique({
      where: { orderId },
      include: {
        order: { include: { customer: true } },
      },
    });

    if (!shipment) {
      throw new NotFoundError('Shipment');
    }

    this.assertReadAccess(shipment.order.customer.userId, actor);
    return shipment;
  }
  private assertReadAccess(ownerId: string, actor: { userId: string; role: string }): void {
    if (actor.role !== 'ADMIN' && actor.userId !== ownerId) throw new AuthorizationError('You do not own this shipment');
  }

}

export const shipmentService = new ShipmentService();
