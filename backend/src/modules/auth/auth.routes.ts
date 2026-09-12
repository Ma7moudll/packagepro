import { FastifyPluginAsync } from 'fastify';
import { authController } from './auth.controller';
import {
  verifyAccessToken,
  verifyRefreshToken,
} from './middleware/auth.middleware';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // ============================================
  // PUBLIC AUTH ENDPOINTS
  // ============================================

  // Register
  fastify.post('/auth/register', async (request, reply) => {
    return authController.register(request, reply);
  });

  // Login
  fastify.post('/auth/login', async (request, reply) => {
    return authController.login(request, reply);
  });

  // Refresh token (requires valid refresh token)
  fastify.post('/auth/refresh', { onRequest: verifyRefreshToken }, async (request, reply) => {
    return authController.refreshToken(request, reply);
  });

  // Logout (requires access token)
  fastify.post('/auth/logout', { onRequest: verifyAccessToken }, async (request, reply) => {
    return authController.logout(request, reply);
  });

  // Verify email
  fastify.post('/auth/verify-email', async (request, reply) => {
    return authController.verifyEmail(request, reply);
  });

  // Resend verification email
  fastify.post('/auth/resend-verification', async (request, reply) => {
    return authController.resendVerificationEmail(request, reply);
  });

  // Forgot password
  fastify.post('/auth/forgot-password', async (request, reply) => {
    return authController.forgotPassword(request, reply);
  });

  // Reset password
  fastify.post('/auth/reset-password', async (request, reply) => {
    return authController.resetPassword(request, reply);
  });

  // ============================================
  // PROTECTED ENDPOINTS
  // ============================================

  // Get current user profile (requires access token)
  fastify.get('/auth/me', { onRequest: verifyAccessToken }, async (request, reply) => {
    return authController.getCurrentUser(request, reply);
  });

  // Get audit logs (requires access token)
  fastify.get('/auth/audit-logs', { onRequest: verifyAccessToken }, async (request, reply) => {
    return authController.getAuditLogs(request, reply);
  });
};
