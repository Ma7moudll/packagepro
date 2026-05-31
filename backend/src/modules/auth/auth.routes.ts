import { FastifyPluginAsync } from 'fastify';
import { authController } from './auth.controller';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Register
  fastify.post('/auth/register', async (request, reply) => {
    return authController.register(request, reply);
  });

  // Login
  fastify.post('/auth/login', async (request, reply) => {
    return authController.login(request, reply);
  });

  // Refresh token
  fastify.post('/auth/refresh', async (request, reply) => {
    return authController.refreshToken(request, reply);
  });
};
