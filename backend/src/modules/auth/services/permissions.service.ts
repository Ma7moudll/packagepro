import { UserRole } from '@prisma/client';
import { logger } from '../../../utils/logger';
import { PermissionAction, PermissionCheckResult } from '../types/auth.types';

/**
 * Permissions Service - Centralized RBAC (Role-Based Access Control)
 * Phase 1: Inline checks based on roles
 * Phase 1.5: Can be extended to database-driven Permission model
 * 
 * Architecture: Single source of truth for authorization logic
 * Avoids permission duplication across endpoints
 */
export class PermissionsService {
  /**
   * Define role -> action mappings
   * Phase 1: Hard-coded roles (CUSTOMER, VENDOR, ADMIN)
   * Phase 2: Can extend to DESIGNER, ENTERPRISE, SUPERADMIN
   */
  private rolePermissions: Record<UserRole, Set<PermissionAction>> = {
    CUSTOMER: new Set([
      // User management (own profile only)
      PermissionAction.READ_USER,
      PermissionAction.UPDATE_USER,

      // Order management (own orders only)
      PermissionAction.CREATE_ORDER,
      PermissionAction.READ_ORDER,
      PermissionAction.UPDATE_ORDER,
      PermissionAction.LIST_ORDERS,
    ]),

    VENDOR: new Set([
      // User management (own profile only)
      PermissionAction.READ_USER,
      PermissionAction.UPDATE_USER,

      // Vendor profile
      PermissionAction.READ_VENDOR,
      PermissionAction.UPDATE_VENDOR,

      // Order management (assigned orders only)
      PermissionAction.READ_ORDER,
      PermissionAction.UPDATE_ORDER,
      PermissionAction.LIST_ORDERS,
    ]),

    ADMIN: new Set([
      // User management (all)
      PermissionAction.CREATE_USER,
      PermissionAction.READ_USER,
      PermissionAction.UPDATE_USER,
      PermissionAction.DELETE_USER,

      // Order management (all)
      PermissionAction.CREATE_ORDER,
      PermissionAction.READ_ORDER,
      PermissionAction.UPDATE_ORDER,
      PermissionAction.DELETE_ORDER,
      PermissionAction.LIST_ORDERS,

      // Vendor management (all)
      PermissionAction.CREATE_VENDOR,
      PermissionAction.READ_VENDOR,
      PermissionAction.UPDATE_VENDOR,
      PermissionAction.DELETE_VENDOR,
      PermissionAction.LIST_VENDORS,

      // Admin operations
      PermissionAction.READ_AUDIT_LOG,
      PermissionAction.MANAGE_PERMISSIONS,
      PermissionAction.SYSTEM_CONFIG,
    ]),
  };

  /**
   * Check if a user has permission for an action
   * @param userRole User's role
   * @param action Action to check
   * @param resourceOwnerId Owner of the resource (optional, for ownership checks)
   * @param requestingUserId ID of user making request (optional, for ownership checks)
   * @returns Permission check result
   */
  checkPermission(
    userRole: UserRole,
    action: PermissionAction,
    resourceOwnerId?: string,
    requestingUserId?: string
  ): PermissionCheckResult {
    try {
      const permissions = this.rolePermissions[userRole];

      if (!permissions) {
        logger.warn(`Unknown role: ${userRole}`);
        return {
          granted: false,
          reason: 'Unknown role',
        };
      }

      const hasAction = permissions.has(action);

      if (!hasAction) {
        return {
          granted: false,
          reason: `Role ${userRole} does not have permission for ${action}`,
        };
      }

      // For non-admin roles, check resource ownership
      if (userRole !== 'ADMIN' && resourceOwnerId && requestingUserId) {
        const isOwner = resourceOwnerId === requestingUserId;

        if (!isOwner) {
          return {
            granted: false,
            reason: `User is not the owner of ${action} resource`,
          };
        }
      }

      return {
        granted: true,
      };
    } catch (error) {
      logger.error('Permission check failed', error);
      return {
        granted: false,
        reason: 'Permission check error',
      };
    }
  }

