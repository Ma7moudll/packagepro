import Redis from 'ioredis';

let redis: Redis | null = null;
let redisEnabled = false;
let connectionAttempted = false;

export function getRedisClient(): Redis | null {
  // Don't attempt connection if disabled or already failed
  if (process.env.REDIS_ENABLED === 'false' || !process.env.REDIS_URL) {
    return null;
  }

  if (connectionAttempted && !redis) {
    return null;
  }

  if (!redis && !connectionAttempted) {
    connectionAttempted = true;
    try {
      redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        maxRetriesPerRequest: 0, // Don't retry
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        retryStrategy: () => null, // Don't retry on failure
      });

      redis.on('error', (err) => {
        // Silently disable Redis on any error
        if (err.message.includes('NOAUTH') || 
            err.message.includes('ECONNREFUSED') ||
            err.message.includes('Connection')) {
          redisEnabled = false;
          redis = null;
        }
      });

      redis.on('connect', () => {
        redisEnabled = true;
        console.log('✅ Redis Client Connected');
      });

      redis.on('close', () => {
        redisEnabled = false;
        redis = null;
      });
    } catch (error) {
      redisEnabled = false;
      redis = null;
    }
  }

  return redis;
}

export async function connectRedis(): Promise<void> {
  // Skip if explicitly disabled
  if (process.env.REDIS_ENABLED === 'false' || !process.env.REDIS_URL) {
    return;
  }

  try {
    const client = getRedisClient();
    if (!client) {
      return;
    }

    // Try to connect with timeout
    await Promise.race([
      client.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Redis connection timeout')), 2000)
      ),
    ]).catch(() => {
      redisEnabled = false;
      redis = null;
    });
  } catch (error) {
    // Redis is optional - silently fail
    redisEnabled = false;
    redis = null;
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
    } catch (error) {
      // Ignore errors on disconnect
    }
    redis = null;
  }
}

export function isRedisEnabled(): boolean {
  return redisEnabled && redis !== null;
}

export default getRedisClient;