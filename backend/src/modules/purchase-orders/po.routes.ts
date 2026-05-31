import { FastifyPluginAsync } from 'fastify';
import { poController } from './po.controller';

export const poRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/orders/:id/create-po', async (request, reply) => {
    return poController.createPO(request, reply);
  });

  fastify.get('/purchase-orders/:id', async (request, reply) => {
    return poController.getPO(request, reply);
  });

  fastify.post('/purchase-orders/:id/confirm', async (request, reply) => {
    return poController.confirmPO(request, reply);
  });
};
