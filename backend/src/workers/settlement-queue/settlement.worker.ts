import { Worker } from 'bullmq';
import { getRedisClient, isRedisEnabled } from '../../lib/redis';
import { logger } from '../../utils/logger';
import { ValidationError } from '../../utils/errors';
import { settlementService } from '../../modules/settlements/settlement.service';

/**
 * SEC-03a — the worker shares the ONE processing implementation with the
 * manual admin route (identical financial record + notification from either
 * entry point). The previous divergent body completed settlements without
 * convertedAmount/exchangeRate/receipt or any notification.
 *
 * A ValidationError (verification window not ended / not claimable) is an
 * expected skip, not a failure. BullMQ has no retry configuration, so a job
 * runs once; a retryable failure (e.g. FX provider down) leaves the row
 * safely pending for the next attempt.
 */
export async function runSettlementJob(settlementId: string): Promise<void> {
  try {
    await settlementService.processSettlement(settlementId);
  } catch (error) {
    if (error instanceof ValidationError) {
      logger.info(`Settlement ${settlementId} not claimable — skip`);
      return;
    }
    logger.error(`Settlement job failed for ${settlementId}`, error);
    throw error;
  }
}

const redis = getRedisClient();

// Only create worker if Redis is enabled
export const settlementWorker = redis && isRedisEnabled() ? new Worker(
  'settlement-queue',
  async (job) => {
    await runSettlementJob(job.data.settlementId);
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
