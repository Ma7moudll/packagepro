import {
  dhlService,
  DHLShipmentRequest,
} from '../dhl/dhl.service';
import {
  CreatedShipment,
  CreateShipmentRequest,
  ShippingProvider,
  ShippingProviderNotConfiguredError,
  ShippingProviderKey,
} from './shipping-provider';

/**
 * DHL implementation of the shipping provider boundary. Behavior is unchanged
 * from the pre-abstraction code path — this adapter only moves the module
 * boundary so `SHIPPING_PROVIDER` can swap it out.
 */
export class DhlShippingProvider implements ShippingProvider {
  readonly key = 'dhl' as const;

  createShipment(request: CreateShipmentRequest): Promise<CreatedShipment> {
    return dhlService.createShipment(request as DHLShipmentRequest);
  }

  trackShipment(trackingNumber: string): Promise<unknown> {
    return dhlService.trackShipment(trackingNumber);
  }
}

/**
 * Registered-but-not-yet-integrated Egyptian carriers.
 *
 *   - bosta:   business account at bosta.co → BOSTA_API_KEY.
 *   - aramex:  Aramex Egypt business account → ARAMEX_USERNAME,
 *              ARAMEX_PASSWORD, ARAMEX_ACCOUNT_NUMBER, ARAMEX_ACCOUNT_ENTITY,
 *              ARAMEX_ACCOUNT_COUNTRY_CODE.
 *
 * Replace the throwing bodies with the carrier's API calls once the account
 * and credentials exist; the required env vars are in .env.example.
 */
const REQUIRED_ENV: Record<Exclude<ShippingProviderKey, 'dhl'>, string[]> = {
  bosta: ['BOSTA_API_KEY'],
  aramex: [
    'ARAMEX_USERNAME',
    'ARAMEX_PASSWORD',
    'ARAMEX_ACCOUNT_NUMBER',
    'ARAMEX_ACCOUNT_ENTITY',
    'ARAMEX_ACCOUNT_COUNTRY_CODE',
  ],
};

abstract class EgyptianCarrierStub implements ShippingProvider {
  abstract readonly key: Exclude<ShippingProviderKey, 'dhl'>;

  private fail(): never {
    throw new ShippingProviderNotConfiguredError(
      this.key,
      REQUIRED_ENV[this.key].filter((name) => !process.env[name])
    );
  }

  async createShipment(_request: CreateShipmentRequest): Promise<CreatedShipment> {
    return this.fail();
  }

  async trackShipment(_trackingNumber: string): Promise<unknown> {
    return this.fail();
  }
}

export class BostaShippingProvider extends EgyptianCarrierStub {
  readonly key = 'bosta' as const;
}

export class AramexShippingProvider extends EgyptianCarrierStub {
  readonly key = 'aramex' as const;
}
