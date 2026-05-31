// Price Calculator Service
// Real-time pricing calculations for the editor

export interface PricingInput {
  productType: string;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  material: string;
  quantity: number;
  printType: string;
  finishing?: string;
  lamination?: string;
  shipping?: {
    method: string;
    country: string;
  };
}

export interface PricingBreakdown {
  basePrice: number;
  materialCost: number;
  printingCost: number;
  finishingCost: number;
  laminationCost: number;
  shippingCost: number;
  total: number;
  unitPrice: number;
  currency: string;
}

export interface PriceComparison {
  options: PricingOption[];
  recommended: string;
  savings: number;
}

export interface PricingOption {
  id: string;
  name: string;
  description: string;
  pricing: PricingBreakdown;
  estimatedDelivery: string;
  quality: 'standard' | 'premium' | 'deluxe';
}

export class PriceCalculatorService {
  private static readonly MATERIAL_PRICES: Record<string, number> = {
    'cardboard-white': 0.15,
    'cardboard-kraft': 0.12,
    'cardboard-coated': 0.18,
    'corrugated-white': 0.25,
    'corrugated-kraft': 0.22,
    'paper-glossy': 0.08,
    'paper-matte': 0.07,
  };

  private static readonly PRINT_PRICES: Record<string, number> = {
    'print-monochrome': 0.05,
    'print-fullcolor': 0.15,
    'print-metallic': 0.35,
    'print-fluorescent': 0.25,
    'print-none': 0,
  };

  private static readonly FINISHING_PRICES: Record<string, number> = {
    'none': 0,
    'gloss': 0.03,
    'matte': 0.025,
    'soft-touch': 0.08,
    'spot-uv': 0.12,
  };

  private static readonly LAMINATION_PRICES: Record<string, number> = {
    'none': 0,
    'glossy': 0.04,
    'matte': 0.035,
    'soft-touch': 0.10,
  };

  private static readonly QUANTITY_DISCOUNTS = [
    { min: 1, max: 49, multiplier: 1.0 },
    { min: 50, max: 99, multiplier: 0.95 },
    { min: 100, max: 249, multiplier: 0.90 },
    { min: 250, max: 499, multiplier: 0.85 },
    { min: 500, max: 999, multiplier: 0.80 },
    { min: 1000, max: 9999, multiplier: 0.75 },
    { min: 10000, max: Infinity, multiplier: 0.70 },
  ];

  private static readonly SHIPPING_PRICES: Record<string, Record<string, number>> = {
    'standard': {
      'local': 15,
      'regional': 25,
      'international': 45,
    },
    'express': {
      'local': 35,
      'regional': 65,
      'international': 120,
    },
    'overnight': {
      'local': 75,
      'regional': 150,
      'international': 300,
    },
  };

  /**
   * Calculate pricing breakdown for given input
   */
  static calculatePricing(input: PricingInput): PricingBreakdown {
    const { dimensions, material, quantity, printType, finishing, lamination, shipping } = input;

    // Calculate surface area for printing
    const surfaceArea = this.calculateSurfaceArea(dimensions, input.productType);

    // Base price per unit
    const basePrice = this.calculateBasePrice(dimensions, input.productType);

    // Material cost
    const materialCost = (this.MATERIAL_PRICES[material] || 0.15) * surfaceArea;

    // Printing cost
    const printingCost = (this.PRINT_PRICES[printType] || 0.05) * surfaceArea;

    // Finishing cost
    const finishingCost = (this.FINISHING_PRICES[finishing || 'none'] || 0) * surfaceArea;

    // Lamination cost
    const laminationCost = (this.LAMINATION_PRICES[lamination || 'none'] || 0) * surfaceArea;

    // Subtotal per unit
    const subtotalPerUnit = basePrice + materialCost + printingCost + finishingCost + laminationCost;

    // Apply quantity discount
    const discountMultiplier = this.getQuantityDiscount(quantity);
    const discountedPricePerUnit = subtotalPerUnit * discountMultiplier;

    // Shipping cost
    const shippingCost = shipping ? this.calculateShippingCost(shipping.method, shipping.country, quantity) : 0;

    // Total calculation
    const total = (discountedPricePerUnit * quantity) + shippingCost;
    const unitPrice = total / quantity;

    return {
      basePrice: basePrice * quantity,
      materialCost: materialCost * quantity,
      printingCost: printingCost * quantity,
      finishingCost: finishingCost * quantity,
      laminationCost: laminationCost * quantity,
      shippingCost,
      total,
      unitPrice,
      currency: 'USD',
    };
  }

