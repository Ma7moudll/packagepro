import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

import { CustomOrderSchema } from "@/lib/validation"
import { withValidation, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"
import { AuthService } from "@/lib/auth" // Import AuthService
import { withAuth } from "@/lib/authMiddleware" // Import withAuth

interface User {
  id: number | string
  role: string
  email?: string
  name?: string
}



// POST /api/custom-orders - Create custom order request
export const POST = withValidation(
  CustomOrderSchema,
  withRateLimit(
    10,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, data: any) => {
      const authHeader = request.headers.get("authorization")
      let user: User | null = null

      // Try to get user if authenticated
      if (authHeader?.startsWith("Bearer ")) {
        try {
          const token = authHeader.substring(7)
          user = (await AuthService.getCurrentUser(token)) as User
        } catch {
          // Guest requests allowed
        }
      }

      MonitoringService.addBreadcrumb("Creating custom order", "api", {
        userId: user?.id,
        customerEmail: data.customerEmail,
        productId: data.productId,
      })

      // Generate unique request number
      const requestNumber = `RFQ-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      const customOrder = await DatabaseService.createCustomOrder({
        requestNumber,
        customerId: user?.id ? Number(user.id) : undefined,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        productId: data.productId,
        productName: data.productName,
        quantity: data.quantity,
        specifications: data.specifications,
        customizations: data.customizations,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        budgetRange: data.budgetRange,
      })

      // Send confirmation email (optional, can be implemented later)
      // await EmailService.sendCustomOrderNotification({...})

      MonitoringService.captureMessage(`Custom order created: ${requestNumber}`, "info")

      return NextResponse.json(customOrder, { status: 201 })
    }),
  ),
)

// GET /api/custom-orders - Get custom orders (for manufacturers)
export const GET = withAuth(
  withRateLimit(
    100,
    60000,
  )(
    withErrorHandling(async (request: NextRequest, user: User) => {
      if (user.role !== "MANUFACTURER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      MonitoringService.addBreadcrumb("Fetching custom orders", "api", {
        manufacturerId: user.id,
      })

      const customOrders = await DatabaseService.getCustomOrdersForManufacturer(Number(user.id))

      return NextResponse.json({ customOrders })
    }),
  ),
)
