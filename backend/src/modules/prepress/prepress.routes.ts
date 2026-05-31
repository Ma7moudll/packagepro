import { FastifyPluginAsync } from 'fastify';
import { prePressController } from './prepress.controller';

export const prePressRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/orders/:id/prepress-check', async (request, reply) => {
    return prePressController.checkOrder(request, reply);
  });

  fastify.get('/orders/:id/prepress-results', async (request, reply) => {
    return prePressController.getResults(request, reply);
  });
};
