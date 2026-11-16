// SEC-04A — pure unit tests for the order status transition matrix.
// No database, no mocks of application code; '@prisma/client' is stubbed
// only because src/types re-exports it and the generated client is not
// available in this environment (see sec04a-order-status.test.ts header).
import { describe, it, expect, vi } from 'vitest';

vi.mock('@prisma/client', () => ({
  OrderStatus: {
    pending_review: 'pending_review',
    awaiting_approval: 'awaiting_approval',
    ready_for_routing: 'ready_for_routing',
    vendor_confirmed: 'vendor_confirmed',
    in_production: 'in_production',
    quality_check: 'quality_check',
    ready_to_ship: 'ready_to_ship',
    shipped: 'shipped',
    delivered: 'delivered',
    completed: 'completed',
    cancelled: 'cancelled',
  },
  UserRole: { ADMIN: 'ADMIN', CUSTOMER: 'CUSTOMER', VENDOR: 'VENDOR' },
  PrismaClient: class {},
  Prisma: { Decimal: class {} },
}));

import {
  ORDER_STATUS_TRANSITIONS,
  TERMINAL_ORDER_STATUSES,
  isAllowedOrderStatusTransition,
  assertAllowedOrderStatusTransition,
} from './order-status-transitions';

describe('SEC-04A order status transition matrix', () => {
  it('allows the full happy-path lifecycle, one step at a time', () => {
    const path = [
      'pending_review',
      'awaiting_approval',
      'ready_for_routing',
      'vendor_confirmed',
      'in_production',
      'quality_check',
      'ready_to_ship',
      'shipped',
      'delivered',
      'completed',
    ] as const;
    for (let i = 0; i < path.length - 1; i++) {
      expect(isAllowedOrderStatusTransition(path[i], path[i + 1])).toBe(true);
    }
  });

  it('allows cancel from every non-terminal state', () => {
    const nonTerminal = Object.keys(ORDER_STATUS_TRANSITIONS).filter(
      (s) => !TERMINAL_ORDER_STATUSES.includes(s as any)
    );
    expect(nonTerminal).toHaveLength(8);
    for (const from of nonTerminal) {
      expect(isAllowedOrderStatusTransition(from as any, 'cancelled')).toBe(true);
    }
  });

  it('rejects skipping ahead (the original vulnerability)', () => {
    expect(isAllowedOrderStatusTransition('pending_review', 'shipped')).toBe(false);
    expect(isAllowedOrderStatusTransition('pending_review', 'delivered')).toBe(false);
    expect(isAllowedOrderStatusTransition('pending_review', 'completed')).toBe(false);
    expect(isAllowedOrderStatusTransition('ready_for_routing', 'delivered')).toBe(false);
    expect(isAllowedOrderStatusTransition('awaiting_approval', 'completed')).toBe(false);
    expect(isAllowedOrderStatusTransition('shipped', 'completed')).toBe(false);
  });

  it('rejects moving backwards', () => {
    expect(isAllowedOrderStatusTransition('delivered', 'shipped')).toBe(false);
    expect(isAllowedOrderStatusTransition('in_production', 'vendor_confirmed')).toBe(false);
    expect(isAllowedOrderStatusTransition('ready_to_ship', 'quality_check')).toBe(false);
  });

  it('completed and cancelled have no outgoing transitions; delivered has only completed', () => {
    expect(ORDER_STATUS_TRANSITIONS['completed']).toEqual([]);
    expect(ORDER_STATUS_TRANSITIONS['cancelled']).toEqual([]);
    // 'delivered' is terminal for the SEC-03a overwrite guards (a delivered
    // order is never moved back), but it has one legitimate close-out:
    // delivered -> completed.
    expect(ORDER_STATUS_TRANSITIONS['delivered']).toEqual(['completed']);
    expect(isAllowedOrderStatusTransition('delivered', 'completed')).toBe(true);
    expect(isAllowedOrderStatusTransition('completed', 'delivered')).toBe(false);
    expect(isAllowedOrderStatusTransition('cancelled', 'pending_review')).toBe(false);
  });

  it('assertAllowedOrderStatusTransition throws 409 on illegal transitions and no-ops', () => {
    expect(() =>
      assertAllowedOrderStatusTransition('pending_review', 'delivered')
    ).toThrowError(expect.objectContaining({ statusCode: 409 }));
    expect(() =>
      assertAllowedOrderStatusTransition('delivered', 'delivered')
    ).toThrowError(expect.objectContaining({ statusCode: 409 }));
    expect(() =>
      assertAllowedOrderStatusTransition('pending_review', 'awaiting_approval')
    ).not.toThrow();
  });
});
