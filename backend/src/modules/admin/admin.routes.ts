import { FastifyPluginAsync } from 'fastify';
import { adminController } from './admin.controller';
import { requireAdmin } from '../../middleware/rbac';

/**
 * Platform operations console (SPEC-029 Phase 4).
 * Every route is ADMIN-gated — the frontend admin pages run under the same
 * role, so a 403 here means the session role is wrong, not the UI.
 */
export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/admin/overview', async (request, reply) => {
    await requireAdmin(request, reply);
    return adminController.getOverview(request, reply);
  });

  fastify.get('/admin/orders', async (request, reply) => {
    await requireAdmin(request, reply);
    return adminController.getOrders(request, reply);
  });

  fastify.get('/admin/vendors', async (request, reply) => {
    await requireAdmin(request, reply);
    return adminController.getVendors(request, reply);
  });

  fastify.patch('/admin/vendors/:id', async (request, reply) => {
    await requireAdmin(request, reply);
    return adminController.updateVendor(request, reply);
  });

  fastify.get('/admin/customers', async (request, reply) => {
    await requireAdmin(request, reply);
    return adminController.getCustomers(request, reply);
  });

  // QA sample review queue (SPEC-029: sample upload → QA approve → full run).
  fastify.get('/admin/samples', async (request, reply) => {
    await requireAdmin(request, reply);
    return adminController.getSamples(request, reply);
  });
};
