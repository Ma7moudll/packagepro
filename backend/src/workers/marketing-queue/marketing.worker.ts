import { Worker } from 'bullmq';
import { getRedisClient, isRedisEnabled } from '../../lib/redis';
import { emailService } from '../../services/email/email.service';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

const redis = getRedisClient();

// Only create worker if Redis is enabled
export const marketingWorker = redis && isRedisEnabled() ? new Worker(
  'marketing-queue',
  async (job) => {
    const { type, data } = job.data;

    try {
      switch (type) {
        case 'post-purchase-thank-you':
          const order = await prisma.order.findUnique({
            where: { id: data.orderId },
            include: {
              customer: {
                include: {
                  user: true,
                },
              },
            },
          });
          if (order) {
            await emailService.sendOrderConfirmation(order);
          }
          break;

        case 'review-request':
          const orderForReview = await prisma.order.findUnique({
            where: { id: data.orderId },
            include: {
              customer: {
                include: {
                  user: true,
                },
              },
            },
          });
          if (orderForReview) {
            const reviewUrl = `${process.env.FRONTEND_URL}/orders/${data.orderId}/review`;
            await emailService.sendEmail({
              to: orderForReview.customer.user.email,
              subject: `Review Your Order ${orderForReview.orderNumber}`,
              template: 'review-request',
              templateData: {
                order: orderForReview,
                reviewUrl,
              },
            });
          }
          break;

        case 'retention-2weeks':
        case 'retention-30days':
          // Send retention email
          logger.info(`Retention email sent to customer ${data.customerId}`);
          break;

        case 'abandoned-cart':
          // Send abandoned cart email
          logger.info(`Abandoned cart email sent for cart ${data.cartId}`);
          break;

        default:
          logger.warn(`Unknown marketing email type: ${type}`);
      }
    } catch (error) {
      logger.error(`Marketing job ${job.id} failed`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
) : null;

if (marketingWorker) {
  marketingWorker.on('completed', (job) => {
    logger.info(`Marketing job ${job.id} completed`);
  });

  marketingWorker.on('failed', (job, err) => {
    logger.error(`Marketing job ${job?.id} failed`, err);
  });

  logger.info('Marketing worker started');
} else {
  logger.warn('Marketing worker not started - Redis not available');
}
