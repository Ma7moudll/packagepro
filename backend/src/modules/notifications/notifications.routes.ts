import { FastifyPluginAsync } from 'fastify';
import { notificationsController } from './notifications.controller';

export const notificationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/notifications', async (request, reply) => {
    return notificationsController.list(request, reply);
  });

  fastify.get('/notifications/unread-count', async (request, reply) => {
    return notificationsController.unreadCount(request, reply);
  });

  fastify.get('/notifications/stream', async (request, reply) => {
    return notificationsController.stream(request, reply);
  });

  fastify.patch('/notifications/:id/read', async (request, reply) => {
    return notificationsController.markAsRead(request, reply);
  });

  fastify.post('/notifications/read-all', async (request, reply) => {
    return notificationsController.markAllAsRead(request, reply);
  });
};