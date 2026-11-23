import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/prisma', () => ({ prisma: { pricingRule: { findMany: vi.fn() } } }));
import { prisma } from '../../lib/prisma';
import { pricingService } from './pricing.service';

const query = vi.mocked(prisma.pricingRule.findMany);
const row = (extra: Record<string, unknown> = {}) => ({
  id: 'global-margin', productType: 'box', scope: 'productType', scopeId: null,
  ruleType: 'margin', value: 0.35, minQuantity: null, maxQuantity: null,
  isActive: true, validFrom: new Date('2020-01-01'), validUntil: null,
  createdAt: new Date('2020-01-01'), ...extra,
});

/** Mimic Prisma's scoped query, newest first, without any database writes. */
function useRows(rows: ReturnType<typeof row>[]) {
  query.mockImplementation(async ({ where }: any) => rows.filter((r: any) =>
    ['productType', 'scope', 'scopeId', 'ruleType', 'isActive'].every(k => where[k] === undefined || r[k] === where[k]) &&
    r.validFrom <= where.validFrom.lte && (!r.validUntil || r.validUntil >= where.OR[1].validUntil.gte)
  ).sort((a, b) => +b.createdAt - +a.createdAt) as any);
}

beforeEach(() => { query.mockReset(); });
describe('generic margin lookup isolation', () => {
  it('ignores newer unrelated product/variant and non-margin rules', async () => {
    useRows([
      row({ id: 'pizza-conversion', scope: 'product', scopeId: 'pizza', ruleType: 'conversion', value: 4, createdAt: new Date('2025-06-01') }),
      row({ id: 'other-product-margin', scope: 'product', scopeId: 'other', value: 0.9, createdAt: new Date('2025-05-01') }),
      row({ id: 'variant-margin', scope: 'variant', scopeId: 'variant', value: 0.8, createdAt: new Date('2025-04-01') }),
      row({ id: 'global-conversion', ruleType: 'conversion', value: 8, createdAt: new Date('2025-03-01') }),
      row({ id: 'invalid-global-scope-id', scopeId: 'other', value: 0.7, createdAt: new Date('2025-02-01') }),
      row(),
    ]);
    expect(await pricingService.getPricingRule('box', 30)).toBe(0.35);
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      productType: 'box', scope: 'productType', scopeId: null, ruleType: 'margin', isActive: true,
    }), orderBy: { createdAt: 'desc' } }));
  });
  it('preserves newest eligible quantity/date selection and inclusive bounds', async () => {
    useRows([
      row({ id: 'expired', value: 0.99, validUntil: new Date('2020-02-01'), createdAt: new Date('2025-12-01') }),
      row({ id: 'future', value: 0.98, validFrom: new Date('2100-01-01'), createdAt: new Date('2025-11-01') }),
      row({ id: 'inactive', value: 0.97, isActive: false, createdAt: new Date('2025-10-01') }),
      row({ id: 'bag', productType: 'bag', value: 0.96, createdAt: new Date('2025-09-01') }),
      row({ id: '100-plus', value: 0.4, minQuantity: 100, maxQuantity: 300, createdAt: new Date('2025-01-01') }),
      row(),
    ]);
    expect(await pricingService.getPricingRule('box', 30)).toBe(0.35);
    expect(await pricingService.getPricingRule('box', 100)).toBe(0.4);
    expect(await pricingService.getPricingRule('box', 300)).toBe(0.4);
    expect(await pricingService.getPricingRule('box', 301)).toBe(0.35);
    expect(await pricingService.getPricingRule('box')).toBe(0.4);
  });
  it('preserves the existing 30% fallback when no eligible margin exists', async () => {
    useRows([row({ minQuantity: 100 })]);
    expect(await pricingService.getPricingRule('box', 30)).toBe(0.3);
    useRows([]);
    expect(await pricingService.getPricingRule('box', 30)).toBe(0.3);
  });
});
