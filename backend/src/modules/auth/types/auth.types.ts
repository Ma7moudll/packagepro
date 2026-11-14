import { FastifyRequest } from 'fastify';
import { UserRole, AuditAction } from '@prisma/client';

export type { AuditAction };

/**
 * JWT Payload with JTI (JWT ID) for blacklist-based revocation
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  jti: string; // JWT ID for blacklist-based revocation
  type: 'access' | 'refresh';
  exp?: number; // Expiration time (Unix timestamp in seconds)
  iat?: number; // Issued at (Unix timestamp in seconds)
  iss?: string; // Issuer
  aud?: string; // Audience
  sub?: string; // Subject
}

/**
 * Token pair returned on login/refresh
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
  tokenType: 'Bearer';
}

/**
 * Extended Fastify request with authenticated user
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload;
}

/**
 * Register request
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  // SEC-01: public registration creates CUSTOMER (default) or VENDOR only.
  // ADMIN accounts are provisioned exclusively through scripts/bootstrap-admin.ts.
  role?: 'CUSTOMER' | 'VENDOR';
}

/**
 * Login request
 */
export interface LoginRequest {
  email: string;
  password: string;
  captchaToken?: string; // reCAPTCHA v3 token
}

/**
 * Verify email request
 */
export interface VerifyEmailRequest {
  token: string;
}

/**
 * Resend verification email request
 */
export interface ResendVerificationRequest {
  email: string;
}

/**
 * Forgot password request
 */
export interface ForgotPasswordRequest {
  email: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  token: string;
  newPassword: string;
}

/**
 * Auth error codes - Standardized error responses
 */
export enum AuthErrorCode {
  // Authentication
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  TOKEN_INVALID = 'TOKEN_INVALID',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_REVOKED = 'TOKEN_REVOKED',
  REFRESH_TOKEN_INVALID = 'REFRESH_TOKEN_INVALID',
  REFRESH_TOKEN_EXPIRED = 'REFRESH_TOKEN_EXPIRED',

  // Registration
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  PASSWORD_WEAK = 'PASSWORD_WEAK',
  PASSWORD_INVALID = 'PASSWORD_INVALID',

  // Rate limiting & CAPTCHA
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',

  // Email verification
  VERIFICATION_TOKEN_INVALID = 'VERIFICATION_TOKEN_INVALID',
  VERIFICATION_TOKEN_EXPIRED = 'VERIFICATION_TOKEN_EXPIRED',
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',

  // Password reset
  PASSWORD_RESET_TOKEN_INVALID = 'PASSWORD_RESET_TOKEN_INVALID',
  PASSWORD_RESET_TOKEN_EXPIRED = 'PASSWORD_RESET_TOKEN_EXPIRED',

  // Internal
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Permission action types for authorization checks
 */
export enum PermissionAction {
  // User management
  CREATE_USER = 'CREATE_USER',
  READ_USER = 'READ_USER',
  UPDATE_USER = 'UPDATE_USER',
  DELETE_USER = 'DELETE_USER',

  // Order management
  CREATE_ORDER = 'CREATE_ORDER',
  READ_ORDER = 'READ_ORDER',
  UPDATE_ORDER = 'UPDATE_ORDER',
  DELETE_ORDER = 'DELETE_ORDER',
  LIST_ORDERS = 'LIST_ORDERS',

  // Vendor management
  CREATE_VENDOR = 'CREATE_VENDOR',
  READ_VENDOR = 'READ_VENDOR',
  UPDATE_VENDOR = 'UPDATE_VENDOR',
  DELETE_VENDOR = 'DELETE_VENDOR',
  LIST_VENDORS = 'LIST_VENDORS',

  // Admin operations
  READ_AUDIT_LOG = 'READ_AUDIT_LOG',
  MANAGE_PERMISSIONS = 'MANAGE_PERMISSIONS',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  granted: boolean;
  allowed?: boolean; // Alias for granted
  reason?: string;
}

/**
 * Audit log entry returned to client
 */
export interface AuditLogEntry {
  id: string;
  userId: string;
  action: AuditAction;
  resource: string; // e.g., 'user:123', 'order:456'
  details: Record<string, unknown> | any; // Allow Prisma JsonValue
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  errorMessage?: string | null;
  createdAt: Date;
}
