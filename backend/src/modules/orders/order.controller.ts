import { FastifyRequest, FastifyReply } from 'fastify';
import { orderService } from './order.service';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac';
import { OrderStatus } from '../../types';
import {prisma} from '../../lib/prisma';
import {parseCustomerOrderQuery} from './customer-order-query';

const createOrderSchema = z.object({
  items: z.array(
    z.object({
      productType: z.enum(['box', 'bag', 'label']),
      quantity: z.number().int().positive(),
      dimensions: z.object({
        length: z.number().positive(),
        width: z.number().positive(),
        height: z.number().optional(),
        unit: z.enum(['cm', 'mm', 'inch']),
      }),
      materialCode: z.string().optional(),
      color: z.string().optional(),
      finish: z.string().optional(),
    })
  ),
  shippingAddress: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    postalCode: z.string(),
    country: z.string(),
  }),
  notes: z.string().optional(),
  designSessionId: z.string().optional(),
});

export class OrderController {
  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const body = createOrderSchema.parse(request.body);

    // Get customer ID from user
    const customer = await prisma.customer.findUnique({
      where: { userId: user.userId },
    });

    if (!customer) {
      return reply.status(404).send({
        success: false,
        error: 'Customer profile not found',
      });
    }

    const order = await orderService.createOrder({
      ...body,
      customerId: customer.id,
    });

    return reply.status(201).send({
      success: true,
      data: order,
    });
  }

  async getOrder(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const orderId = (request.params as { id: string }).id;
    const order = await orderService.getOrder(orderId, user.userId);

    return reply.send({
      success: true,
      data: order,
    });
  }

  async getOrders(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const query = parseCustomerOrderQuery(request.query as {page?:unknown;limit?:unknown;status?:unknown});

    // Get customer ID from user
    const customer = await prisma.customer.findUnique({
      where: { userId: user.userId },
    });

    if (!customer) {
      return reply.status(404).send({
        success: false,
        error: 'Customer profile not found',
      });
    }

    const result = await orderService.getCustomerOrders(customer.id, query.page, query.limit, query.status);

    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  }

  /**
   * SEC-04A: ADMIN-only. Previously any authenticated user (including the
   * order's owner) could set any status; the service additionally refuses
   * non-admin callers and enforces the transition matrix (409 on illegal
   * transitions).
   */
  async updateOrderStatus(request: FastifyRequest, reply: FastifyReply) {
    const user = await requireAdmin(request, reply);
    const orderId = (request.params as { id: string }).id;
    const body = z
      .object({
        status: z.nativeEnum(OrderStatus),
      })
      .parse(request.body);

    const order = await orderService.updateOrderStatus(orderId, body.status, user.userId);

    return reply.send({
      success: true,
      data: order,
    });
  }
}

export const orderController = new OrderController();
