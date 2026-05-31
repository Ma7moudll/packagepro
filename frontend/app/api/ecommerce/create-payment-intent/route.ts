import { NextRequest, NextResponse } from "next/server"
// import Stripe from "stripe"

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
//   apiVersion: "2024-11-20.acacia",
// })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount } = body

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 })
    }

    // TODO: Create Stripe payment intent
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(amount * 100), // Convert to cents
    //   currency: "sar",
    //   automatic_payment_methods: {
    //     enabled: true,
    //   },
    // })

    // Mock payment intent for development
    const clientSecret = `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`

    return NextResponse.json({ clientSecret })
  } catch (error) {
    console.error("Error creating payment intent:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

