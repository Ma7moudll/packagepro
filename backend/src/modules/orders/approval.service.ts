import { prisma } from '../../lib/prisma';
import { AuthorizationError, ConflictError, NotFoundError, ValidationError } from '../../utils/errors';
import { emailService } from '../../services/email/email.service';
import { getReminderQueue } from '../../lib/queues';
import { proofGeneratorService } from '../../services/pre-press-checker/proof-generator';
import { notificationService } from '../notifications/notifications.service';
import { logger } from '../../utils/logger';

export class ApprovalService {
  /**
   * Generate proof and send approval request
   */
  async requestApproval(orderId: string, actor: { role: string }): Promise<void> {
    if (actor.role !== 'ADMIN') throw new AuthorizationError('Only admins may request approval');
    const order = await prisma.$transaction(async (tx) => {
      // Row lock plus a durable claim serializes all workers without holding a
      // database transaction open during PDF generation, email or queue calls.
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId} FOR UPDATE`;
      const current = await tx.order.findUnique({
        where: { id: orderId },
        include: { design: true, payment: true, customer: { include: { user: true } } },
      });
      if (!current) throw new NotFoundError('Order');
      if (!['pending_review', 'awaiting_approval'].includes(current.status)) {
        throw new ValidationError('Order is not in a reviewable state');
      }
      if ((current.metadata as any)?.approvalRequestClaimedAt) {
        throw new ConflictError('Approval request already claimed; reconcile before retrying');
      }
      await tx.order.update({
        where: { id: orderId },
        data: { metadata: { ...(current.metadata as any), approvalRequestClaimedAt: new Date().toISOString() } },
      });
      return current;
    });
    // Generate proof
    const proof = await proofGeneratorService.generateProof(orderId);

    // Create approval URL
    const approvalUrl = `${process.env.FRONTEND_URL}/orders/${orderId}/approve?token=${proof.approvalToken}`;

    // Send approval email
    await emailService.sendApprovalRequest(order, approvalUrl);

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'awaiting_approval',
      },
    });

    // Schedule reminder emails
    await this.scheduleReminders(orderId, approvalUrl);

    if (order.customer?.user?.id) {
      await notificationService.createIfUnseen(
        order.customer.user.id,
        { entityType: 'order', entityId: orderId },
        {
          type: 'approval_required',
          title: `Approval needed for ${order.orderNumber}`,
          message: `Review your design proof for ${order.orderNumber} and approve to continue.`,
          link: `/orders/${orderId}`,
        }
      );
    }

    logger.info(`Approval requested for order ${order.orderNumber}`);
  }

  /**
   * Approve order
   */
  async approveOrder(
    orderId: string,
    token: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    // Verify token
    const tokenData = await proofGeneratorService.verifyApprovalToken(token);
    if (!tokenData || tokenData.orderId !== orderId) {
      throw new ValidationError('Invalid or expired approval token');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.status !== 'awaiting_approval') {
      throw new ValidationError('Order is not awaiting approval');
    }

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'ready_for_routing',
        approvedAt: new Date(),
        metadata: {
          ...(order.metadata as any),
          approval: {
            ipAddress,
            userAgent,
            approvedAt: new Date().toISOString(),
          },
        },
      },
    });

    // Cancel reminder jobs
    await this.cancelReminders(orderId);

    logger.info(`Order ${order.orderNumber} approved`);
  }

  /**
   * Schedule reminder emails
   */
  private async scheduleReminders(orderId: string, approvalUrl: string): Promise<void> {
    const reminderQueue = getReminderQueue();
    if (!reminderQueue) {
      // Redis not available - skip reminders
      return;
    }

    try {
      // 24h reminder
      await reminderQueue.add(
        'approval-reminder',
        { orderId, approvalUrl, type: '24h' },
        { delay: 24 * 60 * 60 * 1000 }
      );

      // 48h reminder
      await reminderQueue.add(
        'approval-reminder',
        { orderId, approvalUrl, type: '48h' },
        { delay: 48 * 60 * 60 * 1000 }
      );

      // 72h reminder
      await reminderQueue.add(
        'approval-reminder',
        { orderId, approvalUrl, type: '72h' },
        { delay: 72 * 60 * 60 * 1000 }
      );

      // Auto-cancel after 7 days
      await reminderQueue.add(
        'auto-cancel-order',
        { orderId },
        { delay: 7 * 24 * 60 * 60 * 1000 }
      );
    } catch (error) {
      // Queue not available - continue without reminders
    }
  }

  /**
   * Cancel reminder jobs
   */
  private async cancelReminders(orderId: string): Promise<void> {
    // In production, implement job cancellation logic
    logger.info(`Reminders cancelled for order ${orderId}`);
  }

  /**
   * Auto-cancel order if not approved
   */
  async autoCancelOrder(orderId: string): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.status !== 'awaiting_approval') {
      return;
    }

    // Update order status to cancelled
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'cancelled',
      },
    });

    // Send cancellation email
    await emailService.sendEmail({
      to: order.shippingEmail || '',
      subject: `Order ${order.orderNumber} Cancelled`,
      template: 'order-cancelled',
      templateData: { order },
    });

    logger.info(`Order ${order.orderNumber} auto-cancelled`);
  }
}

export const approvalService = new ApprovalService();
