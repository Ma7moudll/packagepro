"use client"

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: "png" | "jpeg" | "webp"
  dpi?: number
}

export interface ProcessedImage {
  dataUrl: string
  width: number
  height: number
  originalWidth: number
  originalHeight: number
  fileSize: number
  dpi?: number
}

/**
 * Client-side image processing (basic resize/format conversion)
 * For advanced processing, use server-side API
 */
export async function processImageClient(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        let { width, height } = img
        const { maxWidth = Infinity, maxHeight = Infinity, quality = 0.9, format = "png" } = options

        // Calculate new dimensions
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = width * ratio
          height = height * ratio
        }

        canvas.width = width
        canvas.height = height

        // Draw and convert
        ctx.drawImage(img, 0, 0, width, height)

        const mimeType = format === "jpeg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png"
        const dataUrl = canvas.toDataURL(mimeType, quality)

        resolve({
          dataUrl,
          width,
          height,
          originalWidth: img.width,
          originalHeight: img.height,
          fileSize: file.size,
        })
      }
      img.onerror = () => reject(new Error("Failed to load image"))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsDataURL(file)
  })
}

/**
 * Server-side image processing (uses Sharp)
 * Uploads image to server for advanced processing
 */
export async function processImageServer(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("options", JSON.stringify(options))

  try {
    const response = await fetch("/api/packagepro/process-image", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Image processing failed")
    }

    const blob = await response.blob()
    const dataUrl = await blobToDataURL(blob)

    // Get metadata from response headers
    const width = parseInt(response.headers.get("X-Image-Width") || "0")
    const height = parseInt(response.headers.get("X-Image-Height") || "0")
    const dpi = parseInt(response.headers.get("X-Image-DPI") || "0")

    return {
      dataUrl,
      width,
      height,
      originalWidth: width,
      originalHeight: height,
      fileSize: blob.size,
      dpi: dpi || undefined,
    }
  } catch (error) {
    console.error("Server-side processing failed, falling back to client:", error)
    // Fallback to client-side processing
    return processImageClient(file, options)
  }
}

/**
 * Check image DPI (requires server-side analysis)
 */
export async function checkImageDPI(file: File): Promise<number | null> {
  try {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch("/api/packagepro/check-image-dpi", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return data.dpi || null
  } catch (error) {
    console.error("DPI check failed:", error)
    return null
  }
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

