/**
 * Shipping Adapters
 * Unified interface for shipping providers
 */

import { generateLabelEasyPost, generateLabelShipEngine } from "../services/fulfillment-service"
import { ShippingAddress, ShippingLabel } from "../services/fulfillment-service"
import { getConfig } from "../config"

export type ShippingProvider = "easypost" | "shipengine"

export interface GenerateLabelParams {
  orderId: string
  toAddress: ShippingAddress
  weight: number // kg
  dimensions: {
    length: number // cm
    width: number // cm
    height: number // cm
  }
}

/**
 * Generate shipping label using specified provider
 */
export async function generateLabel(
  provider: ShippingProvider,
  params: GenerateLabelParams,
): Promise<ShippingLabel> {
  switch (provider) {
    case "easypost":
      return generateLabelEasyPost(
        params.orderId,
        params.toAddress,
        params.weight,
        params.dimensions,
      )

    case "shipengine":
      return generateLabelShipEngine(
        params.orderId,
        params.toAddress,
        params.weight,
        params.dimensions,
      )

    default:
      throw new Error(`Unsupported shipping provider: ${provider}`)
  }
}

/**
 * Get default shipping provider from config
 */
export function getDefaultProvider(): ShippingProvider {
  const config = getConfig()
  // Default to EasyPost if available, otherwise ShipEngine
  if (config.shipping.easypostApiKey) {
    return "easypost"
  }
  if (config.shipping.shipengineApiKey) {
    return "shipengine"
  }
  return "easypost" // Fallback
}

