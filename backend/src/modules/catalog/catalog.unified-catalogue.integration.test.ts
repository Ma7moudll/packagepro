import { describe, it, expect, beforeAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { catalogService } from './catalog.service';
import {pricingService} from '../../services/pricing-engine/pricing.service';
import {
  CATALOGUE_PRODUCTS,
  CATALOGUE_CATEGORIES,
  CATALOGUE_PRODUCT_COUNT,
} from '../../../../shared/catalog/products';

/**
 * Unified catalogue (storefront + editor share the 55 picker products).
 * Read-only integration test over the seeded catalogue. Guarantees:
 *  - every canonical registry product is seeded exactly once, joined to its
 *    editor picker id, with an explicit three-axis readiness verdict;
 *  - quote_required products carry NO scoped pricing rules and no anchor
 *    price — nothing invented reaches the pricing engine;
 *  - the editor-config endpoint exposes readiness and flags quote_required
 *    pricing honestly (no generic engine estimate is returned);
 *  - classification (categories/subcategories) is complete and ordered.
 */
describe('unified catalogue — 55 products, honest readiness', () => {
  beforeAll(async () => {
    const count = await prisma.product.count();
    if (count === 0) {
      throw new Error('Catalogue empty — run "npm run prisma:seed" first');
    }
  });

  it('seeds every canonical registry product exactly once', async () => {
    const products = await prisma.product.findMany({ select: { id: true, slug: true, editorDefaults: true } });
    expect(products.length).toBe(CATALOGUE_PRODUCT_COUNT);

    const byId = new Map(products.map((p) => [p.id, p]));
    for (const entry of CATALOGUE_PRODUCTS) {
      const row = byId.get(entry.productId);
      expect(row, `missing seeded product ${entry.productId}`).toBeTruthy();
      expect(row!.slug, entry.productId).toBe(entry.slug);
      const ed = (row!.editorDefaults as any) ?? {};
      expect(ed.editorType, entry.productId).toBe(entry.id);
      expect(ed.readiness, entry.productId).toEqual(entry.readiness);
    }
  });

  it('quote_required products have no rates and no anchor price', async () => {
    const quoteRequired = CATALOGUE_PRODUCTS.filter((p) => p.readiness.pricing === 'quote_required');
    expect(quoteRequired.length).toBe(CATALOGUE_PRODUCT_COUNT - 8); // only the original 8 keep rates

    for (const entry of quoteRequired) {
      const product = await prisma.product.findUnique({
        where: { id: entry.productId },
        select: { priceFrom: true },
      });
      expect(product!.priceFrom, entry.productId).toBeNull();

      const rules = await prisma.pricingRule.findMany({
        where: { scope: 'product', scopeId: entry.productId },
      });
      expect(rules, `${entry.productId} must not carry invented rates`).toHaveLength(0);
    }
  });

  it('keeps the original 8 products priced with their rates intact', async () => {
    const estimated = CATALOGUE_PRODUCTS.filter((p) => p.readiness.pricing === 'estimated');
    expect(estimated.length).toBe(8);
    for (const entry of estimated) {
      const product = await prisma.product.findUnique({
        where: { id: entry.productId },
        select: { priceFrom: true },
      });
      expect(product!.priceFrom, entry.productId).not.toBeNull();
      const rules = await prisma.pricingRule.findMany({
        where: { scope: 'product', scopeId: entry.productId, ruleType: 'conversion' },
      });
      expect(rules, `${entry.productId} lost its conversion rule`).toHaveLength(1);
    }
  });

  it('editor-config exposes readiness and flags quote_required pricing', async () => {
    // quote_required: flagged, support deferred, no blueprint
    const deferred = CATALOGUE_PRODUCTS.find((p) => p.readiness.pricing === 'quote_required')!;
    const cfg = await catalogService.getEditorConfig(deferred.slug, deferred.moq);
    expect(cfg.product.editorType).toBe(deferred.id);
    expect(cfg.product.readiness).toEqual(deferred.readiness);
    expect(cfg.product.support).toBe('deferred');
    expect(cfg.product.dieline).toBeUndefined();
    expect((cfg.pricing as any).status).toBe('quote_required');
    expect(cfg.pricing.unitPrice).toBeNull();
    expect(cfg.pricing.totalPrice).toBeNull();

    // estimated: original products keep their pricing status
    const supported = CATALOGUE_PRODUCTS.find((p) => p.readiness.dieline === 'supported')!;
    const cfg2 = await catalogService.getEditorConfig(supported.slug, 100);
    expect(cfg2.product.readiness).toEqual(supported.readiness);
    expect((cfg2.pricing as any).status).toBe('estimated');
  });

  it('all 47 quote-only products have own candidates and cannot be quoted generically',async()=>{
    for(const entry of CATALOGUE_PRODUCTS.filter(p=>p.readiness.pricing==='quote_required')){
      const cfg=await catalogService.getEditorConfig(entry.slug,entry.moq);
      expect(cfg.product.editorType,entry.id).toBe(entry.id);
      expect(cfg.product.id,entry.id).toBe(entry.productId);
      expect(cfg.product.candidateMaterials.length,entry.id).toBeGreaterThan(0);
      expect(cfg.product.candidateMaterials,entry.id).toContain(cfg.material.code);
      expect(cfg.pricing.totalPrice,entry.id).toBeNull();
      await expect(pricingService.quoteCatalog({slug:entry.slug,quantity:entry.moq})).rejects.toThrow(/QUOTE_REQUIRED/);
    }
  });

  it('exposes only the seeded carrier handle candidates and real no-handle default',async()=>{
    const cfg=await catalogService.getEditorConfig('custom-paper-bag',50);expect(cfg.product.defaultHandle).toBe('none');expect(cfg.product.candidateHandles).toEqual(['none','twisted_paper','cotton_ropes','ribbon']);
  });

  it('adapts legacy non-box axes without modifying the stored variants',async()=>{
    for(const slug of ['custom-paper-bag','custom-poly-mailer','custom-label-sticker']){
      const cfg=await catalogService.getEditorConfig(slug,100);
      const row=await prisma.productVariant.findUnique({where:{id:cfg.variant.id}});
      const d=row!.dimensions as any;
      expect(cfg.variant.dimensions).toEqual({length:d.length*10,width:d.height*10,height:d.width*10,unit:'mm'});
    }
  });

  it('exposes the full classification through the catalog list endpoint', async () => {
    const categories = await catalogService.listCategories();
    expect(categories.map((c) => c.slug)).toEqual(
      CATALOGUE_CATEGORIES.slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c) => c.slug),
    );
    const listed = categories.flatMap((c) => c.subcategories.flatMap((s) => s.products));
    expect(listed.length).toBe(CATALOGUE_PRODUCT_COUNT);
    for (const p of listed) {
      expect((p as any).readiness, p.slug).toBeTruthy();
      expect((p as any).editorType, p.slug).toBeTruthy();
    }
  });
});
