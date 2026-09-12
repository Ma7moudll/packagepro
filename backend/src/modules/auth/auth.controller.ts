import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authService } from './auth.service';
import { auditLogService } from './services/audit-log.service';
import { AuthErrorCode, AuthenticatedRequest } from './types/auth.types';
import { logger } from '../../utils/logger';

/**
 * Request validation schemas
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  role: z.enum(['CUSTOMER', 'VENDOR', 'ADMIN']).optional().default('CUSTOMER'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  captchaToken: z.string().optional(),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Helper to extract IP and user agent
 */
function getClientInfo(request: FastifyRequest) {
  let ip = request.ip || 'unknown';
  
  // Handle case where request.ip might be an array
  if (Array.isArray(ip)) {
    ip = ip[0] || 'unknown';
  }
  
  // Fallback to x-forwarded-for header
  if (ip === 'unknown') {
    const forwarded = request.headers['x-forwarded-for'];
    if (Array.isArray(forwarded)) {
      ip = forwarded[0] || 'unknown';
    } else {
      ip = forwarded || 'unknown';
    }
  }
  
  let userAgent = request.headers['user-agent'] || 'unknown';
  if (Array.isArray(userAgent)) {
    userAgent = userAgent[0] || 'unknown';
  }
  
  return { ip, userAgent };
}

/**
 * Auth Controller - Handles all auth endpoint logic
 */
export class AuthController {
  /**
   * POST /auth/register
   * Register a new user
   */
  async register(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = registerSchema.parse(request.body);
      const { ip, userAgent } = getClientInfo(request);

      const result = await authService.register(body, ip, userAgent);

      return reply.status(201).send({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: AuthErrorCode.PASSWORD_INVALID,
          message: error.errors[0].message,
        });
      }

      if (error instanceof Error) {
        const code = error.message as AuthErrorCode;

        if (code === AuthErrorCode.EMAIL_ALREADY_EXISTS) {
          return reply.status(409).send({
            success: false,
            error: code,
            message: 'Email address is already registered',
          });
        }

        if (code === AuthErrorCode.PASSWORD_WEAK) {
          return reply.status(400).send({
            success: false,
            error: code,
            message: 'Password does not meet requirements',
          });
        }
      }

