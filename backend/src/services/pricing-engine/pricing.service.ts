import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import {
  calculatePrice,
  calculateSurfaceArea,
  calculateConversionCost,
  calculateTax,
  estimateShippingCost,
  Dimensions,
  PricingBreakdown,
  MaterialCost,
  getConfiguredTaxRate,
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
    /** ISO currency of the material rate card; lets clients label the price
     *  instead of hardcoding one. */
    currency: string;
  };
  productType: string;
  quantity: number;
  dimensions: Dimensions;
}

// ---------------------------------------------------------------------------
// Catalog pricing (Packhelp-style configurator quotes)
// ---------------------------------------------------------------------------

export interface CatalogQuoteRequest {
  productId?: string;
  slug?: string;
  variantId?: string;
  quantity: number;
  dimensions?: Dimensions;
  config?: Record<string, string>; // option key -> selected value
  complexity?: 'simple' | 'medium' | 'complex';
  taxRate?: number;
}

export interface ResolvedCatalogOption {
  key: string;
  label: string;
  value: string;
  optionLabel: string;
  priceDelta: number | null;
  priceType: string;
}

export interface CatalogQuoteResult {
  product: {
    id: string;
    slug: string;
    name: string;
    productType: string;
    boxType: string | null;
    customisation: string;
    moq: number;
    thumbnail: string | null;
  };
  variant: {
    id: string | null;
    sku: string;
    sizeCode: string | null;
    dimensions: Dimensions;
    custom: boolean;
  };
  quantity: number;
  moq: number;
  config: ResolvedCatalogOption[];
  material: MaterialCost;
  breakdown: PricingBreakdown;
  totalPrice: number;
  unitPrice: number;
  tiers: Array<{ minQuantity: number; factor: number }>;
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

    if (material.currency !== 'EGP') {
      throw new ValidationError('Material rate card is not EGP. Review and run the explicit EGP pricing bootstrap before quoting.');
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
      request.taxRate ?? getConfiguredTaxRate(),
      request.weightPerUnit
    );

