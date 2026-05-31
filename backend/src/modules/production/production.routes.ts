import { FastifyPluginAsync } from 'fastify';
import { productionController } from './production.controller';

export const productionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/production/start/:poId', async (request, reply) => {
    return productionController.startProduction(request, reply);
  });

  fastify.post('/production/:id/progress', async (request, reply) => {
    return productionController.updateProgress(request, reply);
  });

  fastify.get('/production/:id', async (request, reply) => {
    return productionController.getProduction(request, reply);
  });

};