/**
 * PackagePro Design Proof API
 * GET /api/packagepro/designs/:id/proof
 * POST /api/packagepro/designs/:id/proof (generate proof)
 */

import { NextRequest, NextResponse } from "next/server"
import { getDesign, getDesignFileUrl } from "@/lib/packagepro/services/design-service"
import { validateDesign, generateProofPdf, autoFixBasicIssues } from "@/lib/packagepro/services/prepress-service"
import { withAuth } from "@/lib/packagepro/middleware/auth"
import { logger } from "@/lib/packagepro/utils/logger"
import { enqueueJob } from "@/lib/packagepro/queue/queue-client"

/**
 * GET /api/packagepro/designs/:id/proof
 * Get proof PDF URL
 */
export const GET = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  try {
    const design = await getDesign(id)

    // Check authorization
    if (user.role !== "ADMIN" && design.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 },
      )
    }

    if (!design.proofPdfUrl) {
      return NextResponse.json(
        { error: "Proof not yet generated. Please request proof generation first." },
        { status: 404 },
      )
    }

    // Get presigned URL for secure access
    const proofUrl = await getDesignFileUrl(id, "pdf")

    return NextResponse.json({
      success: true,
      proofUrl,
      status: design.prepressStatus,
    })
  } catch (error: any) {
    logger.error("Error getting proof", { error, designId: id })
    return NextResponse.json(
      { error: error.message || "Failed to get proof" },
      { status: 500 },
    )
  }
})

/**
 * POST /api/packagepro/designs/:id/proof
 * Generate proof PDF (async)
 */
export const POST = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params
  try {
    const design = await getDesign(id)

    // Check authorization
    if (user.role !== "ADMIN" && design.userId !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const shouldValidate = body.validate !== false
    const shouldAutoFix = body.autoFix === true

    // Validate design first
    if (shouldValidate) {
      const validation = await validateDesign(id)
      
      if (!validation.isValid && validation.status === "REJECTED") {
        return NextResponse.json({
          success: false,
          error: "Design validation failed",
          validation,
        }, { status: 400 })
      }

      // Auto-fix if requested and issues are fixable
      if (shouldAutoFix && validation.issues.some((i) => i.fixable)) {
        await autoFixBasicIssues(id)
      }
    }

    // Enqueue proof generation job (async)
    await enqueueJob("prepress-queue", {
      type: "generate_proof",
      designId: id,
    })

    return NextResponse.json({
      success: true,
      message: "Proof generation started. Check status later.",
      status: "processing",
    })
  } catch (error: any) {
    logger.error("Error generating proof", { error, designId: id })
    return NextResponse.json(
      { error: error.message || "Failed to generate proof" },
      { status: 500 },
    )
  }
})

