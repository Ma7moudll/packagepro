import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { notificationService } from './notifications.service';
import { notificationHub } from './notification-hub';

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const idParamsSchema = z.object({
  id: z.string().min(1),
});

export class NotificationsController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const { limit } = listQuerySchema.parse(request.query);
    const user = (request as AuthenticatedRequest).user;

    const result = await notificationService.listForUser(user.userId, limit);

    return reply.send({
      success: true,
      data: result.data,
      total: result.total,
      unread: result.unread,
    });
  }

  async unreadCount(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;

    const count = await notificationService.unreadCount(user.userId);

    return reply.send({
      success: true,
      data: { count },
    });
  }

  async markAsRead(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const { id } = idParamsSchema.parse(request.params);

    const unread = await notificationService.markAsRead(user.userId, id);

    return reply.send({
      success: true,
      data: { unread },
    });
  }

  async markAllAsRead(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;

    const unread = await notificationService.markAllAsRead(user.userId);

    return reply.send({
      success: true,
      data: { unread },
    });
  }

  async stream(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;

    reply.hijack();
    const raw = reply.raw;

    const origin = request.headers.origin || '*';
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Cache-Control',
      Vary: 'Origin',
    });

    const unread = await notificationService.unreadCount(user.userId);
    raw.write(`event: snapshot\ndata: ${JSON.stringify({ unread })}\n\n`);

    const heartbeat = setInterval(() => {
      raw.write(': ping\n\n');
    }, 25000);
    heartbeat.unref();

    const conn = notificationHub.subscribe(user.userId, raw);

    request.raw.on('close', () => {
      clearInterval(heartbeat);
      notificationHub.unsubscribe(user.userId, conn);
    });
  }
}

export const notificationsController = new NotificationsController();