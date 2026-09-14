import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { OrderStatus } from '../../types';
import { pricingService } from '../../services/pricing-engine/pricing.service';
import { notificationService } from '../notifications/notifications.service';
import { randomUUID } from 'crypto';

/**
 * Map Prisma Payment.status → shared PaymentStatus union the FE renders.
 * 'captured' (webhook-confirmed Stripe capture) is surfaced as 'succeeded'
 * so the invoice/billing gates (`isPaid`) work against the real API.
 */
const PAYMENT_STATUS_MAP: Record<string, string> = {
  pending: 'pending',
  captured: 'succeeded',
  failed: 'failed',
  refunded: 'refunded',
};

/**
 * Normalize a raw Prisma Order into the shared Order contract consumed by
 * the customer portal. Prisma Order has no paymentStatus/paymentMethod/
 * currency/shipping/trackingNumber columns — those are projections over
 * the payment + shipment relations. Decimals serialize to strings via
 * JSON, which the FE projection helpers coerce back to numbers.
 */
export function serializeOrder<T extends Record<string, any>>(order: T): T {
  const rawPaymentStatus = order.payment?.status as string | undefined;
  return {
    ...order,
    paymentStatus: rawPaymentStatus
      ? (PAYMENT_STATUS_MAP[rawPaymentStatus] ?? rawPaymentStatus)
      : 'pending',
    paymentMethod: 'stripe',
    currency: order.payment?.currency || 'USD',
    shipping: order.shippingCost ?? 0,
    trackingNumber:
      order.shipment?.dhlTrackingNumber ??
      order.shipment?.trackingNumber ??
      null,
  };
}

export interface CreateOrderData {
  customerId: string;
  items: Array<{
    productType: 'box' | 'bag' | 'label';
    quantity: number;
    dimensions: {
      length: number;
      width: number;
      height?: number;
      unit: 'cm' | 'mm' | 'inch';
    };
    materialCode?: string;
    color?: string;
    finish?: string;
    // M7: Catalog traceability
    productId?: string;
    variantId?: string;
    sku?: string;
    config?: Record<string, unknown>;
    designId?: string;
    templateId?: string;
    sessionId?: string;
  }>;
  shippingAddress: {
    name: string;
    phone: string;
    email?: string;
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };
  notes?: string;
  designSessionId?: string;
}

export class OrderService {
  /**
   * Generate unique order number
   */
  private generateOrderNumber(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = randomUUID().substring(0, 8).toUpperCase().replace(/-/g, '');
    return `PP-${year}${month}${day}-${random}`;
  }

