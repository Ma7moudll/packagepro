import { describe, it, expect, afterEach } from 'vitest';
import {
  getPaymentProvider,
  resetPaymentProviderForTests,
} from './payments/registry';
import { PaymentProviderNotConfiguredError } from './payments/payment-provider';
import {
  getShippingProvider,
  resetShippingProviderForTests,
} from './shipping/registry';
import { ShippingProviderNotConfiguredError } from './shipping/shipping-provider';
import { getConfiguredTaxRate } from '../services/pricing-engine/calculations';

describe('provider registries', () => {
  afterEach(() => {
    delete process.env.PAYMENT_PROVIDER;
    delete process.env.SHIPPING_PROVIDER;
    delete process.env.DEFAULT_TAX_RATE;
    resetPaymentProviderForTests();
    resetShippingProviderForTests();
  });

  it('defaults to stripe + dhl when no env is set', () => {
    expect(getPaymentProvider().key).toBe('stripe');
    expect(getShippingProvider().key).toBe('dhl');
  });

  it('selects the Egyptian providers from env', () => {
    process.env.PAYMENT_PROVIDER = 'fawry';
    process.env.SHIPPING_PROVIDER = 'bosta';
    resetPaymentProviderForTests();
    resetShippingProviderForTests();
    expect(getPaymentProvider().key).toBe('fawry');
    expect(getShippingProvider().key).toBe('bosta');
  });

  it('Egyptian stubs throw a descriptive not-configured error', async () => {
    process.env.PAYMENT_PROVIDER = 'vodafone_cash';
    resetPaymentProviderForTests();
    await expect(
      getPaymentProvider().createPayment({
        orderId: 'x',
        amount: 1,
        currency: 'egp',
      })
    ).rejects.toBeInstanceOf(PaymentProviderNotConfiguredError);

    process.env.SHIPPING_PROVIDER = 'aramex';
    resetShippingProviderForTests();
    await expect(getShippingProvider().trackShipment('t')).rejects.toBeInstanceOf(
      ShippingProviderNotConfiguredError
    );
  });

  it('rejects an unknown provider key', () => {
    process.env.PAYMENT_PROVIDER = 'paypal';
    resetPaymentProviderForTests();
    expect(() => getPaymentProvider()).toThrow(/Unknown PAYMENT_PROVIDER/);
  });
});

describe('getConfiguredTaxRate', () => {
  afterEach(() => {
    delete process.env.DEFAULT_TAX_RATE;
  });

  it('is 0 when unset (pre-change behavior)', () => {
    expect(getConfiguredTaxRate()).toBe(0);
  });

  it('parses a decimal rate', () => {
    process.env.DEFAULT_TAX_RATE = '0.14';
    expect(getConfiguredTaxRate()).toBeCloseTo(0.14);
  });

  it('rejects garbage', () => {
    process.env.DEFAULT_TAX_RATE = 'fourteen';
    expect(() => getConfiguredTaxRate()).toThrow();
  });
});
