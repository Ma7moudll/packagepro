import { OrderStatus } from '../../types';
import { ConflictError } from '../../utils/errors';

/**
 * SEC-04A — Order status transition matrix.
 *
 * Generic forward-status transition matrix. Explicit approval reopening is a
 * separate admin-only operation with an order lock, capability invalidation
 * and an any-PO guard; do not add a generic reverse PATCH transition. The
 * matrix is derived from the lifecycle the code actually implements:
 *
 *   pending_review    — order created; Stripe capture moves it on
 *   awaiting_approval — design proof sent; customer approves (or it times out)
 *   ready_for_routing — approved; admin creates purchase orders (SEC-04A)
 *   vendor_confirmed  — vendor accepted the handshake / confirmed the PO
 *   in_production     — production started
 *   quality_check     — production finished, QA in progress
 *   ready_to_ship     — QA passed
 *   shipped           — shipment created (DHL label)
 *   delivered         — DHL Track API confirmed delivery (SEC-03a)
 *   completed         — terminal (post-delivery close-out)
 *   cancelled         — terminal (from any non-terminal state)
 *
 * Rules enforced by `assertAllowedOrderStatusTransition`:
 * - a transition must be listed for the current status — no skipping ahead
 *   (e.g. pending_review -> shipped, ready_for_routing -> delivered, or
 *   anything -> completed except delivered -> completed are all rejected);
 * - `delivered`, `completed` and `cancelled` are terminal: nothing leaves
 *   them. This is the same terminal set as TERMINAL_ORDER_STATUSES in
 *   modules/settlements/settlement.service.ts (SEC-03a) — keep both in sync;
 * - `cancelled` is reachable from every non-terminal state (admin cancel).
 *
 * The matrix is enforced in OrderService.updateOrderStatus (admin HTTP path)
 * AND in OrderService.updateOrderStatusInternal (trusted backend callers).
 * Internal flows that move orders directly (Stripe capture, DHL webhook,
 * handshake accept, production, QA, shipment creation) use their own
 * guarded updates and their transitions are all within this matrix.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_review: ['awaiting_approval', 'cancelled'],
  awaiting_approval: ['ready_for_routing', 'cancelled'],
  ready_for_routing: ['vendor_confirmed', 'cancelled'],
  vendor_confirmed: ['in_production', 'cancelled'],
  in_production: ['quality_check', 'cancelled'],
  quality_check: ['ready_to_ship', 'cancelled'],
  ready_to_ship: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
};

/** Terminal statuses: no transition out is allowed (see matrix above). */
export const TERMINAL_ORDER_STATUSES: OrderStatus[] = [
  'delivered',
  'completed',
  'cancelled',
];

export function isAllowedOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  return (ORDER_STATUS_TRANSITIONS[from] ?? []).includes(to);
}

/** Throws a 409 ConflictError when the transition is not in the matrix. */
export function assertAllowedOrderStatusTransition(
  from: OrderStatus,
  to: OrderStatus
): void {
  if (from === to) {
    throw new ConflictError(
      `Order is already in status '${to}': no-op status change is not allowed`
    );
  }
  if (!isAllowedOrderStatusTransition(from, to)) {
    throw new ConflictError(
      `Order status transition from '${from}' to '${to}' is not allowed`
    );
  }
}
