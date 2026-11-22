import { describe, it, expect, vi, beforeEach } from 'vitest';

const state = vi.hoisted(() => ({ ready: false }));
vi.mock('../lib/redis', () => ({ isRedisEnabled: () => state.ready }));
vi.mock('./email-queue/email.worker', () => ({}));
vi.mock('./settlement-queue/settlement.worker', () => ({}));
vi.mock('./reminder-queue/reminder.worker', () => ({}));
vi.mock('./marketing-queue/marketing.worker', () => ({}));
vi.mock('./export-queue/export.worker', () => ({}));

describe('background worker status is truthful', () => {
  beforeEach(() => { vi.resetModules(); state.ready = false; });

  it('boots without Redis: disabled, and later Redis recovery requires a restart', async () => {
    const mod = await import('./index');
    await mod.startWorkers();
    expect(mod.getBackgroundWorkerStatus()).toBe('disabled_redis_unavailable');
    state.ready = true; // Redis recovers after boot; startWorkers does not run again
    expect(mod.getBackgroundWorkerStatus()).toBe('not_started_restart_required');
  });

  it('boots with Redis: bootstrap completion, and reports Redis loss without claiming processing health', async () => {
    state.ready = true;
    const mod = await import('./index');
    await mod.startWorkers();
    expect(mod.getBackgroundWorkerStatus()).toBe('bootstrap_completed');
    state.ready = false;
    expect(mod.getBackgroundWorkerStatus()).toBe('bootstrap_completed_redis_unavailable');
  });
});
