import {
  PaymentProvider,
  PaymentProviderKey,
} from './payment-provider';
import { StripePaymentProvider } from './stripe.provider';
import {
  BankTransferPaymentProvider,
  FawryPaymentProvider,
  InstapayPaymentProvider,
  VodafoneCashPaymentProvider,
} from './egyptian.providers';

const PROVIDERS: Record<PaymentProviderKey, () => PaymentProvider> = {
  stripe: () => new StripePaymentProvider(),
  fawry: () => new FawryPaymentProvider(),
  instapay: () => new InstapayPaymentProvider(),
  vodafone_cash: () => new VodafoneCashPaymentProvider(),
  bank_transfer: () => new BankTransferPaymentProvider(),
};

let active: PaymentProvider | null = null;

/**
 * The payment provider selected by `PAYMENT_PROVIDER` (default: 'stripe'
 * until the Egyptian merchant accounts exist). Resolved once per process.
 */
export function getPaymentProvider(): PaymentProvider {
  if (active) {
    return active;
  }
  const key = (process.env.PAYMENT_PROVIDER || 'stripe') as PaymentProviderKey;
  const factory = PROVIDERS[key];
  if (!factory) {
    throw new Error(
      `Unknown PAYMENT_PROVIDER "${key}". Valid values: ${Object.keys(
        PROVIDERS
      ).join(', ')}.`
    );
  }
  active = factory();
  return active;
}

/** Test hook: drop the cached provider so a new PAYMENT_PROVIDER applies. */
export function resetPaymentProviderForTests(): void {
  active = null;
}
