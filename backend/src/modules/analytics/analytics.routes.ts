import { FastifyPluginAsync } from 'fastify';
import { analyticsService } from './analytics.service';
import { authenticate } from '../../middleware/auth.middleware';

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/analytics/funnel', async (request, reply) => {
    await authenticate(request, reply);
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
    await authenticate(request, reply);
    const popularity = await analyticsService.getProductPopularity();

    return reply.send({
      success: true,
      data: popularity,
    });
  });

  fastify.get('/vendors/:id/performance', async (request, reply) => {
    await authenticate(request, reply);
    const vendorId = (request.params as { id: string }).id;
    const performance = await analyticsService.getVendorPerformance(vendorId);

    return reply.send({
      success: true,
      data: performance,
    });
  });
};
