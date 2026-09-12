import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { withAuth, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"

interface User {
  id: number | string
  role: string
}

// PUT /api/cart/[id] - Update cart item quantity
export const PUT = withAuth(
  withRateLimit(
    100,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User, { params }: { params: Promise<{ id: string }> }) => {
      const { id } = await params
      const cartItemId = Number.parseInt(id)
      const { quantity } = await request.json()

      if (isNaN(cartItemId) || !quantity || quantity < 1) {
        return NextResponse.json({ error: "Invalid data" }, { status: 400 })
      }

      MonitoringService.addBreadcrumb("Updating cart item", "api", {
        userId: user.id,
        cartItemId,
        quantity,
      })

      const updatedItem = await DatabaseService.updateCartItem(cartItemId, quantity)

      return NextResponse.json(updatedItem)
    }),
  ),
)

// DELETE /api/cart/[id] - Remove cart item
export const DELETE = withAuth(
  withRateLimit(
    100,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User, { params }: { params: Promise<{ id: string }> }) => {
      const { id } = await params
      const cartItemId = Number.parseInt(id)

      if (isNaN(cartItemId)) {
        return NextResponse.json({ error: "Invalid cart item ID" }, { status: 400 })
      }

      MonitoringService.addBreadcrumb("Removing cart item", "api", {
        userId: user.id,
        cartItemId,
      })

      await DatabaseService.removeFromCart(cartItemId)

      return NextResponse.json({ success: true })
    }),
  ),
)
