import { describe, it, expect, vi, beforeEach } from 'vitest';

// The worker closure and getExportJobStatus, with a fake bullmq (captures the processor, serves jobs) and a
// fake prisma that records any design read.
const h = vi.hoisted(() => ({ processor: null as any, jobs: {} as Record<string, any>, designReads: 0, owner: { D1: 'cust1' } as Record<string, string>, roles: { admin1: 'ADMIN', cust1: 'CUSTOMER', cust2: 'CUSTOMER' } as Record<string, string> }));
vi.mock('bullmq', () => ({
  Queue: class { async getJob(id: string) { return h.jobs[id] ?? null; } },
  Worker: class { constructor(_n: string, p: any) { h.processor = p; } on() {} },
  Job: class {},
}));
vi.mock('ioredis', () => ({ Redis: class {} }));
vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: { findUnique: async ({ where }: any) => (h.roles[where.id] ? { role: h.roles[where.id] } : null) },
    design: { findUnique: async () => { h.designReads++; return null; } },
  },
}));
vi.mock('../../middleware/auth.middleware', () => ({ isDesignOwner: async (u: string, d: string) => h.owner[d] === u }));

import { createExportWorker, initializeExportQueue, getExportJobStatus } from './export.worker';

const job = (requestedBy?: string) => ({ id: 'j1', data: { designId: 'D1', format: 'png', requestedBy }, getState: async () => 'completed', progress: 100, returnvalue: { url: 'u' }, failedReason: undefined });

beforeEach(() => { h.designReads = 0; h.jobs = {}; });

describe('export worker processor', () => {
  it('refuses a non-owner, a vendor-like user and a missing requester before reading the design', async () => {
    createExportWorker({} as any);
    for (const who of ['cust2', 'vend1', undefined]) {
      await expect(h.processor(job(who))).rejects.toThrow();
    }
    expect(h.designReads).toBe(0);
  });
  it('lets the owner through to the design read', async () => {
    createExportWorker({} as any);
    await expect(h.processor(job('cust1'))).rejects.toThrow('not found');
    expect(h.designReads).toBe(1);
  });
});

describe('getExportJobStatus', () => {
  it('returns data to the requester and admin, null to others', async () => {
    initializeExportQueue({} as any);
    h.jobs.j1 = job('cust1');
    expect((await getExportJobStatus('j1', 'cust1'))?.data.designId).toBe('D1');
    expect((await getExportJobStatus('j1', 'admin1'))?.id).toBe('j1');
    expect(await getExportJobStatus('j1', 'cust2')).toBeNull();
    expect(await getExportJobStatus('j1')).toBeNull();
    expect(await getExportJobStatus('nope', 'cust1')).toBeNull();
  });
});
