import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/** Each negative case must initialize a fresh transporter, not reuse the
 * rejected dynamic import from an earlier case. No network transport is built. */
describe('email transport guard (EMAIL_PROVIDER=test outside test mode)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('EMAIL_PROVIDER', 'test');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('fails closed with NODE_ENV=production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await expect(import('./email.service')).rejects.toThrow(
      /only allowed with NODE_ENV=test/
    );
  });

  it('fails closed with NODE_ENV unset', async () => {
    vi.stubEnv('NODE_ENV', undefined);
    await expect(import('./email.service')).rejects.toThrow(
      /only allowed with NODE_ENV=test/
    );
  });
});
