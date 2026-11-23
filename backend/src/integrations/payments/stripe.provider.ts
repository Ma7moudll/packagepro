import { prisma } from '../../lib/prisma';
import { stripeService } from '../stripe/stripe.service';
import { NotFoundError } from '../../utils/errors';
import {
  CreatePaymentRequest,
  PaymentProvider,
  ProviderPayment,
  ProviderPaymentStatus,
} from './payment-provider';

/**
 * Stripe implementation of the payment provider boundary. Behavior is
 * unchanged from the pre-abstraction code path — this adapter only moves the
 * module boundary so `PAYMENT_PROVIDER` can swap it out.
 */
export class StripePaymentProvider implements PaymentProvider {
  readonly key = 'stripe' as const;
  assertCheckoutAvailable(): void {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('Payment provider unavailable');
  }

  async createPayment(data: CreatePaymentRequest): Promise<ProviderPayment> {
    const paymentIntent = await stripeService.createPaymentIntent({
      orderId: data.orderId,
      amount: data.amount,
      currency: data.currency,
      customerEmail: data.customerEmail,
    });
    return {
      providerRef: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? undefined,
    };
  }

  async getStatus(providerRef: string): Promise<ProviderPaymentStatus> {
    return stripeService.retrievePaymentIntentStatus(providerRef);
  }

  async refund(providerRef: string, amount?: number): Promise<void> {
    const payment = await prisma.payment.findUnique({
      where: { stripePaymentIntentId: providerRef },
      select: { orderId: true },
    });
    if (!payment) {
      throw new NotFoundError('Payment');
    }
    await stripeService.refundPayment(payment.orderId, amount);
  }
}
