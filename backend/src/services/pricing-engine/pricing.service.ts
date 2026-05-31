import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import {
  calculatePrice,
  Dimensions,
  PricingBreakdown,
  MaterialCost,
} from './calculations';

export interface PricingRequest {
  productType: 'box' | 'bag' | 'label';
  quantity: number;
  dimensions: Dimensions;
  materialCode?: string;
  complexity?: 'simple' | 'medium' | 'complex';
  taxRate?: number;
  weightPerUnit?: number;
}

export interface PricingResponse {
  totalPrice: number;
  breakdown: PricingBreakdown;
  material: {
    code: string;
    name: string;
    unitPrice: number;
  };
  productType: string;
  quantity: number;
  dimensions: Dimensions;
}

export class PricingService {
  /**
   * Get all active materials
   */
  async getMaterials(): Promise<MaterialCost[]> {
    const materials = await prisma.material.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return materials.map((m) => ({
      code: m.code,
      name: m.name,
      unitPrice: Number(m.unitPrice),
      currency: m.currency,
    }));
  }

  /**
   * Get material by code
   */
  async getMaterial(code: string): Promise<MaterialCost> {
    const material = await prisma.material.findUnique({
      where: { code },
    });

    if (!material || !material.isActive) {
      throw new NotFoundError(`Material with code ${code}`);
    }

    return {
      code: material.code,
      name: material.name,
      unitPrice: Number(material.unitPrice),
      currency: material.currency,
    };
  }

  /**
   * Get pricing rule for product type
   */
  async getPricingRule(
    productType: string,
    quantity?: number
  ): Promise<number> {
    const rules = await prisma.pricingRule.findMany({
      where: {
        productType,
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [
          { validUntil: null },
          { validUntil: { gte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by quantity if provided
    let matchingRules = rules;
    if (quantity !== undefined) {
      matchingRules = rules.filter((rule) => {
        const minOk = !rule.minQuantity || rule.minQuantity <= quantity;
        const maxOk = !rule.maxQuantity || rule.maxQuantity >= quantity;
        return minOk && maxOk;
      });
    }

    if (matchingRules.length === 0) {
      // Default margin: 30%
      return 0.3;
    }

    const rule = matchingRules[0];

    if (rule.ruleType === 'margin') {
      return Number(rule.value);
    } else if (rule.ruleType === 'fixed') {
      // Fixed price rule - would need more complex logic
      return 0.3; // Fallback
    } else {
      return 0.3; // Default
    }
  }

  /**
   * Calculate price for a product
   */
  async calculatePrice(request: PricingRequest): Promise<PricingResponse> {
    // Validate input
    if (request.quantity < 1) {
      throw new ValidationError('Quantity must be at least 1');
    }

    if (
      request.dimensions.length <= 0 ||
      request.dimensions.width <= 0
    ) {
      throw new ValidationError('Invalid dimensions');
    }

    // Get material (default to first active material if not specified)
    let material: MaterialCost;
    if (request.materialCode) {
      material = await this.getMaterial(request.materialCode);
    } else {
      const materials = await this.getMaterials();
      if (materials.length === 0) {
        throw new NotFoundError('No active materials found');
      }
      material = materials[0];
    }

    // Get margin from pricing rules
    const marginPercent = await this.getPricingRule(
      request.productType,
      request.quantity
    );

    // Calculate price
    const breakdown = calculatePrice(
      request.dimensions,
      request.productType,
      request.quantity,
      material,
      marginPercent,
      request.complexity || 'medium',
      request.taxRate || 0.0,
      request.weightPerUnit
    );

    return {
      totalPrice: breakdown.total,
      breakdown,
      material: {
        code: material.code,
        name: material.name,
        unitPrice: material.unitPrice,
      },
      productType: request.productType,
      quantity: request.quantity,
      dimensions: request.dimensions,
    };
  }

  /**
   * Get pricing breakdown for multiple quantities (for quantity selection UI)
   */
  async getQuantityPricing(
    baseRequest: Omit<PricingRequest, 'quantity'>,
    quantities: number[] = [100, 250, 500, 1000, 2500, 5000]
  ): Promise<Array<{ quantity: number; total: number; unitPrice: number }>> {
    const results = await Promise.all(
      quantities.map(async (qty) => {
        const pricing = await this.calculatePrice({
          ...baseRequest,
          quantity: qty,
        });
        return {
          quantity: qty,
          total: pricing.totalPrice,
          unitPrice: pricing.totalPrice / qty,
        };
      })
    );

    return results;
  }
}

export const pricingService = new PricingService();
