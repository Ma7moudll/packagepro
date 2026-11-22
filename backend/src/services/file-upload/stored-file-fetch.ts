import axios from 'axios';
import dns from 'node:dns';
import type http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import ipaddr from 'ipaddr.js';
import { fileUploadService } from './upload.service';

/**
 * Server-side download of a stored design file (print_file, preview).
 *
 * DesignFile.fileUrl comes from client input, so it is never fetched blindly:
 *  - /api/files/<key> is read from local storage (realpath contained, size
 *    capped), never over HTTP.
 *  - Anything else must be https on an origin (host AND port) that the
 *    operator configured: CDN_URL, S3_ENDPOINT or STORED_FILE_ALLOWED_HOSTS
 *    ("host" means port 443, "host:port" is exact). Nothing is allowed by
 *    default, so an unconfigured deployment fails closed.
 *  - The address the socket connects to is validated inside the connection's
 *    own DNS lookup (no second resolution, so no rebinding window). Only
 *    globally routable unicast addresses pass (ipaddr.js range === 'unicast',
 *    IPv4-mapped IPv6 unwrapped). The one exception is the exact origin of
 *    S3_ENDPOINT (e.g. an internal MinIO), which may be private.
 *  - Proxies are NOT used (proxy: false, explicit agents), so HTTP(S)_PROXY
 *    environment variables cannot redirect the request or bypass the check.
 *  - No redirects, 15s timeout, 50MB cap, generic error codes.
 * Outside production only, loopback http/https is allowed so local test
 * servers keep working.
 */
export class StoredFileFetchError extends Error {
  constructor(public readonly code: string) {
    super(`Stored file cannot be fetched (${code})`);
    this.name = 'StoredFileFetchError';
  }
}

export const MAX_STORED_FILE_BYTES = 50 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const LOCAL_PREFIX = '/api/files/';

/** True only for globally routable unicast addresses. */
export function isPublicAddress(address: string): boolean {
  if (!ipaddr.isValid(address)) return false;
  let parsed = ipaddr.parse(address);
  if (parsed.kind() === 'ipv6' && (parsed as ipaddr.IPv6).isIPv4MappedAddress()) {
    parsed = (parsed as ipaddr.IPv6).toIPv4Address();
  }
  return parsed.range() === 'unicast';
}
/** Kept for callers/tests that think in the negative. */
export const isPrivateAddress = (address: string) => !isPublicAddress(address);

type Origin = string; // "host:port", host lowercased, no brackets

function originOf(url: URL): Origin {
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const port = url.port || (url.protocol === 'https:' ? '443' : '80');
  return `${host}:${port}`;
}

function parseEntry(entry: string): Origin | null {
  const v = entry.trim().toLowerCase();
  if (!v) return null;
  try {
    // Accept a full URL or "host[:port]"; https and 443 are the defaults.
    const url = new URL(v.includes('://') ? v : `https://${v}`);
    if (url.protocol !== 'https:' || !url.hostname) return null;
    return originOf(url);
  } catch {
    return null;
  }
}

function configuredOrigins(): { allowed: Set<Origin>; privateOk: Origin | null } {
  const allowed = new Set<Origin>();
  const cdn = process.env.CDN_URL ? parseEntry(process.env.CDN_URL) : null;
  if (cdn) allowed.add(cdn);
  for (const e of (process.env.STORED_FILE_ALLOWED_HOSTS || '').split(',')) {
    const o = parseEntry(e);
    if (o) allowed.add(o);
  }
  const s3 = process.env.S3_ENDPOINT ? parseEntry(process.env.S3_ENDPOINT) : null;
  if (s3) allowed.add(s3);
  return { allowed, privateOk: s3 };
}

type Resolver = (host: string) => Promise<{ address: string; family: number }[]>;

const systemResolver: Resolver = (host) =>
  new Promise((resolve, reject) =>
    dns.lookup(host, { all: true }, (err, addrs) => (err ? reject(err) : resolve(addrs)))
  );

