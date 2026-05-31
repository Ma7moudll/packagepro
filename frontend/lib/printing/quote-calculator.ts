"use client"

import { PrintQuote } from "./types"

interface QuoteInput {
  quantity: number
  dimensions: {
    width: number
    height: number
    depth?: number
    unit: "mm" | "cm" | "inch"
  }
  material: string
  finish: string[]
  colors: {
    front: number
    back: number
    sides: number
  }
  dieCutLines: number
  foldLines: number
  spotUV: number
  embossing: number
  debossing: number
  pantoneColors: string[]
  rushOrder: boolean
  deliveryDate?: string
}

/**
 * Calculate print quote based on specifications
 */
export function calculatePrintQuote(input: QuoteInput): PrintQuote {
  // Base pricing (per unit)
  const basePricePerUnit = 0.5

  // Material costs (per square meter)
  const materialCosts: Record<string, number> = {
    "cardboard-250": 2.5,
    "cardboard-300": 3.0,
    "cardboard-350": 3.5,
    "kraft": 2.0,
    "corrugated": 2.8,
    "white-cardboard": 3.2,
    "recycled": 2.3,
  }

  // Finish costs (per unit)
  const finishCosts: Record<string, number> = {
    "gloss": 0.15,
    "matte": 0.12,
    "soft-touch": 0.20,
    "textured": 0.18,
    "laminated": 0.25,
  }

  // Color costs (per side, per color)
  const colorCostPerSide = 0.05

  // Special effects costs (per unit)
  const specialEffectsCosts = {
    dieCutLine: 0.10,
    foldLine: 0.05,
    spotUV: 0.30,
    embossing: 0.25,
    debossing: 0.25,
    pantoneColor: 0.15,
  }

  // Rush order multiplier
  const rushMultiplier = input.rushOrder ? 1.5 : 1.0

  // Calculate area (convert to square meters)
  let areaInSquareMeters = 0
  if (input.dimensions.unit === "mm") {
    areaInSquareMeters =
      (input.dimensions.width * input.dimensions.height) / 1000000
  } else if (input.dimensions.unit === "cm") {
    areaInSquareMeters =
      (input.dimensions.width * input.dimensions.height) / 10000
  } else {
    // inch to square meters
    areaInSquareMeters =
      (input.dimensions.width * input.dimensions.height * 0.00064516)
  }

  // Base price
  const basePrice = basePricePerUnit * input.quantity

  // Material cost
  const materialCostPerSquareMeter =
    materialCosts[input.material] || materialCosts["cardboard-250"]
  const materialCost = materialCostPerSquareMeter * areaInSquareMeters * input.quantity

  // Color cost
  const totalColors =
    input.colors.front + input.colors.back + input.colors.sides
  const colorCost = colorCostPerSide * totalColors * input.quantity

  // Finish cost
  const finishCost = input.finish.reduce((sum, finish) => {
    return sum + (finishCosts[finish] || 0) * input.quantity
  }, 0)

  // Special effects cost
  const specialEffectsCost =
    input.dieCutLines * specialEffectsCosts.dieCutLine * input.quantity +
    input.foldLines * specialEffectsCosts.foldLine * input.quantity +
    input.spotUV * specialEffectsCosts.spotUV * input.quantity +
    input.embossing * specialEffectsCosts.embossing * input.quantity +
    input.debossing * specialEffectsCosts.debossing * input.quantity +
    input.pantoneColors.length * specialEffectsCosts.pantoneColor * input.quantity

  // Rush cost
  const rushCost =
    input.rushOrder
      ? (basePrice + materialCost + colorCost + finishCost + specialEffectsCost) *
        0.5
      : 0

  // Subtotal
  const subtotal =
    basePrice +
    materialCost +
    colorCost +
    finishCost +
    specialEffectsCost +
    rushCost

  // Tax (15% VAT)
  const tax = subtotal * 0.15

  // Total
  const total = subtotal + tax

  return {
    ...input,
    basePrice: basePrice * rushMultiplier,
    materialCost: materialCost * rushMultiplier,
    colorCost: colorCost * rushMultiplier,
    finishCost: finishCost * rushMultiplier,
    specialEffectsCost: specialEffectsCost * rushMultiplier,
    rushCost,
    tax,
    total,
    currency: "SAR",
  }
}

/**
 * Get material options
 */
export function getMaterialOptions() {
  return [
    { value: "cardboard-250", label: "Cardboard 250gsm" },
    { value: "cardboard-300", label: "Cardboard 300gsm" },
    { value: "cardboard-350", label: "Cardboard 350gsm" },
    { value: "kraft", label: "Kraft Paper" },
    { value: "corrugated", label: "Corrugated" },
    { value: "white-cardboard", label: "White Cardboard" },
    { value: "recycled", label: "Recycled Cardboard" },
  ]
}

/**
 * Get finish options
 */
export function getFinishOptions() {
  return [
    { value: "gloss", label: "Gloss" },
    { value: "matte", label: "Matte" },
    { value: "soft-touch", label: "Soft Touch" },
    { value: "textured", label: "Textured" },
    { value: "laminated", label: "Laminated" },
  ]
}

