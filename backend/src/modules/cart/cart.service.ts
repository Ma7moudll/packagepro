import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { pricingService } from '../../services/pricing-engine/pricing.service';
import { groupShippingByProductType } from '../../services/pricing-engine/calculations';

export interface CartItemInput {
  productType: 'box' | 'bag' | 'label';
  productId?: string;
  variantId?: string;
  sku?: string;
  config?: Record<string, string>;
  quantity: number;
  dimensions: {
    length: number;
    width: number;
    height?: number;
    unit: 'cm' | 'mm' | 'inch';
  };
  materialCode?: string;
  color?: string;
  finish?: string;
  templateId?: string;
  sessionId?: string;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Stable JSON stringification (Postgres jsonb reorders keys) for line dedupe. */
function jsonStable(value: unknown): string {
  if (value === undefined || value === null) return 'null';
  if (typeof value !== 'object' || Array.isArray(value)) return JSON.stringify(value);
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    ordered[key] = (value as Record<string, unknown>)[key];
  }
  return JSON.stringify(ordered);
}

export class CartService {
  /**
   * Get or lazily create the customer's cart
   */
  async getOrCreateCart(customerId: string) {
    let cart = await prisma.cart.findUnique({
      where: { customerId },
      include: { items: true },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { customerId, currency: 'EGP' },
        include: { items: true },
      });
    }

