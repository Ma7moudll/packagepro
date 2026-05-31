import { Worker } from 'bullmq';
import { getRedisClient, isRedisEnabled } from '../../lib/redis';
import { emailService } from '../../services/email/email.service';
import { logger } from '../../utils/logger';

const redis = getRedisClient();

// Only create worker if Redis is enabled
export const emailWorker = redis && isRedisEnabled() ? new Worker(
  'email-queue',
  async (job) => {
    const { type, data } = job.data;

    try {
      switch (type) {
        case 'order-confirmation':
          await emailService.sendOrderConfirmation(data.order);
          break;
        case 'approval-request':
          await emailService.sendApprovalRequest(data.order, data.approvalUrl);
          break;
        default:
          logger.warn(`Unknown email type: ${type}`);
      }

      logger.info(`Email job ${job.id} completed`);
    } catch (error) {
      logger.error(`Email job ${job.id} failed`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
) : null;

if (emailWorker) {
  emailWorker.on('completed', (job) => {
    logger.info(`Email job ${job.id} completed`);
  });

  emailWorker.on('failed', (job, err) => {
    logger.error(`Email job ${job?.id} failed`, err);
  });

  logger.info('Email worker started');
} else {
  logger.warn('Email worker not started - Redis not available');
}
