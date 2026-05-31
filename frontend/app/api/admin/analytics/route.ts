import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { withAdminAuth, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"

interface User {
  id: number | string
  role: string
}

export const GET = withAdminAuth(
  withErrorHandling(async (request: NextRequest, user: User) => {
    const { searchParams } = new URL(request.url)
    const days = Number.parseInt(searchParams.get("days") || "30")

    MonitoringService.addBreadcrumb("Fetching analytics data", "admin", {
      userId: user.id,
      days,
    })

    const [orderStats, topProducts] = await Promise.all([
      DatabaseService.getOrderStats(days),
      DatabaseService.getTopProducts(10, days),
    ])

    return NextResponse.json({
      orderStats,
      topProducts,
    })
  }),
)
