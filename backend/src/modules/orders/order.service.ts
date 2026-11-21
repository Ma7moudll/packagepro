import { prisma } from '../../lib/prisma';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import { OrderStatus } from '../../types';
import { pricingService } from '../../services/pricing-engine/pricing.service';
import { groupShippingByProductType } from '../../services/pricing-engine/calculations';
import { notificationService } from '../notifications/notifications.service';
import {
  assertAllowedOrderStatusTransition,
} from './order-status-transitions';
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
    currency: order.payment?.currency || 'EGP',
    shipping: order.shippingCost ?? 0,
    trackingNumber:
      order.shipment?.dhlTrackingNumber ??
      order.shipment?.trackingNumber ??
      null,
    // 4a bridge: keep the legacy singular `purchaseOrder` on the wire (the
    // admin console and portal mappers still read it). It is now the FIRST
    // PO of the order; consumers move to `purchaseOrders[]` over time.
    purchaseOrder: Array.isArray(order.purchaseOrders)
      ? (order.purchaseOrders[0] ?? null)
      : (order.purchaseOrder ?? null),
    // 4c: per-group shipping split persisted at order creation (metadata).
    shippingBreakdown:
      ((order.metadata as any)?.shippingBreakdown as any) ?? null,
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

    // 4c: persist the per-group shipping split (one group per productType,
    // the same grouping multi-vendor POs use) so order views can show
    // vendor-split shipping without recomputation. Sums to shippingCost.
    const shippingBreakdown = groupShippingByProductType(
      orderItems.map((item) => ({
        productType: item.productType,
        shipping: item.shippingEstimate,
      }))
    );

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
        // 4c: stored under metadata; approval.service spreads-and-extends
        // this object, so the breakdown survives the approval transition.
        metadata: { shippingBreakdown },
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
        purchaseOrders: {
          include: {
            vendor: true,
          },
        },
        shipment: true,
        payment: true,
        settlements: true,
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
        // 4a: a vendor may now own several POs of one order.
        order.purchaseOrders.some((po: any) => po.vendor.userId === userId)
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
   * Update order status — HTTP-facing admin path (PATCH /orders/:id/status).
   *
   * SEC-04A: ADMIN-only, defense in depth behind the route-level
   * `requireAdmin` gate. A customer (even the order's owner) gets 403; an
   * unrelated user gets the existing 400 'Access denied' from getOrder.
   * The requested transition must be in the SEC-04A transition matrix
   * (order-status-transitions.ts) — illegal transitions are 409.
   *
   * The write is a conditional `updateMany` on the observed current status,
   * so a concurrent transition by another actor fails with 409 instead of
   * silently overwriting it.
   */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    userId?: string
  ): Promise<any> {
    // Verify order exists and user has access
    const current = await this.getOrder(orderId, userId);

    if (!userId) {
      throw new AuthorizationError('Only admins can change order status');
    }
    const actor = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!actor || actor.role !== 'ADMIN') {
      throw new AuthorizationError('Only admins can change order status');
    }

    assertAllowedOrderStatusTransition(current.status as OrderStatus, status);

    return this.applyStatusTransition(orderId, current.status as OrderStatus, status);
  }

  /**
   * Update order status — trusted internal callers only (NOT an HTTP route).
   *
   * Same matrix enforcement and same conditional write as the admin path,
   * but no role check: the caller is backend code, not a user. There are
   * currently NO internal callers of this method — the established flows
   * (Stripe capture, DHL webhook, handshake accept, production, QA,
   * shipment creation) move orders through their own guarded direct
   * updates and were deliberately left untouched by SEC-04A. Use this
   * method for any future trusted flow instead of calling the admin path
   * or writing an unguarded `prisma.order.update`.
   */
  async updateOrderStatusInternal(
    orderId: string,
    status: OrderStatus
  ): Promise<any> {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundError('Order');
    }

    assertAllowedOrderStatusTransition(order.status as OrderStatus, status);

    return this.applyStatusTransition(orderId, order.status as OrderStatus, status);
  }

  /**
   * Shared guarded transition: conditional write on the observed current
   * status (a 0-row claim means the order moved concurrently → 409),
   * then reload, side-effect timestamps, and status notifications.
   */
  private async applyStatusTransition(
    orderId: string,
    fromStatus: OrderStatus,
    status: OrderStatus
  ): Promise<any> {
    const claimed = await prisma.order.updateMany({
      where: { id: orderId, status: fromStatus },
      data: {
        status,
        ...(status === 'awaiting_approval' && { approvedAt: new Date() }),
        ...(status === 'shipped' && { shippedAt: new Date() }),
        ...(status === 'delivered' && { deliveredAt: new Date() }),
        ...(status === 'completed' && { completedAt: new Date() }),
      },
    });

    if (claimed.count === 0) {
      throw new ConflictError(
        `Order status changed concurrently: expected '${fromStatus}'`
      );
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
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

    if (!updatedOrder) {
      throw new NotFoundError('Order');
    }

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
