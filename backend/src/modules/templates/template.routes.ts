import { FastifyPluginAsync } from 'fastify';
import { templateController } from './template.controller';

export const templateRoutes: FastifyPluginAsync = async (fastify) => {
  // List templates (public)
  fastify.get('/templates', async (request, reply) => {
    return templateController.listTemplates(request, reply);
  });

  // Get popular templates
  fastify.get('/templates/popular', async (request, reply) => {
    return templateController.getPopular(request, reply);
  });

  // Get template by ID
  fastify.get('/templates/:id', async (request, reply) => {
    return templateController.getTemplate(request, reply);
  });

  // Create template (authenticated)
  fastify.post('/templates', async (request, reply) => {
    return templateController.createTemplate(request, reply);
  });

  // Update template (authenticated)
  fastify.patch('/templates/:id', async (request, reply) => {
    return templateController.updateTemplate(request, reply);
  });

  // Delete template (authenticated)
  fastify.delete('/templates/:id', async (request, reply) => {
    return templateController.deleteTemplate(request, reply);
  });
};

