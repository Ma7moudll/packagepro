/**
 * PackagePro Order Detail API
 */

import { NextRequest, NextResponse } from "next/server"
import { getOrder } from "@/lib/packagepro/services/order-service"
import { withAuth } from "@/lib/packagepro/middleware/auth"
import { logger } from "@/lib/packagepro/utils/logger"

export const GET = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  try {
    const order = await getOrder(id)

    // Check authorization
    if (user.role !== "ADMIN" && order.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 },
      )
    }

    return NextResponse.json({
      success: true,
      order,
    })
  } catch (error: any) {
    logger.error("Error getting order", { error, orderId: id })

    if (error.message === "Order not found") {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      )
    }

    return NextResponse.json(
      { error: error.message || "Failed to get order" },
      { status: 500 },
    )
  }
})

