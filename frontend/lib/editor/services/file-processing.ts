"use client"

/**
 * Unified file processing service
 * Routes files to appropriate processors based on file type
 */

import { processPDF, pdfPageToLayerData } from "./pdf-processing"
import { processPSD, psdLayerToDesignLayer } from "./psd-processing"
import { parseSVG, svgToImageDataURL } from "./svg-processing"
import { processImageClient, checkImageDPI } from "./image-processing"
import { processEPSorAI } from "./pdf-processing"
import { Layer } from "@/lib/editor/state/types"

export interface ProcessedFileResult {
  layers: Partial<Layer>[]
  metadata?: {
    pages?: number
    width?: number
    height?: number
    dpi?: number
    warnings?: string[]
  }
}

/**
 * Process any supported file type and return layers
 */
export async function processFile(file: File, faceId: string): Promise<ProcessedFileResult> {
  const fileExtension = file.name.split(".").pop()?.toLowerCase()
  const warnings: string[] = []

  try {
    // PDF files
    if (fileExtension === "pdf") {
      const result = await processPDF(file)
      const layers = result.pages.map((page) => pdfPageToLayerData(page, faceId))
      return {
        layers,
        metadata: {
          pages: result.pages.length,
          warnings: result.pages.length > 1 ? ["Multiple pages detected. Only first page added."] : [],
        },
      }
    }

    // PSD files
    if (fileExtension === "psd") {
      const result = await processPSD(file)
      if (result.layers.length > 0) {
        const layers = result.layers.slice(0, 10).map((layer, index) =>
          psdLayerToDesignLayer(
            layer,
            faceId,
            { x: 100 + index * 20, y: 100 + index * 20 } // Offset layers
          )
        )
        if (result.layers.length > 10) {
          warnings.push(`Only first 10 layers added. Total layers: ${result.layers.length}`)
        }
        return {
          layers,
          metadata: {
            width: result.width,
            height: result.height,
            warnings,
          },
        }
      } else if (result.flattenedImageDataUrl) {
        return {
          layers: [
            {
              type: "image",
              name: file.name,
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: "normal",
              position: { x: 100, y: 100 },
              rotation: 0,
              scale: { x: 1, y: 1 },
              faceId: faceId as any,
              imageProperties: {
                src: result.flattenedImageDataUrl,
                naturalWidth: result.width,
                naturalHeight: result.height,
              },
            },
          ],
          metadata: {
            width: result.width,
            height: result.height,
          },
        }
      }
    }

    // SVG files
    if (fileExtension === "svg") {
      const result = await parseSVG(file)
      const imageDataUrl = await svgToImageDataURL(result.optimized, result.width, result.height)
      return {
        layers: [
          {
            type: "image",
            name: file.name,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: "normal",
            position: { x: 100, y: 100 },
            rotation: 0,
            scale: { x: 1, y: 1 },
            faceId: faceId as any,
            imageProperties: {
              src: imageDataUrl,
              naturalWidth: result.width,
              naturalHeight: result.height,
            },
          },
        ],
        metadata: {
          width: result.width,
          height: result.height,
          warnings: ["SVG converted to raster image. Vector properties may be lost."],
        },
      }
    }

    // EPS/AI files
    if (fileExtension === "eps" || fileExtension === "ai") {
      try {
        const pages = await processEPSorAI(file)
        const layers = pages.map((page) => pdfPageToLayerData(page, faceId))
        return {
          layers,
          metadata: {
            pages: pages.length,
            warnings: pages.length > 1 ? ["Multiple pages detected. Only first page added."] : [],
          },
        }
      } catch (err: any) {
        throw new Error(err.message || "EPS/AI conversion failed")
      }
    }

    // Image files
    if (file.type.startsWith("image/")) {
      // Check DPI
      const dpi = await checkImageDPI(file)
      if (dpi && dpi < 300) {
        warnings.push(`Low DPI: ${dpi}. Recommended: 300+ DPI for print quality.`)
      }

      // Process image
      const processed = await processImageClient(file, {
        maxWidth: 2000,
        maxHeight: 2000,
        quality: 0.9,
      })

      return {
        layers: [
          {
            type: "image",
            name: file.name,
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: "normal",
            position: { x: 100, y: 100 },
            rotation: 0,
            scale: { x: 1, y: 1 },
            faceId: faceId as any,
            imageProperties: {
              src: processed.dataUrl,
              naturalWidth: processed.width,
              naturalHeight: processed.height,
            },
          },
        ],
        metadata: {
          width: processed.width,
          height: processed.height,
          dpi: dpi || undefined,
          warnings,
        },
      }
    }

    throw new Error(`Unsupported file type: ${fileExtension || "unknown"}`)
  } catch (error: any) {
    console.error("File processing error:", error)
    throw new Error(error.message || "Failed to process file")
  }
}

/**
 * Get supported file types
 */
export function getSupportedFileTypes(): {
  extensions: string[]
  mimeTypes: string[]
  descriptions: Record<string, string>
} {
  return {
    extensions: ["jpg", "jpeg", "png", "webp", "gif", "pdf", "svg", "psd", "eps", "ai"],
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "application/pdf",
      "image/svg+xml",
      "image/vnd.adobe.photoshop",
      "application/postscript",
    ],
    descriptions: {
      jpg: "JPEG Image",
      jpeg: "JPEG Image",
      png: "PNG Image",
      webp: "WebP Image",
      gif: "GIF Image",
      pdf: "PDF Document",
      svg: "SVG Vector",
      psd: "Photoshop Document",
      eps: "Encapsulated PostScript",
      ai: "Adobe Illustrator",
    },
  }
}

