// Step-4 Piece 4c — Unit suite: per-group shipping split (pure).
// The split feeds the checkout summary and the order metadata breakdown;
// its defining property is Σ groups = original shipping total.

import { describe, it, expect } from 'vitest';
import { groupShippingByProductType } from './calculations';

describe('groupShippingByProductType', () => {
  it('A: multi-group split sums back to the order shipping total', () => {
    const lines = [
      { productType: 'box', shipping: 5 },
      { productType: 'bag', shipping: 7.5 },
      { productType: 'box', shipping: 2.25 },
      { productType: 'label', shipping: 5 },
    ];

    const groups = groupShippingByProductType(lines);

    const sum = groups.reduce((acc, g) => acc + g.shipping, 0);
    expect(sum).toBeCloseTo(
      lines.reduce((acc, l) => acc + l.shipping, 0),
      2
    );
    expect(groups.map((g) => g.productType)).toEqual(['box', 'bag', 'label']);
    expect(groups[0].shipping).toBeCloseTo(7.25, 2);
  });

  it('B: a single-type order is one unchanged group', () => {
    const groups = groupShippingByProductType([{ productType: 'box', shipping: 10 }]);

    expect(groups).toEqual([{ productType: 'box', shipping: 10 }]);
  });

  it('C: an empty cart yields an empty split', () => {
    expect(groupShippingByProductType([])).toEqual([]);
  });

  it('D: floating-point drift is rounded to the cent (0.1+0.2 case)', () => {
    const groups = groupShippingByProductType([
      { productType: 'box', shipping: 0.1 },
      { productType: 'box', shipping: 0.2 },
    ]);

    expect(groups[0].shipping).toBe(0.3);
    expect(Number.isInteger(groups[0].shipping * 100)).toBe(true);
  });
});
