import { type NextRequest, NextResponse } from "next/server"
import { DatabaseService } from "@/lib/database"
import { EmailService } from "@/lib/email"
import { OrderSchema } from "@/lib/validation"
import { withAuth, withValidation, withRateLimit, withErrorHandling } from "@/lib/middleware"
import { MonitoringService } from "@/lib/monitoring"
import { AuthService } from "@/lib/auth" // Declared the AuthService variable

interface User {
  id: number | string
  role: string
  email?: string
  name?: string
}





// GET /api/orders - Get user orders
export const GET = withAuth(
  withRateLimit(
    100,
    60000,
  )(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    withErrorHandling(async (request: NextRequest, data: any, user: User) => {
      const { searchParams } = new URL(request.url)
      const status = searchParams.get("status")
      const limit = Number.parseInt(searchParams.get("limit") || "20")
      const offset = Number.parseInt(searchParams.get("offset") || "0")

      MonitoringService.addBreadcrumb("Fetching user orders", "api", {
        userId: user.id,
        status,
        limit,
        offset,
      })

      const orders = await DatabaseService.getUserOrders(Number(user.id), {
        status: status || undefined,
        limit,
        offset,
      })

      return NextResponse.json({
        orders,
        pagination: {
          limit,
          offset,
          total: orders.length,
        },
      })
    }),
  ),
)

// POST /api/orders - Create new order
export const POST = withValidation(
  OrderSchema,
  withRateLimit(
    20,
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
          // Guest checkout allowed
        }
      }

      MonitoringService.addBreadcrumb("Creating order", "api", {
        userId: user?.id,
        customerEmail: data.customerEmail,
        itemCount: data.items.length,
      })

      // Generate unique order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

      // Calculate totals
      let subtotal = 0
      const orderItems = []

      for (const item of data.items) {
        const product = await DatabaseService.getProductById(item.productId)
        if (!product) {
          return NextResponse.json({ error: `Product with ID ${item.productId} not found` }, { status: 400 })
        }

        if (product.stock < item.quantity) {
          return NextResponse.json({ error: `Insufficient stock for product ${product.name}` }, { status: 400 })
        }

        const unitPrice = product.price
        const totalPrice = unitPrice * item.quantity
        subtotal += totalPrice

        orderItems.push({
          productId: item.productId,
          productName: product.name,
          quantity: item.quantity,
          unitPrice,
          totalPrice,
          size: item.size,
          color: item.color,
          customizationDetails: item.customizationDetails,
        })
      }

      const taxAmount = subtotal * 0.14 // 14% VAT in Egypt
      const shippingAmount = subtotal > 500 ? 0 : 50 // Free shipping over 500 EGP
      const totalAmount = subtotal + taxAmount + shippingAmount

      const order = await DatabaseService.createOrder({
        orderNumber,
        customerId: user?.id ? Number(user.id) : undefined,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        subtotal,
        taxAmount,
        shippingAmount,
        discountAmount: 0,
        totalAmount,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        paymentMethod: data.paymentMethod,
        items: orderItems,
      })

      // Send confirmation email
      await EmailService.sendOrderConfirmation({
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        orderNumber,
        items: orderItems,
        totalAmount,
      })

      MonitoringService.captureMessage(`Order created: ${orderNumber}`, "info")

      return NextResponse.json(order, { status: 201 })
    }),
  ),
)
