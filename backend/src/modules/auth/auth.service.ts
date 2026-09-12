import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';
import { jwtService } from './services/jwt.service';
import { authRedisService } from './services/redis.service';
import { authEmailService } from './services/email.service';
import { auditLogService } from './services/audit-log.service';
import { validatePassword } from './utils/password.validator';
import {
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  PasswordResetRequest,
  ForgotPasswordRequest,
  TokenPair,
  AuthErrorCode,
  JWTPayload,
} from './types/auth.types';
import { AuditAction } from '@prisma/client';

const BCRYPT_COST = parseInt(process.env.BCRYPT_COST || '12', 10);
const EMAIL_VERIFICATION_EXPIRES_IN = process.env.EMAIL_VERIFICATION_TOKEN_EXPIRES_IN || '24h';
const PASSWORD_RESET_EXPIRES_IN = process.env.PASSWORD_RESET_TOKEN_EXPIRES_IN || '1h';

/**
 * Convert time strings like "24h" to milliseconds
 */
function parseExpiry(expiryStr: string): number {
  const match = expiryStr.match(/^(\d+)([smhd])$/);
  if (!match) return 86400000; // Default 24h

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case 's':
      return num * 1000;
    case 'm':
      return num * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    default:
      return 86400000;
  }
}

/**
 * Auth Service - Core authentication business logic
 * Uses Phase 2 services (JWT, Redis, Email, Audit, Permissions)
 */
export class AuthService {
  /**
   * Calculate exponential backoff delay in milliseconds
   * Pattern: attempt 1: 0ms, attempt 2: 1s, attempt 3: 2s, attempt 4: 4s, attempt 5: 8s, max 16s
   */
  private calculateBackoffDelay(attemptCount: number): number {
    if (attemptCount <= 1) return 0;
    
    // Exponential: 2^(attemptCount - 2)
    const exponential = Math.pow(2, Math.min(attemptCount - 2, 4)); // Cap at 2^4 = 16
    return exponential * 1000; // Convert to milliseconds
  }

