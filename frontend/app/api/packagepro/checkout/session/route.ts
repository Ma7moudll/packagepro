/**
 * PackagePro Checkout Session API
 */

import { NextRequest, NextResponse } from "next/server"
import { createStripeSession } from "@/lib/packagepro/services/payment-service"
import { withAuth } from "@/lib/packagepro/middleware/auth"
import { z } from "zod"
import { logger } from "@/lib/packagepro/utils/logger"
import { getConfig } from "@/lib/packagepro/config"

const createSessionSchema = z.object({
  orderId: z.string().uuid(),
  quoteId: z.string().uuid().optional(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
})

export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const validated = createSessionSchema.parse(body)

    const config = getConfig()
    const baseUrl = config.auth.nextAuthUrl

    const session = await createStripeSession({
      orderId: validated.orderId,
      quoteId: validated.quoteId,
      userId: user.id,
      amount: 0, // TODO: Get amount from order
      successUrl: validated.successUrl || `${baseUrl}/orders/${validated.orderId}/success`,
      cancelUrl: validated.cancelUrl || `${baseUrl}/orders/${validated.orderId}/cancel`,
    })

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
    })
  } catch (error: any) {
    logger.error("Error creating checkout session", { error })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 },
    )
  }
})

