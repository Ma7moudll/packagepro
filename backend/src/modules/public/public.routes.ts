import { FastifyPluginAsync } from 'fastify';
import { publicStatsService } from './public.service';

/**
 * Public (unauthenticated) read-only endpoints. These power marketing
 * pages with REAL aggregates from the database instead of hardcoded numbers.
 */
export const publicRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/public/stats', async (_request, reply) => {
    const stats = await publicStatsService.getStats();
    return reply.send({ success: true, data: stats });
  });
};