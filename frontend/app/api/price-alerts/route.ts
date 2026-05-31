import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { PriceAlertSchema } from "@/lib/validation"
import { withValidation, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"
import { AuthService } from "@/lib/auth" // Declared the AuthService variable

interface User {
  id: number | string
  role: string
}



// POST /api/price-alerts - Create price alert
export const POST = withValidation(
  PriceAlertSchema,
  withRateLimit(
    30,
    60000,
  )(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    withErrorHandling(async (request: NextRequest, data: any) => {
      const authHeader = request.headers.get("authorization")
      let user: User | null = null

      // Try to get user if authenticated
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7)
          user = (await AuthService.getCurrentUser(token)) as User
        } catch {
          // Guest alerts allowed
        }
      }

      MonitoringService.addBreadcrumb("Creating price alert", "api", {
        userId: user?.id,
        customerEmail: data.customerEmail,
        productId: data.productId,
      })

      // Get current product price
      const product = await DatabaseService.getProductById(data.productId)
      if (!product) {
        return NextResponse.json({ error: "Product not found" }, { status: 404 })
      }

      if (data.targetPrice >= product.price) {
        return NextResponse.json({ error: "Target price must be lower than current price" }, { status: 400 })
      }

      const priceAlert = await DatabaseService.createPriceAlert({
        customerId: user?.id ? Number(user.id) : undefined,
        customerEmail: data.customerEmail,
        productId: data.productId,
        currentPrice: product.price,
        targetPrice: data.targetPrice,
      })

      MonitoringService.captureMessage(`Price alert created for product: ${data.productId}`, "info")

      return NextResponse.json(priceAlert, { status: 201 })
    }),
  ),
)
