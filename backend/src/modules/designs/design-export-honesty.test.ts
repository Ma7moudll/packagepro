import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  design: { id: 'd1', lifecycleStatus: 'DRAFT', orderId: null, updatedAt: new Date(), designData: {} } as any,
  owner: true,
}));
vi.mock('../../lib/prisma', () => ({ prisma: { design: { findUnique: async () => mocks.design } } }));
vi.mock('../../lib/redis', () => ({ getRedisClient: () => null }));
vi.mock('../../services/file-upload/upload.service', () => ({ fileUploadService: {} }));
vi.mock('../../middleware/auth.middleware', () => ({ isDesignOwner: async () => mocks.owner }));
vi.mock('../../services/pre-press-checker/prepress.service', () => ({ prePressCheckService: { getPrePressResults: async () => null } }));

import { designService } from './design.service';

describe('server-side export does not fake success', () => {
  beforeEach(() => { mocks.owner = true; });

  it.each(['png', 'pdf', 'ai', 'eps'] as const)('%s is rejected as not implemented, never queued', async (format) => {
    await expect(designService.exportDesign('d1', 'u1', { format })).rejects.toMatchObject({ statusCode: 501 });
  });

  it('certified svg still returns a receipt', async () => {
    const result = await designService.exportDesign('d1', 'u1', { format: 'svg', options: { dieline: true } });
    expect(result).toBeTruthy();
    expect(result).not.toHaveProperty('jobId');
  });

  it('non-owners are still refused before anything else', async () => {
    mocks.owner = false;
    await expect(designService.exportDesign('d1', 'u2', { format: 'png' })).rejects.toMatchObject({ statusCode: 403 });
  });
});
