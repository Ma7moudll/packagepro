import Stripe from 'stripe';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { notificationService } from '../../modules/notifications/notifications.service';
import { notificationHub } from '../../modules/notifications/notification-hub';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export interface CreatePaymentIntentData {
  orderId: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
}

/**
 * SEC-03c: sentinel thrown INSIDE a processing transaction when the event
 * ledger already holds the eventId. It aborts (rolls back) the transaction;
 * the caller converts it into an idempotent no-op success.
 */
class DuplicateEventError extends Error {
  constructor(public readonly eventId: string) {
    super(`Duplicate Stripe event already processed: ${eventId}`);
    this.name = 'DuplicateEventError';
  }
}

/**
 * SEC-03c: true ONLY for a Prisma P2002 that names the eventId unique
 * constraint of the event ledger. Unrelated unique violations (or any other
 * DB error) must propagate so Stripe receives a retryable failure (500).
 *
 * Duck-typed on purpose (not instanceof): Prisma error classes are stable
 * across generated-client/runtime copies (an instanceof check can
 * false-negative across module copies), and the name/code/target triple is
 * exactly what discriminates a duplicate eventId delivery from any other
 * unique violation or DB failure.
 */
export function isEventIdUniqueViolation(err: unknown): boolean {
  const e = err as
    | { name?: unknown; code?: unknown; meta?: { target?: unknown } | null }
    | null
    | undefined;
  if (!e || e.name !== 'PrismaClientKnownRequestError' || e.code !== 'P2002') {
    return false;
  }
  const target = e.meta?.target;
  if (Array.isArray(target)) {
    return (
      target.includes('eventId') ||
      target.includes('processed_stripe_events_eventId_key')
    );
  }
  if (typeof target === 'string') {
    return (
      target === 'eventId' ||
      target === 'processed_stripe_events_eventId_key'
    );
  }
  return false;
}

export class StripeService {
  /**
   * Create payment intent for an order
   */
  async createPaymentIntent(data: CreatePaymentIntentData): Promise<Stripe.PaymentIntent> {
    // Verify order exists
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        customer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.status !== 'pending_review') {
      throw new ValidationError('Order is not in a state to accept payment');
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({
      where: { orderId: data.orderId },
    });

    if (existingPayment && existingPayment.stripePaymentIntentId) {
      // Retrieve existing payment intent
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          existingPayment.stripePaymentIntentId
        );
        return paymentIntent;
      } catch (error) {
        // Payment intent doesn't exist, create new one
      }
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: data.currency || 'usd',
      metadata: {
        orderId: order.id,
        orderNumber: order.orderNumber,
      },
      receipt_email: data.customerEmail || order.customer.user.email,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Save payment record
    await prisma.payment.upsert({
      where: { orderId: data.orderId },
      update: {
        stripePaymentIntentId: paymentIntent.id,
        amount: data.amount,
        currency: data.currency || 'usd',
      },
      create: {
        orderId: data.orderId,
        stripePaymentIntentId: paymentIntent.id,
        amount: data.amount,
        currency: data.currency || 'usd',
        status: 'pending',
      },
    });

