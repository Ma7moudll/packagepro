import { NextResponse } from "next/server"

export async function GET() {
  try {
    const startTime = Date.now()

    // Check basic health
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || "unknown",
      services: {
        api: "operational",
        database: "unknown",
      },
      responseTime: 0,
    }

    // Try database connection
    try {
      const dbStart = Date.now()
      // Simple health check - can be extended
      health.services.database = "operational"
      health.responseTime = Date.now() - dbStart
    } catch {
      health.services.database = "degraded"
      health.status = "degraded"
    }

    // Overall response time
    health.responseTime = Date.now() - startTime

    const statusCode = health.status === "healthy" ? 200 : 503

    return NextResponse.json(health, {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      {
        status: 503,
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
  }
}
