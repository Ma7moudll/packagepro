/**
 * Order State Machine
 * Defines valid state transitions for orders
 */

export type OrderStatus =
  | "CREATED"
  | "AWAITING_PROOF_APPROVAL"
  | "READY_FOR_ROUTING"
  | "AWAITING_SUPPLIER_CONFIRMATION"
  | "IN_PRODUCTION"
  | "READY_FOR_PICKUP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED"
  | "SETTLED"

export interface StateTransition {
  from: OrderStatus
  to: OrderStatus
  allowedRoles: string[]
  requiresAction?: string
}

/**
 * Valid state transitions
 */
export const VALID_TRANSITIONS: StateTransition[] = [
  // Initial flow
  {
    from: "CREATED",
    to: "AWAITING_PROOF_APPROVAL",
    allowedRoles: ["ADMIN", "CUSTOMER", "OPERATOR"],
  },
  {
    from: "AWAITING_PROOF_APPROVAL",
    to: "READY_FOR_ROUTING",
    allowedRoles: ["ADMIN", "CUSTOMER", "OPERATOR"],
    requiresAction: "APPROVE_PROOF",
  },
  {
    from: "AWAITING_PROOF_APPROVAL",
    to: "CREATED",
    allowedRoles: ["ADMIN", "CUSTOMER", "OPERATOR"],
    requiresAction: "REJECT_PROOF",
  },
  
  // Routing flow
  {
    from: "READY_FOR_ROUTING",
    to: "AWAITING_SUPPLIER_CONFIRMATION",
    allowedRoles: ["ADMIN", "OPERATOR"],
  },
  
  // Supplier flow
  {
    from: "AWAITING_SUPPLIER_CONFIRMATION",
    to: "IN_PRODUCTION",
    allowedRoles: ["ADMIN", "SUPPLIER", "OPERATOR"],
    requiresAction: "ACCEPT_ORDER",
  },
  {
    from: "AWAITING_SUPPLIER_CONFIRMATION",
    to: "READY_FOR_ROUTING",
    allowedRoles: ["ADMIN", "SUPPLIER", "OPERATOR"],
    requiresAction: "REJECT_ORDER",
  },
  
  // Production flow
  {
    from: "IN_PRODUCTION",
    to: "READY_FOR_PICKUP",
    allowedRoles: ["ADMIN", "SUPPLIER", "OPERATOR"],
    requiresAction: "MARK_READY",
  },
  
  // Shipping flow
  {
    from: "READY_FOR_PICKUP",
    to: "IN_TRANSIT",
    allowedRoles: ["ADMIN", "OPERATOR"],
    requiresAction: "SHIP_ORDER",
  },
  {
    from: "IN_TRANSIT",
    to: "DELIVERED",
    allowedRoles: ["ADMIN", "OPERATOR"],
    requiresAction: "MARK_DELIVERED",
  },
  
  // Completion flow
  {
    from: "DELIVERED",
    to: "SETTLED",
    allowedRoles: ["ADMIN", "ACCOUNTANT"],
    requiresAction: "SETTLE_PAYMENT",
  },
  
  // Cancellation flow
  {
    from: "CREATED",
    to: "CANCELLED",
    allowedRoles: ["ADMIN", "CUSTOMER", "OPERATOR"],
    requiresAction: "CANCEL_ORDER",
  },
  {
    from: "AWAITING_PROOF_APPROVAL",
    to: "CANCELLED",
    allowedRoles: ["ADMIN", "CUSTOMER", "OPERATOR"],
    requiresAction: "CANCEL_ORDER",
  },
  
  // Refund flow
  {
    from: "CANCELLED",
    to: "REFUNDED",
    allowedRoles: ["ADMIN", "ACCOUNTANT"],
    requiresAction: "PROCESS_REFUND",
  },
  {
    from: "DELIVERED",
    to: "REFUNDED",
    allowedRoles: ["ADMIN", "ACCOUNTANT"],
    requiresAction: "PROCESS_REFUND",
  },
]

/**
 * Check if a state transition is valid
 */
export function isValidTransition(
  from: OrderStatus,
  to: OrderStatus,
  userRole: string,
): { valid: boolean; reason?: string } {
  // Same state is always invalid
  if (from === to) {
    return { valid: false, reason: "Cannot transition to the same state" }
  }

  // Find matching transition
  const transition = VALID_TRANSITIONS.find((t) => t.from === from && t.to === to)

  if (!transition) {
    return { valid: false, reason: `Invalid transition from ${from} to ${to}` }
  }

  // Check role permission
  if (!transition.allowedRoles.includes(userRole)) {
    return {
      valid: false,
      reason: `Role ${userRole} is not allowed to transition from ${from} to ${to}`,
    }
  }

  return { valid: true }
}

/**
 * Get all valid next states from current state
 */
export function getValidNextStates(
  currentState: OrderStatus,
  userRole: string,
): OrderStatus[] {
  return VALID_TRANSITIONS
    .filter((t) => t.from === currentState && t.allowedRoles.includes(userRole))
    .map((t) => t.to)
}

/**
 * Get transition requirements
 */
export function getTransitionRequirements(
  from: OrderStatus,
  to: OrderStatus,
): { requiresAction?: string } | null {
  const transition = VALID_TRANSITIONS.find((t) => t.from === from && t.to === to)
  return transition ? { requiresAction: transition.requiresAction } : null
}

