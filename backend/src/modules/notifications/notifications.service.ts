import { prisma } from '../../lib/prisma';
import { NotificationType, Prisma } from '../../types';
import { NotFoundError } from '../../utils/errors';
import { notificationHub } from './notification-hub';

export interface NotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, unknown>;
}

export interface NotificationEntityRef {
  entityType: string;
  entityId: string;
}

export class NotificationService {
  async create(userId: string, input: NotificationInput): Promise<any> {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        metadata: input.metadata as Prisma.InputJsonValue ?? undefined,
      },
    });

    notificationHub.publish(userId, notification);

    return notification;
  }

  /**
   * SEC-03c: persist-only variant of createIfUnseen for transactional callers.
   * Same dedupe semantics (one notification per (userId, type, entityRef)),
   * but runs on the provided transaction client and NEVER publishes to the
   * realtime hub — the caller publishes only after its transaction commits,
   * so a rolled-back transaction can never emit a realtime notification.
   */
  async createIfUnseenInTx(
    tx: Prisma.TransactionClient,
    userId: string,
    entityRef: NotificationEntityRef,
    input: NotificationInput
  ): Promise<{ status: 'created' | 'exists'; notification: any | null }> {
    const existing = await tx.notification.findFirst({
      where: {
        userId,
        type: input.type,
        AND: [
          { metadata: { path: ['entityType'], equals: entityRef.entityType } },
          { metadata: { path: ['entityId'], equals: entityRef.entityId } },
        ],
      },
    });

    if (existing) {
      return { status: 'exists', notification: existing };
    }

    const notification = await tx.notification.create({
      data: {
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
        metadata: {
          ...(input.metadata ?? {}),
          entityType: entityRef.entityType,
          entityId: entityRef.entityId,
        } as Prisma.InputJsonValue,
      },
    });

    return { status: 'created', notification };
  }

  async createIfUnseen(
    userId: string,
    entityRef: NotificationEntityRef,
    input: NotificationInput
  ): Promise<{ status: 'created' | 'exists'; notification: any | null }> {
    const res = await this.createIfUnseenInTx(prisma, userId, entityRef, input);

    if (res.status === 'created' && res.notification) {
      notificationHub.publish(userId, res.notification);
    }

    return res;
  }

  async listForUser(
    userId: string,
    limit: number = 20
  ): Promise<{ data: any[]; total: number; unread: number }> {
    const take = Math.min(Math.max(limit, 1), 50);
    const [data, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
      }),
      prisma.notification.count({ where: { userId } }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return { data, total, unread };
  }

  async unreadCount(userId: string): Promise<number> {
    return prisma.notification.count({ where: { userId, read: false } });
  }

  async markAsRead(userId: string, id: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true, readAt: new Date() },
    });

    if (result.count === 0) {
      throw new NotFoundError('Notification');
    }

    return this.unreadCount(userId);
  }

  async markAllAsRead(userId: string): Promise<number> {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });

    return this.unreadCount(userId);
  }
}

export const notificationService = new NotificationService();