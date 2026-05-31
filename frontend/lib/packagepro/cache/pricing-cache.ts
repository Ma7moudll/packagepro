/**
 * Pricing Cache using Redis
 * Caches calculated prices to avoid recomputation
 */

import { getConfig } from "../config"
import { logger } from "../utils/logger"
import { createClient, RedisClientType } from "redis"

let redisClient: RedisClientType | null = null

/**
 * Get Redis client (singleton)
 */
async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    const config = getConfig()
    redisClient = createClient({
      url: config.redis.url,
      password: config.redis.password,
      database: config.redis.db,
    })

    redisClient.on("error", (err) => {
      logger.error("Redis client error", { error: err })
    })

    await redisClient.connect()
  }

  return redisClient
}

/**
 * Generate cache key for pricing request
 */
function generateCacheKey(request: {
  productId: string
  qty: number
  material: string
  dimensions: any
  printType?: string
}): string {
  const keyParts = [
    "pricing",
    request.productId,
    request.qty,
    request.material,
    JSON.stringify(request.dimensions),
    request.printType || "digital_print",
  ]

  // Hash the key for shorter cache keys (optional)
  return keyParts.join(":")
}

/**
 * Get cached price
 */
export async function getCachedPrice(request: {
  productId: string
  qty: number
  material: string
  dimensions: any
  printType?: string
}): Promise<any | null> {
  try {
    const config = getConfig()
    if (!config.features.enablePriceCache) {
      return null
    }

    const client = await getRedisClient()
    const key = generateCacheKey(request)

    const cached = await client.get(key)
    if (cached) {
      logger.debug("Cache hit", { key })
      return JSON.parse(cached)
    }

    logger.debug("Cache miss", { key })
    return null
  } catch (error) {
    logger.error("Error getting cached price", { error, request })
    // Don't throw - return null on cache errors (fail gracefully)
    return null
  }
}

/**
 * Set cached price
 */
export async function setCachedPrice(
  request: {
    productId: string
    qty: number
    material: string
    dimensions: any
    printType?: string
  },
  priceResult: any,
  ttl: number = 3600, // Default 1 hour
): Promise<void> {
  try {
    const config = getConfig()
    if (!config.features.enablePriceCache) {
      return
    }

    const client = await getRedisClient()
    const key = generateCacheKey(request)

    await client.setEx(key, ttl || config.pricing.cacheTtl, JSON.stringify(priceResult))
    logger.debug("Price cached", { key, ttl })
  } catch (error) {
    logger.error("Error caching price", { error, request })
    // Don't throw - caching errors shouldn't break the flow
  }
}

/**
 * Invalidate cache for a product
 */
export async function invalidateProductCache(productId: string): Promise<void> {
  try {
    const client = await getRedisClient()
    const pattern = `pricing:${productId}:*`

    // Redis SCAN to find all matching keys
    let cursor = 0
    do {
      const result = await client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      })
      cursor = result.cursor

      if (result.keys.length > 0) {
        await client.del(result.keys)
        logger.debug("Cache invalidated", { productId, keysDeleted: result.keys.length })
      }
    } while (cursor !== 0)
  } catch (error) {
    logger.error("Error invalidating cache", { error, productId })
  }
}

/**
 * Clear all pricing cache
 */
export async function clearPricingCache(): Promise<void> {
  try {
    const client = await getRedisClient()
    const pattern = "pricing:*"

    let cursor = 0
    do {
      const result = await client.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      })
      cursor = result.cursor

      if (result.keys.length > 0) {
        await client.del(result.keys)
      }
    } while (cursor !== 0)

    logger.info("All pricing cache cleared")
  } catch (error) {
    logger.error("Error clearing cache", { error })
  }
}

