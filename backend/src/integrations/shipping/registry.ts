import {
  ShippingProvider,
  ShippingProviderKey,
} from './shipping-provider';
import {
  AramexShippingProvider,
  BostaShippingProvider,
  DhlShippingProvider,
} from './providers';

const PROVIDERS: Record<ShippingProviderKey, () => ShippingProvider> = {
  dhl: () => new DhlShippingProvider(),
  bosta: () => new BostaShippingProvider(),
  aramex: () => new AramexShippingProvider(),
};

let active: ShippingProvider | null = null;

/**
 * The shipping carrier selected by `SHIPPING_PROVIDER` (default: 'dhl' until
 * the Egyptian carrier accounts exist). Resolved once per process.
 */
export function getShippingProvider(): ShippingProvider {
  if (active) {
    return active;
  }
  const key = (process.env.SHIPPING_PROVIDER || 'dhl') as ShippingProviderKey;
  const factory = PROVIDERS[key];
  if (!factory) {
    throw new Error(
      `Unknown SHIPPING_PROVIDER "${key}". Valid values: ${Object.keys(
        PROVIDERS
      ).join(', ')}.`
    );
  }
  active = factory();
  return active;
}

/** Test hook: drop the cached provider so a new SHIPPING_PROVIDER applies. */
export function resetShippingProviderForTests(): void {
  active = null;
}
