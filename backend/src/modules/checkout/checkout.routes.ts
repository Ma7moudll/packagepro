import { FastifyPluginAsync } from 'fastify';
import { checkoutController } from './checkout.controller';

export const checkoutRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/checkout/summary', async (request, reply) => {
    return checkoutController.summary(request, reply);
  });

  fastify.post('/checkout', async (request, reply) => {
    return checkoutController.checkout(request, reply);
  });
};