  /**
   * Check multiple permissions (AND logic)
   * All must be granted for result to be true
   * @param userRole User's role
   * @param actions Actions to check
   * @param resourceOwnerId Resource owner ID
   * @param requestingUserId Requesting user ID
   * @returns Permission check result
   */
  checkAllPermissions(
    userRole: UserRole,
    actions: PermissionAction[],
    resourceOwnerId?: string,
    requestingUserId?: string
  ): PermissionCheckResult {
    for (const action of actions) {
      const result = this.checkPermission(
        userRole,
        action,
        resourceOwnerId,
        requestingUserId
      );

      if (!result.granted) {
        return result;
      }
    }

    return { granted: true };
  }

  /**
   * Check multiple permissions (OR logic)
   * At least one must be granted for result to be true
   * @param userRole User's role
   * @param actions Actions to check
   * @param resourceOwnerId Resource owner ID
   * @param requestingUserId Requesting user ID
   * @returns Permission check result
   */
  checkAnyPermission(
    userRole: UserRole,
    actions: PermissionAction[],
    resourceOwnerId?: string,
    requestingUserId?: string
  ): PermissionCheckResult {
    if (actions.length === 0) {
      return {
        granted: false,
        reason: 'No actions to check',
      };
    }

    for (const action of actions) {
      const result = this.checkPermission(
        userRole,
        action,
        resourceOwnerId,
        requestingUserId
      );

      if (result.granted) {
        return result;
      }
    }

    return {
      granted: false,
      reason: `Role ${userRole} does not have any of the required permissions`,
    };
  }

  /**
   * Get all permissions for a role
   * @param userRole User's role
   * @returns Array of allowed actions
   */
  getRolePermissions(userRole: UserRole): PermissionAction[] {
    const permissions = this.rolePermissions[userRole];
    return permissions ? Array.from(permissions) : [];
  }

  /**
   * Check if user is admin
   * @param userRole User's role
   * @returns boolean
   */
  isAdmin(userRole: UserRole): boolean {
    return userRole === 'ADMIN';
  }

  /**
   * Check if user can manage other users
   * @param userRole User's role
   * @returns boolean
   */
  canManageUsers(userRole: UserRole): boolean {
    return this.checkPermission(userRole, PermissionAction.CREATE_USER).granted ||
           this.checkPermission(userRole, PermissionAction.DELETE_USER).granted;
  }

  /**
   * Check if user can manage vendors
   * @param userRole User's role
   * @returns boolean
   */
  canManageVendors(userRole: UserRole): boolean {
    return this.checkPermission(userRole, PermissionAction.CREATE_VENDOR).granted ||
           this.checkPermission(userRole, PermissionAction.DELETE_VENDOR).granted;
  }

  /**
   * Check if user can view audit logs
   * @param userRole User's role
   * @returns boolean
   */
  canViewAuditLogs(userRole: UserRole): boolean {
    return this.checkPermission(userRole, PermissionAction.READ_AUDIT_LOG).granted;
  }

  /**
   * Add permission to role (future use for dynamic permissions)
   * @param userRole Role to add permission to
   * @param action Action to allow
   */
  addPermission(userRole: UserRole, action: PermissionAction): void {
    const permissions = this.rolePermissions[userRole];
    if (permissions) {
      permissions.add(action);
      logger.info(`Added permission ${action} to role ${userRole}`);
    }
  }

  /**
   * Remove permission from role (future use for dynamic permissions)
   * @param userRole Role to remove permission from
   * @param action Action to disallow
   */
  removePermission(userRole: UserRole, action: PermissionAction): void {
    const permissions = this.rolePermissions[userRole];
    if (permissions) {
      permissions.delete(action);
      logger.info(`Removed permission ${action} from role ${userRole}`);
    }
  }
}

// Export singleton instance
export const permissionsService = new PermissionsService();
