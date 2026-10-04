import { FastifyPluginAsync } from 'fastify';
import { analyticsService } from './analytics.service';
import { requireAdmin, requireRoles } from '../../middleware/rbac';
import { prisma } from '../../lib/prisma';

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // Platform-wide funnel metrics — ADMIN console data.
  fastify.get('/analytics/funnel', async (request, reply) => {
    await requireAdmin(request, reply);
    const query = request.query as { start?: string; end?: string };
    const startDate = query.start ? new Date(query.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.end ? new Date(query.end) : new Date();

    const funnel = await analyticsService.getConversionFunnel(startDate, endDate);

    return reply.send({
      success: true,
      data: funnel,
    });
  });

  fastify.get('/analytics/products', async (request, reply) => {
    await requireAdmin(request, reply);
    const popularity = await analyticsService.getProductPopularity();

    return reply.send({
      success: true,
      data: popularity,
    });
  });

  // Vendor performance is visible to the vendor itself and to admins.
  fastify.get('/vendors/:id/performance', async (request, reply) => {
    const user = await requireRoles(request, reply, 'VENDOR', 'ADMIN');
    const vendorId = (request.params as { id: string }).id;

    if (user.role !== 'ADMIN') {
      const vendor = await requireOwnVendorId(user.userId);
      if (vendor !== vendorId) {
        return reply.status(403).send({
          success: false,
          error: 'FORBIDDEN',
          message: 'You do not have access to this vendor performance data',
        });
      }
    }

    const performance = await analyticsService.getVendorPerformance(vendorId);

    return reply.send({
      success: true,
      data: performance,
    });
  });
};

async function requireOwnVendorId(userId: string): Promise<string> {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  return vendor?.id ?? '';
}
