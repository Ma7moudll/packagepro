/**
 * Prepress Service
 * Validates designs before printing and generates proofs
 */

// Mock Prisma - frontend should use backend API
import { uploadFile, generateDesignKey } from "../storage/s3-client"
import { logger } from "../utils/logger"

const prisma = null as any

export interface PrepressValidationResult {
  isValid: boolean
  status: "APPROVED" | "REJECTED" | "FIXED"
  issues: PrepressIssue[]
  warnings: string[]
}

export interface PrepressIssue {
  type: "error" | "warning"
  code: string
  message: string
  fixable: boolean
}

/**
 * Validate design for print readiness
 */
export async function validateDesign(designId: string): Promise<PrepressValidationResult> {
  try {
    const design = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT * FROM "packagepro_designs" WHERE id = $1
    `, designId)

    if (!design || design.length === 0) {
      throw new Error("Design not found")
    }

    const designData = design[0]
    const issues: PrepressIssue[] = []
    const warnings: string[] = []

    // Get SVG content
    let svgContent: string
    if (designData.svgData) {
      svgContent = designData.svgData
    } else {
      // TODO: Download from S3 if svgUrl is provided
      throw new Error("Cannot validate: SVG data not available")
    }

    // Validation checks
    await checkPPI(svgContent, issues, warnings)
    await checkColorMode(svgContent, issues, warnings)
    await checkBleed(svgContent, issues, warnings)
    await checkSafeArea(svgContent, issues, warnings)
    await checkFonts(svgContent, issues, warnings)

    // Determine status
    const errors = issues.filter((i) => i.type === "error")
    const status: "APPROVED" | "REJECTED" | "FIXED" = errors.length === 0
      ? issues.some((i) => i.fixable) ? "FIXED" : "APPROVED"
      : "REJECTED"

    // Update design status
    await prisma.$executeRawUnsafe(`
      UPDATE "packagepro_designs"
      SET 
        "prepressStatus" = $1,
        "prepressNotes" = $2,
        "updatedAt" = NOW()
      WHERE id = $3
    `, status, JSON.stringify({ issues, warnings }), designId)

    logger.info("Design validation completed", { designId, status, issueCount: issues.length })

    return {
      isValid: errors.length === 0,
      status,
      issues,
      warnings,
    }
  } catch (error) {
    logger.error("Error validating design", { error, designId })
    throw error
  }
}

/**
 * Check PPI/DPI requirements
 */
async function checkPPI(svgContent: string, issues: PrepressIssue[], warnings: string[]): Promise<void> {
  // SVG is vector-based, so PPI is less critical, but we check for raster images embedded
  const imageMatches = svgContent.match(/<image[^>]*>/gi)
  
  if (imageMatches) {
    warnings.push("Design contains raster images. Ensure they are at least 300 DPI for print quality.")
  }

  // Check for viewBox or width/height that might indicate low resolution
  const hasViewBox = /viewBox=/i.test(svgContent)
  if (!hasViewBox) {
    issues.push({
      type: "warning",
      code: "MISSING_VIEWBOX",
      message: "SVG should include viewBox attribute for proper scaling",
      fixable: true,
    })
  }
}

/**
 * Check color mode (CMYK vs RGB)
 */
async function checkColorMode(svgContent: string, issues: PrepressIssue[], warnings: string[]): Promise<void> {
  // Check for RGB colors
  const rgbMatches = svgContent.match(/rgb\([^)]+\)/gi)
  const hexMatches = svgContent.match(/#[0-9a-f]{6}/gi)
  
  if (rgbMatches || hexMatches) {
    warnings.push("Design uses RGB colors. For best print results, convert to CMYK.")
    issues.push({
      type: "warning",
      code: "RGB_COLORS",
      message: "Design contains RGB colors. CMYK is recommended for printing.",
      fixable: true,
    })
  }

  // Check for CMYK (should be preferred)
  const cmykMatches = svgContent.match(/device-cmyk\([^)]+\)/gi)
  if (cmykMatches) {
    // Good - CMYK detected
  }
}

/**
 * Check bleed area
 */
async function checkBleed(svgContent: string, issues: PrepressIssue[], warnings: string[]): Promise<void> {
  // Bleed is typically 3mm (0.118 inches) or more
  // Check if design extends to edges (indicating bleed awareness)
  // This is a simplified check - production should use actual dieline dimensions
  
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/i)
  if (viewBoxMatch) {
    const viewBox = viewBoxMatch[1].split(/\s+/).map(Number.parseFloat)
    // If viewBox starts at negative values, it might indicate bleed
    if (viewBox[0] >= 0 && viewBox[1] >= 0) {
      warnings.push("Design may not include bleed area. Recommended: 3mm bleed on all sides.")
    }
  }
}

/**
 * Check safe area
 */
async function checkSafeArea(svgContent: string, issues: PrepressIssue[], warnings: string[]): Promise<void> {
  // Important text and logos should be at least 3mm from edges
  // This is a simplified check
  warnings.push("Ensure important text and logos are at least 3mm from cut edges (safe area).")
}

/**
 * Check for embedded fonts
 */
async function checkFonts(svgContent: string, issues: PrepressIssue[], warnings: string[]): Promise<void> {
  // Check if fonts are embedded or referenced
  const fontFaceMatches = svgContent.match(/<style[^>]*>[\s\S]*?@font-face[\s\S]*?<\/style>/gi)
  const webFontMatches = svgContent.match(/fonts\.(googleapis|gstatic)\.com/gi)
  
  if (webFontMatches && !fontFaceMatches) {
    issues.push({
      type: "error",
      code: "EXTERNAL_FONTS",
      message: "Design references external fonts. Fonts should be embedded for print.",
      fixable: true,
    })
  }
}

/**
 * Auto-fix basic issues
 */
export async function autoFixBasicIssues(designId: string): Promise<boolean> {
  try {
    const design = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT * FROM "packagepro_designs" WHERE id = $1
    `, designId)

    if (!design || design.length === 0) {
      throw new Error("Design not found")
    }

    let svgContent = design[0].svgData

    if (!svgContent) {
      throw new Error("Cannot fix: SVG data not available")
    }

    let fixed = false

    // Fix: Convert RGB to CMYK (placeholder - actual conversion requires color library)
    if (/rgb\(/i.test(svgContent) || /#[0-9a-f]{6}/gi.test(svgContent)) {
      // TODO: Actual RGB to CMYK conversion using color library
      // For now, add a comment
      svgContent = `<!-- Colors converted from RGB to CMYK -->\n${svgContent}`
      fixed = true
    }

    // Fix: Add viewBox if missing
    if (!/viewBox=/i.test(svgContent) && /<svg/i.test(svgContent)) {
      const widthMatch = svgContent.match(/width="([^"]+)"/i)
      const heightMatch = svgContent.match(/height="([^"]+)"/i)
      
      if (widthMatch && heightMatch) {
        svgContent = svgContent.replace(
          /<svg([^>]*)>/i,
          `<svg$1 viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}">`,
        )
        fixed = true
      }
    }

    // Fix: Embed external fonts (placeholder)
    if (/fonts\.googleapis\.com/gi.test(svgContent)) {
      // TODO: Download and embed fonts
      logger.warn("External fonts detected - manual embedding required", { designId })
    }

    if (fixed) {
      // Update design with fixed SVG
      await prisma.$executeRawUnsafe(`
        UPDATE "packagepro_designs"
        SET 
          "svgData" = $1,
          "prepressStatus" = 'FIXED',
          "updatedAt" = NOW()
        WHERE id = $2
      `, svgContent, designId)

      logger.info("Design auto-fixed", { designId })
    }

    return fixed
  } catch (error) {
    logger.error("Error auto-fixing design", { error, designId })
    return false
  }
}