  /**
   * Login a user with email and password
   * Flow: Check rate limit → Verify credentials → Generate tokens → Log audit
   */
  async login(
    data: LoginRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ user: any; tokens: TokenPair; message: string }> {
    const ip = ipAddress || 'unknown';
    
    try {
      // Check failed login attempts
      const attempts = await authRedisService.getFailedLoginAttempts(data.email, ip);
      const maxFailedAttempts = parseInt(process.env.MAX_FAILED_LOGIN_ATTEMPTS || '3', 10);
      const loginRateLimitWindowMs = parseInt(process.env.LOGIN_RATE_LIMIT_WINDOW_MS || '3600000', 10);
      
      // Calculate backoff delay
      const delayMs = this.calculateBackoffDelay(attempts);
      
      // Check if CAPTCHA is required
      const captchaRequired = await authRedisService.isCaptchaRequired(data.email, ip);
      
      // If CAPTCHA is required, validate it
      if (captchaRequired && !data.captchaToken) {
        throw new Error(AuthErrorCode.CAPTCHA_REQUIRED);
      }
      
      // TODO: Implement CAPTCHA validation in Phase 4 (T030-T032)
      // For now, accept any captcha token if provided
      if (captchaRequired && data.captchaToken) {
        logger.info(`Login attempt with CAPTCHA token for ${data.email}`);
        // CAPTCHA validation would go here
      }
      
      // Apply backoff delay if needed
      if (delayMs > 0) {
        logger.warn(`Login backoff: ${delayMs}ms for ${data.email}:${ip} (attempt ${attempts})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });
      
      if (!user) {
        // Record failed attempt
        await authRedisService.recordFailedLoginAttempt(data.email, ip, loginRateLimitWindowMs);
        
        // Check if we should require CAPTCHA now
        const newAttempts = await authRedisService.getFailedLoginAttempts(data.email, ip);
        if (newAttempts >= maxFailedAttempts) {
          const captchaDurationMs = parseInt(process.env.CAPTCHA_DURATION_MS || '86400000', 10);
          await authRedisService.requireCaptcha(data.email, ip, captchaDurationMs);
        }
        
        // Log failed attempt
        await auditLogService.logLoginFailedAttempt(data.email, {
          ip,
          userAgent: userAgent || 'unknown',
          reason: 'USER_NOT_FOUND',
        });
        
        throw new Error(AuthErrorCode.INVALID_CREDENTIALS);
      }
      
      // Compare password
      const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
      
      if (!passwordMatch) {
        // Record failed attempt
        await authRedisService.recordFailedLoginAttempt(data.email, ip, loginRateLimitWindowMs);
        
        // Check if we should require CAPTCHA now
        const newAttempts = await authRedisService.getFailedLoginAttempts(data.email, ip);
        if (newAttempts >= maxFailedAttempts) {
          const captchaDurationMs = parseInt(process.env.CAPTCHA_DURATION_MS || '86400000', 10);
          await authRedisService.requireCaptcha(data.email, ip, captchaDurationMs);
        }
        
        // Log failed attempt
        await auditLogService.logLoginFailed(user.id, data.email, {
          ip,
          userAgent: userAgent || 'unknown',
          reason: 'INVALID_PASSWORD',
          attemptCount: newAttempts,
        });
        
        throw new Error(AuthErrorCode.INVALID_CREDENTIALS);
      }
      
      // Success! Clear failed attempts and CAPTCHA requirement
      await Promise.all([
        authRedisService.clearFailedLoginAttempts(data.email, ip),
        authRedisService.clearCaptchaRequirement(data.email, ip),
      ]);
      
      // Generate tokens
      const accessToken = jwtService.generateAccessToken(user.id, user.email, user.role);
      const refreshToken = jwtService.generateRefreshToken(user.id, user.email, user.role);
      
      // Update last login timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      
      // Log successful login
      await auditLogService.logLoginSuccess(user.id, user.email, {
        ip,
        userAgent: userAgent || 'unknown',
      });
      
       // Extract expiry times
       const accessTokenPayload = jwtService.decodeToken(accessToken);
       
       const accessTokenExpiresIn = accessTokenPayload?.exp
        ? (accessTokenPayload.exp * 1000) - Date.now()
        : 15 * 60 * 1000; // 15 minutes default
      
      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: Math.floor(accessTokenExpiresIn / 1000), // in seconds
          tokenType: 'Bearer',
        },
        message: 'Login successful',
      };
    } catch (error) {
      logger.error('Login failed', error);
      throw error;
    }
  }

  /**
   * Register a new user
   * Flow: Create user → Hash password → Generate verification token → Send email
   */
  async register(
    data: RegisterRequest,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ userId: string; email: string; message: string }> {
    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error(AuthErrorCode.PASSWORD_INVALID);
      }

      // Validate password strength
      const passwordValidation = validatePassword(data.password);
      if (!passwordValidation.valid) {
        throw new Error(AuthErrorCode.PASSWORD_WEAK);
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new Error(AuthErrorCode.EMAIL_ALREADY_EXISTS);
      }

      // Hash password with bcrypt
      const passwordHash = await bcrypt.hash(data.password, BCRYPT_COST);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email,
          passwordHash,
          firstName: data.name,
          role: data.role || 'CUSTOMER',
          emailVerified: false,
        },
      });

      // Create customer record if CUSTOMER role
      if (user.role === 'CUSTOMER') {
        await prisma.customer.create({
          data: { userId: user.id },
        });
      }

      // Create vendor record if VENDOR role
      if (user.role === 'VENDOR') {
        await prisma.vendor.create({
          data: {
            userId: user.id,
            companyName: (data as any).companyName || user.firstName || user.lastName || 'Unnamed Vendor',
            address: (data as any).address || '',
            city: (data as any).city || '',
            country: (data as any).country || '',
            postalCode: (data as any).postalCode,
            phone: (data as any).phone,
            email: data.email,
          },
        });
      }

      // Generate email verification token
      const verificationToken = uuidv4();
      const verificationExpiry = new Date(Date.now() + parseExpiry(EMAIL_VERIFICATION_EXPIRES_IN));

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: verificationExpiry,
        },
      });

      // Send verification email
      try {
        await authEmailService.sendEmailVerificationToken(data.email, verificationToken);
      } catch (error) {
        logger.error('Failed to send verification email during registration', error);
        // Don't fail registration if email fails - user can resend
      }

      // Audit log
      await auditLogService.logRegister(user.id, data.email, ipAddress, userAgent);

      return {
        userId: user.id,
        email: user.email,
        message: 'Registration successful. Please check your email to verify your account.',
      };
    } catch (error) {
      
      logger.error('Registration failed', error);

      // Audit log failure
      if (data.email) {
        const errorMsg = error instanceof Error ? error.message : 'Registration failed';
        await auditLogService.log(
          'unknown',
          AuditAction.REGISTER,
          `email:${data.email}`,
          { email: data.email },
          ipAddress,
          userAgent,
          false,
          errorMsg
        );
      }

      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(
    data: VerifyEmailRequest
  ): Promise<{ email: string; message: string }> {
    try {
      // Find verification token
      const verToken = await prisma.emailVerificationToken.findUnique({
        where: { token: data.token },
      });

      if (!verToken) {
        throw new Error(AuthErrorCode.VERIFICATION_TOKEN_INVALID);
      }

      // Check if expired
      if (verToken.expiresAt < new Date()) {
        throw new Error(AuthErrorCode.VERIFICATION_TOKEN_EXPIRED);
      }

      // Check if already used
      if (verToken.usedAt) {
        throw new Error(AuthErrorCode.VERIFICATION_TOKEN_INVALID);
      }

      // Mark token as used and update user
      await Promise.all([
        prisma.emailVerificationToken.update({
          where: { id: verToken.id },
          data: { usedAt: new Date() },
        }),
        prisma.user.update({
          where: { id: verToken.userId },
          data: { emailVerified: true },
        }),
      ]);

      // Audit log
      const user = await prisma.user.findUnique({ where: { id: verToken.userId } });
      if (user) {
        await auditLogService.logEmailVerified(user.id, user.email);
      }

      return {
        email: user?.email || 'unknown',
        message: 'Email verified successfully. You can now log in.',
      };
    } catch (error) {
      
      logger.error('Email verification failed', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   * Rate-limited: max 5 attempts per hour
   */
  async resendVerificationEmail(
    data: ResendVerificationRequest
  ): Promise<{ message: string }> {
    try {
      // Rate limit check
      const attempts = await authRedisService.getEmailVerificationAttempts(data.email);
      const maxAttempts = parseInt(process.env.VERIFICATION_ATTEMPT_RATE_LIMIT_MAX || '5', 10);

      if (attempts >= maxAttempts) {
        throw new Error(AuthErrorCode.RATE_LIMIT_EXCEEDED);
      }

      // Record attempt
      await authRedisService.recordEmailVerificationAttempt(
        data.email,
        parseInt(process.env.VERIFICATION_ATTEMPT_RATE_LIMIT_WINDOW_MS || '3600000', 10)
      );

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        // Don't reveal if user exists
        return { message: 'If this email is registered, you will receive a verification email.' };
      }

      // Check if already verified
      if (user.emailVerified) {
        return { message: 'Email is already verified. You can log in.' };
      }

      // Delete old tokens
      await prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      });

      // Create new token
      const verificationToken = uuidv4();
      const verificationExpiry = new Date(Date.now() + parseExpiry(EMAIL_VERIFICATION_EXPIRES_IN));

      await prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: verificationToken,
          expiresAt: verificationExpiry,
        },
      });

      // Send email
      try {
        await authEmailService.sendEmailVerificationResend(data.email, verificationToken);
      } catch (error) {
        logger.error('Failed to send verification email', error);
      }

      return { message: 'Verification email sent. Please check your inbox.' };
    } catch (error) {
      
      logger.error('Resend verification failed', error);
      throw error;
    }
  }

  /**
   * Forgot password - initiate password reset
   */
  async forgotPassword(
    data: ForgotPasswordRequest
  ): Promise<{ message: string }> {
    try {
      // Rate limit check
      const attempts = await authRedisService.getPasswordResetAttempts(data.email);
      const maxAttempts = parseInt(process.env.PASSWORD_RESET_ATTEMPT_RATE_LIMIT_MAX || '5', 10);

      if (attempts >= maxAttempts) {
        throw new Error(AuthErrorCode.RATE_LIMIT_EXCEEDED);
      }

      // Record attempt
      await authRedisService.recordPasswordResetAttempt(
        data.email,
        parseInt(process.env.PASSWORD_RESET_ATTEMPT_RATE_LIMIT_WINDOW_MS || '3600000', 10)
      );

      // Find user (don't reveal if exists)
      const user = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (!user) {
        return { message: 'If this email is registered, you will receive a password reset link.' };
      }

      // Delete old tokens
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Create reset token
      const resetToken = uuidv4();
      const resetExpiry = new Date(Date.now() + parseExpiry(PASSWORD_RESET_EXPIRES_IN));

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expiresAt: resetExpiry,
        },
      });

      // Send reset email
      try {
        await authEmailService.sendPasswordResetToken(data.email, resetToken);
      } catch (error) {
        logger.error('Failed to send password reset email', error);
      }

      return { message: 'Password reset link sent. Please check your email.' };
    } catch (error) {
      
      logger.error('Forgot password failed', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(
    data: PasswordResetRequest
  ): Promise<{ message: string }> {
    try {
      // Validate new password
      const passwordValidation = validatePassword(data.newPassword);
      if (!passwordValidation.valid) {
        throw new Error(AuthErrorCode.PASSWORD_WEAK);
      }

      // Find reset token
      const resetToken = await prisma.passwordResetToken.findUnique({
        where: { token: data.token },
      });

      if (!resetToken) {
        throw new Error(AuthErrorCode.PASSWORD_RESET_TOKEN_INVALID);
      }

      // Check if expired
      if (resetToken.expiresAt < new Date()) {
        throw new Error(AuthErrorCode.PASSWORD_RESET_TOKEN_EXPIRED);
      }

      // Check if already used
      if (resetToken.usedAt) {
        throw new Error(AuthErrorCode.PASSWORD_RESET_TOKEN_INVALID);
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(data.newPassword, BCRYPT_COST);

      // Update user and mark token as used
      const user = await prisma.user.findUnique({
        where: { id: resetToken.userId },
      });

      if (!user) {
        throw new Error(AuthErrorCode.USER_NOT_FOUND);
      }

      await Promise.all([
        prisma.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash },
        }),
        prisma.passwordResetToken.update({
          where: { id: resetToken.id },
          data: { usedAt: new Date() },
        }),
      ]);

      // Invalidate all existing refresh tokens (logout all devices)
      // TODO: Implement when we build session management

      // Audit log
      await auditLogService.logPasswordReset(user.id, user.email);

      return { message: 'Password reset successful. Please log in with your new password.' };
    } catch (error) {
      
      logger.error('Password reset failed', error);
      throw error;
    }
  }

  /**
   * Logout - Revoke refresh token by adding JTI to blacklist
   */
  async logout(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ message: string }> {
    try {
      // Verify and decode refresh token to get JTI
      let payload: JWTPayload;
      
      try {
        payload = jwtService.verifyRefreshToken(refreshToken);
      } catch (error) {
        // Token might be expired or invalid, but we still want to log the logout attempt
        logger.warn(`Logout attempted with invalid refresh token for user ${userId}`);
        await auditLogService.logLogout(userId, { ip: ipAddress || 'unknown', userAgent: userAgent || 'unknown' });
        throw new Error(AuthErrorCode.TOKEN_INVALID);
      }
      
      // Verify the token belongs to the user who requested logout
      if (payload.userId !== userId) {
        logger.error(`Logout token mismatch: token for ${payload.userId}, requested by ${userId}`);
        throw new Error(AuthErrorCode.TOKEN_INVALID);
      }
      
      // Blacklist the refresh token using its JTI
      const jti = payload.jti || '';
      if (jti) {
        // Token expires in 7 days, but we'll blacklist for that duration
        const refreshTokenExpiresInSeconds = 7 * 24 * 60 * 60; // 7 days
        await authRedisService.blacklistRefreshToken(jti, refreshTokenExpiresInSeconds);
      }
      
      // Log logout
      await auditLogService.logLogout(userId, {
        ip: ipAddress || 'unknown',
        userAgent: userAgent || 'unknown',
        jti,
      });
      
      return { message: 'Logout successful' };
    } catch (error) {
      
      logger.error('Logout failed', error);
      throw error;
    }
  }

  /**
   * Refresh access token - Generate new access token from refresh token
   * Checks Redis blacklist to ensure refresh token is not revoked
   */
  async refreshAccessToken(
    refreshToken: string,
    ipAddress?: string
  ): Promise<{ tokens: TokenPair; message: string }> {
    try {
      // Verify refresh token
      const payload = jwtService.verifyRefreshToken(refreshToken);
      
      // Check if refresh token is blacklisted
      const jti = payload.jti || '';
      if (jti) {
        const isBlacklisted = await authRedisService.isRefreshTokenBlacklisted(jti);
        if (isBlacklisted) {
          throw new Error(AuthErrorCode.TOKEN_REVOKED);
        }
      }
      
      // Get user to verify still exists and get current role
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });
      
      if (!user) {
        throw new Error(AuthErrorCode.USER_NOT_FOUND);
      }
      
      // Generate new access token
      const accessToken = jwtService.generateAccessToken(user.id, user.email, user.role);
      
      // Can optionally generate new refresh token (rotate)
      // For now, keep the same refresh token (only if not in blacklist)
      
      const accessTokenPayload = jwtService.decodeToken(accessToken);
      const accessTokenExpiresIn = accessTokenPayload?.exp
        ? (accessTokenPayload.exp * 1000) - Date.now()
        : 15 * 60 * 1000; // 15 minutes default
      
      // Log token refresh (for audit trail)
      await auditLogService.logTokenRefresh(user.id, { ip: ipAddress || 'unknown' });
      
      return {
        tokens: {
          accessToken,
          refreshToken, // Return same refresh token
          expiresIn: Math.floor(accessTokenExpiresIn / 1000), // in seconds
          tokenType: 'Bearer',
        },
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      
      logger.error('Token refresh failed', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
