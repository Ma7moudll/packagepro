import Redis from 'ioredis';

let redis: Redis | null = null;
let stopping = false;

export function getRedisClient(): Redis | null {
  if (process.env.REDIS_ENABLED === 'false' || !process.env.REDIS_URL || stopping) return null;
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 0,
      connectTimeout: 2000,
      // Retain the client across transient outages. Security callers still
      // refuse commands until ready; no unbounded offline command buffering.
      retryStrategy: (attempt) => Math.min(250 * 2 ** Math.min(attempt - 1, 7), 30000),
    });
    // ioredis emits errors during backoff. Readiness owns availability, not
    // presence of a client or a TCP connection before AUTH/ready completes.
    redis.on('error', () => {});
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  stopping = false;
  const client = getRedisClient();
  if (!client || client.status !== 'wait') return;
  // Initial failure starts ioredis' bounded backoff. Never discard this client.
  try { await client.connect(); } catch { /* auth remains fail closed */ }
}

export async function disconnectRedis(): Promise<void> {
  stopping = true;
  const client = redis;
  redis = null;
  if (client) client.disconnect();
}

export function isRedisEnabled(): boolean {
  return !stopping && redis?.status === 'ready';
}
export default getRedisClient;
