// Step-4 Piece 4b — Unit suite: item-grouping for multi-vendor PO splitting
// (pure, database-free). One PO per productType group, first-seen order.

import { describe, it, expect } from 'vitest';
import { groupOrderItemsByProductType } from './po.service';

const item = (productType: string, quantity: number, totalPrice: string, material?: string) => ({
  productType,
  quantity,
  totalPrice,
  material,
});

describe('groupOrderItemsByProductType', () => {
  it('A: one PO group per productType, in first-seen order', () => {
    const groups = groupOrderItemsByProductType([
      item('box', 2, '8.00'),
      item('bag', 3, '9.00'),
      item('box', 1, '4.00'),
      item('label', 10, '3.00'),
    ]);

    expect(groups.map((g) => g.productType)).toEqual(['box', 'bag', 'label']);
  });

  it('B: same-type items merge; quantity and subtotal accumulate', () => {
    const groups = groupOrderItemsByProductType([
      item('box', 2, '8.00', 'kraft'),
      item('box', 1, '4.00', 'corrugated'),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].quantity).toBe(3);
    expect(groups[0].subtotal).toBe(12);
    expect(groups[0].items).toHaveLength(2);
  });

  it('C: a single-type order yields exactly one legacy-shaped group', () => {
    const groups = groupOrderItemsByProductType([item('box', 5, '20.00')]);

    expect(groups).toHaveLength(1);
    expect(groups[0].productType).toBe('box');
    expect(groups[0].quantity).toBe(5);
    expect(groups[0].subtotal).toBe(20);
  });

  it('D: missing/blank line totals count as 0 (no NaN ever enters a PO cost)', () => {
    const groups = groupOrderItemsByProductType([
      item('box', 2, '8.00'),
      item('box', 1, undefined as any),
    ]);

    expect(groups[0].subtotal).toBe(8);
    expect(Number.isNaN(groups[0].subtotal)).toBe(false);
  });
});
