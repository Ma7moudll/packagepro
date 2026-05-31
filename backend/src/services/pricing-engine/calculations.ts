// Pricing calculation utilities

export interface Dimensions {
  length: number;
  width: number;
  height?: number;
  unit: 'cm' | 'mm' | 'inch';
}

export interface MaterialCost {
  code: string;
  name: string;
  unitPrice: number;
  currency: string;
}

export interface PricingBreakdown {
  surfaceArea: number;
  materialCost: number;
  conversionCost: number;
  marginAmount: number;
  subtotal: number;
  tax: number;
  shippingEstimate: number;
  total: number;
}

/**
 * Calculate surface area of a box/bag in square units
 */
export function calculateSurfaceArea(
  dimensions: Dimensions,
  productType: 'box' | 'bag' | 'label'
): number {
  const { length, width, height, unit } = dimensions;

  // Convert to cm for consistency
  let l = length;
  let w = width;
  let h = height || 0;

  if (unit === 'mm') {
    l = l / 10;
    w = w / 10;
    h = h / 10;
  } else if (unit === 'inch') {
    l = l * 2.54;
    w = w * 2.54;
    h = h * 2.54;
  }

  let area = 0;

  if (productType === 'box' && h > 0) {
    // Box surface area: 2*(l*w + l*h + w*h)
    area = 2 * (l * w + l * h + w * h);
  } else if (productType === 'bag') {
    // Bag: front + back + sides + bottom
    // Simplified: 2*(l*w) + 2*(l*h) + w*h (if height exists)
    if (h > 0) {
      area = 2 * (l * w + l * h) + w * h;
    } else {
      area = 2 * l * w; // Flat bag
    }
  } else if (productType === 'label') {
    // Label: simple area
    area = l * w;
  }

  return Math.round(area * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate material cost based on surface area and material price
 */
export function calculateMaterialCost(
  surfaceArea: number,
  material: MaterialCost,
  quantity: number
): number {
  const costPerUnit = surfaceArea * material.unitPrice;
  return costPerUnit * quantity;
}

/**
 * Calculate conversion cost (printing, die-cutting, labor)
 */
export function calculateConversionCost(
  productType: string,
  quantity: number,
  surfaceArea: number,
  complexity: 'simple' | 'medium' | 'complex' = 'medium'
): number {
  // Base conversion costs per unit (in USD)
  const baseCosts: Record<string, Record<string, number>> = {
    box: {
      simple: 0.15,
      medium: 0.25,
      complex: 0.40,
    },
    bag: {
      simple: 0.10,
      medium: 0.18,
      complex: 0.30,
    },
    label: {
      simple: 0.05,
      medium: 0.08,
      complex: 0.12,
    },
  };

  const baseCost =
    baseCosts[productType]?.[complexity] || baseCosts.box.medium;

  // Add area-based adjustment (larger items cost more)
  const areaMultiplier = Math.max(1, surfaceArea / 1000); // Base 1000 sq cm

  // Quantity discount
  let quantityMultiplier = 1;
  if (quantity >= 1000) {
    quantityMultiplier = 0.85; // 15% discount
  } else if (quantity >= 500) {
    quantityMultiplier = 0.90; // 10% discount
  } else if (quantity >= 250) {
    quantityMultiplier = 0.95; // 5% discount
  }

  return baseCost * areaMultiplier * quantityMultiplier * quantity;
}

/**
 * Apply margin to cost
 */
export function applyMargin(
  cost: number,
  marginPercent: number
): { cost: number; margin: number } {
  const margin = cost * marginPercent;
  return {
    cost: cost + margin,
    margin,
  };
}

/**
 * Calculate shipping cost estimate based on dimensions and weight
 */
export function estimateShippingCost(
  dimensions: Dimensions,
  quantity: number,
  weightPerUnit: number = 0.1 // kg per unit (default)
): number {
  // Simplified shipping calculation
  // In production, this should integrate with shipping APIs
  const totalWeight = quantity * weightPerUnit;

  let baseShipping = 5; // Base shipping cost in USD

  if (totalWeight > 10) {
    baseShipping = 15;
  } else if (totalWeight > 5) {
    baseShipping = 10;
  } else if (totalWeight > 2) {
    baseShipping = 7;
  }

  // Add dimensional weight calculation
  const { length, width, height, unit } = dimensions;
  let l = length;
  let w = width;
  let h = height || 1;

  if (unit === 'mm') {
    l = l / 10;
    w = w / 10;
    h = h / 10;
  } else if (unit === 'inch') {
    l = l * 2.54;
    w = w * 2.54;
    h = h * 2.54;
  }

  const dimensionalWeight = (l * w * h) / 5000; // DHL formula
  const chargeableWeight = Math.max(totalWeight, dimensionalWeight);

  if (chargeableWeight > 5) {
    baseShipping += (chargeableWeight - 5) * 2;
  }

  return Math.round(baseShipping * 100) / 100;
}

/**
 * Calculate tax (simplified - adjust based on business logic)
 */
export function calculateTax(subtotal: number, taxRate: number = 0.0): number {
  return subtotal * taxRate;
}

/**
 * Complete pricing calculation
 */
export function calculatePrice(
  dimensions: Dimensions,
  productType: 'box' | 'bag' | 'label',
  quantity: number,
  material: MaterialCost,
  marginPercent: number,
  complexity: 'simple' | 'medium' | 'complex' = 'medium',
  taxRate: number = 0.0,
  weightPerUnit?: number
): PricingBreakdown {
  // 1. Calculate surface area
  const surfaceArea = calculateSurfaceArea(dimensions, productType);

  // 2. Calculate material cost
  const materialCost = calculateMaterialCost(surfaceArea, material, quantity);

  // 3. Calculate conversion cost
  const conversionCost = calculateConversionCost(
    productType,
    quantity,
    surfaceArea,
    complexity
  );

  // 4. Total cost before margin
  const baseCost = materialCost + conversionCost;

  // 5. Apply margin
  const { cost: subtotal, margin: marginAmount } = applyMargin(
    baseCost,
    marginPercent
  );

  // 6. Calculate tax
  const tax = calculateTax(subtotal, taxRate);

  // 7. Estimate shipping
  const shippingEstimate = estimateShippingCost(
    dimensions,
    quantity,
    weightPerUnit
  );

  // 8. Total
  const total = subtotal + tax + shippingEstimate;

  return {
    surfaceArea,
    materialCost: Math.round(materialCost * 100) / 100,
    conversionCost: Math.round(conversionCost * 100) / 100,
    marginAmount: Math.round(marginAmount * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    shippingEstimate: Math.round(shippingEstimate * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}
