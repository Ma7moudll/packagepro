import { FastifyRequest, FastifyReply } from 'fastify';
import { stripeService } from '../../integrations/stripe/stripe.service';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { handleStripeWebhook } from '../../integrations/stripe/webhooks';

const createPaymentIntentSchema = z.object({
  orderId: z.string(),
  currency: z.string().optional(),
});

export class PaymentController {
  async createPaymentIntent(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const body = createPaymentIntentSchema.parse(request.body);

    // Get order and verify ownership
    const { prisma } = require('../../lib/prisma');
    const order = await prisma.order.findUnique({
      where: { id: body.orderId },
      include: {
        customer: true,
      },
    });

    if (!order) {
      return reply.status(404).send({
        success: false,
        error: 'Order not found',
      });
    }

    if (order.customer.userId !== user.userId) {
      return reply.status(403).send({
        success: false,
        error: 'Access denied',
      });
    }

    const paymentIntent = await stripeService.createPaymentIntent({
      orderId: body.orderId,
      amount: Number(order.total),
      currency: body.currency || 'usd',
      customerEmail: user.email,
    });

    return reply.send({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      },
    });
  }

  async confirmPayment(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const body = z
      .object({
        paymentIntentId: z.string(),
      })
      .parse(request.body);

    await stripeService.confirmPayment(body.paymentIntentId);

    return reply.send({
      success: true,
      message: 'Payment confirmed',
    });
  }

  async stripeWebhook(request: FastifyRequest, reply: FastifyReply) {
    return handleStripeWebhook(request, reply);
  }
}

export const paymentController = new PaymentController();
