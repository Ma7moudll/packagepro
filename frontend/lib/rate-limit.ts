import { type NextRequest, NextResponse } from "next/server"

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export function rateLimit(
  request: NextRequest,
  options = {
    limit: 100,
    window: 60 * 1000, // 1 minute
  },
) {
  // Get client IP
  const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || request.ip || "unknown"

  const key = `${ip}:${new Date().getTime() / options.window}`
  const now = Date.now()

  // Clean old entries
  Object.keys(store).forEach((k) => {
    if (store[k].resetTime < now) {
      delete store[k]
    }
  })

  // Check rate limit
  if (!store[key]) {
    store[key] = {
      count: 1,
      resetTime: now + options.window,
    }
  } else {
    store[key].count++
  }

  const isLimited = store[key].count > options.limit

  return {
    isLimited,
    current: store[key].count,
    limit: options.limit,
    remaining: Math.max(0, options.limit - store[key].count),
    resetTime: new Date(store[key].resetTime),
  }
}

interface RateLimitResult {
  isLimited: boolean
  current: number
  limit: number
  remaining: number
  resetTime: Date
}

export function handleRateLimit(rateLimit: RateLimitResult) {
  if (rateLimit.isLimited) {
    return NextResponse.json(
      {
        error: "Too many requests",
        retryAfter: rateLimit.resetTime,
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((rateLimit.resetTime.getTime() - Date.now()) / 1000).toString(),
        },
      },
    )
  }
  return null
}
