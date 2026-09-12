import { FastifyPluginAsync } from 'fastify';
import { catalogController } from './catalog.controller';

export const catalogRoutes: FastifyPluginAsync = async (fastify) => {
  // Marketplace catalog: categories -> subcategories -> products
  fastify.get('/catalog', async (request, reply) => {
    return catalogController.list(request, reply);
  });

  // Product detail + configurator options
  fastify.get('/catalog/:slug', async (request, reply) => {
    return catalogController.getBySlug(request, reply);
  });

  // Authoritative quote for a configured product
  fastify.post('/catalog/:slug/quote', async (request, reply) => {
    return catalogController.quote(request, reply);
  });

  // M7: Canonical editor configuration for a product slug
  fastify.get('/catalog/:slug/editor-config', async (request, reply) => {
    return catalogController.editorConfig(request, reply);
  });
};