import {
  CreatePaymentRequest,
  PaymentProvider,
  PaymentProviderNotConfiguredError,
  PaymentProviderKey,
  ProviderPayment,
  ProviderPaymentStatus,
} from './payment-provider';

/**
 * Registered-but-not-yet-integrated Egyptian payment providers.
 *
 * Each stub is the exact plug-in point for the real integration: replace the
 * throwing bodies with the provider's API calls once the merchant account and
 * credentials exist. The required env vars per provider are listed in
 * REQUIRED_ENV and documented in .env.example.
 *
 *   - fawry:          merchant account at fawry.com → FAWRY_MERCHANT_CODE,
 *                     FAWRY_SECURITY_KEY (+ FAWRY_BASE_URL for sandbox/prod).
 *   - instapay:       InstaPay business onboarding → INSTAPAY_MERCHANT_ID,
 *                     INSTAPAY_API_KEY.
 *   - vodafone_cash:  Vodafone Cash merchant wallet →
 *                     VODAFONE_CASH_MERCHANT_ID, VODAFONE_CASH_API_KEY.
 *   - bank_transfer:  no API keys needed — offline/manual flow (show bank
 *                     details, admin marks the payment captured after the
 *                     transfer arrives). Stubbed until the ops flow is
 *                     confirmed with the product owner.
 */
const REQUIRED_ENV: Record<Exclude<PaymentProviderKey, 'stripe'>, string[]> = {
  fawry: ['FAWRY_MERCHANT_CODE', 'FAWRY_SECURITY_KEY'],
  instapay: ['INSTAPAY_MERCHANT_ID', 'INSTAPAY_API_KEY'],
  vodafone_cash: ['VODAFONE_CASH_MERCHANT_ID', 'VODAFONE_CASH_API_KEY'],
  bank_transfer: ['BANK_TRANSFER_ACCOUNT_DETAILS'],
};

abstract class EgyptianProviderStub implements PaymentProvider {
  abstract readonly key: Exclude<PaymentProviderKey, 'stripe'>;

  private fail(): never {
    throw new PaymentProviderNotConfiguredError(
      this.key,
      REQUIRED_ENV[this.key].filter((name) => !process.env[name])
    );
  }

  async createPayment(_data: CreatePaymentRequest): Promise<ProviderPayment> {
    return this.fail();
  }

  async getStatus(_providerRef: string): Promise<ProviderPaymentStatus> {
    return this.fail();
  }

  async refund(_providerRef: string, _amount?: number): Promise<void> {
    return this.fail();
  }
}

export class FawryPaymentProvider extends EgyptianProviderStub {
  readonly key = 'fawry' as const;
}

export class InstapayPaymentProvider extends EgyptianProviderStub {
  readonly key = 'instapay' as const;
}

export class VodafoneCashPaymentProvider extends EgyptianProviderStub {
  readonly key = 'vodafone_cash' as const;
}

export class BankTransferPaymentProvider extends EgyptianProviderStub {
  readonly key = 'bank_transfer' as const;
}
