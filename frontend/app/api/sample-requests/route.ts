import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"

import { SampleRequestSchema } from "@/lib/validation"
import { withValidation, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"
import { AuthService } from "@/lib/auth" // Import AuthService
import { withAuth } from "@/lib/authMiddleware" // Import withAuth

interface User {
  id: number | string
  role: string
}



// POST /api/sample-requests - Create sample request
export const POST = withValidation(
  SampleRequestSchema,
  withRateLimit(
    20,
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

      MonitoringService.addBreadcrumb("Creating sample request", "api", {
        userId: user?.id,
        customerEmail: data.customerEmail,
        productId: data.productId,
      })

      // Generate unique request number
      const requestNumber = `SAMPLE-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      // Calculate shipping cost (simplified)
      const shippingCost = 25 // Fixed 25 EGP for samples

      const sampleRequest = await DatabaseService.createSampleRequest({
        requestNumber,
        customerId: user?.id ? Number(user.id) : undefined,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        companyName: data.companyName,
        productId: data.productId,
        shippingAddress: data.shippingAddress,
        shippingCost,
        notes: data.notes,
      })

      // Get product details for email
      const product = await DatabaseService.getProductById(data.productId)

      if (product) {
        // Send confirmation email
        // TODO: Implement sendSampleRequestConfirmation in EmailService
        // await EmailService.sendSampleRequestConfirmation({
        //   customerEmail: data.customerEmail,
        //   customerName: data.customerName,
        //   requestNumber,
        //   productName: product.name,
        //   shippingAddress: data.shippingAddress,
        // })
      }

      MonitoringService.captureMessage(`Sample request created: ${requestNumber}`, "info")

      return NextResponse.json(sampleRequest, { status: 201 })
    }),
  ),
)

// GET /api/sample-requests - Get sample requests (for manufacturers)
export const GET = withAuth(
  withRateLimit(
    100,
    60000,
  )(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    withErrorHandling(async (request: NextRequest, data: any, user: User) => {
      if (user.role !== "MANUFACTURER" && user.role !== "ADMIN") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
      }

      MonitoringService.addBreadcrumb("Fetching sample requests", "api", {
        manufacturerId: user.id,
      })

      const sampleRequests = await DatabaseService.getSampleRequestsForManufacturer(Number(user.id))

      return NextResponse.json({ sampleRequests })
    }),
  ),
)
