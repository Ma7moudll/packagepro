"use client"

export interface BackgroundRemovalResult {
  imageDataUrl: string
  originalSize: number
  processedSize: number
  success: boolean
  error?: string
}

/**
 * Remove background from image using remove.bg API or similar service
 */
export async function removeBackground(
  imageFile: File,
  apiKey?: string
): Promise<BackgroundRemovalResult> {
  try {
    // Option 1: Use remove.bg API (requires API key)
    if (apiKey) {
      const formData = new FormData()
      formData.append("image_file", imageFile)
      formData.append("size", "auto")

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Background removal failed: ${response.statusText}`)
      }

      const blob = await response.blob()
      const dataUrl = await blobToDataURL(blob)

      return {
        imageDataUrl: dataUrl,
        originalSize: imageFile.size,
        processedSize: blob.size,
        success: true,
      }
    }

    // Option 2: Use server-side processing (fallback)
    const serverFormData = new FormData()
    serverFormData.append("file", imageFile)

    const serverResponse = await fetch("/api/packagepro/remove-background", {
      method: "POST",
      body: serverFormData,
    })

    if (!serverResponse.ok) {
      throw new Error("Background removal service unavailable")
    }

    const serverBlob = await serverResponse.blob()
    const serverDataUrl = await blobToDataURL(serverBlob)

    return {
      imageDataUrl: serverDataUrl,
      originalSize: imageFile.size,
      processedSize: serverBlob.size,
      success: true,
    }
  } catch (error: any) {
    return {
      imageDataUrl: "",
      originalSize: imageFile.size,
      processedSize: 0,
      success: false,
      error: error.message || "Failed to remove background",
    }
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