    return cart;
  }

  /**
   * Server-authoritative pricing for a single cart item.
   * item.totalPrice excludes shipping (shipping is aggregated per order),
   * matching OrderService.createOrder aggregation.
   */
  private async enrichItem(item: any, template?: any) {
    const product = item.variantId
      ? await prisma.product.findFirst({
          where: { variants: { some: { id: item.variantId } } },
          select: { id: true, name: true, thumbnail: true },
        })
      : null;

    const isCatalog = Boolean(item.variantId) && Boolean(item.productId);
    const pricing = isCatalog
      ? await pricingService.quoteCatalog({
          productId: item.productId!,
          variantId: item.variantId!,
          quantity: item.quantity,
          dimensions: item.dimensions as any,
          config: (item.config as Record<string, string>) ?? undefined,
        })
      : await pricingService.calculatePrice({
          productType: item.productType,
          quantity: item.quantity,
          dimensions: item.dimensions as any,
          materialCode: item.materialCode || undefined,
        });

    const itemSubtotal = round2(pricing.breakdown.subtotal + pricing.breakdown.tax);

    return {
      id: item.id,
      productType: item.productType,
      productId: item.productId ?? product?.id ?? null,
      variantId: item.variantId ?? null,
      sku: item.sku ?? null,
      config: item.config ?? null,
      designId: item.designId ?? null,
      quantity: item.quantity,
      dimensions: item.dimensions,
      materialCode: item.materialCode,
      color: item.color,
      finish: item.finish,
      templateId: item.templateId,
      sessionId: item.sessionId,
      name: (item.config as Record<string, string> | null)?.designName || product?.name || template?.name || item.productType,
      thumbnail: product?.thumbnail || template?.thumbnail || undefined,
      unitPrice: round2(itemSubtotal / item.quantity),
      totalPrice: itemSubtotal,
      shipping: pricing.breakdown.shippingEstimate,
      tax: pricing.breakdown.tax,
      material: pricing.material,
      breakdown: pricing.breakdown,
    };
  }

  /**
   * Compute server-authoritative cart summary: totals are computed from the
   * pricing engine, never accepted from the client.
   */
  async getCart(customerId: string) {
    const cart = await this.getOrCreateCart(customerId);

    const enrichedItems = await Promise.all(
      cart.items.map(async (item) => {
        const template = item.templateId
          ? await prisma.template.findUnique({ where: { id: item.templateId! } })
          : null;
        return this.enrichItem(item, template);
      })
    );

    return this.toCartResponse(cart.id, cart.currency, enrichedItems);
  }

  /**
   * Add an item to the cart. Identical lines (productType + dimensions +
   * materialCode + templateId + sessionId) are merged by quantity. Re-prices
   * server-side. When a sessionId references an editor Design, the Design is
   * resolved server-side so designId + product identity are persisted for
   * Cart->Order traceability (M7-E).
   */
  async addItem(customerId: string, input: CartItemInput) {
    if (input.quantity < 1) {
      throw new ValidationError('Quantity must be at least 1');
    }

    // Validate product type and pricing by running the engine up-front so we
    // never persist an unpriceable line.
    await pricingService.calculatePrice({
      productType: input.productType,
      quantity: input.quantity,
      dimensions: input.dimensions,
      materialCode: input.materialCode,
    });

    const cart = await this.getOrCreateCart(customerId);

    // M7-E traceability: resolve the editor Design by its unique sessionId and
    // carry its identity into the cart line. Client identity is never trusted
    // for pricing/authorization — this is persistence only.
    let design: {
      id: string;
      designConfig?: unknown;
      productId?: string | null;
      variantId?: string | null;
      sku?: string | null;
    } | null = null;
    if (input.sessionId) {
      design = await prisma.design.findUnique({
        where: { sessionId: input.sessionId },
        select: { id: true, productId: true, variantId: true, sku: true, designConfig: true },
      });
    }
    const designId = design?.id;
    const productId = input.productId ?? design?.productId ?? undefined;
    const variantId = input.variantId ?? design?.variantId ?? undefined;
    const sku = input.sku ?? design?.sku ?? undefined;
    const config = input.config ?? (design?.designConfig as Record<string, string> | undefined) ?? undefined;

    const existing = cart.items.find(
      (item) =>
        item.productType === input.productType &&
        jsonStable(item.dimensions) === jsonStable(input.dimensions) &&
        (item.variantId || undefined) === variantId &&
        (item.sku || undefined) === sku &&
        jsonStable(item.config ?? null) === jsonStable(config ?? null) &&
        (item.materialCode || undefined) === input.materialCode &&
        (item.templateId || undefined) === input.templateId &&
        (item.sessionId || undefined) === input.sessionId
    );

    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          quantity: existing.quantity + input.quantity,
          // Backfill identity if the pre-existing line predates M7-E (no designId).
          ...(designId && !existing.designId
            ? {
                designId,
                productId: existing.productId ?? productId ?? null,
                variantId: existing.variantId ?? variantId ?? null,
                sku: existing.sku ?? sku ?? null,
                config: existing.config ?? (config as any) ?? null,
              }
            : {}),
        },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productType: input.productType,
          productId: productId ?? null,
          variantId: variantId ?? null,
          sku: sku ?? null,
          config: config ? (config as any) : undefined,
          designId: designId ?? null,
          quantity: input.quantity,
          dimensions: input.dimensions as any,
          materialCode: input.materialCode,
          color: input.color,
          finish: input.finish,
          templateId: input.templateId,
          sessionId: input.sessionId,
        },
      });
    }

    return this.getCart(customerId);
  }

  /**
   * Update an item's quantity/options. Quantities ≤ 0 remove the line.
   */
  async updateItem(
    customerId: string,
    itemId: string,
    data: { quantity?: number; dimensions?: any; materialCode?: string; color?: string; finish?: string }
  ) {
    const cart = await this.getOrCreateCart(customerId);
    const existing = cart.items.find((item) => item.id === itemId);

    if (!existing) {
      throw new NotFoundError('Cart item');
    }

    if (data.quantity !== undefined && data.quantity <= 0) {
      await prisma.cartItem.delete({ where: { id: itemId } });
      return this.getCart(customerId);
    }

    if (data.quantity !== undefined) {
      data.quantity = Math.floor(data.quantity);
    }

    const next = {
      quantity: data.quantity ?? existing.quantity,
      dimensions: data.dimensions ?? existing.dimensions,
      materialCode: data.materialCode !== undefined ? data.materialCode : existing.materialCode,
      color: data.color !== undefined ? data.color : existing.color,
      finish: data.finish !== undefined ? data.finish : existing.finish,
    };

    await pricingService.calculatePrice({
      productType: existing.productType as any,
      quantity: next.quantity,
      dimensions: next.dimensions as any,
      materialCode: next.materialCode || undefined,
    });

    await prisma.cartItem.update({ where: { id: itemId }, data: next as any });

    return this.getCart(customerId);
  }

  async removeItem(customerId: string, itemId: string) {
    const cart = await this.getOrCreateCart(customerId);
    const existing = cart.items.find((item) => item.id === itemId);

    if (!existing) {
      throw new NotFoundError('Cart item');
    }

    await prisma.cartItem.delete({ where: { id: itemId } });
    return this.getCart(customerId);
  }

  async clear(customerId: string) {
    const cart = await this.getOrCreateCart(customerId);
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return this.toCartResponse(cart.id, cart.currency, []);
  }

  private toCartResponse(cartId: string, currency: string, items: any[]) {
    const subtotal = round2(items.reduce((sum, item) => sum + item.totalPrice, 0));
    const tax = round2(items.reduce((sum, item) => sum + item.tax, 0));
    const shipping = round2(items.reduce((sum, item) => sum + item.shipping, 0));
    const total = round2(subtotal + tax + shipping);

    // 4c: per productType-group shipping (the multi-vendor PO grouping) so
    // checkout can show shipping per vendor group; sums to `shipping`.
    const shippingByGroup = groupShippingByProductType(
      items.map((item) => ({ productType: item.productType, shipping: item.shipping }))
    );

    return {
      cartId,
      currency,
      items,
      summary: {
        subtotal,
        tax,
        shipping,
        total,
        currency,
        itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
        shippingByGroup,
      },
    };
  }
}

export const cartService = new CartService();