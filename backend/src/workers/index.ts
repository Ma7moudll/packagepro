import { isRedisEnabled } from '../lib/redis';
import { logger } from '../utils/logger';

/**
 * One-time background bootstrap. The email, settlement, reminder and marketing
 * modules construct their guarded workers on import. The export module only
 * exposes factories; importing it does not start export processing.
 */

let bootstrapCompleted = false;

export type BackgroundWorkerStatus =
  | 'bootstrap_completed'
  | 'bootstrap_completed_redis_unavailable'
  | 'disabled_redis_unavailable'
  | 'not_started_restart_required';

/**
 * Truthful worker status for /health. startWorkers() runs once at boot, so a
 * Redis recovery later does NOT start workers: that state is reported as
 * restart required. 'bootstrap_completed' means the module-load sequence finished
 * after a ready Redis check. It proves neither processing nor export readiness.
 */
export function getBackgroundWorkerStatus(): BackgroundWorkerStatus {
  const redisReady = isRedisEnabled();
  if (bootstrapCompleted) return redisReady ? 'bootstrap_completed' : 'bootstrap_completed_redis_unavailable';
  return redisReady ? 'not_started_restart_required' : 'disabled_redis_unavailable';
}

export async function startWorkers(): Promise<void> {
  if (!isRedisEnabled()) {
    logger.info('Background workers disabled (Redis not configured)');
    return;
  }

  // These four modules construct guarded workers on import.
  await import('./email-queue/email.worker');
  await import('./settlement-queue/settlement.worker');
  await import('./reminder-queue/reminder.worker');
  await import('./marketing-queue/marketing.worker');
  // Load export definitions only. No factory is called here; do not imply
  // that export processing or its placeholder upload path is enabled.
  await import('./export-queue/export.worker');

  bootstrapCompleted = true;
  logger.info('Background bootstrap completed: email, settlement, reminder and marketing modules loaded; export processing is not started by this bootstrap');
}
