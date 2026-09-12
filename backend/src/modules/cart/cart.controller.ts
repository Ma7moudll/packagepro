import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { cartService } from './cart.service';

const dimensionsSchema = z.object({
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().optional(),
  unit: z.enum(['cm', 'mm', 'inch']),
});

const addItemSchema = z.object({
  productType: z.enum(['box', 'bag', 'label']),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  sku: z.string().optional(),
  config: z.record(z.string()).optional(),
  quantity: z.number().int().positive(),
  dimensions: dimensionsSchema,
  materialCode: z.string().optional(),
  color: z.string().optional(),
  finish: z.string().optional(),
  templateId: z.string().optional(),
  sessionId: z.string().optional(),
});

const updateItemSchema = z.object({
  quantity: z.number().int().positive().optional(),
  dimensions: dimensionsSchema.optional(),
  materialCode: z.string().optional(),
  color: z.string().optional(),
  finish: z.string().optional(),
});

function resolveCustomerId(request: FastifyRequest): string {
  const user = (request as AuthenticatedRequest).user;
  if (!user?.userId) {
    throw new Error('Unauthenticated');
  }
  return user.userId;
}

export class CartController {
  async getCart(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const customer = await this.resolveCustomer(request, reply);
    if (!customer) return;

    const cart = await cartService.getCart(customer.id);
    return reply.send({ success: true, data: cart });
  }

  async addItem(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const customer = await this.resolveCustomer(request, reply);
    if (!customer) return;

    const body = addItemSchema.parse(request.body);
    const cart = await cartService.addItem(customer.id, body);
    return reply.send({ success: true, data: cart });
  }

  async updateItem(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const customer = await this.resolveCustomer(request, reply);
    if (!customer) return;

    const itemId = (request.params as { id: string }).id;
    const body = updateItemSchema.parse(request.body);
    const cart = await cartService.updateItem(customer.id, itemId, body);
    return reply.send({ success: true, data: cart });
  }

  async removeItem(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const customer = await this.resolveCustomer(request, reply);
    if (!customer) return;

    const itemId = (request.params as { id: string }).id;
    const cart = await cartService.removeItem(customer.id, itemId);
    return reply.send({ success: true, data: cart });
  }

  async clear(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const customer = await this.resolveCustomer(request, reply);
    if (!customer) return;

    const cart = await cartService.clear(customer.id);
    return reply.send({ success: true, data: cart });
  }

  private async resolveCustomer(request: FastifyRequest, reply: FastifyReply) {
    const user = resolveCustomerId(request);
    const { prisma } = require('../../lib/prisma');
    const customer = await prisma.customer.findUnique({ where: { userId: user } });

    if (!customer) {
      reply.status(404).send({
        success: false,
        error: 'Customer profile not found',
      });
      return null;
    }

    return customer;
  }
}

export const cartController = new CartController();