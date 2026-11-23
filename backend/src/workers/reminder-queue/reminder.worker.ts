import { Worker } from 'bullmq';
import { getRedisClient, isRedisEnabled } from '../../lib/redis';
import { approvalService } from '../../modules/orders/approval.service';
import { logger } from '../../utils/logger';

const redis = getRedisClient();

// Only create worker if Redis is enabled
export const reminderWorker = redis && isRedisEnabled() ? new Worker(
  'reminder-queue',
  async (job) => {
    const { type, data } = job.data;

    try {
      switch (type) {
        case 'approval-reminder': {
          // Legacy jobs contain unbound URLs. Do not reactivate or forward them.
          logger.warn('Unbound legacy approval reminder skipped');
          break;
        }

        case 'auto-cancel-order':
          await approvalService.autoCancelOrder(data.orderId);
          logger.info(`Order ${data.orderId} auto-cancelled`);
          break;

        default:
          logger.warn(`Unknown reminder type: ${type}`);
      }
    } catch (error) {
      logger.error(`Reminder job ${job.id} failed`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 5,
  }
) : null;

if (reminderWorker) {
  reminderWorker.on('completed', (job) => {
    logger.info(`Reminder job ${job.id} completed`);
  });

  reminderWorker.on('failed', (job, err) => {
    logger.error(`Reminder job ${job?.id} failed`, err);
  });

  logger.info('Reminder worker started');
} else {
  logger.warn('Reminder worker not started - Redis not available');
}
