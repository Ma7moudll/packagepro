import { FastifyPluginAsync } from 'fastify';
import { designController } from './design.controller';

export const designRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/designs/session', async (request, reply) => {
    return designController.createSession(request, reply);
  });

  fastify.get('/designs/session/:sessionId', async (request, reply) => {
    return designController.getSession(request, reply);
  });

  fastify.post('/designs/save', async (request, reply) => {
    return designController.saveDesign(request, reply);
  });

  fastify.get('/designs/:id', async (request, reply) => {
    return designController.getDesign(request, reply);
  });

  fastify.get('/designs/:id/files', async (request, reply) => {
    return designController.getDesignFiles(request, reply);
  });
};
