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
  // SEC-03b: rawBody opt-in is REQUIRED — constructEvent() must verify the
  // signature over the exact original request bytes, not re-serialized JSON.
  // fastify-raw-body is registered with global: false in src/index.ts, so each
  // consumer route must opt in. bodyLimit 2 MB (default 1 MB): oversized events
  // (e.g. charge.disputed evidence) must reach signature verification instead
  // of being rejected pre-verification by the default body limit.
  fastify.post(
    '/webhooks/stripe',
    {
      config: { rawBody: true },
      bodyLimit: 2 * 1024 * 1024,
    },
    async (request, reply) => {
      return paymentController.stripeWebhook(request, reply);
    }
  );
};
