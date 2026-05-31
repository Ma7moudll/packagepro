/**
 * PackagePro Supplier RFQ (Request for Quote) API
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth, withRole } from "@/lib/packagepro/middleware/auth"
import { enqueueJob } from "@/lib/packagepro/queue/queue-client"
import { logger } from "@/lib/packagepro/utils/logger"
import { z } from "zod"

const rfqSchema = z.object({
  orderId: z.string().uuid(),
  requirements: z.object({
    productId: z.string().uuid(),
    qty: z.number().int().positive(),
    material: z.string(),
    dimensions: z.object({
      width: z.number().positive(),
      height: z.number().positive(),
      depth: z.number().optional(),
    }),
  }),
})

/**
 * POST /api/packagepro/suppliers/:id/rfq
 * Send RFQ to supplier
 */
export const POST = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } },
) => {
  try {
    const body = await request.json()
    const validated = rfqSchema.parse(body)

    // Enqueue RFQ job
    await enqueueJob("routing-queue", {
      type: "send_rfq",
      supplierId: params.id,
      orderId: validated.orderId,
      requirements: validated.requirements,
    })

    return NextResponse.json({
      success: true,
      message: "RFQ sent to supplier",
    })
  } catch (error: any) {
    logger.error("Error sending RFQ", { error })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: error.message || "Failed to send RFQ" },
      { status: 500 },
    )
  }
})

