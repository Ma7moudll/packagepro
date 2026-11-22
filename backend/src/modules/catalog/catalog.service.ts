import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { pricingService, CatalogQuoteRequest, CatalogQuoteResult } from '../../services/pricing-engine/pricing.service';

/** Material hex color lookup — seeded materials store hex in metadata. */
const MATERIAL_HEX: Record<string, string> = {
  'paper-coated-white':'#eeeeec', 'paper-white':'#eeeeec','paper-kraft':'#b8936a',
  'poly-white':'#eeeeec','poly-black':'#242424','foil-matte':'#dddddd','foil-glossy':'#eeeeec',
  'plastic-clear':'#eeeeee','cotton-natural':'#ddd5c2','cotton-white':'#eeeeec',
  'cardboard-kraft': '#b8936a',
  'cardboard-white': '#ffffff',
  'cardboard-coated': '#ffffff',
  'corrugated-kraft': '#a67c52',
  'corrugated-white': '#f8f9fa',
  'kraft': '#b8936a',
  'poly': '#e8e8e8',
  'paper': '#ffffff',
};

// Shapes returned by the marketplace (frontend consumes these via /api/catalog).

function toSummary(p: any) {
  const editorDefaults = p.editorDefaults ?? undefined;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    productType: p.productType,
    boxType: p.boxType,
    customisation: p.customisation,
    customisable: p.customisation === 'custom',
    moq: p.moq,
    priceFrom: p.priceFrom !== null ? Number(p.priceFrom) : null,
    thumbnail: p.thumbnail,
    gallery: p.gallery,
    ecoFlags: p.ecoFlags,
    editorDefaults: p.editorDefaults,
    // Unified-catalogue readiness passthrough (additive; undefined on rows
    // seeded before the unification).
    editorType: editorDefaults?.editorType,
    readiness: editorDefaults?.readiness,
    support: editorDefaults?.support,
    supportReason: editorDefaults?.supportReason,
    // Grounded currency: the pricing engine rejects any material rate card
    // whose currency is not EGP (pricing.service.ts), so every price this
    // API serves is EGP by construction. Storefronts must format with this
    // field, never assume another currency or convert rates.
    currency: 'EGP',
  };
}

export class CatalogService {
  /**
   * Categories with their subcategories and product summaries — powers the
   * marketplace landing + category pages.
   */
  async listCategories(opts: { category?: string; subcategory?: string } = {}) {
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      include: {
        subcategories: {
          where: { isActive: true },
          include: {
            products: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    let result = categories.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      description: c.description,
      image: c.image,
      subcategories: c.subcategories.map((s) => ({
        id: s.id,
        slug: s.slug,
        name: s.name,
        description: s.description,
        image: s.image,
        products: s.products.map(toSummary),
      })),
    }));

    const catSlug = opts.category;
    const subSlug = opts.subcategory;
    if (catSlug) {
      result = result.filter((c) => c.slug === catSlug);
    }
    if (subSlug) {
      result = result.map((c) => ({
        ...c,
        subcategories: c.subcategories.filter((s) => s.slug === subSlug),
      }));
    }
    return result;
  }

