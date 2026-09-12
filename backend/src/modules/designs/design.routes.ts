import { FastifyPluginAsync } from 'fastify';
import { designController } from './design.controller';

export const designRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/designs', async (request, reply) => {
    return designController.listDesigns(request, reply);
  });

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

  // Lifecycle endpoints
  fastify.post('/designs/:id/submit', async (request, reply) => {
    return designController.submitDesign(request, reply);
  });

  fastify.post('/designs/:id/recall', async (request, reply) => {
    return designController.recallDesign(request, reply);
  });

  // Export endpoints
  fastify.post('/designs/:id/export', async (request, reply) => {
    return designController.exportDesign(request, reply);
  });

  // Review endpoints
  fastify.get('/designs/:id/review', async (request, reply) => {
    return designController.getDesignForReview(request, reply);
  });

  fastify.post('/designs/:id/review/comment', async (request, reply) => {
    return designController.addComment(request, reply);
  });

  fastify.post('/designs/:id/review/approve', async (request, reply) => {
    return designController.approveDesign(request, reply);
  });

  fastify.post('/designs/:id/review/reject', async (request, reply) => {
    return designController.rejectDesign(request, reply);
  });

  fastify.post('/designs/:id/review/request-changes', async (request, reply) => {
    return designController.requestChanges(request, reply);
  });
};