    return paymentIntent;
  }

  /**
   * Confirm payment (called after webhook or manual confirmation)
   *
   * SEC-03c: idempotent + transactional.
   * - Webhook path (with `eventId`): the event ledger row is INSERTed inside
   *   the SAME transaction as the effects; the (eventId) unique constraint is
   *   the concurrency arbiter — a duplicate delivery (sequential or
   *   concurrent) aborts the transaction and is reported as success so Stripe
   *   stops retrying. A non-duplicate DB failure propagates → 500 → retry.
   * - Manual path (no `eventId`, authenticated /api/payments/confirm): the
   *   same conditional transition guards make repeated calls no-ops.
   * - Stripe's retrieved PaymentIntent state stays authoritative.
   */
  async confirmPayment(paymentIntentId: string, eventId?: string): Promise<void> {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Stripe-authoritative state — never trust the webhook payload alone.
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      await this.applyCapturedTransition(payment, eventId);
    } else if (
      paymentIntent.status === 'canceled' ||
      (paymentIntent.status as string) === 'payment_failed'
    ) {
      await this.applyFailedTransition(payment, eventId);
    }
    // Other statuses (processing, requires_action, …): nothing to do — the
    // event is deliberately NOT ledgered, so a redelivery re-checks the
    // then-current authoritative state.
  }

  /**
   * payment_intent.succeeded effects (SEC-03c): one transaction holds the
   * ledger marker, the payment/order transitions and the persisted in-app
   * notification; realtime hub publication happens only AFTER commit.
   */
  private async applyCapturedTransition(
    payment: { id: string; orderId: string },
    eventId?: string
  ): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let published: { userId: string; notification: any } | null = null;

    try {
      published = await prisma.$transaction(async (tx) => {
        if (eventId) {
          try {
            await tx.processedStripeEvent.create({
              data: { eventId, type: 'payment_intent.succeeded' },
            });
          } catch (err) {
            if (isEventIdUniqueViolation(err)) {
              // Duplicate delivery: abort the whole transaction (zero
              // writes) and report success to the caller.
              throw new DuplicateEventError(eventId);
            }
            // Unrelated unique violation or DB failure → 500 → Stripe retry.
            throw err;
          }
        }

        // Payment: captured only from pending/failed — a refunded or already
        // captured payment can never flip back (second event for the same
        // PaymentIntent cannot repeat this side effect).
        await tx.payment.updateMany({
          where: { id: payment.id, status: { in: ['pending', 'failed'] } },
          data: { status: 'captured', capturedAt: new Date() },
        });

        // Order: forward-safe — only pending_review moves to awaiting_approval,
        // so a replayed/late success event can never regress an advanced order.
        const orderUpdate = await tx.order.updateMany({
          where: { id: payment.orderId, status: 'pending_review' },
          data: { status: 'awaiting_approval' },
        });

        // Persisted in-app notification ONLY when the order actually
        // transitioned (closes the check-then-create race: concurrent
        // processors can never both win this conditional update).
        if (orderUpdate.count > 0) {
          const orderCustomer = await tx.order.findUnique({
            where: { id: payment.orderId },
            select: {
              orderNumber: true,
              customer: { select: { userId: true } },
            },
          });

          if (orderCustomer?.customer?.userId) {
            const res = await notificationService.createIfUnseenInTx(
              tx,
              orderCustomer.customer.userId,
              { entityType: 'order', entityId: payment.orderId },
              {
                type: 'payment_received',
                title: `Payment received for ${orderCustomer.orderNumber}`,
                message: `Your payment for ${orderCustomer.orderNumber} was successful.`,
                link: `/orders/${payment.orderId}`,
              }
            );
            if (res.status === 'created' && res.notification) {
              return {
                userId: orderCustomer.customer.userId,
                notification: res.notification,
              };
            }
          }
        }

        return null;
      });
    } catch (err) {
      if (err instanceof DuplicateEventError) {
        // Duplicate event → idempotent success (HTTP 200), no reprocessing.
        return;
      }
      throw err; // non-duplicate DB failure → retryable 500
    }

    // AFTER commit: realtime publication. A failure here must NOT undo the
    // committed payment/order/notification — the persisted notification stays
    // available through the normal notification retrieval endpoints.
    if (published) {
      try {
        notificationHub.publish(published.userId, published.notification);
      } catch (err) {
        logger.warn(
          'Realtime notification publish failed after payment confirmation commit',
          err
        );
      }
    }
  }

  /**
   * payment_intent.payment_failed / canceled effects (SEC-03c): ledgered and
   * guarded — a late failure event can never flip a captured or refunded
   * payment back to failed.
   */
  private async applyFailedTransition(
    payment: { id: string },
    eventId?: string
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        if (eventId) {
          try {
            await tx.processedStripeEvent.create({
              data: { eventId, type: 'payment_intent.payment_failed' },
            });
          } catch (err) {
            if (isEventIdUniqueViolation(err)) {
              throw new DuplicateEventError(eventId);
            }
            throw err;
          }
        }

        // Only pending → failed; captured/refunded stay untouched.
        await tx.payment.updateMany({
          where: { id: payment.id, status: 'pending' },
          data: { status: 'failed' },
        });
      });
    } catch (err) {
      if (err instanceof DuplicateEventError) {
        return;
      }
      throw err;
    }
  }

  /**
   * Handle Stripe webhook event
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.confirmPayment(
          (event.data.object as Stripe.PaymentIntent).id,
          event.id
        );
        break;
      case 'payment_intent.payment_failed': {
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        const payment = await prisma.payment.findUnique({
          where: { stripePaymentIntentId: failedPayment.id },
        });
        // Unknown payment → nothing to update (same as the previous
        // updateMany matching zero rows) and nothing worth ledgering.
        if (payment) {
          await this.applyFailedTransition(payment, event.id);
        }
        break;
      }
      default:
        // Handle other event types if needed
        break;
    }
  }

  /**
   * Refund payment
   */
  async refundPayment(orderId: string, amount?: number): Promise<Stripe.Refund> {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
    });

    if (!payment || !payment.stripePaymentIntentId) {
      throw new NotFoundError('Payment');
    }

    if (payment.status !== 'captured') {
      throw new ValidationError('Payment cannot be refunded');
    }

    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Full refund if amount not specified
    });

    // Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'refunded',
        refundedAt: new Date(),
        refundAmount: amount || payment.amount,
      },
    });

    return refund;
  }
}

export const stripeService = new StripeService();
