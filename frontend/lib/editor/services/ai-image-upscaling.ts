"use client"

export interface UpscalingResult {
  imageDataUrl: string
  originalWidth: number
  originalHeight: number
  upscaledWidth: number
  upscaledHeight: number
  scaleFactor: number
  success: boolean
  error?: string
}

export type UpscalingScale = 2 | 4 | 8

/**
 * Upscale image using Real-ESRGAN or similar service
 */
export async function upscaleImage(
  imageFile: File,
  scale: UpscalingScale = 2,
  apiKey?: string
): Promise<UpscalingResult> {
  try {
    // Get original dimensions
    const originalDimensions = await getImageDimensions(imageFile)

    // Option 1: Use server-side Real-ESRGAN processing
    const formData = new FormData()
    formData.append("file", imageFile)
    formData.append("scale", scale.toString())

    const response = await fetch("/api/packagepro/upscale-image", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Image upscaling service unavailable")
    }

    const blob = await response.blob()
    const dataUrl = await blobToDataURL(blob)

    // Get upscaled dimensions
    const upscaledDimensions = await getImageDimensionsFromDataURL(dataUrl)

    return {
      imageDataUrl: dataUrl,
      originalWidth: originalDimensions.width,
      originalHeight: originalDimensions.height,
      upscaledWidth: upscaledDimensions.width,
      upscaledHeight: upscaledDimensions.height,
      scaleFactor: scale,
      success: true,
    }
  } catch (error: any) {
    return {
      imageDataUrl: "",
      originalWidth: 0,
      originalHeight: 0,
      upscaledWidth: 0,
      upscaledHeight: 0,
      scaleFactor: scale,
      success: false,
      error: error.message || "Failed to upscale image",
    }
  }
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

function getImageDimensionsFromDataURL(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.width, height: img.height })
    img.onerror = reject
    img.src = dataUrl
  })
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

