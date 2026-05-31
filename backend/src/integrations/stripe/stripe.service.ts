import Stripe from 'stripe';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export interface CreatePaymentIntentData {
  orderId: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
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
   */
  async confirmPayment(paymentIntentId: string): Promise<void> {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: paymentIntentId },
      include: { order: true },
    });

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Update payment status
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'captured',
          capturedAt: new Date(),
        },
      });

      // Update order status
      await prisma.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'awaiting_approval',
        },
      });
    } else if (paymentIntent.status === 'canceled' || (paymentIntent.status as string) === 'payment_failed') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
        },
      });
    }
  }

  /**
   * Handle Stripe webhook event
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.confirmPayment((event.data.object as Stripe.PaymentIntent).id);
        break;
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object as Stripe.PaymentIntent;
        await prisma.payment.updateMany({
          where: { stripePaymentIntentId: failedPayment.id },
          data: { status: 'failed' },
        });
        break;
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
