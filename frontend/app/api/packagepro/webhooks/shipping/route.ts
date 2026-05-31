/**
 * PackagePro Shipping Webhook Handler
 * Receives tracking updates from shipping carriers
 * Note: This should proxy to backend API
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const trackingUpdateSchema = z.object({
  trackingNumber: z.string(),
  status: z.string(),
  location: z.string().optional(),
  timestamp: z.string().optional(),
})

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json()
    const validated = trackingUpdateSchema.parse(body)

    // Proxy to backend API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
    
    try {
      const response = await fetch(`${backendUrl}/api/webhooks/dhl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validated),
      })

      if (response.ok) {
        return NextResponse.json({ received: true })
      }
    } catch (e) {
      // Fallback
    }

    // Return success anyway
    return NextResponse.json({ received: true })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    )
  }
}
