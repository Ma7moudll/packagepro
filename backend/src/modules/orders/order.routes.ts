import { FastifyPluginAsync } from 'fastify';
import { orderController } from './order.controller';

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/orders', async (request, reply) => {
    return orderController.createOrder(request, reply);
  });

  fastify.get('/orders/:id', async (request, reply) => {
    return orderController.getOrder(request, reply);
  });

  fastify.get('/orders', async (request, reply) => {
    return orderController.getOrders(request, reply);
  });

  fastify.patch('/orders/:id/status', async (request, reply) => {
    return orderController.updateOrderStatus(request, reply);
  });
};

export const approvalRoutes: FastifyPluginAsync = async (fastify) => {
  const { approvalController } = await import('./approval.controller');

  fastify.post('/orders/:id/reopen-approval',async(request,reply)=>approvalController.reopenApproval(request,reply));

  fastify.post('/orders/:id/request-approval', async (request, reply) => {
    return approvalController.requestApproval(request, reply);
  });

  fastify.post('/orders/:id/approve', async (request, reply) => {
    return approvalController.approveOrder(request, reply);
  });
};
