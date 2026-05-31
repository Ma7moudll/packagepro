/**
 * Pricing Rules Configuration
 * Configurable pricing rules for materials, conversion costs, and platform margins
 */

export interface MaterialCost {
  type: string
  baseCostPerSqm: number // Base cost per square meter
  unit: "sqm" | "sqft" | "unit"
}

export interface ConversionCost {
  type: "digital_print" | "offset" | "flexo" | "screen_print"
  setupCost: number // One-time setup cost
  costPerUnit: number // Cost per unit
  minOrder: number // Minimum order quantity
  bulkDiscounts?: Array<{
    qty: number
    discount: number // Percentage discount (0.1 = 10%)
  }>
}

export interface PlatformMargin {
  productType?: string // Optional: product type specific
  margin: number // Platform margin percentage (0.15 = 15%)
}

// Material costs (per square meter)
export const MATERIAL_COSTS: Record<string, MaterialCost> = {
  corrugated_kraft: {
    type: "corrugated_kraft",
    baseCostPerSqm: 2.5,
    unit: "sqm",
  },
  white_corrugated: {
    type: "white_corrugated",
    baseCostPerSqm: 3.0,
    unit: "sqm",
  },
  chipboard: {
    type: "chipboard",
    baseCostPerSqm: 5.0,
    unit: "sqm",
  },
  kraft_liner: {
    type: "kraft_liner",
    baseCostPerSqm: 4.5,
    unit: "sqm",
  },
  vinyl: {
    type: "vinyl",
    baseCostPerSqm: 8.0,
    unit: "sqm",
  },
  paper: {
    type: "paper",
    baseCostPerSqm: 1.5,
    unit: "sqm",
  },
  polyester: {
    type: "polyester",
    baseCostPerSqm: 10.0,
    unit: "sqm",
  },
}

// Conversion costs by print type
export const CONVERSION_COSTS: Record<string, ConversionCost> = {
  digital_print: {
    type: "digital_print",
    setupCost: 50,
    costPerUnit: 0.5,
    minOrder: 100,
    bulkDiscounts: [
      { qty: 500, discount: 0.1 },
      { qty: 1000, discount: 0.15 },
      { qty: 5000, discount: 0.25 },
    ],
  },
  offset: {
    type: "offset",
    setupCost: 200,
    costPerUnit: 0.3,
    minOrder: 1000,
    bulkDiscounts: [
      { qty: 5000, discount: 0.15 },
      { qty: 10000, discount: 0.25 },
    ],
  },
  flexo: {
    type: "flexo",
    setupCost: 300,
    costPerUnit: 0.2,
    minOrder: 2000,
    bulkDiscounts: [
      { qty: 10000, discount: 0.2 },
    ],
  },
  screen_print: {
    type: "screen_print",
    setupCost: 100,
    costPerUnit: 0.8,
    minOrder: 50,
    bulkDiscounts: [
      { qty: 500, discount: 0.1 },
    ],
  },
}

// Platform margins (default and product-specific)
export const PLATFORM_MARGINS: PlatformMargin[] = [
  {
    margin: 0.15, // Default 15% margin
  },
  {
    productType: "MAILER_BOX",
    margin: 0.12, // 12% for mailer boxes
  },
  {
    productType: "RIGID_BOX",
    margin: 0.20, // 20% for premium rigid boxes
  },
  {
    productType: "STICKER",
    margin: 0.25, // 25% for stickers (smaller margins but higher volume)
  },
]

/**
 * Get material cost
 */
export function getMaterialCost(materialType: string): MaterialCost | null {
  return MATERIAL_COSTS[materialType] || null
}

/**
 * Get conversion cost
 */
export function getConversionCost(printType: string): ConversionCost | null {
  return CONVERSION_COSTS[printType] || null
}

/**
 * Get platform margin for product type
 */
export function getPlatformMargin(productType?: string): number {
  const specific = PLATFORM_MARGINS.find((m) => m.productType === productType)
  if (specific) return specific.margin

  const defaultMargin = PLATFORM_MARGINS.find((m) => !m.productType)
  return defaultMargin?.margin || 0.15
}

