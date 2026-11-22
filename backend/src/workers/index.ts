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

let workersStarted = false;

export type BackgroundWorkerStatus =
  | 'started'
  | 'started_redis_unavailable'
  | 'disabled_redis_unavailable'
  | 'not_started_restart_required';

/**
 * Truthful worker status for /health. startWorkers() runs once at boot, so a
 * Redis recovery later does NOT start workers: that state is reported as
 * restart required. 'started' means the worker modules were loaded after a
 * ready Redis check; it does not prove each worker is currently processing.
 */
export function getBackgroundWorkerStatus(): BackgroundWorkerStatus {
  const redisReady = isRedisEnabled();
  if (workersStarted) return redisReady ? 'started' : 'started_redis_unavailable';
  return redisReady ? 'not_started_restart_required' : 'disabled_redis_unavailable';
}

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

  workersStarted = true;
  logger.info('Background workers started (email, settlement, reminder, marketing, export)');
}
