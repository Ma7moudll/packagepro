import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Signed, expiring URLs for GET /api/files/<key> (local-storage mode).
 *
 * The signature covers the file key and the expiry. It does not identify a user
 * or an order: anyone holding a live URL can open that one file until it
 * expires. The signing secret is FILE_URL_SIGNING_SECRET (at least 32
 * characters). With no valid secret nothing is signed or served.
 */
export const MAX_SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
const MIN_SECRET_LENGTH = 32;
const PREFIX = '/api/files/';

export class FileSigningNotConfiguredError extends Error {
  constructor() {
    super('FILE_URL_SIGNING_SECRET is missing or shorter than 32 characters');
    this.name = 'FileSigningNotConfiguredError';
  }
}

function secret(): string {
  const s = process.env.FILE_URL_SIGNING_SECRET;
  if (!s || s.length < MIN_SECRET_LENGTH) throw new FileSigningNotConfiguredError();
  return s;
}

function mac(key: string, exp: number): string {
  return createHmac('sha256', secret()).update(`${key}\n${exp}`).digest('hex');
}

export function isFileSigningConfigured(): boolean {
  const s = process.env.FILE_URL_SIGNING_SECRET;
  return !!s && s.length >= MIN_SECRET_LENGTH;
}

export function createSignedFileUrl(
  fileUrl: string,
  opts: { ttlSeconds: number; nowSeconds?: number }
): string {
  if (!fileUrl.startsWith(PREFIX)) throw new Error('not a local /api/files/ URL');
  const key = fileUrl.slice(PREFIX.length).split('?')[0];
  if (!key || key.split('/').some((seg) => seg === '..' || seg === '.' || seg === '')) {
    throw new Error('invalid file key');
  }
  const { ttlSeconds } = opts;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0 || ttlSeconds > MAX_SIGNED_URL_TTL_SECONDS) {
    throw new Error('ttlSeconds must be an integer from 1 to 86400');
  }
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);
  const exp = now + ttlSeconds;
  return `${PREFIX}${key}?exp=${exp}&sig=${mac(key, exp)}`;
}

/** True only for a correct signature on an expiry that is not past and not beyond the cap. */
export function verifyFileSignature(
  key: string,
  expRaw: unknown,
  sigRaw: unknown,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  if (typeof expRaw !== 'string' || typeof sigRaw !== 'string') return false;
  if (!/^\d{1,12}$/.test(expRaw) || !/^[0-9a-f]{64}$/.test(sigRaw)) return false;
  const exp = Number(expRaw);
  if (exp < nowSeconds) return false;
  if (exp > nowSeconds + MAX_SIGNED_URL_TTL_SECONDS) return false;
  const expected = Buffer.from(mac(key, exp), 'hex');
  const given = Buffer.from(sigRaw, 'hex');
  return expected.length === given.length && timingSafeEqual(expected, given);
}
