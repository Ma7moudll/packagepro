/**
 * PackagePro Order State Transitions API
 */

import { NextRequest, NextResponse } from "next/server"
import { transitionOrderState, getOrder } from "@/lib/packagepro/services/order-service"
import { withAuth } from "@/lib/packagepro/middleware/auth"
import { z } from "zod"
import { logger } from "@/lib/packagepro/utils/logger"

const transitionSchema = z.object({
  toState: z.enum([
    "CREATED",
    "AWAITING_PROOF_APPROVAL",
    "READY_FOR_ROUTING",
    "AWAITING_SUPPLIER_CONFIRMATION",
    "IN_PRODUCTION",
    "READY_FOR_PICKUP",
    "IN_TRANSIT",
    "DELIVERED",
    "CANCELLED",
    "REFUNDED",
    "SETTLED",
  ]),
  metadata: z.any().optional(),
})

/**
 * POST /api/packagepro/orders/:id/transitions
 */
export const POST = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } },
) => {
  try {
    // Verify order exists and user has access
    const order = await getOrder(params.id)

    if (user.role !== "ADMIN" && order.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const validated = transitionSchema.parse(body)

    await transitionOrderState(
      params.id,
      validated.toState,
      { id: user.id, role: user.role },
      validated.metadata,
    )

    return NextResponse.json({
      success: true,
      message: `Order transitioned to ${validated.toState}`,
    })
  } catch (error: any) {
    logger.error("Error transitioning order", { error, orderId: params.id })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: error.message || "Failed to transition order" },
      { status: 500 },
    )
  }
})

