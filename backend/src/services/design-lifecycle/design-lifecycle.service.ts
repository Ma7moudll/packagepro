/**
 * Design Lifecycle Service
 * Manages design state transitions and validation
 * Enforces state machine rules: Draft → Submitted → In Review → Approved/Rejected → In Production
 */

// DesignLifecycleStatus enum is defined locally

export type DesignLifecycleState = 'DRAFT' | 'SUBMITTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'IN_PRODUCTION';

interface StateTransition {
  from: DesignLifecycleState;
  to: DesignLifecycleState;
  allowedRoles: string[]; // 'CUSTOMER', 'DESIGNER', 'ADMIN'
}

/**
 * Allowed state transitions in the design lifecycle
 */
const ALLOWED_TRANSITIONS: StateTransition[] = [
  // Owner submissions
  { from: 'DRAFT', to: 'SUBMITTED', allowedRoles: ['CUSTOMER'] },
  { from: 'SUBMITTED', to: 'DRAFT', allowedRoles: ['CUSTOMER'] }, // Recall
  
  // Reviewer transitions
  { from: 'SUBMITTED', to: 'IN_REVIEW', allowedRoles: ['DESIGNER', 'ADMIN'] },
  { from: 'IN_REVIEW', to: 'APPROVED', allowedRoles: ['DESIGNER', 'ADMIN'] },
  { from: 'IN_REVIEW', to: 'REJECTED', allowedRoles: ['DESIGNER', 'ADMIN'] },
  
  // Production transition
  { from: 'APPROVED', to: 'IN_PRODUCTION', allowedRoles: ['ADMIN'] },
];

export class DesignLifecycleService {
  /**
   * Validate if a state transition is allowed
   */
  static canTransition(
    currentState: DesignLifecycleState,
    targetState: DesignLifecycleState,
    userRole: string
  ): { allowed: boolean; reason?: string } {
    if (currentState === targetState) {
      return { allowed: false, reason: 'Design is already in this state' };
    }

    const transition = ALLOWED_TRANSITIONS.find(
      (t) => t.from === currentState && t.to === targetState
    );

    if (!transition) {
      return {
        allowed: false,
        reason: `Cannot transition from ${currentState} to ${targetState}`,
      };
    }

    if (!transition.allowedRoles.includes(userRole)) {
      return {
        allowed: false,
        reason: `Role ${userRole} cannot perform this transition`,
      };
    }

    return { allowed: true };
  }

  /**
   * Get all allowed next states for current state and role
   */
  static getAllowedTransitions(
    currentState: DesignLifecycleState,
    userRole: string
  ): DesignLifecycleState[] {
    return ALLOWED_TRANSITIONS
      .filter(
        (t) =>
          t.from === currentState && t.allowedRoles.includes(userRole)
      )
      .map((t) => t.to);
  }

  /**
   * Check if a design in a given lifecycle state can be edited
   */
  static isEditableState(state: DesignLifecycleState): boolean {
    // Only DRAFT designs can be edited
    return state === 'DRAFT';
  }

  /**
   * Check if a design can be submitted for review
   */
  static canSubmit(state: DesignLifecycleState): boolean {
    return state === 'DRAFT';
  }

  /**
   * Check if a design submission can be recalled
   */
  static canRecall(state: DesignLifecycleState): boolean {
    return state === 'SUBMITTED';
  }

  /**
   * Check if a design can be reviewed
   */
  static canBeReviewed(state: DesignLifecycleState): boolean {
    return state === 'SUBMITTED';
  }

  /**
   * Check if a design can be exported
   */
  static canExport(state: DesignLifecycleState): boolean {
    // Can export DRAFT (working) or APPROVED (production ready)
    return state === 'DRAFT' || state === 'APPROVED';
  }
}
