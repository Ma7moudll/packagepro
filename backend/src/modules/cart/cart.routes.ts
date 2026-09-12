import { FastifyPluginAsync } from 'fastify';
import { cartController } from './cart.controller';

export const cartRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/cart', async (request, reply) => {
    return cartController.getCart(request, reply);
  });

  fastify.post('/cart/items', async (request, reply) => {
    return cartController.addItem(request, reply);
  });

  fastify.patch('/cart/items/:id', async (request, reply) => {
    return cartController.updateItem(request, reply);
  });

  fastify.delete('/cart/items/:id', async (request, reply) => {
    return cartController.removeItem(request, reply);
  });

  fastify.delete('/cart', async (request, reply) => {
    return cartController.clear(request, reply);
  });
};