    return {
      totalPrice: breakdown.total,
      breakdown,
      material: {
        code: material.code,
        name: material.name,
        unitPrice: material.unitPrice,
        currency: material.currency,
      },
      productType: request.productType,
      quantity: request.quantity,
      dimensions: request.dimensions,
    };
  }

  /**
   * Get a single active rule scoped to a catalog product (or variant).
   */
  async getScopedRule(
    scopeId: string,
    ruleType: string,
    scope: 'product' | 'variant' = 'product'
  ): Promise<{ value: number; scopeId: string | null } | null> {
    const rule = await prisma.pricingRule.findFirst({
      where: {
        scope,
        scopeId,
        ruleType,
        isActive: true,
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!rule) return null;
    return { value: Number(rule.value), scopeId: rule.scopeId };
  }

  /**
   * Quantity discount factor for a catalog product: the deepest tier whose
   * minQuantity is <= the requested quantity. 1 = no discount.
   */
  async getQuantityDiscountFactor(
    productId: string,
    quantity: number
  ): Promise<number> {
    const tiers = await prisma.pricingRule.findMany({
      where: {
        scope: 'product',
        scopeId: productId,
        ruleType: 'discount_tier',
        isActive: true,
        minQuantity: { lte: quantity },
        validFrom: { lte: new Date() },
        OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
      },
      orderBy: { minQuantity: 'desc' },
    });
    if (tiers.length === 0) return 1;
    return Number(tiers[0].value);
  }

  /**
   * Quantity tier ladder for a catalog product (for the pricing table UI).
   */
  async getCatalogTiers(
    productId: string
  ): Promise<Array<{ minQuantity: number; factor: number }>> {
    const tiers = await prisma.pricingRule.findMany({
      where: {
        scope: 'product',
        scopeId: productId,
        ruleType: 'discount_tier',
        isActive: true,
      },
      orderBy: { minQuantity: 'asc' },
    });
    return tiers.map((t) => ({ minQuantity: t.minQuantity!, factor: Number(t.value) }));
  }

  /**
   * Margin for a catalog price: variant-scoped -> product-scoped -> productType.
   */
  async getScopedMargin(
    productId: string,
    variantId: string | null,
    productType: string
  ): Promise<number> {
    if (variantId) {
      const rule = await this.getScopedRule(variantId, 'margin', 'variant');
      if (rule) return rule.value;
    }
    const productRule = await this.getScopedRule(productId, 'margin', 'product');
    if (productRule) return productRule.value;
    return this.getPricingRule(productType);
  }

  /**
   * Quote a catalog product with a variant/custom dimensions + option config.
   * This is the authoritative pricing path for the marketplace configurator.
   */
  async quoteCatalog(request: CatalogQuoteRequest): Promise<CatalogQuoteResult> {
    if (!request.quantity || request.quantity < 1) {
      throw new ValidationError('Quantity must be at least 1');
    }

    // 1. Load product
    let product: any;
    if (request.slug) {
      product = await prisma.product.findUnique({
        where: { slug: request.slug },
      });
    } else if (request.productId) {
      product = await prisma.product.findUnique({
        where: { id: request.productId },
      });
    }
    if (!product) {
      throw new NotFoundError('Catalog product');
    }
    if (!product.isActive) {
      throw new ValidationError(`Product "${product.name}" is not available`);
    }
    if (request.quantity < product.moq) {
      throw new ValidationError(
        `Minimum order quantity for "${product.name}" is ${product.moq}`
      );
    }

    // 2. Load product options
    const optionRows = await prisma.productOption.findMany({
      where: { productId: product.id },
      include: { values: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });

    // 4. Resolve dimensions (variant preset -> base size -> custom dims) so the
    //    option loop below can fall back to variant-derived defaults.
    const config = request.config ?? {};
    const configSize = config.size;
    let variant: any = null;
    if (request.variantId) {
      variant = await prisma.productVariant.findUnique({
        where: { id: request.variantId },
      });
      if (!variant || variant.productId !== product.id) {
        throw new ValidationError('Variant does not belong to this product');
      }
      variant = { ...variant, dimensions: variant.dimensions as Dimensions };
    }

    // 3. Resolve selected config against the defined options. Config may come
    //    from the editor's designConfig, which uses frontend alias keys
    //    (selectedMaterial/selectedFinish/selectedSize) and omits keys that a
    //    seeded variant pins (material/printColors/printSides/finish) — those
    //    fall back to the variant so a design saved from the editor quotes,
    //    displays and orders identically to the configurator.
    const resolved: ResolvedCatalogOption[] = [];
    for (const opt of optionRows) {
      let chosen: string | undefined = config[opt.key];
      if (chosen === undefined && opt.key === 'material') chosen = config['selectedMaterial'];
      if (chosen === undefined && opt.key === 'finish') chosen = config['selectedFinish'];
      if (chosen === undefined && opt.key === 'size') chosen = config['selectedSize'];
      if (chosen === undefined && variant) {
        if (opt.key === 'material') chosen = variant.materialCode ?? undefined;
        else if (opt.key === 'printColors') {
          chosen = variant.printMode !== undefined && variant.printMode !== null
            ? String(variant.printMode)
            : undefined;
        } else if (opt.key === 'printSides') {
          chosen = variant.printSides !== undefined && variant.printSides !== null
            ? String(variant.printSides)
            : undefined;
        } else if (opt.key === 'finish') {
          chosen = variant.finish ?? undefined;
        }
      }
      if (chosen === undefined) {
        const def = opt.values.find((v) => v.isDefault);
        chosen = def?.value;
      }
      if (!chosen && opt.required) {
        throw new ValidationError(`"${opt.label}" is required for this product`);
      }
      if (chosen) {
        const value = opt.values.find((v) => v.value === chosen);
        if (!value) {
          throw new ValidationError(
            `Invalid value "${chosen}" for option "${opt.label}"`
          );
        }
        resolved.push({
          key: opt.key,
          label: opt.label,
          value: value.value,
          optionLabel: value.label,
          priceDelta: value.priceDelta !== null ? Number(value.priceDelta) : null,
          priceType: value.priceType,
        });
      }
    }

    let dimensions: Dimensions;
    let sizeCode: string | null = null;
    let custom = false;

    if (variant) {
      dimensions = variant.dimensions;
      sizeCode = variant.sizeCode ?? null;
    } else if (configSize && Array.isArray(product.baseSizes)) {
      const baseSize = (product.baseSizes as any[]).find(
        (s) => s.code === configSize
      );
      if (!baseSize) {
        throw new ValidationError(`Unknown size "${configSize}"`);
      }
      dimensions = {
        length: baseSize.length,
        width: baseSize.width,
        height: baseSize.height,
        unit: product.sizeUnit as any,
      };
      sizeCode = baseSize.code;
    } else if (request.dimensions) {
      const min = (product.minDimensions ?? {}) as any;
      const max = (product.maxDimensions ?? {}) as any;
      const d = request.dimensions;
      const len = d.length;
      const wid = d.width;
      const hei = d.height ?? 0;
      if (
        (min.length != null && len < min.length) ||
        (max.length != null && len > max.length) ||
        (min.width != null && wid < min.width) ||
        (max.width != null && wid > max.width) ||
        (min.height != null && hei < min.height) ||
        (max.height != null && hei > max.height)
      ) {
        throw new ValidationError(
          `Dimensions outside the allowed ${product.minDimensions}..${product.maxDimensions}`
        );
      }
      dimensions = { length: len, width: wid, height: hei, unit: d.unit };
      custom = true;
    } else {
      throw new ValidationError('Provide a variant, size or custom dimensions');
    }

    // 5. Resolve material (config -> variant -> editor default -> first active)
    const materialCode =
      config.material ??
      variant?.materialCode ??
      (product.editorDefaults as any)?.defaultMaterial ??
      undefined;
    const material = materialCode
      ? await this.getMaterial(materialCode)
      : (await this.getMaterials())[0];

    // 6. Print / finish for SKU synthesis
    const printMode = config.printColors ?? variant?.printMode ?? 'none';
    const finish = config.finish ?? variant?.finish ?? 'none';

    // 7. Build the SKU (configurator-synthesized, mirrors seeded family schema)
    const sku = [
      product.productType,
      product.boxType ?? product.productType,
      sizeCode ?? 'custom',
      material.code,
      `print-${printMode}`,
      `finish-${finish}`,
    ].join('--');

    // 8. Unit economics
    const productType = product.productType as 'box' | 'bag' | 'label';
    const surfaceArea = calculateSurfaceArea(dimensions, productType);
    if (material.currency !== 'EGP') {
      throw new ValidationError('Material rate card is not EGP. Review and run the explicit EGP pricing bootstrap before quoting.');
    }
    const materialCostPerUnit = surfaceArea * material.unitPrice;

    // Option upcharges (per_unit adds flat; percent scales material cost; fixed amortizes)
    let optionsMarkupPerUnit = 0;
    for (const opt of resolved) {
      if (opt.priceDelta == null) continue;
      if (opt.priceType === 'percent') {
        optionsMarkupPerUnit += materialCostPerUnit * opt.priceDelta;
      } else if (opt.priceType === 'fixed') {
        optionsMarkupPerUnit += opt.priceDelta / request.quantity;
      } else {
        optionsMarkupPerUnit += opt.priceDelta;
      }
    }

    // Conversion per unit: product-scoped rule replaces the heuristic table.
    let conversionPerUnit: number;
    const convRule = await this.getScopedRule(product.id, 'conversion', 'product');
    if (convRule) {
      conversionPerUnit = convRule.value;
    } else {
      const legacy = calculateConversionCost(
        productType,
        request.quantity,
        surfaceArea,
        request.complexity || 'medium'
      );
      conversionPerUnit = legacy / request.quantity;
    }

    // Quantity discount tier
    const discountFactor = await this.getQuantityDiscountFactor(
      product.id,
      request.quantity
    );

    // Margin
    const margin = await this.getScopedMargin(
      product.id,
      variant?.id ?? null,
      productType
    );

    // 9. Assemble breakdown
    const quantity = request.quantity;
    const rawUnitCost = materialCostPerUnit + optionsMarkupPerUnit + conversionPerUnit;
    const lineCost = rawUnitCost * quantity * discountFactor;
    const discountApplied = rawUnitCost * quantity * (1 - discountFactor);
    const marginAmount = lineCost * margin;
    const subtotal = lineCost + marginAmount;
    const tax = calculateTax(subtotal, request.taxRate ?? getConfiguredTaxRate());
    const shippingEstimate = estimateShippingCost(
      dimensions,
      quantity,
      product.boxType === 'label' || product.boxType === 'poly-mailer' ? 0.03 : undefined
    );
    const total = subtotal + tax + shippingEstimate;
    const unitPrice = subtotal / quantity;

    const breakdown: PricingBreakdown = {
      surfaceArea: Math.round(surfaceArea * 100) / 100,
      materialCost: Math.round(materialCostPerUnit * quantity * 100) / 100,
      conversionCost: Math.round(conversionPerUnit * quantity * 100) / 100,
      optionsMarkup: Math.round(optionsMarkupPerUnit * quantity * 100) / 100,
      optionsMarkupPerUnit: Math.round(optionsMarkupPerUnit * 100) / 100,
      discountFactor: Math.round(discountFactor * 1000) / 1000,
      discountApplied: Math.round(discountApplied * 100) / 100,
      marginAmount: Math.round(marginAmount * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      shippingEstimate: Math.round(shippingEstimate * 100) / 100,
      total: Math.round(total * 100) / 100,
    };

    const tiers = await this.getCatalogTiers(product.id);

    return {
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        productType: product.productType,
        boxType: product.boxType,
        customisation: product.customisation,
        moq: product.moq,
        thumbnail: product.thumbnail,
      },
      variant: {
        id: variant?.id ?? null,
        sku,
        sizeCode,
        dimensions,
        custom,
      },
      quantity,
      moq: product.moq,
      config: resolved,
      material: {
        code: material.code,
        name: material.name,
        unitPrice: material.unitPrice,
        currency: material.currency,
      },
      breakdown,
      totalPrice: total,
      unitPrice: Math.round(unitPrice * 100) / 100,
      tiers,
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
