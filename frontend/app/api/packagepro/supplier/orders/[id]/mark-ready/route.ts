/**
 * Mark Order Ready for Pickup (Supplier)
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth, withRole } from "@/lib/packagepro/middleware/auth"
import { transitionOrderState, getOrder } from "@/lib/packagepro/services/order-service"
import { logger } from "@/lib/packagepro/utils/logger"

export const POST = withRole("SUPPLIER")(async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  try {
    const order = await getOrder(id)

    await transitionOrderState(
      id,
      "READY_FOR_PICKUP",
      { id: user.id, role: user.role },
      { action: "MARKED_READY_BY_SUPPLIER" },
    )

    return NextResponse.json({
      success: true,
      message: "Order marked ready for pickup",
    })
  } catch (error: any) {
    logger.error("Error marking order ready", { error, orderId: id })
    return NextResponse.json(
      { error: error.message || "Failed to mark order ready" },
      { status: 500 },
    )
  }
})

