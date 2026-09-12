/**
 * Design Service
 * Handles design upload, storage, and preview generation
 */

// Mock Prisma - frontend should use backend API
import { uploadFile, generateDesignKey, getPresignedUrl, fileExists } from "../storage/s3-client"
import { enqueueJob } from "../queue/queue-client"
import { logger } from "../utils/logger"

const prisma = {
  $queryRawUnsafe: async <T = any>(strings: TemplateStringsArray | string, ...values: any[]): Promise<T> => [] as T,
  $executeRawUnsafe: async (strings: TemplateStringsArray | string, ...values: any[]) => {},
}

export interface DesignUploadData {
  userId: string
  productId: string
  svgData?: string // Raw SVG data
  svgUrl?: string  // URL to existing SVG
  metadata?: Record<string, any>
}

export interface DesignResult {
  id: string
  svgUrl: string
  previewPngUrl?: string
  status: string
}

/**
 * Upload and create a new design
 */
export async function uploadDesign(data: DesignUploadData): Promise<DesignResult> {
  try {
    let svgUrl = data.svgUrl
    let svgKey: string | undefined

    // If SVG data is provided, upload it to S3
    if (data.svgData && !data.svgUrl) {
      const normalizedSvg = normalizeSVG(data.svgData)
      const tempKey = `designs/${data.userId}/${Date.now()}.svg`

      // Upload SVG to S3 (we'll get the ID after creating the record)
      // For now, we'll create the design record first, then upload
      const uploaded = await uploadFile(
        tempKey,
        Buffer.from(normalizedSvg, "utf-8"),
        {
          contentType: "image/svg+xml",
          metadata: data.metadata || {},
          acl: "private",
        },
      )

      svgUrl = uploaded.url
      svgKey = uploaded.key
    }

    // Create design record in database
    // Note: Using raw query because we're using a separate schema
    const design = await prisma.$queryRawUnsafe<Array<{ id: string }>>(`
      INSERT INTO "packagepro_designs" (
        id, "userId", "productId", "svgUrl", "svgData", "prepressStatus", "createdAt", "updatedAt"
      )
      VALUES (
        gen_random_uuid(),
        $1,
        $2,
        $3,
        $4,
        'PENDING',
        NOW(),
        NOW()
      )
      RETURNING id
    `, data.userId, data.productId, svgUrl, data.svgData || null)

    const designId = design[0]?.id

    if (!designId) {
      throw new Error("Failed to create design record")
    }

    // If we uploaded to a temp location, move to final location
    if (svgKey && svgKey.includes("temp")) {
      const finalKey = generateDesignKey(designId, "svg")
      // TODO: Move file in S3 (or re-upload with final key)
      // For now, we'll use the temp key
    }

    // Enqueue preview generation job
    await enqueueJob("rendering-queue", {
      type: "generate_preview",
      designId,
      productId: data.productId,
    })

    logger.info("Design uploaded", { designId, userId: data.userId, productId: data.productId })

    return {
      id: designId,
      svgUrl: svgUrl!,
      status: "PENDING",
    }
  } catch (error) {
    logger.error("Error uploading design", { error, data })
    throw error
  }
}

/**
 * Normalize SVG data (remove unnecessary whitespace, ensure proper encoding)
 */
export function normalizeSVG(svgData: string): string {
  // Remove XML declaration if present (not needed for inline SVG)
  let normalized = svgData.replace(/<?xml[^>]*\?>/g, "").trim()

  // Ensure proper namespace
  if (!normalized.includes("xmlns")) {
    normalized = normalized.replace(
      /<svg/,
      '<svg xmlns="http://www.w3.org/2000/svg"',
    )
  }

  // Remove comments and extra whitespace
  normalized = normalized.replace(/<!--[\s\S]*?-->/g, "")
  normalized = normalized.replace(/\s+/g, " ")

  return normalized
}

/**
 * Get design by ID
 */
export async function getDesign(designId: string): Promise<any> {
  const design = await prisma.$queryRawUnsafe<Array<any>>(`
    SELECT 
      d.*,
      u.email as user_email,
      u.name as user_name,
      p.name as product_name,
      p.slug as product_slug
    FROM "packagepro_designs" d
    JOIN "packagepro_users" u ON d."userId" = u.id
    JOIN "packagepro_products" p ON d."productId" = p.id
    WHERE d.id = $1
  `, designId)

  if (!design || design.length === 0) {
    throw new Error("Design not found")
  }

  return design[0]
}

/**
 * Generate preview PNG for a design
 * This is typically done by a worker, but can be called directly
 */
export async function generatePreviewPNG(designId: string): Promise<string> {
  try {
    const design = await getDesign(designId)

    if (!design.svgUrl && !design.svgData) {
      throw new Error("Design has no SVG data")
    }

    // Get SVG content
    let svgContent: string
    if (design.svgData) {
      svgContent = design.svgData
    } else if (design.svgUrl) {
      // Download from S3
      // For now, we'll assume the SVG is accessible
      // In production, use S3 getObject
      svgContent = "" // TODO: Download from S3
    } else {
      throw new Error("Cannot generate preview: no SVG content")
    }

    // TODO: Use headless browser (Puppeteer) or SVG-to-PNG library
    // For now, we'll create a placeholder
    // In production: await generatePNGFromSVG(svgContent)

    // Placeholder implementation
    const previewKey = generateDesignKey(designId, "png")
    const placeholderPng = Buffer.from("") // TODO: Generate actual PNG

    // Upload preview to S3
    const uploaded = await uploadFile(previewKey, placeholderPng, {
      contentType: "image/png",
      acl: "public-read",
    })

    // Update design record
    await prisma.$executeRawUnsafe(`
      UPDATE "packagepro_designs"
      SET "previewPngUrl" = $1, "updatedAt" = NOW()
      WHERE id = $2
    `, uploaded.url, designId)

    logger.info("Preview PNG generated", { designId, previewUrl: uploaded.url })

    return uploaded.url
  } catch (error) {
    logger.error("Error generating preview PNG", { error, designId })
    throw error
  }
}

/**
 * Get presigned URL for design file (for secure access)
 */
export async function getDesignFileUrl(designId: string, type: "svg" | "png" | "pdf"): Promise<string> {
  const design = await getDesign(designId)

  let key: string | undefined
  switch (type) {
    case "svg":
      key = design.svgUrl?.split("/").pop() || undefined
      break
    case "png":
      key = design.previewPngUrl?.split("/").pop() || undefined
      break
    case "pdf":
      key = design.proofPdfUrl?.split("/").pop() || undefined
      break
  }

  if (!key) {
    throw new Error(`Design file of type ${type} not found`)
  }

  // Generate presigned URL (valid for 1 hour)
  return getPresignedUrl(key, 3600)
}

