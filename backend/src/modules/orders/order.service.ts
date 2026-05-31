import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { OrderStatus } from '../../types';
import { pricingService } from '../../services/pricing-engine/pricing.service';
import { randomUUID } from 'crypto';

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

    // Calculate pricing for each item
    const orderItems = await Promise.all(
      data.items.map(async (item) => {
        const pricing = await pricingService.calculatePrice({
          productType: item.productType,
          quantity: item.quantity,
          dimensions: item.dimensions,
          materialCode: item.materialCode,
        });

        return {
          productType: item.productType,
          quantity: item.quantity,
          dimensions: item.dimensions,
          material: item.materialCode,
          color: item.color,
          finish: item.finish,
          unitPrice: pricing.totalPrice / item.quantity,
          totalPrice: pricing.totalPrice,
          pricing,
        };
      })
    );

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const shippingCost = orderItems.reduce(
      (sum, item) => sum + item.pricing.breakdown.shippingEstimate,
      0
    );
    const tax = 0; // Calculate tax based on location
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
          })),
        },
      },
      include: {
        items: true,
        customer: {
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Link design if session ID provided
    if (data.designSessionId) {
      await prisma.design.updateMany({
        where: { sessionId: data.designSessionId },
        data: { orderId: order.id },
      });
    }

    return order;
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
        return order;
      }

      throw new ValidationError('Access denied');
    }

    return order;
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
        },
      }),
      prisma.order.count({ where: { customerId } }),
    ]);

    return {
      data: orders,
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
    });

    return updatedOrder;
  }
}

export const orderService = new OrderService();
