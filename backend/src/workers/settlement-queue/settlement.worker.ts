import { Worker } from 'bullmq';
import { getRedisClient, isRedisEnabled } from '../../lib/redis';
import { prisma } from '../../lib/prisma';
import { logger } from '../../utils/logger';

const redis = getRedisClient();

// Only create worker if Redis is enabled
export const settlementWorker = redis && isRedisEnabled() ? new Worker(
  'settlement-queue',
  async (job) => {
    const { settlementId } = job.data;

    try {
      const settlement = await prisma.settlement.findUnique({
        where: { id: settlementId },
        include: {
          order: {
            include: {
              purchaseOrder: {
                include: {
                  vendor: true,
                },
              },
            },
          },
        },
      });

      if (!settlement) {
        throw new Error(`Settlement ${settlementId} not found`);
      }

      // Process settlement
      // In production, integrate with bank API or manual processing
      await prisma.settlement.update({
        where: { id: settlementId },
        data: {
          status: 'processing',
        },
      });

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Mark as completed
      await prisma.settlement.update({
        where: { id: settlementId },
        data: {
          status: 'completed',
          processedAt: new Date(),
        },
      });

      logger.info(`Settlement ${settlementId} processed`);
    } catch (error) {
      logger.error(`Settlement job ${job?.id} failed`, error);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 3,
  }
) : null;

if (settlementWorker) {
  settlementWorker.on('completed', (job) => {
    logger.info(`Settlement job ${job.id} completed`);
  });

  settlementWorker.on('failed', (job, err) => {
    logger.error(`Settlement job ${job?.id} failed`, err);
  });

  logger.info('Settlement worker started');
} else {
  logger.warn('Settlement worker not started - Redis not available');
}
