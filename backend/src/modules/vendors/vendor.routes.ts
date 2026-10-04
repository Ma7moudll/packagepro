import { FastifyPluginAsync } from 'fastify';
import { vendorController } from './vendor.controller';

export const vendorRoutes: FastifyPluginAsync = async (fastify) => {
  // Vendor self-service portal endpoints (VENDOR/ADMIN scoped in the controller
  // via requireVendorProfile).
  fastify.get('/vendors/dashboard', async (request, reply) => {
    return vendorController.getVendorDashboard(request, reply);
  });

  fastify.get('/vendors/orders', async (request, reply) => {
    return vendorController.getVendorOrders(request, reply);
  });

  fastify.get('/vendors/me', async (request, reply) => {
    return vendorController.getVendorProfile(request, reply);
  });

  fastify.patch('/vendors/me', async (request, reply) => {
    return vendorController.updateVendorProfile(request, reply);
  });
};
