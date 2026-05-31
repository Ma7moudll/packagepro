/**
 * Pricing Engine Service
 * Calculates pricing for orders based on product specs, materials, quantities, and supplier rules
 */

import { getMaterialCost, getConversionCost, getPlatformMargin } from "../config/pricing-rules"
import { getConfig } from "../config"
import { logger } from "../utils/logger"

export interface Dimensions {
  width: number  // mm
  height: number // mm
  depth?: number // mm (optional for flat items)
}

export interface PricingRequest {
  productId: string
  productType: string
  qty: number
  material: string
  finish?: string[]
  dimensions: Dimensions
  printType?: string
  supplierPricingRule?: any // JSON pricing rule from ProductSupplier
}

export interface PricingBreakdown {
  materialCost: number
  conversionCost: number
  setupCost: number
  shippingEstimate: number
  platformMargin: number
  unitPrice: number
  totalPrice: number
  bulkDiscount?: number
}

export interface PricingResult {
  unitPrice: number
  totalPrice: number
  breakdown: PricingBreakdown
  recommendedSuppliers?: Array<{
    supplierId: string
    score: number
    estimatedLeadDays: number
    cost: number
  }>
}

/**
 * Compute surface area from dimensions (in square meters)
 */
export function computeSurfaceArea(dimensions: Dimensions): number {
  // Convert mm to meters
  const width = dimensions.width / 1000
  const height = dimensions.height / 1000
  const depth = dimensions.depth ? dimensions.depth / 1000 : 0

  // For boxes: calculate total surface area
  if (depth > 0) {
    // Box surface area: 2 * (l*w + l*h + w*h)
    const area = 2 * (width * depth + width * height + depth * height)
    return area
  }

  // For flat items (stickers, labels): just width * height
  return width * height
}

/**
 * Compute base cost (material + conversion)
 */
export function computeBaseCost(
  area: number,
  materialCost: number,
  conversionCost: number,
  qty: number,
  printType: string = "digital_print",
): { material: number; conversion: number; setup: number } {
  // Material cost
  const material = area * materialCost * qty

  // Conversion cost
  const conversionConfig = getConversionCost(printType)
  if (!conversionConfig) {
    logger.warn("Unknown print type, using digital_print default", { printType })
    // Fallback
    return {
      material,
      conversion: 0.5 * qty,
      setup: 50,
    }
  }

  // Setup cost (one-time, amortized if qty > 0)
  const setup = conversionConfig.setupCost

  // Per-unit conversion cost
  let conversionPerUnit = conversionConfig.costPerUnit

  // Apply bulk discounts
  if (conversionConfig.bulkDiscounts) {
    for (const discount of conversionConfig.bulkDiscounts.sort((a, b) => b.qty - a.qty)) {
      if (qty >= discount.qty) {
        conversionPerUnit = conversionPerUnit * (1 - discount.discount)
        break
      }
    }
  }

  const conversion = conversionPerUnit * qty

  return {
    material,
    conversion,
    setup,
  }
}

/**
 * Apply supplier-specific pricing rules
 */
export function applySupplierPricingRules(
  baseCost: number,
  pricingRule: any,
  qty: number,
): number {
  if (!pricingRule) {
    return baseCost
  }

  let adjustedCost = baseCost

  // Apply base multiplier
  if (pricingRule.baseMultiplier) {
    adjustedCost = adjustedCost * pricingRule.baseMultiplier
  }

  // Apply bulk discounts from supplier
  if (pricingRule.bulkDiscounts) {
    for (const discount of pricingRule.bulkDiscounts.sort((a: any, b: any) => b.qty - a.qty)) {
      if (qty >= discount.qty) {
        adjustedCost = adjustedCost * (1 - discount.discount)
        break
      }
    }
  }

  return adjustedCost
}

/**
 * Apply platform margin
 */
export function applyPlatformMargin(cost: number, productType: string): number {
  const margin = getPlatformMargin(productType)
  return cost * (1 + margin)
}

/**
 * Calculate shipping estimate (simplified)
 */
