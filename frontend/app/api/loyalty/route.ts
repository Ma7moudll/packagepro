import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { withAuth, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"

interface User {
  id: number | string
  role: string
}

// GET /api/loyalty - Get user loyalty points
export const GET = withAuth(
  withRateLimit(
    100,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User) => {
      MonitoringService.addBreadcrumb("Fetching loyalty points", "api", {
        userId: user.id,
      })

      const points = await DatabaseService.getUserLoyaltyPoints(Number(user.id))

      return NextResponse.json({ points })
    }),
  ),
)

// POST /api/loyalty/redeem - Redeem loyalty points
export const POST = withAuth(
  withRateLimit(
    20,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User) => {
      const { points, description } = await request.json()

      if (!points || points < 1) {
        return NextResponse.json({ error: "Invalid points amount" }, { status: 400 })
      }

      MonitoringService.addBreadcrumb("Redeeming loyalty points", "api", {
        userId: user.id,
        points,
      })

      // Check if user has enough points
      const currentPoints = await DatabaseService.getUserLoyaltyPoints(Number(user.id))
      if (currentPoints < points) {
        return NextResponse.json({ error: "Insufficient points" }, { status: 400 })
      }

      const redemption = await DatabaseService.redeemLoyaltyPoints(Number(user.id), points, description)

      MonitoringService.captureMessage(`Points redeemed: ${points} by user ${user.id}`, "info")

      return NextResponse.json(redemption, { status: 201 })
    }),
  ),
)