      logger.error('Register endpoint error', error);
      return reply.status(500).send({
        success: false,
        error: AuthErrorCode.INTERNAL_ERROR,
        message: 'Registration failed',
      });
    }
  }

  /**
   * POST /auth/login
   * Log in a user with email and password
   * Implements exponential backoff + CAPTCHA validation
   */
  async login(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = loginSchema.parse(request.body);
      const { ip, userAgent } = getClientInfo(request);

      const result = await authService.login(body, ip, userAgent);

      return reply.status(200).send({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: AuthErrorCode.PASSWORD_INVALID,
          message: error.errors[0].message,
        });
      }

      if (error instanceof Error) {
        const code = error.message as AuthErrorCode;

        if (code === AuthErrorCode.INVALID_CREDENTIALS) {
          return reply.status(401).send({
            success: false,
            error: code,
            message: 'Invalid email or password',
          });
        }

        if (code === AuthErrorCode.CAPTCHA_REQUIRED) {
          return reply.status(403).send({
            success: false,
            error: code,
            message: 'Too many failed login attempts. CAPTCHA verification required.',
          });
        }

        if (code === AuthErrorCode.RATE_LIMIT_EXCEEDED) {
          return reply.status(429).send({
            success: false,
            error: code,
            message: 'Too many login attempts. Please try again later.',
            retryAfter: 60,
          });
        }
      }

      logger.error('Login endpoint error', error);
      return reply.status(500).send({
        success: false,
        error: AuthErrorCode.INTERNAL_ERROR,
        message: 'Login failed',
      });
    }
  }

  /**
   * POST /auth/verify-email
   * Verify email with token
   */
  async verifyEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = verifyEmailSchema.parse(request.body);

      const result = await authService.verifyEmail(body);

      return reply.status(200).send({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: AuthErrorCode.VERIFICATION_TOKEN_INVALID,
          message: error.errors[0].message,
        });
      }

      if (error instanceof Error) {
        const code = error.message as AuthErrorCode;

        if (code === AuthErrorCode.VERIFICATION_TOKEN_EXPIRED) {
          return reply.status(401).send({
            success: false,
            error: code,
            message: 'Verification token has expired. Please request a new one.',
          });
        }

        if (code === AuthErrorCode.VERIFICATION_TOKEN_INVALID) {
          return reply.status(401).send({
            success: false,
            error: code,
            message: 'Invalid or already-used verification token',
          });
        }
      }

      logger.error('Verify email endpoint error', error);
      return reply.status(500).send({
        success: false,
        error: AuthErrorCode.INTERNAL_ERROR,
        message: 'Email verification failed',
      });
    }
  }

  /**
   * POST /auth/resend-verification
   * Resend verification email
   */
  async resendVerificationEmail(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = resendVerificationSchema.parse(request.body);

      const result = await authService.resendVerificationEmail(body);

      return reply.status(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: AuthErrorCode.PASSWORD_INVALID,
          message: error.errors[0].message,
        });
      }

      if (error instanceof Error) {
        const code = error.message as AuthErrorCode;

        if (code === AuthErrorCode.RATE_LIMIT_EXCEEDED) {
          return reply.status(429).send({
            success: false,
            error: code,
            message: 'Too many resend attempts. Please try again later.',
            retryAfter: 60,
          });
        }
      }

      logger.error('Resend verification endpoint error', error);
      return reply.status(500).send({
        success: false,
        error: AuthErrorCode.INTERNAL_ERROR,
        message: 'Resend verification failed',
      });
    }
  }

  /**
   * POST /auth/forgot-password
   * Initiate password reset
   */
  async forgotPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = forgotPasswordSchema.parse(request.body);

      const result = await authService.forgotPassword(body);

      return reply.status(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: AuthErrorCode.PASSWORD_INVALID,
          message: error.errors[0].message,
        });
      }

      if (error instanceof Error) {
        const code = error.message as AuthErrorCode;

        if (code === AuthErrorCode.RATE_LIMIT_EXCEEDED) {
          return reply.status(429).send({
            success: false,
            error: code,
            message: 'Too many requests. Please try again later.',
            retryAfter: 60,
          });
        }
      }

      logger.error('Forgot password endpoint error', error);
      return reply.status(500).send({
        success: false,
        error: AuthErrorCode.INTERNAL_ERROR,
        message: 'Password reset initiation failed',
      });
    }
  }

  /**
   * POST /auth/reset-password
   * Reset password with token
   */
  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = resetPasswordSchema.parse(request.body);

      const result = await authService.resetPassword(body);

      return reply.status(200).send({
        success: true,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: AuthErrorCode.PASSWORD_INVALID,
          message: error.errors[0].message,
        });
      }

      if (error instanceof Error) {
        const code = error.message as AuthErrorCode;

        if (code === AuthErrorCode.PASSWORD_WEAK) {
          return reply.status(400).send({
            success: false,
            error: code,
            message: 'Password does not meet requirements',
          });
        }

        if (code === AuthErrorCode.PASSWORD_RESET_TOKEN_INVALID) {
          return reply.status(401).send({
            success: false,
            error: code,
            message: 'Invalid or already-used password reset token',
          });
        }

        if (code === AuthErrorCode.PASSWORD_RESET_TOKEN_EXPIRED) {
          return reply.status(401).send({
            success: false,
            error: code,
            message: 'Password reset token has expired. Please request a new one.',
          });
        }
      }

      logger.error('Reset password endpoint error', error);
      return reply.status(500).send({
        success: false,
        error: AuthErrorCode.INTERNAL_ERROR,
        message: 'Password reset failed',
      });
    }
  }

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    try {
      const body = refreshTokenSchema.parse(request.body);
      const { ip } = getClientInfo(request);

      const result = await authService.refreshAccessToken(body.refreshToken, ip);

      return reply.status(200).send({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: AuthErrorCode.TOKEN_INVALID,
          message: error.errors[0].message,
        });
      }

      if (error instanceof Error) {
        const code = error.message as AuthErrorCode;

        if (code === AuthErrorCode.REFRESH_TOKEN_EXPIRED) {
          return reply.status(401).send({
            success: false,
            error: code,
            message: 'Refresh token has expired. Please login again.',
          });
        }

        if (code === AuthErrorCode.TOKEN_REVOKED) {
          return reply.status(401).send({
            success: false,
            error: code,
            message: 'Refresh token has been revoked. Please login again.',
          });
        }

        if (
          code === AuthErrorCode.REFRESH_TOKEN_INVALID ||
          code === AuthErrorCode.TOKEN_INVALID
        ) {
          return reply.status(401).send({
            success: false,
            error: code,
            message: 'Invalid refresh token',
          });
        }
      }

      logger.error('Refresh token endpoint error', error);
      return reply.status(500).send({
        success: false,
        error: AuthErrorCode.INTERNAL_ERROR,
        message: 'Token refresh failed',
      });
    }
  }

  /**
   * POST /auth/logout
   * Log out user by revoking refresh token
   */
  async logout(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authRequest = request as AuthenticatedRequest;
      const { ip, userAgent } = getClientInfo(request);

      if (!authRequest.user) {
        return reply.status(401).send({
          success: false,
          error: AuthErrorCode.TOKEN_INVALID,
          message: 'Not authenticated',
        });
      }

      // Parse refresh token from body
      const body = refreshTokenSchema.parse(request.body);

      const result = await authService.logout(
        authRequest.user.userId,
        body.refreshToken,
        ip,
        userAgent
      );

      return reply.status(200).send({
        success: true,
        data: result,
        message: result.message,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: AuthErrorCode.TOKEN_INVALID,
          message: error.errors[0].message,
        });
      }

      if (error instanceof Error) {
        const code = error.message as AuthErrorCode;

        if (code === AuthErrorCode.TOKEN_INVALID) {
          return reply.status(401).send({
            success: false,
            error: code,
            message: 'Invalid refresh token',
          });
        }
      }

      logger.error('Logout endpoint error', error);
      return reply.status(500).send({
        success: false,
        error: AuthErrorCode.INTERNAL_ERROR,
        message: 'Logout failed',
      });
    }
  }

  /**
   * GET /auth/me
   * Get current user profile
   */
  async getCurrentUser(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authRequest = request as AuthenticatedRequest;

      if (!authRequest.user) {
        return reply.status(401).send({
          success: false,
          error: AuthErrorCode.TOKEN_INVALID,
          message: 'Not authenticated',
        });
      }

      return reply.status(200).send({
        success: true,
        data: authRequest.user,
      });
    } catch (error) {
      logger.error('Get current user endpoint error', error);
      return reply.status(500).send({
        success: false,
        error: AuthErrorCode.INTERNAL_ERROR,
        message: 'Failed to get user profile',
      });
    }
  }

  /**
   * GET /auth/audit-logs
   * Get current user's audit logs
   */
  async getAuditLogs(request: FastifyRequest, reply: FastifyReply) {
    try {
      const authRequest = request as AuthenticatedRequest;

      if (!authRequest.user) {
        return reply.status(401).send({
          success: false,
          error: AuthErrorCode.TOKEN_INVALID,
          message: 'Not authenticated',
        });
      }

      const limit = Math.min(
        parseInt((request.query as Record<string, string>).limit || '50'),
        100
      );
      const offset = parseInt((request.query as Record<string, string>).offset || '0');

      const logs = await auditLogService.getUserAuditLogs(
        authRequest.user.userId,
        limit,
        offset
      );

      return reply.status(200).send({
        success: true,
        data: logs,
      });
    } catch (error) {
      logger.error('Get audit logs endpoint error', error);
      return reply.status(500).send({
        success: false,
        error: AuthErrorCode.INTERNAL_ERROR,
        message: 'Failed to retrieve audit logs',
      });
    }
  }
}

export const authController = new AuthController();
