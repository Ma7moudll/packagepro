import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { CartItemSchema } from "@/lib/validation"
import { withAuth, withValidation, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"

interface User {
  id: number | string
  role: string
}

interface GroupBuyingOpportunity {
  productId: number
  opportunity: any // DatabaseService.findGroupBuyingOpportunities returns any or a specific type?
}

// GET /api/cart - Get cart items
export const GET = withAuth(
  withRateLimit(
    200,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User) => {
      MonitoringService.addBreadcrumb("Fetching cart items", "api", {
        userId: user.id,
      })

      const cartItems = await DatabaseService.getCartItems(Number(user.id))

      // Check for group buying opportunities
      const groupBuyingOpportunities: GroupBuyingOpportunity[] = []
      for (const item of cartItems) {
        const opportunity = await DatabaseService.findGroupBuyingOpportunities(item.productId, item.quantity)
        if (opportunity) {
          groupBuyingOpportunities.push({
            productId: item.productId,
            opportunity,
          })
        }
      }

      return NextResponse.json({
        cartItems,
        groupBuyingOpportunities,
      })
    }),
  ),
)

// POST /api/cart - Add item to cart
export const POST = withAuth(
  withValidation(
    CartItemSchema,
    withRateLimit(
      100,
      60000,
    )(
      withErrorHandling(async (request: NextRequest, data: any, user: User) => {
        MonitoringService.addBreadcrumb("Adding item to cart", "api", {
          userId: user.id,
          productId: data.productId,
        })

        // Verify product exists and is available
        const product = await DatabaseService.getProductById(data.productId)
        if (!product) {
          return NextResponse.json({ error: "Product not found" }, { status: 404 })
        }

        if (!product.isActive || !product.isApproved) {
          return NextResponse.json({ error: "Product not available" }, { status: 400 })
        }

        if (product.stock < data.quantity) {
          return NextResponse.json({ error: "Insufficient stock" }, { status: 400 })
        }

        const cartItem = await DatabaseService.addToCart({
          userId: Number(user.id),
          productId: data.productId,
          quantity: data.quantity,
          size: data.size,
          color: data.color,
          customizationDetails: data.customizationDetails,
        })

        MonitoringService.captureMessage(`Item added to cart: ${data.productId}`, "info")

        return NextResponse.json(cartItem, { status: 201 })
      }),
    ),
  ),
)
