/**
 * Reject Order (Supplier)
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth, withRole } from "@/lib/packagepro/middleware/auth"
import { transitionOrderState, getOrder } from "@/lib/packagepro/services/order-service"
import { logger } from "@/lib/packagepro/utils/logger"
import { z } from "zod"

const rejectSchema = z.object({
  reason: z.string().optional(),
})

export const POST = withRole("SUPPLIER")(async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  try {
    const order = await getOrder(id)
    const body = await request.json().catch(() => ({}))
    const validated = rejectSchema.parse(body)

    // Transition back to READY_FOR_ROUTING for re-assignment
    await transitionOrderState(
      id,
      "READY_FOR_ROUTING",
      { id: user.id, role: user.role },
      {
        action: "REJECTED_BY_SUPPLIER",
        reason: validated.reason,
      },
    )

    return NextResponse.json({
      success: true,
      message: "Order rejected",
    })
  } catch (error: any) {
    logger.error("Error rejecting order", { error, orderId: id })
    return NextResponse.json(
      { error: error.message || "Failed to reject order" },
      { status: 500 },
    )
  }
})

