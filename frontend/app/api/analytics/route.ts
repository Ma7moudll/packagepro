import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { withManufacturerAuth, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"

interface User {
  id: number | string
  role: string
}

// GET /api/analytics - Get manufacturer analytics
export const GET = withManufacturerAuth(
  withRateLimit(
    50,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User) => {
      const { searchParams } = new URL(request.url)
      const days = Number.parseInt(searchParams.get("days") || "30")

      MonitoringService.addBreadcrumb("Fetching manufacturer analytics", "api", {
        manufacturerId: user.id,
        days,
      })

      const analytics = await DatabaseService.getManufacturerAnalytics(Number(user.id), days)

      return NextResponse.json(analytics)
    }),
  ),
)
