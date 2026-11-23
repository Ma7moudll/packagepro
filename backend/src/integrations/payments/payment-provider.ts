/**
 * Payment provider boundary.
 *
 * PackagePro targets Egypt. Stripe was the first integrated provider, but the
 * production providers are Egyptian: Fawry, InstaPay, Vodafone Cash and
 * manual bank transfer. This module is the single seam between the checkout /
 * order modules and any payment processor:
 *
 *   - modules never import a provider implementation directly;
 *   - they call `getPaymentProvider()` and speak the `PaymentProvider`
 *     interface;
 *   - the active provider is selected with the `PAYMENT_PROVIDER` env var.
 *
 * Adding a real Egyptian provider = implement this interface in a sibling
 * file, register it in `PROVIDERS` below, set its env vars (see
 * `.env.example`), and set `PAYMENT_PROVIDER` to its key. No module code
 * changes.
 */

export type PaymentProviderKey =
  | 'stripe'
  | 'fawry'
  | 'instapay'
  | 'vodafone_cash'
  | 'bank_transfer';

export interface CreatePaymentRequest {
  orderId: string;
  /** Major units (e.g. EGP pounds), NOT piasters/cents. */
  amount: number;
  /** ISO 4217, lowercase (e.g. 'egp'). */
  currency: string;
  customerEmail?: string;
}

export interface ProviderPayment {
  /** Provider-side reference (Stripe PaymentIntent id, Fawry reference number, ...). */
  providerRef: string;
  /** Token the frontend needs to complete the payment, when the provider has one. */
  clientSecret?: string;
}

export type ProviderPaymentStatus =
  | 'succeeded'
  | 'failed'
  | 'pending'
  | 'canceled';

export interface PaymentProvider {
  readonly key: PaymentProviderKey;
  /** Explicit fail-closed capability check before any checkout order is created. */
  assertCheckoutAvailable(): void;
  /**
   * Create a payment against an existing `pending_review` order and persist
   * the local Payment row. Returns what the frontend needs to collect money.
   */
  createPayment(data: CreatePaymentRequest): Promise<ProviderPayment>;
  /** Provider-authoritative status for a previously created payment. */
  getStatus(providerRef: string): Promise<ProviderPaymentStatus>;
  /** Refund a captured payment (full when amount is omitted). */
  refund(providerRef: string, amount?: number): Promise<void>;
}

/**
 * Thrown by provider stubs that are registered but not configured yet. The
 * message lists exactly which env vars / accounts are missing so operations
 * can finish the setup without reading code.
 */
export class PaymentProviderNotConfiguredError extends Error {
  constructor(
    public readonly provider: PaymentProviderKey,
    public readonly missing: string[]
  ) {
    super(
      `Payment provider "${provider}" is selected but not configured. Missing: ${missing.join(
        ', '
      )}. See .env.example for the full setup list.`
    );
    this.name = 'PaymentProviderNotConfiguredError';
  }
}
