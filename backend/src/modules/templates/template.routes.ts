import { FastifyPluginAsync } from 'fastify';
import { templateController } from './template.controller';
import { requireAdmin } from '../../middleware/rbac';

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

  // Template authoring is a platform (ADMIN) capability.
  fastify.post('/templates', async (request, reply) => {
    await requireAdmin(request, reply);
    return templateController.createTemplate(request, reply);
  });

  fastify.patch('/templates/:id', async (request, reply) => {
    await requireAdmin(request, reply);
    return templateController.updateTemplate(request, reply);
  });

  fastify.delete('/templates/:id', async (request, reply) => {
    await requireAdmin(request, reply);
    return templateController.deleteTemplate(request, reply);
  });
};
