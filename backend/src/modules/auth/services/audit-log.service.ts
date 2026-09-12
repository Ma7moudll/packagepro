import { prisma } from '../../../lib/prisma';
import { logger } from '../../../utils/logger';
import { AuditLogEntry } from '../types/auth.types';
import { AuditAction } from '@prisma/client';

/**
 * Audit Log Service - Tracks all sensitive auth operations
 * Used for compliance, security analysis, and debugging
 */
export class AuditLogService {
  /**
   * Log an audit event
   * @param userId User ID
   * @param action Audit action type
   * @param resource Resource being acted upon (e.g., "user:123")
   * @param details Additional context/metadata
   * @param ipAddress Client IP address
   * @param userAgent Client user agent
   * @param success Whether action succeeded
   * @param errorMessage Error message if failed
   * @returns Created audit log ID
   */
  async log(
    userId: string,
    action: AuditAction,
    resource: string,
    details?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<string> {
    try {
      const auditLog = await prisma.auditLog.create({
        data: {
          userId,
          action,
          resource,
          details: (details || {}) as any, // Cast to any for Prisma JSON field
          ipAddress: ipAddress || 'unknown',
          userAgent: userAgent || 'unknown',
          success,
          errorMessage,
        },
      });

      logger.info(`Audit log created: ${action} on ${resource}`, {
        auditLogId: auditLog.id,
        userId,
        action,
        success,
      });

      return auditLog.id;
    } catch (error) {
      logger.error('Failed to create audit log', error);
      // Don't throw - audit logging should not break the main flow
      return '';
    }
  }

  /**
   * Log a user login
   * @param userId User ID
   * @param email User email
   * @param ipAddress Client IP
   * @param userAgent Client user agent
   * @param success Whether login succeeded
   * @param errorMessage Error if failed
   */
  async logLogin(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<string> {
    return this.log(
      userId,
      AuditAction.LOGIN,
      `user:${userId}`,
      { email },
      ipAddress,
      userAgent,
      success,
      errorMessage
    );
  }

  /**
   * Log a user logout
   * @param userId User ID
   * @param ipAddress Client IP
   * @param userAgent Client user agent
   */
  /**
   * Log user registration
   * @param userId User ID
   * @param email User email
   * @param ipAddress Client IP
   * @param userAgent Client user agent
   */
  async logRegister(
    userId: string,
    email: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string> {
    return this.log(
      userId,
      AuditAction.REGISTER,
      `user:${userId}`,
      { email },
      ipAddress,
      userAgent
    );
  }

  /**
   * Log email verification
   * @param userId User ID
   * @param email User email
   */
  async logEmailVerified(userId: string, email: string): Promise<string> {
    return this.log(
      userId,
      AuditAction.EMAIL_VERIFIED,
      `user:${userId}`,
      { email }
    );
  }

  /**
   * Log password reset completion
   * @param userId User ID
   * @param email User email
   */
  async logPasswordReset(userId: string, email: string): Promise<string> {
    return this.log(
      userId,
      AuditAction.PASSWORD_RESET,
      `user:${userId}`,
      { email }
    );
  }

  /**
   * Log password change
   * @param userId User ID
   */
  async logPasswordChanged(userId: string): Promise<string> {
    return this.log(
      userId,
      AuditAction.PASSWORD_CHANGED,
      `user:${userId}`,
      {}
    );
  }

  /**
   * Log token revocation (logout)
   * @param userId User ID
   * @param jti JWT ID being revoked
   */
  async logTokenRevoked(userId: string, jti: string): Promise<string> {
    return this.log(
      userId,
      AuditAction.TOKEN_REVOKED,
      `user:${userId}`,
      { revokedJti: jti }
    );
  }

  /**
   * Get audit logs for a user
   * @param userId User ID
   * @param limit Number of logs to return
   * @param offset Pagination offset
   * @returns Audit logs
   */
  async getUserAuditLogs(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to retrieve audit logs', error);
      return [];
    }
  }

  /**
   * Get all audit logs for an action
   * @param action Audit action to filter by
   * @param limit Number of logs to return
   * @param offset Pagination offset
   * @returns Audit logs
   */
  async getAuditLogsByAction(
    action: AuditAction,
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: { action },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return logs;
    } catch (error) {
      logger.error('Failed to retrieve audit logs by action', error);
      return [];
    }
  }

  /**
   * Get failed login attempts in a time period
   * @param startDate Start date
   * @param endDate End date
   * @returns Failed login audit logs
   */
  async getFailedLoginAttempts(
    startDate: Date,
    endDate: Date
  ): Promise<AuditLogEntry[]> {
    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          action: AuditAction.LOGIN,
          success: false,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return logs;
    } catch (error) {
      logger.error('Failed to retrieve failed login attempts', error);
      return [];
    }
  }

  /**
   * Delete old audit logs (for retention policy)
   * @param daysToKeep Number of days to retain
   * @returns Number of deleted logs
   */
  async deleteOldLogs(daysToKeep: number = 180): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      logger.info(`Deleted ${result.count} old audit logs`);
      return result.count;
    } catch (error) {
      logger.error('Failed to delete old audit logs', error);
      return 0;
    }
  }

  /**
   * Log a successful login
   */
  async logLoginSuccess(
    userId: string,
    email: string,
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.log(
      userId,
      AuditAction.LOGIN,
      `user:${userId}`,
      { email, ...details },
      undefined,
      undefined,
      true
    );
  }

  /**
   * Log a failed login
   */
  async logLoginFailed(
    userId: string,
    email: string,
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.log(
      userId,
      AuditAction.LOGIN,
      `user:${userId}`,
      { email, ...details },
      undefined,
      undefined,
      false,
      'Login failed'
    );
  }

  /**
   * Log a logout with optional details
   */
  async logLogout(
    userId: string,
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.log(
      userId,
      AuditAction.LOGOUT,
      `user:${userId}`,
      details || {}
    );
  }

  /**
   * Log token refresh with optional details
   */
  async logTokenRefresh(
    userId: string,
    details?: Record<string, unknown>
  ): Promise<string> {
    return this.log(
      userId,
      AuditAction.TOKEN_REFRESH,
      `user:${userId}`,
      details || {}
    );
  }

  /**
   * Log a failed login attempt (use for tracking attempts without logged-in user)
   * This is used when user doesn't exist yet
   */
  async logLoginFailedAttempt(
    email: string,
    details?: Record<string, unknown>
  ): Promise<string> {
    // Use a system user ID for unknown login attempts
    return this.log(
      'unknown',
      AuditAction.LOGIN,
      `email:${email}`,
      { email, ...details },
      undefined,
      undefined,
      false,
      'Login attempt failed'
    );
  }
}

// Export singleton instance
export const auditLogService = new AuditLogService();
