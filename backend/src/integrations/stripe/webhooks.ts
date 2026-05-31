import { FastifyRequest, FastifyReply } from 'fastify';
import Stripe from 'stripe';
import { stripeService } from './stripe.service';
import { logger } from '../../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function handleStripeWebhook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const sig = request.headers['stripe-signature'] as string;

  if (!sig) {
    return reply.status(400).send({
      success: false,
      error: 'Missing stripe-signature header',
    });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      (request as any).rawBody as Buffer,
      sig,
      webhookSecret
    );
  } catch (err) {
    logger.error('Stripe webhook signature verification failed', err);
    return reply.status(400).send({
      success: false,
      error: 'Webhook signature verification failed',
    });
  }

  try {
    // Handle the event
    await stripeService.handleWebhook(event);

    return reply.status(200).send({ received: true });
  } catch (error) {
    logger.error('Error handling Stripe webhook', error);
    return reply.status(500).send({
      success: false,
      error: 'Error processing webhook',
    });
  }
}
