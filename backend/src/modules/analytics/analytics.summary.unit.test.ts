// Step-4 Piece 5 — Unit suite: ADMIN dashboard summary composition (pure,
// database-free). Lettered cases follow the repo's unit-test style
// (dieline-delivery.unit.test.ts).
//
// The frontend composes the summary in lib/api/analytics.ts
// getDashboardSummary(); the backend now composes the identical math in
// buildDashboardSummary() so GET /analytics/summary and the SSE stream
// (event: summary) serve the same object the console expects. Parity is the
// whole point — these tests pin both sides to one contract.

import { describe, it, expect } from 'vitest';
import { buildDashboardSummary } from './analytics.service';

const statsFixture = {
  completedDeals: { value: 21 },
  registeredFactories: { value: 9 },
  transactionVolume: { value: 1250000 },
  activeTraders: { value: 34 },
  categories: { food: 12, ecommerce: 11 },
};

const funnelFixture = {
  visitors: 210,
  ordersCreated: 57,
  ordersPaid: 40,
  ordersApproved: 30,
  ordersDelivered: 21,
  conversionRate: 0.1,
};

describe('buildDashboardSummary (ADMIN dashboard summary)', () => {
  it('A: parity — mirrors the frontend composition field for field', () => {
    const summary = buildDashboardSummary(statsFixture, funnelFixture);

    expect(summary).toEqual({
      revenue: 1250000, // transactionVolume.value
      revenueChange: 0,
      orders: 57, // funnel.ordersCreated
      ordersChange: 0,
      users: 34, // activeTraders.value
      products: 2, // distinct category keys
      productsChange: 0,
    });
  });

  it('B: missing aggregates -> zeros (no NaN, no throw)', () => {
    const summary = buildDashboardSummary(null, undefined);

    expect(summary).toEqual({
      revenue: 0,
      revenueChange: 0,
      orders: 0,
      ordersChange: 0,
      users: 0,
      products: 0,
      productsChange: 0,
    });
    expect(Number.isNaN(summary.revenue)).toBe(false);
    expect(Number.isNaN(summary.products)).toBe(false);
  });

  it('C: partially missing stats fields fall back to 0', () => {
    const summary = buildDashboardSummary({ categories: null }, { ordersCreated: 3 });

    expect(summary.revenue).toBe(0);
    expect(summary.users).toBe(0);
    expect(summary.products).toBe(0);
    expect(summary.orders).toBe(3);
  });

  it('D: products counts distinct categories, never summed values', () => {
    const summary = buildDashboardSummary(
      { categories: { a: 100, b: 50, c: 7 } },
      funnelFixture
    );

    expect(summary.products).toBe(3);
  });

  it('E: shape contract — exactly the 7 DashboardSummary keys', () => {
    const summary = buildDashboardSummary(statsFixture, funnelFixture);

    expect(Object.keys(summary).sort()).toEqual([
      'orders',
      'ordersChange',
      'products',
      'productsChange',
      'revenue',
      'revenueChange',
      'users',
    ]);
  });
});