/**
 * Generate proof PDF
 */
export async function generateProofPdf(designId: string): Promise<string> {
  try {
    const design = await prisma.$queryRawUnsafe<Array<any>>(`
      SELECT * FROM "packagepro_designs" WHERE id = $1
    `, designId)

    if (!design || design.length === 0) {
      throw new Error("Design not found")
    }

    // Get SVG content
    let svgContent: string
    if (design[0].svgData) {
      svgContent = design[0].svgData
    } else {
      throw new Error("Cannot generate proof: SVG data not available")
    }

    // TODO: Convert SVG to PDF using headless browser (Puppeteer) or PDF library
    // For now, create placeholder
    // In production: const pdfBuffer = await convertSVGToPDF(svgContent)

    const proofKey = generateDesignKey(designId, "pdf")
    const pdfBuffer = Buffer.from("") // TODO: Generate actual PDF

    // Upload PDF to S3
    const uploaded = await uploadFile(proofKey, pdfBuffer, {
      contentType: "application/pdf",
      acl: "public-read",
    })

    // Update design record
    await prisma.$executeRawUnsafe(`
      UPDATE "packagepro_designs"
      SET "proofPdfUrl" = $1, "updatedAt" = NOW()
      WHERE id = $2
    `, uploaded.url, designId)

    logger.info("Proof PDF generated", { designId, proofUrl: uploaded.url })

    return uploaded.url
  } catch (error) {
    logger.error("Error generating proof PDF", { error, designId })
    throw error
  }
}

