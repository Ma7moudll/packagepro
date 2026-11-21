import { AppError, AuthenticationError } from '../../../utils/errors';

/** Verify legacy reCAPTCHA v3 tokens on the server. Never accept a token string alone.
 * Existing project deployment contract uses RECAPTCHA_SECRET_KEY.
 * Reference: https://developers.google.com/recaptcha/docs/v3
 */
export async function verifyLoginCaptcha(token: string, ip: string): Promise<void> {
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  const hostname = process.env.RECAPTCHA_HOSTNAME;
  const threshold = Number(process.env.RECAPTCHA_RISK_SCORE_THRESHOLD || '0.5');
  if (!secret || !hostname || !Number.isFinite(threshold) || threshold < 0 || threshold > 1) {
    throw new AppError(503, 'CAPTCHA verification is unavailable', 'CAPTCHA_UNAVAILABLE');
  }
  let result: { success?: boolean; action?: string; score?: number; hostname?: string; challenge_ts?: string };
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, ...(ip !== 'unknown' ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('CAPTCHA upstream unavailable');
    result = await response.json() as typeof result;
  } catch {
    throw new AppError(503, 'CAPTCHA verification is unavailable', 'CAPTCHA_UNAVAILABLE');
  }
  if (!result || typeof result !== 'object') throw new AppError(503, 'CAPTCHA verification is unavailable', 'CAPTCHA_UNAVAILABLE');
  const age = Date.now() - Date.parse(result.challenge_ts || '');
  if (result.success !== true || result.action !== 'login' || result.hostname !== hostname ||
      typeof result.score !== 'number' || !Number.isFinite(result.score) || result.score < threshold || result.score > 1 ||
      !Number.isFinite(age) || age < -30000 || age > 120000) {
    throw new AuthenticationError('CAPTCHA_REQUIRED');
  }
}
