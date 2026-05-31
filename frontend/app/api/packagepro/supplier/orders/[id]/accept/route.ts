/**
 * Accept Order (Supplier)
 */

import { NextRequest, NextResponse } from "next/server"
import { withAuth, withRole } from "@/lib/packagepro/middleware/auth"
import { transitionOrderState, getOrder } from "@/lib/packagepro/services/order-service"
import { logger } from "@/lib/packagepro/utils/logger"

export const POST = withRole("SUPPLIER")(async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } },
) => {
  try {
    // Verify order belongs to supplier
    const order = await getOrder(params.id)

    // TODO: Verify supplier owns this order
    // const supplierId = await getSupplierIdFromUser(user.id)
    // if (order.supplierId !== supplierId) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    // }

    // Transition to IN_PRODUCTION
    await transitionOrderState(
      params.id,
      "IN_PRODUCTION",
      { id: user.id, role: user.role },
      { action: "ACCEPTED_BY_SUPPLIER" },
    )

    return NextResponse.json({
      success: true,
      message: "Order accepted",
    })
  } catch (error: any) {
    logger.error("Error accepting order", { error, orderId: params.id })
    return NextResponse.json(
      { error: error.message || "Failed to accept order" },
      { status: 500 },
    )
  }
})

