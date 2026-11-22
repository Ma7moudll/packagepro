import { NextRequest, NextResponse } from "next/server"

// Base of the real Fastify backend, normalised the same way as
// lib/api/client.ts: NEXT_PUBLIC_API_URL may or may not end with "/api";
// this route always appends "/api/public/stats" itself.
const BACKEND_URL = (() => {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  )
  return raw.endsWith("/api") ? raw.slice(0, -"/api".length) : raw
})()

// Every failure from this route is the same plain 502. The body never
// carries the backend URL/host, the backend's status or message, or any
// network error detail — those are logged server-side only.
const GENERIC_FAILURE = { success: false, error: "Failed to fetch stats" } as const

function genericFailure() {
  return NextResponse.json({ ...GENERIC_FAILURE }, { status: 502 })
}

// The route takes no query parameters of its own. If a caller passes the
// usual list-style params anyway, validate their bounds instead of
// silently accepting garbage: limit must be an integer in [1, 100],
// offset an integer in [0, 10000].
function hasValidQueryBounds(searchParams: URLSearchParams): boolean {
  const check = (value: string | null, min: number, max: number): boolean => {
    if (value === null) return true
    if (!/^\d+$/.test(value)) return false
    const n = Number(value)
    return n >= min && n <= max
  }
  return check(searchParams.get("limit"), 1, 100) && check(searchParams.get("offset"), 0, 10000)
}

export async function GET(request: NextRequest) {
  if (!hasValidQueryBounds(new URL(request.url).searchParams)) {
    return NextResponse.json(
      { success: false, error: "Invalid query parameters" },
      { status: 400 },
    )
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/public/stats`, {
      cache: "no-store",
    })

    if (!response.ok) {
      console.error(`GET /api/stats: backend responded ${response.status}`)
      return genericFailure()
    }

    const data = await response.json()

    if (!data.success || !data.data) {
      console.error("GET /api/stats: backend reported failure")
      return genericFailure()
    }

    const stats = data.data

    return NextResponse.json({
      success: true,
      stats: {
        completedDeals: {
          value: stats.completedDeals.value,
          raw: stats.completedDeals.value,
        },
        registeredFactories: {
          value: stats.registeredFactories.value,
          raw: stats.registeredFactories.value,
        },
        transactionVolume: {
          value: stats.transactionVolume.value,
          raw: stats.transactionVolume.value,
        },
        activeTraders: {
          value: stats.activeTraders.value,
          raw: stats.activeTraders.value,
        },
        categories: stats.categories || {},
      },
    })
  } catch (error) {
    // Network failure, invalid JSON, or a malformed stats payload. The
    // detail stays in the server log; the client gets the generic 502.
    console.error(
      "GET /api/stats: backend request failed",
      error instanceof Error ? error.message : error,
    )
    return genericFailure()
  }
}
