import axios from 'axios';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { ShipmentStatus } from '@prisma/client';

const DHL_API_KEY = process.env.DHL_API_KEY || '';
const DHL_API_SECRET = process.env.DHL_API_SECRET || '';
const DHL_BASE_URL = process.env.DHL_BASE_URL || 'https://api.dhl.com';
const DHL_ACCOUNT_NUMBER = process.env.DHL_ACCOUNT_NUMBER || '';

/**
 * SEC-03a — bounded verification window for webhook-triggered Track API
 * calls so a hung carrier endpoint cannot stall the webhook handler.
 */
export const DHL_VERIFY_TIMEOUT_MS = 10_000;

/** SEC-03a — runtime injection point for the verification timeout (tests). */
export const DHL_VERIFY_RUNTIME = { timeoutMs: DHL_VERIFY_TIMEOUT_MS };

/**
 * SEC-03a — provider-confirmed shipment state. `status` is null when the
 * carrier reports a status outside our vocabulary (inconclusive); it must
 * never be applied as authoritative state.
 */
export interface VerifiedShipmentState {
  trackingNumber: string;
  /** Provider status string, unmodified. */
  rawStatus: string;
  /** Mapped ShipmentStatus, or null when inconclusive. */
  status: ShipmentStatus | null;
  /** True only when the carrier unambiguously confirms delivery. */
  delivered: boolean;
}

/** Map a carrier status string to our ShipmentStatus vocabulary (or null). */
function normalizeCarrierStatus(raw: string): ShipmentStatus | null {
  const normalized = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  switch (normalized) {
    case 'pre_transit':
      return 'label_generated';
    case 'picked_up':
      return 'picked_up';
    case 'in_transit':
    case 'transit':
      return 'in_transit';
    case 'out_for_delivery':
      return 'out_for_delivery';
    case 'delivered':
    case 'shipment_delivered':
      return 'delivered';
    default:
      return null;
  }
}

export interface DHLShipmentRequest {
  orderId: string;
  pickupAddress: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
  };
  deliveryAddress: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    email?: string;
  };
  weight: number; // in kg
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  shippingMethod?: 'express' | 'standard';
}

