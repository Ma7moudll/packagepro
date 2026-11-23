/**
 * Shipping carrier boundary.
 *
 * DHL was the first integrated carrier, but the production carriers are
 * Egyptian (Bosta, Aramex Egypt, ...). Modules never import a carrier
 * implementation directly; they call `getShippingProvider()` and speak the
 * `ShippingProvider` interface. The active carrier is selected with the
 * `SHIPPING_PROVIDER` env var.
 *
 * Carrier-specific webhook receivers stay carrier-specific by design (each
 * carrier has its own signature scheme); a new carrier adds its own webhook
 * route next to the DHL one and reuses the same settlement pipeline.
 */

export type ShippingProviderKey = 'dhl' | 'bosta' | 'aramex';

export interface ShipmentAddress {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
  email?: string;
}

export interface CreateShipmentRequest {
  orderId: string;
  pickupAddress: ShipmentAddress;
  deliveryAddress: ShipmentAddress;
  /** kg */
  weight: number;
  dimensions: { length: number; width: number; height: number };
  shippingMethod?: 'express' | 'standard';
}

export interface CreatedShipment {
  trackingNumber: string;
  labelUrl: string;
  estimatedDeliveryDate: Date;
}

export interface ShippingProvider {
  readonly key: ShippingProviderKey;
  createShipment(request: CreateShipmentRequest): Promise<CreatedShipment>;
  /** Raw carrier tracking payload for a shipment. */
  trackShipment(trackingNumber: string): Promise<unknown>;
}

/**
 * Thrown by carrier stubs that are registered but not configured yet. The
 * message lists exactly which env vars / accounts are missing.
 */
export class ShippingProviderNotConfiguredError extends Error {
  constructor(
    public readonly provider: ShippingProviderKey,
    public readonly missing: string[]
  ) {
    super(
      `Shipping provider "${provider}" is selected but not configured. Missing: ${missing.join(
        ', '
      )}. See .env.example for the full setup list.`
    );
    this.name = 'ShippingProviderNotConfiguredError';
  }
}
