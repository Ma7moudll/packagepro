import axios from 'axios';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';

const DHL_API_KEY = process.env.DHL_API_KEY || '';
const DHL_API_SECRET = process.env.DHL_API_SECRET || '';
const DHL_BASE_URL = process.env.DHL_BASE_URL || 'https://api.dhl.com';
const DHL_ACCOUNT_NUMBER = process.env.DHL_ACCOUNT_NUMBER || '';

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
   * Track shipment
   */
  async trackShipment(trackingNumber: string): Promise<any> {
    try {
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

      const trackingResponse = await axios.get(
        `${DHL_BASE_URL}/track/shipments`,
        {
          params: {
            trackingNumber,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return trackingResponse.data;
    } catch (error: any) {
      throw new ValidationError(
        `DHL tracking error: ${error.response?.data?.message || error.message}`
      );
    }
  }
}

export const dhlService = new DHLService();
