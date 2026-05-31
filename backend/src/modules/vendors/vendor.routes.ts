import { FastifyPluginAsync } from 'fastify';
import { vendorController } from './vendor.controller';

export const vendorRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/vendors/dashboard', async (request, reply) => {
    return vendorController.getVendorDashboard(request, reply);
  });

  fastify.get('/vendors/orders', async (request, reply) => {
    return vendorController.getVendorOrders(request, reply);
  });
};