  /**
   * Create a new order
   */
  async createOrder(data: CreateOrderData): Promise<any> {
    // Validate customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
    });

    if (!customer) {
      throw new NotFoundError('Customer');
    }

    // Calculate pricing for each item. Catalog lines (productId + variantId)
    // follow the authoritative quoteCatalog path exactly like the cart; bare
    // productType lines fall back to the legacy heuristic.
    const orderItems = await Promise.all(
      data.items.map(async (item) => {
        const isCatalog = Boolean(item.variantId) && Boolean(item.productId);
        const pricing = isCatalog
          ? await pricingService.quoteCatalog({
              productId: item.productId!,
              variantId: item.variantId!,
              quantity: item.quantity,
              dimensions: item.dimensions,
              config: (item.config as Record<string, string>) ?? undefined,
            })
          : await pricingService.calculatePrice({
              productType: item.productType,
              quantity: item.quantity,
              dimensions: item.dimensions,
              materialCode: item.materialCode,
            });

        // Line total EXCLUDES shipping; shipping is aggregated separately so
        // it is not double-counted in the order total.
        const lineTotal =
          pricing.breakdown.subtotal + pricing.breakdown.tax;

        return {
          productType: item.productType,
          quantity: item.quantity,
          dimensions: item.dimensions,
          material: item.materialCode,
          color: item.color,
          finish: item.finish,
          unitPrice: lineTotal / item.quantity,
          totalPrice: lineTotal,
          tax: pricing.breakdown.tax,
          shippingEstimate: pricing.breakdown.shippingEstimate,
          pricing,
          // M7/M7-E: Catalog + design traceability passthrough
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          config: item.config,
          designId: item.designId,
        };
      })
    );

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = orderItems.reduce((sum, item) => sum + item.tax, 0);
    const shippingCost = orderItems.reduce(
      (sum, item) => sum + item.shippingEstimate,
      0
    );
    const total = subtotal + tax + shippingCost;

    // Create order
    const order = await prisma.order.create({
      data: {
        customerId: data.customerId,
        orderNumber: this.generateOrderNumber(),
        status: 'pending_review',
        subtotal,
        tax,
        shippingCost,
        total,
        shippingAddress: data.shippingAddress as any,
        shippingName: data.shippingAddress.name,
        shippingPhone: data.shippingAddress.phone,
        shippingEmail: data.shippingAddress.email,
        notes: data.notes,
        items: {
          create: orderItems.map((item) => ({
            productType: item.productType,
            quantity: item.quantity,
            dimensions: item.dimensions as any,
            material: item.material,
            color: item.color,
            finish: item.finish,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            // M7/M7-E: Catalog + design traceability
            ...(item.productId && { productId: item.productId }),
            ...(item.variantId && { variantId: item.variantId }),
            ...(item.sku && { sku: item.sku }),
            ...(item.config && { config: item.config as any }),
            ...(item.designId && { designId: item.designId }),
          })),
        },
      },
      include: {
        items: true,
        customer: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (order.customer.user.id) {
      await notificationService.createIfUnseen(
        order.customer.user.id,
        { entityType: 'order', entityId: order.id },
        {
          type: 'order_created',
          title: `Order ${order.orderNumber} created`,
          message: `Your order ${order.orderNumber} was received and is pending review.`,
          link: `/orders/${order.id}`,
        }
      );
    }

    // Link design if session ID provided
    if (data.designSessionId) {
      await prisma.design.updateMany({
        where: { sessionId: data.designSessionId },
        data: { orderId: order.id },
      });
    }

    return serializeOrder(order);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string, userId?: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        design: {
          include: {
            files: true,
          },
        },
        customer: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        purchaseOrder: {
          include: {
            vendor: true,
          },
        },
        shipment: true,
        payment: true,
        settlement: true,
        reviews: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // Check authorization
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { customer: true, vendor: true },
      });

      if (
        user?.role === 'ADMIN' ||
        order.customer.user.id === userId ||
        order.purchaseOrder?.vendor.userId === userId
      ) {
        return serializeOrder(order);
      }

      throw new ValidationError('Access denied');
    }

    return serializeOrder(order);
  }

  /**
   * Get orders for a customer
   */
  async getCustomerOrders(
    customerId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { customerId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          design: {
            include: {
              files: {
                where: { fileType: 'preview' },
                take: 1,
              },
            },
          },
          shipment: {
            select: {
              status: true,
              dhlTrackingNumber: true,
            },
          },
          payment: true,
        },
      }),
      prisma.order.count({ where: { customerId } }),
    ]);

    return {
      data: orders.map(serializeOrder),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update order status
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    userId?: string
  ): Promise<any> {
    // Verify order exists and user has access
    await this.getOrder(orderId, userId);

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(status === 'awaiting_approval' && { approvedAt: new Date() }),
        ...(status === 'shipped' && { shippedAt: new Date() }),
        ...(status === 'delivered' && { deliveredAt: new Date() }),
        ...(status === 'completed' && { completedAt: new Date() }),
      },
      include: {
        customer: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    const customerUserId = updatedOrder.customer?.user?.id;
    if (customerUserId) {
      if (status === 'delivered') {
        await notificationService.createIfUnseen(
          customerUserId,
          { entityType: 'order', entityId: orderId },
          {
            type: 'delivery_confirmed',
            title: `Order ${updatedOrder.orderNumber} delivered`,
            message: `Your order ${updatedOrder.orderNumber} has been delivered.`,
            link: `/orders/${orderId}`,
          }
        );
      }

      if (status === 'completed') {
        await notificationService.createIfUnseen(
          customerUserId,
          { entityType: 'order', entityId: orderId },
          {
            type: 'review_requested',
            title: `Share your feedback on ${updatedOrder.orderNumber}`,
            message: `Your order ${updatedOrder.orderNumber} is complete. We'd love your review.`,
            link: `/reviews`,
          }
        );
      }
    }

    return serializeOrder(updatedOrder);
  }
}

export const orderService = new OrderService();
