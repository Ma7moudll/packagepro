import { FastifyPluginAsync } from 'fastify';
import { settlementService } from './settlement.service';
import { authenticate } from '../../middleware/auth.middleware';

export const settlementRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/settlements/process/:id', async (request, reply) => {
    await authenticate(request, reply);
    const settlementId = (request.params as { id: string }).id;
    const settlement = await settlementService.processSettlement(settlementId);

    return reply.send({
      success: true,
      data: settlement,
    });
  });

  fastify.get('/settlements/:id', async (request, reply) => {
    await authenticate(request, reply);
    const settlementId = (request.params as { id: string }).id;
    const settlement = await settlementService.getSettlement(settlementId);

    return reply.send({
      success: true,
      data: settlement,
    });
  });

  fastify.get('/vendors/:id/payments', async (request, reply) => {
    await authenticate(request, reply);
    const vendorId = (request.params as { id: string }).id;
    const query = request.query as { page?: string; limit?: string };
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');

    const result = await settlementService.getVendorPayments(vendorId, page, limit);

    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });
};
