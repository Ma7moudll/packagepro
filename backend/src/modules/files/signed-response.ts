import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import { createSignedFileUrl, isFileSigningConfigured } from './signed-url';
import {
  authorizeFileUrls,
  logDeniedFileAccess,
  normaliseFileUrl,
  prismaRefLoader,
  type Actor,
  type FileRefPrisma,
  type RefLoader,
} from './file-access';
import { logger } from '../../utils/logger';

/**
 * JSON responses never carry a raw /api/files/ value. Each one is replaced by a
 * signed URL (15 minutes) when the authenticated requester is entitled to that
 * file (see file-access.ts), and by null otherwise. Stored values are not changed.
 * With no signing secret nothing is signed and every such value becomes null.
 */
export const SIGNED_RESPONSE_TTL_SECONDS = 15 * 60;
const MAX_DEPTH = 16;

function isPlain(v: unknown): v is Record<string, unknown> {
  if (v === null || typeof v !== 'object') return false;
  const proto = Object.getPrototypeOf(v);
  return proto === Object.prototype || proto === null;
}

/** Walk plain objects and arrays. Tracks only the current ancestry (cycles), so a value shared in two places is visited twice. */
function walk(value: unknown, onString: (s: string) => unknown, ancestry: Set<object> = new Set(), depth = 0, state: { withheld: boolean } = { withheld: false }): unknown {
  if (typeof value === 'string') return onString(value);
  if (value === null || typeof value !== 'object') return value;
  // Fail closed: past the depth limit, or on a cycle, a subtree that holds a local file URL is withheld, not passed through raw.
  if (depth >= MAX_DEPTH || ancestry.has(value as object)) {
    if (containsLocalFileUrl(value)) { state.withheld = true; return null; }
    return value;
  }
  if (!Array.isArray(value) && !isPlain(value)) {
    const toJSON = (value as { toJSON?: () => unknown }).toJSON;
    if (typeof toJSON === 'function') return walk(toJSON.call(value), onString, ancestry, depth + 1, state);
    return value;
  }
  ancestry.add(value as object);
  try {
    if (Array.isArray(value)) return value.map((v) => walk(v, onString, ancestry, depth + 1, state));
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = walk(v, onString, ancestry, depth + 1, state);
    return out;
  } finally {
    ancestry.delete(value as object);
  }
}

function containsLocalFileUrl(value: unknown): boolean {
  try {
    return JSON.stringify(value)?.includes('"/api/files/') ?? false;
  } catch {
    return true; // cyclic or unserialisable: assume it may
  }
}

/** Local file URLs found in a payload, and whether a subtree had to be withheld (too deep, or cyclic, and holding one). */
export function scanFileUrls(value: unknown): { urls: string[]; withheld: boolean } {
  const found = new Set<string>();
  const state = { withheld: false };
  walk(value, (s) => {
    const n = normaliseFileUrl(s);
    if (n) found.add(n);
    return s;
  }, new Set(), 0, state);
  return { urls: [...found], withheld: state.withheld };
}

export function collectFileUrls(value: unknown): string[] {
  return scanFileUrls(value).urls;
}

/** Replace every local file URL using `map` (called with the normalised URL). */
export function mapFileUrls(value: unknown, map: (normalised: string) => string | null): unknown {
  return walk(value, (s) => {
    const n = normaliseFileUrl(s);
    return n ? map(n) : s;
  });
}

export function createSignedFileUrlResponses(deps: { loader: () => RefLoader }): FastifyPluginAsync {
  const plugin: FastifyPluginAsync = async (fastify) => {
    fastify.addHook('preSerialization', async (request: FastifyRequest, _reply, payload) => {
      const { urls, withheld } = scanFileUrls(payload);
      if (urls.length === 0 && !withheld) return payload;
      const actor = (request as FastifyRequest & { user?: Actor }).user;
      const where = `${request.method} ${request.routeOptions?.url ?? 'unknown'}`;
      let allowed = new Set<string>();
      if (!isFileSigningConfigured()) {
        logger.error('FILE_URL_SIGNING_SECRET is missing or too short: file URLs withheld', where);
      } else {
        try {
          const res = await authorizeFileUrls(actor, urls, deps.loader());
          allowed = res.allowed;
          logDeniedFileAccess(actor, res.denied, where);
        } catch (err) {
          // Fail closed: nothing is signed when entitlement cannot be checked.
          logger.error('file entitlement check failed: file URLs withheld', where, err);
        }
      }
      return mapFileUrls(payload, (n) => {
        if (!allowed.has(n)) return null;
        try {
          return createSignedFileUrl(n, { ttlSeconds: SIGNED_RESPONSE_TTL_SECONDS });
        } catch (err) {
          // An unsignable key (bad path, bad secret) never fails the response: the value becomes null.
          logger.error('file URL could not be signed: value withheld', where, err instanceof Error ? err.message : 'unknown');
          return null;
        }
      });
    });
  };
  (plugin as unknown as Record<symbol, boolean>)[Symbol.for('skip-override')] = true;
  return plugin;
}

/** Production wiring: loads references with the shared Prisma client on first use. */
export const signedFileUrlResponses: FastifyPluginAsync = createSignedFileUrlResponses({
  loader: () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { prisma } = require('../../lib/prisma') as { prisma: FileRefPrisma };
    return prismaRefLoader(prisma);
  },
});