/**
 * A net.connect-compatible lookup that validates every resolved address and
 * hands back only a validated one. Using it as the agent's lookup means the
 * socket connects to exactly the address that was checked.
 */
export function createGuardedLookup(allowPrivate: boolean, resolver: Resolver = systemResolver) {
  return (
    hostname: string,
    options: dns.LookupOptions,
    callback: (err: NodeJS.ErrnoException | null, address?: any, family?: number) => void
  ) => {
    resolver(hostname).then(
      (addrs) => {
        const ok = addrs.filter((a) => allowPrivate || isPublicAddress(a.address));
        // Any non-public answer poisons the whole set (mixed answers are suspicious).
        if (addrs.length === 0 || ok.length !== addrs.length) {
          const err: NodeJS.ErrnoException = new Error('blocked address');
          err.code = 'EBLOCKEDADDR';
          return callback(err);
        }
        if (options && (options as any).all) {
          return callback(null, ok.map((a) => ({ address: a.address, family: a.family })));
        }
        callback(null, ok[0].address, ok[0].family);
      },
      (e) => callback(e)
    );
  };
}

async function readLocal(fileUrl: string): Promise<Buffer> {
  let key: string;
  try {
    key = decodeURIComponent(fileUrl.slice(LOCAL_PREFIX.length).split(/[?#]/)[0]);
  } catch {
    throw new StoredFileFetchError('LOCAL_FILE_NOT_FOUND');
  }
  const file = key ? await fileUploadService.readLocalFile(key, { maxBytes: MAX_STORED_FILE_BYTES }) : null;
  if (!file) throw new StoredFileFetchError('LOCAL_FILE_NOT_FOUND');
  return file.buffer;
}

const isLoopbackHost = (h: string) => h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';

export async function fetchStoredFile(
  fileUrl: string,
  opts: { timeoutMs?: number } = {}
): Promise<Buffer> {
  if (fileUrl.startsWith(LOCAL_PREFIX)) return readLocal(fileUrl);

  let url: URL;
  try {
    url = new URL(fileUrl);
  } catch {
    throw new StoredFileFetchError('INVALID_URL');
  }
  if (url.username || url.password) throw new StoredFileFetchError('CREDENTIALS_IN_URL');

  const production = process.env.NODE_ENV === 'production';
  const host = url.hostname.toLowerCase();
  const devLoopback =
    !production && isLoopbackHost(host) && (url.protocol === 'http:' || url.protocol === 'https:');

  let agents: { httpAgent?: http.Agent; httpsAgent?: https.Agent } = {};
  if (!devLoopback) {
    if (url.protocol !== 'https:') throw new StoredFileFetchError('HTTPS_REQUIRED');
    const { allowed, privateOk } = configuredOrigins();
    const origin = originOf(url);
    if (!allowed.has(origin)) throw new StoredFileFetchError('HOST_NOT_ALLOWED');
    const allowPrivate = privateOk !== null && origin === privateOk;
    const bare = host.replace(/^\[|\]$/g, '');
    // IP-literal hosts never reach a DNS lookup, so check them here.
    if (net.isIP(bare) && !allowPrivate && !isPublicAddress(bare)) {
      throw new StoredFileFetchError('PRIVATE_ADDRESS');
    }
    agents = { httpsAgent: new https.Agent({ lookup: createGuardedLookup(allowPrivate) as any }) };
  }

  try {
    const response = await axios.get(url.toString(), {
      responseType: 'arraybuffer',
      maxRedirects: 0,
      timeout: opts.timeoutMs ?? TIMEOUT_MS,
      maxContentLength: MAX_STORED_FILE_BYTES,
      maxBodyLength: MAX_STORED_FILE_BYTES,
      proxy: false,
      ...agents,
    });
    return Buffer.from(response.data);
  } catch {
    // Never expose upstream error text (it can reveal internal reachability).
    throw new StoredFileFetchError('DOWNLOAD_FAILED');
  }
}
