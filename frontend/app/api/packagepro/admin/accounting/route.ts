/**
 * PackagePro Admin Accounting API
 */

import { NextRequest, NextResponse } from "next/server"
import { withRole } from "@/lib/packagepro/middleware/auth"
import { reconcilePayments, createPayout, exportInvoicesCSV } from "@/lib/packagepro/services/accounting-service"
import { logger } from "@/lib/packagepro/utils/logger"
import { z } from "zod"

/**
 * GET /api/packagepro/admin/accounting/payouts
 */
export const GET = withRole(["ADMIN", "ACCOUNTANT"])(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    if (action === "reconcile") {
      const reconciliation = await reconcilePayments()
      return NextResponse.json({
        success: true,
        reconciliation,
      })
    }

    // Default: list payouts (placeholder)
    return NextResponse.json({
      success: true,
      payouts: [],
    })
  } catch (error: any) {
    logger.error("Error in accounting API", { error })
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 },
    )
  }
})

/**
 * POST /api/packagepro/admin/accounting/payouts
 */
export const POST = withRole(["ADMIN", "ACCOUNTANT"])(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const payoutId = await createPayout(body)

    return NextResponse.json({
      success: true,
      payoutId,
    })
  } catch (error: any) {
    logger.error("Error creating payout", { error })
    return NextResponse.json(
      { error: error.message || "Failed to create payout" },
      { status: 500 },
    )
  }
})