  /**
   * Generate price comparison options
   */
  static generatePriceComparison(input: PricingInput): PriceComparison {
    const options: PricingOption[] = [];

    // Standard option
    const standardPricing = this.calculatePricing(input);
    options.push({
      id: 'standard',
      name: 'Standard Quality',
      description: 'Good quality for most applications',
      pricing: standardPricing,
      estimatedDelivery: '7-10 business days',
      quality: 'standard',
    });

    // Premium option (higher quality materials)
    const premiumInput = {
      ...input,
      material: this.getPremiumMaterial(input.material),
      finishing: input.finishing || 'gloss',
    };
    const premiumPricing = this.calculatePricing(premiumInput);
    options.push({
      id: 'premium',
      name: 'Premium Quality',
      description: 'High-end materials and finishing',
      pricing: premiumPricing,
      estimatedDelivery: '5-7 business days',
      quality: 'premium',
    });

    // Economy option (lower cost)
    const economyInput = {
      ...input,
      material: this.getEconomyMaterial(input.material),
      printType: input.printType === 'print-fullcolor' ? 'print-monochrome' : input.printType,
    };
    const economyPricing = this.calculatePricing(economyInput);
    options.push({
      id: 'economy',
      name: 'Economy Option',
      description: 'Cost-effective solution',
      pricing: economyPricing,
      estimatedDelivery: '10-14 business days',
      quality: 'standard',
    });

    // Sort by total price
    options.sort((a, b) => a.pricing.total - b.pricing.total);

    // Calculate savings compared to most expensive
    const mostExpensive = Math.max(...options.map(o => o.pricing.total));
    const cheapest = Math.min(...options.map(o => o.pricing.total));
    const savings = mostExpensive - cheapest;

    return {
      options,
      recommended: options[0].id, // Cheapest option
      savings,
    };
  }

  /**
   * Get real-time price updates (for quantity changes)
   */
  static getPriceUpdates(input: PricingInput, quantity: number): PricingBreakdown {
    return this.calculatePricing({ ...input, quantity });
  }

  private static calculateSurfaceArea(dimensions: any, productType: string): number {
    const { length, width, height } = dimensions;

    switch (productType) {
      case 'box':
        // Surface area for a box (all faces)
        return 2 * ((length * width) + (length * height) + (width * height));
      case 'bag':
        // Surface area for a bag (front, back, sides)
        return 2 * (length * width) + 2 * (length * height);
      case 'card':
        // Single face for cards
        return length * width;
      default:
        return length * width;
    }
  }

  private static calculateBasePrice(dimensions: any, productType: string): number {
    // Base manufacturing cost
    const volume = dimensions.length * dimensions.width * dimensions.height;
    let baseMultiplier = 1.0;

    switch (productType) {
      case 'box':
        baseMultiplier = 2.5;
        break;
      case 'bag':
        baseMultiplier = 1.8;
        break;
      case 'card':
        baseMultiplier = 1.2;
        break;
      default:
        baseMultiplier = 2.0;
    }

    return Math.max(volume * 0.001 * baseMultiplier, 0.50); // Minimum 50 cents
  }

  private static getQuantityDiscount(quantity: number): number {
    const discount = this.QUANTITY_DISCOUNTS.find(
      d => quantity >= d.min && quantity <= d.max
    );
    return discount?.multiplier || 1.0;
  }

  private static calculateShippingCost(method: string, country: string, quantity: number): number {
    let region = 'international';
    if (country === 'US' || country === 'CA') region = 'regional';
    if (country === 'local') region = 'local';

    const baseCost = this.SHIPPING_PRICES[method]?.[region] || 45;

    // Scale with quantity (diminishing returns)
    const quantityMultiplier = Math.min(Math.sqrt(quantity) * 0.1 + 0.9, 3.0);

    return baseCost * quantityMultiplier;
  }

  private static getPremiumMaterial(material: string): string {
    const premiumMap: Record<string, string> = {
      'cardboard-white': 'cardboard-coated',
      'cardboard-kraft': 'cardboard-coated',
      'paper-matte': 'paper-glossy',
    };
    return premiumMap[material] || material;
  }

  private static getEconomyMaterial(material: string): string {
    const economyMap: Record<string, string> = {
      'cardboard-coated': 'cardboard-white',
      'cardboard-white': 'cardboard-kraft',
      'paper-glossy': 'paper-matte',
    };
    return economyMap[material] || material;
  }

  /**
   * Format price for display
   */
  static formatPrice(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Get quantity discount tiers
   */
  static getQuantityTiers(): Array<{ min: number; max: number; discount: number }> {
    return this.QUANTITY_DISCOUNTS.map(tier => ({
      min: tier.min,
      max: tier.max === Infinity ? 99999 : tier.max,
      discount: (1 - tier.multiplier) * 100,
    }));
  }
}