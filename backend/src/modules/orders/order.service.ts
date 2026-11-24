import {fenceDispatchWriter} from '../consolidation/dispatch-writer-fence';
import {validateCustomerOrderQuery} from './customer-order-query';
import {approvalContentHash} from './approval-snapshot';
import { assertSpecificationPriced } from "../../utils/production-specification";
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

const round2 = (value: number): number => Math.round(value * 100) / 100;
const ORDER_PRICING_CONTRACT = 'tax-exclusive-v1';

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
 * shipping/trackingNumber columns. New-order currency is persisted; older
 * currency values fall back to the payment or legacy EGP projection over
 * the payment + shipment relations. Decimals serialize to strings via
 * JSON, which the FE projection helpers coerce back to numbers.
 */
export function serializeOrder<T extends Record<string, any>>(order: T): T {
  const rawPaymentStatus = order.payment?.status as string | undefined;
  return {
    ...order,
    currentApprovalRequest: (()=>{
      const r=order.approvalRequests?.[0];
      return r ? {id:r.id,status:r.status,contentHash:r.contentHash,proofFileId:r.proofFileId,proofUrl:r.proofUrl,expiresAt:r.expiresAt,deliveryState:r.deliveryState,current:!!order.design&&approvalContentHash(order.design)===r.contentHash} : null;
    })(),
    approvalRequests: undefined,
    paymentStatus: rawPaymentStatus
      ? (PAYMENT_STATUS_MAP[rawPaymentStatus] ?? rawPaymentStatus)
      : 'pending',
    paymentMethod: 'stripe',
    currency: order.currency || order.payment?.currency || 'EGP',
    currencyKnown: Boolean(order.currency || order.payment?.currency),
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
  async createOrder(data: CreateOrderData, options: {db?: import('@prisma/client').Prisma.TransactionClient; notify?: boolean} = {}): Promise<any> {
    const db = options.db ?? prisma;
    // Validate customer exists
    const customer = await db.customer.findUnique({
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
        // Check every design reference, including the order-level session.
        // An explicit item ID must not hide an unpriced order-level design.
        const references = [
          ...(item.designId ? [{id: item.designId}] : []),
          ...Array.from(new Set([item.sessionId, data.designSessionId].filter(Boolean))).map(sessionId => ({sessionId})),
        ];
        for (const where of references) {
          const design = await db.design.findUnique({where, select: {designData: true}});
          if (!design) throw new NotFoundError('Design');
          assertSpecificationPriced(design.designData);
        }
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

        // New-order line amounts exclude tax and shipping, like the cart.
        // The quote subtotal already includes its discounts and adjustments.
        const lineTotal = round2(pricing.breakdown.subtotal);

        return {
          productType: item.productType,
          quantity: item.quantity,
          dimensions: item.dimensions,
          material: item.materialCode,
          color: item.color,
          finish: item.finish,
          unitPrice: round2(lineTotal / item.quantity),
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
    const subtotal = round2(orderItems.reduce((sum, item) => sum + item.totalPrice, 0));
    const tax = round2(orderItems.reduce((sum, item) => sum + item.tax, 0));
    const shippingCost = round2(orderItems.reduce(
      (sum, item) => sum + item.shippingEstimate,
      0
    ));
    const total = round2(subtotal + tax + shippingCost);

    // 4c: persist the per-group shipping split (one group per productType,
    // the same grouping multi-vendor POs use) so order views can show
    // vendor-split shipping without recomputation. Sums to shippingCost.
    const shippingBreakdown = groupShippingByProductType(
      orderItems.map((item) => ({
        productType: item.productType,
        shipping: item.shippingEstimate,
      }))
    );

    const currencies = new Set(orderItems.map(item => item.pricing.material.currency?.trim().toUpperCase()));
    if (currencies.size !== 1 || ![...currencies].every(c => typeof c === 'string' && /^[A-Z]{3}$/.test(c))) throw new ValidationError('New orders require one known quote currency');
    const currency = [...currencies][0];

    // Create order
    const order = await db.order.create({
      data: {
        customerId: data.customerId,
        orderNumber: this.generateOrderNumber(),
        status: 'pending_review',
        currency,
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
        metadata: {
          shippingBreakdown,
          // Prospective convention only. Unmarked historical orders are not
          // reinterpreted, repriced or migrated by this write-time correction.
          pricingContract: ORDER_PRICING_CONTRACT,
        },
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

    if (options.notify !== false && order.customer.user.id) {
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
      await db.design.updateMany({
        where: { sessionId: data.designSessionId, orderId:null, ownerId: customer.userId, lifecycleStatus:'DRAFT' },
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
        approvalRequests: {orderBy:{createdAt:'desc'},take:1},
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
    limit: number = 20,
    status?: OrderStatus
  ): Promise<any> {
    const {skip} = validateCustomerOrderQuery(page,limit,status);
    const where = {customerId,...(status?{status}:{})};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }, {id:'desc'}],
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
      prisma.order.count({ where }),
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
    if (['quality_check','ready_to_ship','shipped'].includes(status)) {
      throw new ConflictError('Factory completion and outbound release cannot be set by generic status changes');
    }
    const claimed = await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT id FROM orders WHERE id=${orderId} FOR UPDATE`;
      const fresh=await tx.order.findUnique({where:{id:orderId},select:{status:true}});
      if(fresh?.status!==fromStatus)throw new ConflictError('Order status changed concurrently');
      await fenceDispatchWriter(tx,orderId,'order_status_changed_before_start');
      return tx.order.updateMany({
      where: { id: orderId, status: fromStatus },
      data: {
        status,
        ...(status === 'awaiting_approval' && { approvedAt: new Date() }),
        ...(status === 'shipped' && { shippedAt: new Date() }),
        ...(status === 'delivered' && { deliveredAt: new Date() }),
        ...(status === 'completed' && { completedAt: new Date() }),
      },
    });
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