  /**
   * Full product detail for the configurator: base sizes, custom-size bounds,
   * configurable options (with priced values), seeded variants and the
   * quantity discount tier ladder.
   */
  async getProductBySlug(slug: string) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        subcategory: { include: { category: true } },
        variants: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { sizeCode: 'asc' }],
        },
        options: {
          include: { values: { orderBy: { sortOrder: 'asc' } } },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundError(`Product with slug "${slug}"`);
    }

    const tiers = await pricingService.getCatalogTiers(product.id);

    const baseSizes = (product.baseSizes as any[]) ?? [];
    const defaultSize = baseSizes[0];
    const defaultVariant = product.variants.find((v) => v.isDefault) ?? product.variants[0];

    return {
      ...toSummary(product),
      description: product.description,
      sizeUnit: product.sizeUnit,
      baseSizes,
      minDimensions: product.minDimensions,
      maxDimensions: product.maxDimensions,
      defaultDimensions:
        defaultSize ?? defaultVariant?.dimensions ?? product.minDimensions,
      variants: product.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        sizeCode: v.sizeCode,
        materialCode: v.materialCode,
        color: v.color,
        printMode: v.printMode,
        printSides: v.printSides,
        finish: v.finish,
        dimensions: v.dimensions,
        isDefault: v.isDefault,
      })),
      options: product.options.map((o) => ({
        key: o.key,
        label: o.label,
        control: o.control,
        required: o.required,
        values: o.values.map((v) => ({
          label: v.label,
          value: v.value,
          priceDelta: v.priceDelta !== null ? Number(v.priceDelta) : null,
          priceType: v.priceType,
          appliesTo: v.appliesTo,
          isDefault: v.isDefault,
        })),
      })),
      quantityTiers: tiers,
      category: {
        id: product.subcategory.category.id,
        slug: product.subcategory.category.slug,
        name: product.subcategory.category.name,
      },
      subcategory: {
        id: product.subcategory.id,
        slug: product.subcategory.slug,
        name: product.subcategory.name,
      },
    };
  }

  /**
   * Quote a product by slug (or id) — delegates to the authoritative pricing
   * engine (scoped rules, option upcharges, quantity tiers, margin).
   */
  async quote(request: CatalogQuoteRequest): Promise<CatalogQuoteResult> {
    return pricingService.quoteCatalog(request);
  }

  /**
   * M7: Canonical editor configuration for a product slug.
   * Returns the real product, default variant, resolved material, real
   * pricing, and the full ProductStructure stored in editorDefaults.
   */
  async getEditorConfig(slug: string, quantity: number) {
    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        variants: {
          where: { isActive: true },
          orderBy: [{ isDefault: 'desc' }, { sizeCode: 'asc' }],
          take: 1,
        },
      },
    });

    if (!product || !product.isActive) {
      throw new NotFoundError(`Product with slug "${slug}"`);
    }

    const variant = product.variants[0];
    if (!variant) {
      throw new NotFoundError(`No active variant for product "${slug}"`);
    }

    const materialRecord = variant.materialCode
      ? await prisma.material.findFirst({ where: { code: variant.materialCode } })
      : null;

    const quoteRequired=(product.editorDefaults as any)?.readiness?.pricing==='quote_required';
    const quote = quoteRequired?null:await pricingService.quoteCatalog({
      productId: product.id,
      variantId: variant.id,
      quantity,
      dimensions: variant.dimensions as any,
      complexity: 'simple',
      config: {
        material: variant.materialCode ?? 'cardboard-kraft',
        printColors: String(variant.printMode),
        printSides: String(variant.printSides),
        finish: variant.finish ?? 'none',
      },
    });

    const dims = variant.dimensions as any;
    const materialCode = variant.materialCode ?? 'cardboard-kraft';
    const materialHex = materialRecord?.metadata
      ? ((materialRecord.metadata as any).hex ?? MATERIAL_HEX[materialCode] ?? '#b8936a')
      : MATERIAL_HEX[materialCode] ?? '#b8936a';

    const sizeUnit = (product.sizeUnit as string) ?? 'mm';
    const toMm = (v: number | undefined | null) =>
      typeof v === 'number' ? (sizeUnit === 'cm' ? Math.round(v * 10 * 10) / 10 : v) : 0;

    // Original non-box variants store flat width/height/depth in L/W/H.
    // Adapt their editor axes only. Stored variant dimensions and legacy rates
    // stay untouched, including the quote above on their original dimensions.
    const legacyFlatAxes=['prod-paper-bag','prod-poly-mailer','prod-sticker-label'].includes(product.id);
    const editorDims={length:toMm(dims.length),width:toMm(legacyFlatAxes?dims.height:dims.width),height:toMm(legacyFlatAxes?dims.width:dims.height),unit:'mm'};

    // M7: The ProductStructure lives as a nested `structure` key inside
    // editorDefaults. Fall back to the whole blob for resilience.
    // M8-B: the canonical packaging blueprint (schemaVersion, unit, dieline,
    // prepress) sits at the same editorDefaults top level. Each field is
    // passed through additively — absent on products without a blueprint.
    // M8-J (spec §14): `support` flags coverage. Products explicitly deferred
    // (support === 'deferred') NEVER carry a blueprint — the override below
    // guards against any accidental dieline so no fake geometry is ever
    // shipped for bags/labels/pouches.
    const editorDefaults = (product.editorDefaults as any) ?? undefined;
    const structure = editorDefaults?.structure ?? editorDefaults;
    const isDeferred = editorDefaults?.support === 'deferred';

    return {
      product: {
        id: product.id,
        slug: product.slug,
        name: product.name,
        type: product.productType,
        boxType: product.boxType ?? undefined,
        structure: structure ?? undefined,
        schemaVersion: isDeferred ? undefined : (editorDefaults?.schemaVersion ?? undefined),
        unit: isDeferred ? undefined : (editorDefaults?.unit ?? undefined),
        dieline: isDeferred ? undefined : (editorDefaults?.dieline ?? undefined),
        prepress: isDeferred ? undefined : (editorDefaults?.prepress ?? undefined),
        support: editorDefaults?.support ?? undefined,
        supportReason: isDeferred ? (editorDefaults?.supportReason ?? undefined) : undefined,
        // Unified-catalogue join fields (additive).
        editorType: editorDefaults?.editorType ?? undefined,
        readiness: editorDefaults?.readiness ?? undefined,
        candidateMaterials: editorDefaults?.candidateMaterials ?? [],
      },
      variant: {
        id: variant.id,
        sku: variant.sku,
        sizeCode: variant.sizeCode ?? null,
        materialCode: variant.materialCode ?? null,
        color: variant.color ?? undefined,
        printMode: String(variant.printMode),
        printSides: variant.printSides === 'inside_outside' ? 2 : 1,
        finish: variant.finish ?? 'none',
        dimensions: editorDims,
      },
      material: {
        code: materialCode,
        name: materialRecord?.name ?? materialCode,
        hex: materialHex,
        texture: (materialRecord?.metadata as any)?.texture ?? undefined,
      },
      quantity,
      pricing: {
        unitPrice: quote?Number(quote.unitPrice):null,
        totalPrice: quote?Number(quote.totalPrice):null,
        currency: quote?.material?.currency ?? 'EGP',
        // Quote-only products never receive an unrelated generic estimate.
        status: quoteRequired ? 'quote_required' : 'estimated',
      },
    };
  }
}

export const catalogService = new CatalogService();