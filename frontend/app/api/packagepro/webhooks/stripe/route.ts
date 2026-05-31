/**
 * PackagePro Stripe Webhook Handler
 */

import { NextRequest, NextResponse } from "next/server"
import { handleStripeWebhook } from "@/lib/packagepro/services/payment-service"
import { logger } from "@/lib/packagepro/utils/logger"

export const POST = async (request: NextRequest) => {
  try {
    // Get signature from header
    const signature = request.headers.get("stripe-signature") || ""

    // Get raw body
    const body = await request.text()
    const event = JSON.parse(body)

    // Handle webhook with idempotency check
    const processed = await handleStripeWebhook(event, signature)

    if (!processed) {
      return NextResponse.json(
        { error: "Webhook processing failed" },
        { status: 500 },
      )
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    logger.error("Error processing Stripe webhook", { error })
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    )
  }
}

