import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // TODO: Create PayPal order
    // const paypal = require("@paypal/checkout-server-sdk")
    // const environment = new paypal.core.SandboxEnvironment(
    //   process.env.PAYPAL_CLIENT_ID!,
    //   process.env.PAYPAL_CLIENT_SECRET!
    // )
    // const client = new paypal.core.PayPalHttpClient(environment)
    // const request = new paypal.orders.OrdersCreateRequest()
    // request.prefer("return=representation")
    // request.requestBody({
    //   intent: "CAPTURE",
    //   purchase_units: [{
    //     amount: {
    //       currency_code: "SAR",
    //       value: amount.toFixed(2),
    //     },
    //   }],
    // })
    // const order = await client.execute(request)

    // Mock PayPal order for development
    const orderId = `PAYPAL-${Date.now()}-${Math.random().toString(36).substring(7)}`

    return NextResponse.json({ orderId })
  } catch (error) {
    console.error("Error creating PayPal order:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

