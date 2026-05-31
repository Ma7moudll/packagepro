import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId } = body

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
    }

    // TODO: Capture PayPal order
    // const paypal = require("@paypal/checkout-server-sdk")
    // const environment = new paypal.core.SandboxEnvironment(
    //   process.env.PAYPAL_CLIENT_ID!,
    //   process.env.PAYPAL_CLIENT_SECRET!
    // )
    // const client = new paypal.core.PayPalHttpClient(environment)
    // const request = new paypal.orders.OrdersCaptureRequest(orderId)
    // const capture = await client.execute(request)

    // Mock capture for development
    return NextResponse.json({
      status: "COMPLETED",
      captureId: `capture-${Date.now()}`,
    })
  } catch (error) {
    console.error("Error capturing PayPal order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

