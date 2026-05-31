"use client"

export interface PDFPageData {
  pageNumber: number
  width: number
  height: number
  imageDataUrl: string
}

export interface PDFMetadata {
  title?: string
  author?: string
  subject?: string
  creator?: string
  producer?: string
  pages: number
}

/**
 * Process PDF file and extract pages as images
 */
export async function processPDF(file: File): Promise<{
  pages: PDFPageData[]
  metadata: PDFMetadata
}> {
  // IMPORTANT:
  // pdfjs-dist has compatibility issues with Next.js app router / webpack in the browser bundle
  // (see runtime error: Object.defineProperty called on non-object).
  // To keep the editor stable, we currently do NOT run PDF.js in the client.
  // Instead, we throw a controlled error that UploadPanel catches and shows to the user.

  throw new Error(
    "PDF page preview via PDF.js is temporarily disabled due to bundler compatibility. Please upload raster images or pre-rasterized PDFs for now."
  )
}

/**
 * Convert PDF page to image layer data
 */
export function pdfPageToLayerData(
  page: PDFPageData,
  faceId: string,
  position: { x: number; y: number } = { x: 100, y: 100 }
) {
  return {
    type: "image" as const,
    name: `PDF Page ${page.pageNumber}`,
    visible: true,
    locked: false,
    opacity: 1,
    blendMode: "normal" as const,
    position,
    rotation: 0,
    scale: { x: 1, y: 1 },
    faceId: faceId as any,
    imageProperties: {
      src: page.imageDataUrl,
      naturalWidth: page.width,
      naturalHeight: page.height,
    },
  }
}

/**
 * Process EPS/AI files by converting them to PDF first (via server)
 */
export async function processEPSorAI(file: File): Promise<PDFPageData[]> {
  // Upload to server for conversion
  const formData = new FormData()
  formData.append("file", file)
  formData.append("type", file.name.toLowerCase().endsWith(".ai") ? "ai" : "eps")

  try {
    const response = await fetch("/api/packagepro/convert-to-pdf", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      if (response.status === 501) {
        throw new Error(
          errorData.message || "EPS/AI to PDF conversion not yet implemented. Please convert to PDF first."
        )
      }
      throw new Error("Failed to convert file")
    }

    const blob = await response.blob()
    const pdfFile = new File([blob], file.name.replace(/\.(ai|eps)$/i, ".pdf"), {
      type: "application/pdf",
    })

    const result = await processPDF(pdfFile)
    return result.pages
  } catch (error: any) {
    console.error("EPS/AI conversion failed:", error)
    throw new Error(error.message || "Could not convert EPS/AI file. Please convert to PDF first.")
  }
}