export function calculateShippingEstimate(
  qty: number,
  dimensions: Dimensions,
  weight?: number,
): number {
  // Simplified shipping calculation
  // In production, integrate with shipping APIs (EasyPost, ShipEngine)
  
  const volume = (dimensions.width * dimensions.height * (dimensions.depth || 10)) / 1000000 // cm³
  const baseShipping = 10 // Base shipping cost
  const perItemShipping = 0.5
  
  return baseShipping + (perItemShipping * qty) + (volume * 0.1)
}

/**
 * Main pricing calculation function
 */
export async function calculatePrice(request: PricingRequest): Promise<PricingResult> {
  try {
    // Get material cost
    const materialConfig = getMaterialCost(request.material)
    if (!materialConfig) {
      throw new Error(`Unknown material type: ${request.material}`)
    }

    // Calculate surface area
    const area = computeSurfaceArea(request.dimensions)

    // Get print type (default to digital_print)
    const printType = request.printType || "digital_print"

    // Compute base costs
    const costs = computeBaseCost(
      area,
      materialConfig.baseCostPerSqm,
      materialConfig.baseCostPerSqm, // Not used in computeBaseCost
      request.qty,
      printType,
    )

    // Calculate material cost
    const materialCost = area * materialConfig.baseCostPerSqm * request.qty

    // Apply supplier pricing rules if provided
    let adjustedMaterialCost = materialCost
    let bulkDiscount = 0

    if (request.supplierPricingRule) {
      const before = adjustedMaterialCost
      adjustedMaterialCost = applySupplierPricingRules(
        materialCost,
        request.supplierPricingRule,
        request.qty,
      )
      bulkDiscount = before - adjustedMaterialCost
    }

    // Calculate total base cost
    const totalBaseCost = adjustedMaterialCost + costs.conversion + costs.setup

    // Calculate shipping estimate
    const shippingEstimate = calculateShippingEstimate(request.qty, request.dimensions)

    // Apply platform margin
    const marginAmount = applyPlatformMargin(totalBaseCost, request.productType) - totalBaseCost
    const finalPrice = totalBaseCost + marginAmount + shippingEstimate

    // Calculate unit price
    const unitPrice = finalPrice / request.qty

    // Build breakdown
    const breakdown: PricingBreakdown = {
      materialCost: adjustedMaterialCost,
      conversionCost: costs.conversion,
      setupCost: costs.setup,
      shippingEstimate,
      platformMargin: marginAmount,
      unitPrice,
      totalPrice: finalPrice,
      bulkDiscount: bulkDiscount > 0 ? bulkDiscount : undefined,
    }

    logger.info("Price calculated", {
      productId: request.productId,
      qty: request.qty,
      unitPrice,
      totalPrice: finalPrice,
    })

    return {
      unitPrice,
      totalPrice: finalPrice,
      breakdown,
    }
  } catch (error) {
    logger.error("Error calculating price", { error, request })
    throw error
  }
}

/**
 * Calculate price with supplier recommendations
 */
export async function calculatePriceWithSuppliers(
  request: PricingRequest,
  suppliers: Array<{
    supplierId: string
    pricingRule: any
    leadTimeDays: number
    score?: number
  }>,
): Promise<PricingResult> {
  // Calculate base price
  const baseResult = await calculatePrice(request)

  // Calculate prices for each supplier
  const supplierPrices = suppliers.map((supplier) => {
    const supplierRequest = {
      ...request,
      supplierPricingRule: supplier.pricingRule,
    }

    // Calculate price with supplier rules
    const priceResult = calculatePrice(supplierRequest)

    return {
      supplierId: supplier.supplierId,
      cost: priceResult.then((r) => r.totalPrice),
      leadTimeDays: supplier.leadTimeDays,
      score: supplier.score || 0,
    }
  })

  // Resolve all prices
  const prices = await Promise.all(
    supplierPrices.map(async (sp) => ({
      ...sp,
      cost: await sp.cost,
    })),
  )

  // Sort by score (higher is better) and cost (lower is better)
  prices.sort((a, b) => {
    // Primary sort by score (descending)
    if (b.score !== a.score) {
      return b.score - a.score
    }
    // Secondary sort by cost (ascending)
    return a.cost - b.cost
  })

  return {
    ...baseResult,
    recommendedSuppliers: prices.map((sp) => ({
      supplierId: sp.supplierId,
      score: sp.score,
      estimatedLeadDays: sp.leadTimeDays,
      cost: sp.cost,
    })),
  }
}

