import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyLoginCaptcha } from './captcha.service';

describe('server-side login CAPTCHA verification', () => {
  beforeEach(() => {
    vi.stubEnv('RECAPTCHA_SECRET_KEY', 'test-only-placeholder');
    vi.stubEnv('RECAPTCHA_HOSTNAME', 'example.test');
    vi.stubEnv('RECAPTCHA_RISK_SCORE_THRESHOLD', '0.5');
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
  function stub(body: any, ok = true) { vi.stubGlobal('fetch', vi.fn(async () => ({ ok, json: async () => body }))); }
  const valid = () => ({ success: true, action: 'login', score: 0.9, hostname: 'example.test', challenge_ts: new Date().toISOString() });
  it('accepts a verified fresh response for the right site and action', async () => {
    stub(valid()); await expect(verifyLoginCaptcha('token', '127.0.0.1')).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
    const init = vi.mocked(fetch).mock.calls[0][1]!;
    expect(String(init.body)).toContain('response=token');
    expect(String(init.body)).toContain('secret=test-only-placeholder');
  });
  it.each([
    { success: false }, { action: 'payment' }, { hostname: 'attacker.test' }, { score: 0.1 }, { score: 2 }, { score: '0.9' },
    { challenge_ts: new Date(0).toISOString() }, { challenge_ts: 'invalid' }, { challenge_ts: new Date(Date.now() + 60000).toISOString() },
  ])('refuses invalid response %j', async changes => {
    stub({ ...valid(), ...changes }); await expect(verifyLoginCaptcha('token', 'unknown')).rejects.toThrow('CAPTCHA_REQUIRED');
  });
  it.each(['RECAPTCHA_SECRET_KEY', 'RECAPTCHA_HOSTNAME'])('fails closed without %s', async name => {
    vi.stubEnv(name, ''); stub(valid()); await expect(verifyLoginCaptcha('anything', 'unknown')).rejects.toMatchObject({ statusCode: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('fails closed on upstream errors', async () => { stub({}, false); await expect(verifyLoginCaptcha('token', 'unknown')).rejects.toMatchObject({ statusCode: 503 }); });
  it('fails closed on timeout/network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('timeout'); }));
    await expect(verifyLoginCaptcha('token', 'unknown')).rejects.toMatchObject({ statusCode: 503 });
  });
  it('fails closed on malformed payload', async () => { stub(null); await expect(verifyLoginCaptcha('token', 'unknown')).rejects.toThrow(); });
});
