import { FastifyRequest, FastifyReply } from 'fastify';
import { jwtService } from '../services/jwt.service';
import { authRedisService } from '../services/redis.service';
import { logger } from '../../../utils/logger';
import { AuthenticatedRequest, AuthErrorCode } from '../types/auth.types';

/**
 * JWT Authentication Middleware
 * Verifies access tokens and checks refresh token blacklist
 * 
 * Flow:
 * 1. Extract token from Authorization header
 * 2. Verify token signature (stateless - no DB query)
 * 3. For refresh tokens: check Redis blacklist
 * 4. Attach user to request
 */

export const verifyAccessToken = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        success: false,
        error: AuthErrorCode.TOKEN_INVALID,
        message: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = jwtService.verifyAccessToken(token);

      // Verify token type
      if (payload.type !== 'access') {
        return reply.code(401).send({
          success: false,
          error: AuthErrorCode.TOKEN_INVALID,
          message: 'Invalid token type',
        });
      }

      // Attach user to request
      (request as AuthenticatedRequest).user = payload;
      logger.debug(`Access token verified for user ${payload.userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message === 'ACCESS_TOKEN_EXPIRED') {
        return reply.code(401).send({
          success: false,
          error: AuthErrorCode.TOKEN_EXPIRED,
          message: 'Access token has expired',
        });
      } else if (message === 'ACCESS_TOKEN_INVALID') {
        return reply.code(401).send({
          success: false,
          error: AuthErrorCode.TOKEN_INVALID,
          message: 'Access token is invalid',
        });
      } else {
        return reply.code(401).send({
          success: false,
          error: AuthErrorCode.TOKEN_INVALID,
          message: 'Token verification failed',
        });
      }
    }
  } catch (error) {
    logger.error('Unexpected error in access token verification', error);
    return reply.code(500).send({
      success: false,
      error: AuthErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    });
  }
};

/**
 * Verify refresh token middleware
 * Checks both token validity and Redis blacklist
 */
export const verifyRefreshToken = async (
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({
        success: false,
        error: AuthErrorCode.TOKEN_INVALID,
        message: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    try {
      const payload = jwtService.verifyRefreshToken(token);

      // Verify token type
      if (payload.type !== 'refresh') {
        return reply.code(401).send({
          success: false,
          error: AuthErrorCode.TOKEN_INVALID,
          message: 'Invalid token type',
        });
      }

      // Check if token is blacklisted (logged out)
      const isBlacklisted = await authRedisService.isRefreshTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        return reply.code(401).send({
          success: false,
          error: AuthErrorCode.TOKEN_REVOKED,
          message: 'Refresh token has been revoked (user logged out)',
        });
      }

      // Attach user to request
      (request as AuthenticatedRequest).user = payload;
      logger.debug(`Refresh token verified for user ${payload.userId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';

      if (message === 'REFRESH_TOKEN_EXPIRED') {
        return reply.code(401).send({
          success: false,
          error: AuthErrorCode.REFRESH_TOKEN_EXPIRED,
          message: 'Refresh token has expired',
        });
      } else if (message === 'REFRESH_TOKEN_INVALID') {
        return reply.code(401).send({
          success: false,
          error: AuthErrorCode.REFRESH_TOKEN_INVALID,
          message: 'Refresh token is invalid',
        });
      } else {
        return reply.code(401).send({
          success: false,
          error: AuthErrorCode.TOKEN_INVALID,
          message: 'Token verification failed',
        });
      }
    }
  } catch (error) {
    logger.error('Unexpected error in refresh token verification', error);
    return reply.code(500).send({
      success: false,
      error: AuthErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    });
  }
};

/**
 * Optional authentication middleware
 * Attaches user to request if token present, but doesn't fail if missing
 */
export const optionalAuth = async (
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> => {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // User is not authenticated, but that's OK
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = jwtService.verifyAccessToken(token);

      if (payload.type === 'access') {
        (request as AuthenticatedRequest).user = payload;
      }
    } catch {
      // Token verification failed, but continue anyway (optional auth)
      logger.debug('Optional auth token verification failed');
    }
  } catch (error) {
    logger.error('Unexpected error in optional auth', error);
    // Continue anyway
  }
};

/**
 * Permission check middleware factory
 * Returns middleware that checks if user has required permission
 */
export const requirePermission = (requiredAction: string) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;

    if (!authRequest.user) {
      return reply.code(401).send({
        success: false,
        error: AuthErrorCode.TOKEN_INVALID,
        message: 'Authentication required',
      });
    }

    // Permission check would go here (in user story implementations)
    logger.debug(`Permission check: ${authRequest.user.userId} -> ${requiredAction}`);
  };
};