export class DHLService {
  /**
   * Create shipment
   */
  async createShipment(request: DHLShipmentRequest): Promise<{
    trackingNumber: string;
    labelUrl: string;
    estimatedDeliveryDate: Date;
  }> {
    const order = await prisma.order.findUnique({
      where: { id: request.orderId },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    // DHL API request (simplified - adjust based on actual DHL API)
    const shipmentData = {
      plannedShippingDateAndTime: {
        plannedShippingDate: new Date().toISOString().split('T')[0],
      },
      pickup: {
        isRequested: false,
      },
      productCode: request.shippingMethod === 'standard' ? 'N' : 'Y',
      accounts: [
        {
          number: DHL_ACCOUNT_NUMBER,
          typeCode: 'shipper',
        },
      ],
      outputImageProperties: {
        printerDPI: 300,
        encodingFormat: 'PDF',
        imageOptions: [
          {
            typeCode: 'label',
            templateName: 'ECOM26_84_001',
          },
        ],
      },
      customerDetails: {
        shipperDetails: {
          postalAddress: {
            postalCode: request.pickupAddress.postalCode,
            cityName: request.pickupAddress.city,
            countryCode: request.pickupAddress.country,
            addressLine1: request.pickupAddress.address,
          },
          contactInformation: {
            phone: request.pickupAddress.phone,
            companyName: request.pickupAddress.name,
          },
        },
        receiverDetails: {
          postalAddress: {
            postalCode: request.deliveryAddress.postalCode,
            cityName: request.deliveryAddress.city,
            countryCode: request.deliveryAddress.country,
            addressLine1: request.deliveryAddress.address,
          },
          contactInformation: {
            phone: request.deliveryAddress.phone,
            companyName: request.deliveryAddress.name,
          },
        },
      },
      content: {
        packages: [
          {
            weight: request.weight,
            dimensions: request.dimensions,
          },
        ],
      },
    };

    try {
      // Authenticate and get access token
      const authResponse = await axios.post(
        `${DHL_BASE_URL}/auth/v1/accesstoken`,
        {},
        {
          auth: {
            username: DHL_API_KEY,
            password: DHL_API_SECRET,
          },
        }
      );

      const accessToken = authResponse.data.access_token;

      // Create shipment
      const shipmentResponse = await axios.post(
        `${DHL_BASE_URL}/shipment/v1/shipments`,
        shipmentData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const shipment = shipmentResponse.data;

      // Extract tracking number and label
      const trackingNumber = shipment.shipmentTrackingNumber;
      const labelUrl = shipment.label?.[0]?.href || '';
      const estimatedDeliveryDate = new Date(
        shipment.estimatedDeliveryDate || new Date()
      );

      return {
        trackingNumber,
        labelUrl,
        estimatedDeliveryDate,
      };
    } catch (error: any) {
      throw new ValidationError(
        `DHL API error: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * Track shipment. `timeoutMs` (SEC-03a) bounds both the auth and tracking
   * calls so webhook-triggered verification cannot hang indefinitely.
   */
  async trackShipment(trackingNumber: string, timeoutMs?: number): Promise<any> {
    try {
      const authResponse = await axios.post(
        `${DHL_BASE_URL}/auth/v1/accesstoken`,
        {},
        {
          auth: {
            username: DHL_API_KEY,
            password: DHL_API_SECRET,
          },
          ...(timeoutMs ? { timeout: timeoutMs } : {}),
        }
      );

      const accessToken = authResponse.data.access_token;

      const trackingResponse = await axios.get(
        `${DHL_BASE_URL}/track/shipments`,
        {
          params: {
            trackingNumber,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          ...(timeoutMs ? { timeout: timeoutMs } : {}),
        }
      );

      return trackingResponse.data;
    } catch (error: any) {
      throw new ValidationError(
        `DHL tracking error: ${error.response?.data?.message || error.message}`
      );
    }
  }

  /**
   * SEC-03a — independently query the Track API using the shipment's STORED
   * tracking number and map the provider's answer. The webhook NEVER trusts
   * event JSON: this is the source of truth for delivery and settlement
   * eligibility.
   *
   * Throws (caller must answer HTTP 500 so DHL retries, with zero writes) on:
   * missing credentials, API error/timeout, malformed response, response that
   * does not contain the queried tracking number, or an inconclusive status.
   */
  async fetchVerifiedShipmentState(
    trackingNumber: string,
    timeoutMs: number = DHL_VERIFY_RUNTIME.timeoutMs
  ): Promise<VerifiedShipmentState> {
    // SEC-03a — credentials are read at CALL time (not module load) so a
    // misconfigured deployment fails explicitly on EVERY verified call
    // rather than silently trusting event JSON.
    const apiKey = process.env.DHL_API_KEY || '';
    const apiSecret = process.env.DHL_API_SECRET || '';
    if (!apiKey || !apiSecret) {
      throw new Error(
        'DHL credentials not configured — cannot verify webhook events'
      );
    }

    const data = await this.trackShipment(trackingNumber, timeoutMs);

    const shipments = data?.shipments;
    if (!Array.isArray(shipments)) {
      throw new Error('DHL tracking response malformed: missing shipments array');
    }

    const match = shipments.find(
      (s: any) => s?.shipmentTrackingNumber === trackingNumber
    );
    if (!match) {
      throw new Error(
        `DHL tracking response does not contain tracking number ${trackingNumber}`
      );
    }

    const rawStatus = typeof match.status === 'string' ? match.status : '';
    const status = normalizeCarrierStatus(rawStatus);

    return {
      trackingNumber,
      rawStatus,
      status,
      delivered: status === 'delivered',
    };
  }

  /**
   * SEC-03a — unambiguous delivered confirmation for the webhook's financial
   * gate. true → carrier confirms delivery; false → carrier definitively
   * reports a known non-delivered state (caller refuses the event with zero
   * writes); throws → API error / timeout / malformed / inconclusive (caller
   * answers HTTP 500 so DHL retries, zero writes).
   */
  async isConfirmedDelivered(
    trackingNumber: string,
    timeoutMs: number = DHL_VERIFY_RUNTIME.timeoutMs
  ): Promise<boolean> {
    const verified = await this.fetchVerifiedShipmentState(
      trackingNumber,
      timeoutMs
    );
    if (verified.status === null) {
      throw new Error(
        `DHL tracking status inconclusive for ${trackingNumber}: "${verified.rawStatus}"`
      );
    }
    return verified.delivered;
  }
}

export const dhlService = new DHLService();
