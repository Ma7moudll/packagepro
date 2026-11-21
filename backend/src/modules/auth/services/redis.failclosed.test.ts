import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthRedisService } from './redis.service';
const state = vi.hoisted(() => ({ enabled: false, client: null as any }));
vi.mock('../../../lib/redis', () => ({ getRedisClient: () => state.client, isRedisEnabled: () => state.enabled, connectRedis: async () => {}, disconnectRedis: async () => {} }));
const calls: Array<[string, any[]]> = [
  ['recordFailedLoginAttempt', ['test@test.local', '127.0.0.1']],
  ['getFailedLoginAttempts', ['test@test.local', '127.0.0.1']],
  ['clearFailedLoginAttempts', ['test@test.local', '127.0.0.1']],
  ['requireCaptcha', ['test@test.local', '127.0.0.1']],
  ['isCaptchaRequired', ['test@test.local', '127.0.0.1']],
  ['clearCaptchaRequirement', ['test@test.local', '127.0.0.1']],
  ['blacklistRefreshToken', ['token-id', 100]],
  ['isRefreshTokenBlacklisted', ['token-id']],
  ['recordEmailVerificationAttempt', ['test@test.local']],
  ['getEmailVerificationAttempts', ['test@test.local']],
  ['clearEmailVerificationAttempts', ['test@test.local']],
  ['recordPasswordResetAttempt', ['test@test.local']],
  ['getPasswordResetAttempts', ['test@test.local']],
  ['clearPasswordResetAttempts', ['test@test.local']],
];
describe('auth storage cannot fail open', () => {
  const service = new AuthRedisService() as any;
  beforeEach(() => { state.enabled = false; state.client = null; });
  it.each(calls)('%s refuses absent storage', async (method, args) => {
    await expect(service[method](...args)).rejects.toMatchObject({ statusCode: 503, code: 'AUTH_STORAGE_UNAVAILABLE' });
  });
  it.each(calls)('%s refuses runtime storage failure', async (method, args) => {
    state.enabled = true;
    const failure = vi.fn(async () => { throw new Error('connection lost'); });
    state.client = { get: failure, setex: failure, exists: failure, del: failure, incr: failure, expire: failure };
    await expect(service[method](...args)).rejects.toThrow('connection lost');
  });
  it('available storage retains revocations and CAPTCHA decisions', async () => {
    state.enabled = true; state.client = { exists: vi.fn(async () => 1) };
    expect(await service.isCaptchaRequired('test@test.local', '127.0.0.1')).toBe(true);
    expect(await service.isRefreshTokenBlacklisted('token-id')).toBe(true);
  });
});
