import { type NextRequest, NextResponse } from "next/server"
import { PaymentService } from "@/lib/payment"
import { DatabaseService } from "@/lib/database"
import { EmailService } from "@/lib/email"
import { MonitoringService } from "@/lib/monitoring"

export const POST = async (request: NextRequest) => {
  try {
    const provider = request.headers.get("x-payment-provider") || "stripe"
    const body = await request.json()

    // Verify webhook
    const isValid = await PaymentService.handleWebhook(provider, body)
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 })
    }

    // Handle payment success
    if (body.status === "succeeded" || body.success === true) {
      const orderId = body.orderId || body.metadata?.orderId
      const paymentId = body.id

      // Update order status
      await DatabaseService.updateOrderStatus(orderId, "PAYMENT_CONFIRMED")

      // Send confirmation email
      const order = await DatabaseService.getOrderById(orderId)
      if (order) {
        await EmailService.sendOrderConfirmation({
          customerEmail: order.customer?.email || "",
          customerName: order.customer?.name || "",
          orderNumber: order.orderNumber,
          items: order.items.map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
          })),
          totalAmount: order.totalAmount,
        })
      }

      MonitoringService.captureMessage(`Payment confirmed: ${paymentId}`, "info")
    }

    // Handle payment failure
    if (body.status === "failed" || body.success === false) {
      const orderId = body.orderId || body.metadata?.orderId
      await DatabaseService.updateOrderStatus(orderId, "PAYMENT_FAILED")

      MonitoringService.captureMessage(`Payment failed: ${body.id}`, "warning")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    MonitoringService.captureException(error as Error, {
      context: "payment_webhook",
    })
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}
