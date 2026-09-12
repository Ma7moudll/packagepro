import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { authService } from '../auth/auth.service';
import { notificationService } from './notifications.service';
import { NotFoundError } from '../../utils/errors';

/**
 * Notifications Test - Real-time Notification System (SPEC-017)
 * Tests persistence, idempotency, ownership isolation, and read/mark-all flows.
 */
describe('Notifications Tests', () => {
  const userAEmail = 'notif-a@example.com';
  const userBEmail = 'notif-b@example.com';
  const password = 'SecurePassword123!';
  let userAId: string;
  let userBId: string;

  beforeAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [userAEmail, userBEmail] } },
    });

    const userA = await authService.register({
      email: userAEmail,
      password,
      name: 'Notif A',
      role: 'CUSTOMER',
    });
    const userB = await authService.register({
      email: userBEmail,
      password,
      name: 'Notif B',
      role: 'CUSTOMER',
    });

    userAId = userA.userId;
    userBId = userB.userId;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: [userAEmail, userBEmail] } },
    });
  });

  describe('Create & List', () => {
    it('creates a notification and returns it in the user list', async () => {
      const created = await notificationService.create(userAId, {
        type: 'order_created',
        title: 'Order XX created',
        message: 'Your order was received.',
        link: '/orders/order-1',
      });

      expect(created.id).toBeDefined();
      expect(created.userId).toBe(userAId);
      expect(created.read).toBe(false);

      const list = await notificationService.listForUser(userAId);
      expect(list.total).toBeGreaterThanOrEqual(1);
      expect(list.unread).toBeGreaterThanOrEqual(1);
      expect(list.data[0]?.id).toBe(created.id);
    });

    it('does not leak notifications between users', async () => {
      const list = await notificationService.listForUser(userBId);
      expect(list.data).toHaveLength(0);
    });
  });

  describe('Idempotency', () => {
    it('deduplicates notifications for the same entity and type', async () => {
      const first = await notificationService.createIfUnseen(
        userAId,
        { entityType: 'order', entityId: 'order-dedupe' },
        {
          type: 'payment_received',
          title: 'Payment received for order-dedupe',
          message: 'Payment captured.',
        }
      );
      expect(first.status).toBe('created');

      const second = await notificationService.createIfUnseen(
        userAId,
        { entityType: 'order', entityId: 'order-dedupe' },
        {
          type: 'payment_received',
          title: 'Payment received for order-dedupe',
          message: 'Payment captured.',
        }
      );
      expect(second.status).toBe('exists');

      const list = await notificationService.listForUser(userAId);
      const dupes = list.data.filter(
        (n) =>
          n.type === 'payment_received' &&
          (n.metadata as any)?.entityId === 'order-dedupe'
      );
      expect(dupes).toHaveLength(1);
    });
  });

  describe('Ownership & Read flows', () => {
    it('rejects marking another user notification as read', async () => {
      const list = await notificationService.listForUser(userAId);
      const target = list.data[0];

      await expect(notificationService.markAsRead(userBId, target.id)).rejects.toThrow(
        NotFoundError
      );
    });

    it('marks a notification as read and updates the unread count', async () => {
      const created = await notificationService.create(userAId, {
        type: 'shipment_created',
        title: 'Order shipped',
        message: 'Your order has shipped.',
      });

      const before = await notificationService.unreadCount(userAId);
      const unreadAfter = await notificationService.markAsRead(userAId, created.id);
      expect(unreadAfter).toBe(before - 1);

      const updated = await prisma.notification.findUnique({ where: { id: created.id } });
      expect(updated?.read).toBe(true);
      expect(updated?.readAt).not.toBeNull();
    });

    it('marks all notifications as read', async () => {
      await notificationService.create(userAId, {
        type: 'review_requested',
        title: 'Review requested',
        message: 'Please leave a review.',
      });

      const unread = await notificationService.markAllAsRead(userAId);
      expect(unread).toBe(0);
    });
  });
});