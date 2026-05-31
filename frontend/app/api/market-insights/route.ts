import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"

// GET /api/market-insights - Get market insights
export const GET = withRateLimit(
  100,
  60000,
)(
  withErrorHandling(async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")

    MonitoringService.addBreadcrumb("Fetching market insights", "api", {
      category,
    })

    const insights = await DatabaseService.getMarketInsights(category || undefined)

    return NextResponse.json(insights)
  }),
)
