import { FastifyPluginAsync } from 'fastify';
import { paymentController } from './payment.controller';

export const paymentRoutes: FastifyPluginAsync = async (fastify) => {
  // Create payment intent
  fastify.post('/payments/create-intent', async (request, reply) => {
    return paymentController.createPaymentIntent(request, reply);
  });

  // Confirm payment
  fastify.post('/payments/confirm', async (request, reply) => {
    return paymentController.confirmPayment(request, reply);
  });

  // Stripe webhook (no auth required)
  fastify.post('/webhooks/stripe', async (request, reply) => {
    return paymentController.stripeWebhook(request, reply);
  });
};
