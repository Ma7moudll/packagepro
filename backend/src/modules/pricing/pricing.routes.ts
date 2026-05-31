import { FastifyPluginAsync } from 'fastify';
import { pricingController } from './pricing.controller';

export const pricingRoutes: FastifyPluginAsync = async (fastify) => {
  // Calculate price
  fastify.post('/pricing/calculate', async (request, reply) => {
    return pricingController.calculatePrice(request, reply);
  });

  // Get materials
  fastify.get('/pricing/materials', async (request, reply) => {
    return pricingController.getMaterials(request, reply);
  });

  // Get quantity pricing
  fastify.post('/pricing/quantities', async (request, reply) => {
    return pricingController.getQuantityPricing(request, reply);
  });
};
