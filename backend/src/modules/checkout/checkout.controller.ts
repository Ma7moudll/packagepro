import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { checkoutService } from './checkout.service';

const shippingAddressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().optional(),
  postalCode: z.string().min(1),
  country: z.string().min(1),
});

const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  notes: z.string().optional(),
  designSessionId: z.string().optional(),
});

export class CheckoutController {
  async summary(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const customer = await this.resolveCustomer(request, reply);
    if (!customer) return;

    const summary = await checkoutService.getSummary(customer.id);
    return reply.send({ success: true, data: summary });
  }

  async checkout(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const customer = await this.resolveCustomer(request, reply);
    if (!customer) return;

    const body = checkoutSchema.parse(request.body);

    const result = await checkoutService.checkout(customer.id, {
      customerId: customer.id,
      shippingAddress: body.shippingAddress,
      notes: body.notes,
      designSessionId: body.designSessionId,
    });

    return reply.send({ success: true, data: result });
  }

  private async resolveCustomer(request: FastifyRequest, reply: FastifyReply) {
    const user = (request as AuthenticatedRequest).user;
    const { prisma } = require('../../lib/prisma');
    const customer = await prisma.customer.findUnique({
      where: { userId: user?.userId },
    });

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

export const checkoutController = new CheckoutController();