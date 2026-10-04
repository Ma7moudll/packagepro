import { isRedisEnabled } from '../lib/redis';
import { logger } from '../utils/logger';

/**
 * Background worker bootstrap.
 *
 * Each worker module self-guards: it only constructs its BullMQ Worker when
 * Redis is enabled, exporting `null` otherwise. Importing them here is what
 * actually starts the workers inside the API process — without this import
 * the queues receive jobs that nothing ever consumes (email, reminders,
 * settlements and marketing silently pile up).
 */

export async function startWorkers(): Promise<void> {
  if (!isRedisEnabled()) {
    logger.info('Background workers disabled (Redis not configured)');
    return;
  }

  // Side-effect imports: each module starts its Worker on load.
  await import('./email-queue/email.worker');
  await import('./settlement-queue/settlement.worker');
  await import('./reminder-queue/reminder.worker');
  await import('./marketing-queue/marketing.worker');
  // Export queue is initialized separately via lib/queues.ts but its worker
  // must be started here too.
  await import('./export-queue/export.worker');

  logger.info('Background workers started (email, settlement, reminder, marketing, export)');
}
