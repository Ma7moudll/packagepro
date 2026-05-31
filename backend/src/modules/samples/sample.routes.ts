import { FastifyPluginAsync } from 'fastify';
import { sampleController } from './sample.controller';

export const sampleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/production/:productionId/samples', async (request, reply) => {
    return sampleController.uploadSamples(request, reply);
  });

  fastify.post('/samples/:id/approve', async (request, reply) => {
    return sampleController.approveSample(request, reply);
  });

  fastify.post('/samples/:id/reject', async (request, reply) => {
    return sampleController.rejectSample(request, reply);
  });

  fastify.get('/samples/:id', async (request, reply) => {
    return sampleController.getSample(request, reply);
  });
};
