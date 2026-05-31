"use client"

import { readPsd } from "ag-psd"

export interface PSDLayer {
  id: string
  name: string
  visible: boolean
  opacity: number
  width: number
  height: number
  left: number
  top: number
  imageDataUrl: string
  blendMode?: string
}

export interface ParsedPSD {
  width: number
  height: number
  layers: PSDLayer[]
  flattenedImageDataUrl?: string
}

/**
 * Process PSD file and extract layers
 */
export async function processPSD(file: File): Promise<ParsedPSD> {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const psd = readPsd(arrayBuffer, {
      logErrors: true,
      skipLayerImageData: false,
      skipCompositeImageData: false,
    })

    if (!psd) {
      throw new Error("Failed to parse PSD file")
    }

  const layers: PSDLayer[] = []
  let layerIndex = 0

  // Extract layers recursively
  const extractLayers = (layer: any, parentName = ""): void => {
    if (!layer) return

    // Skip hidden layers
    if (layer.hidden) return

    const layerName = layer.name || `Layer ${layerIndex++}`
    const fullName = parentName ? `${parentName}/${layerName}` : layerName

    // If layer has canvas/image data
    if (layer.canvas) {
      try {
        const imageDataUrl = layer.canvas.toDataURL("image/png")
        layers.push({
          id: `psd-layer-${layerIndex}`,
          name: fullName,
          visible: !layer.hidden,
          opacity: (layer.opacity || 255) / 255,
          width: layer.width || 0,
          height: layer.height || 0,
          left: layer.left || 0,
          top: layer.top || 0,
          imageDataUrl,
          blendMode: layer.blendMode,
        })
      } catch (error) {
        console.warn(`Failed to extract layer ${fullName}:`, error)
      }
    }

    // Process children (groups)
    if (layer.children && Array.isArray(layer.children)) {
      layer.children.forEach((child: any) => {
        extractLayers(child, fullName)
      })
    }
  }

  // Extract all layers
  if (psd.children && Array.isArray(psd.children)) {
    psd.children.forEach((child: any) => {
      extractLayers(child)
    })
  }

  // Get flattened image if available
  let flattenedImageDataUrl: string | undefined
  if (psd.canvas) {
    try {
      flattenedImageDataUrl = psd.canvas.toDataURL("image/png")
    } catch (error) {
      console.warn("Failed to extract flattened image:", error)
    }
  }

    return {
      width: psd.width || 0,
      height: psd.height || 0,
      layers,
      flattenedImageDataUrl,
    }
  } catch (error: any) {
    console.error("PSD processing error:", error)
    throw new Error(`Failed to process PSD file: ${error.message || "Unknown error"}`)
  }
}

/**
 * Convert PSD layer to design layer
 */
export function psdLayerToDesignLayer(
  psdLayer: PSDLayer,
  faceId: string,
  offset: { x: number; y: number } = { x: 0, y: 0 }
) {
  return {
    type: "image" as const,
    name: psdLayer.name,
    visible: psdLayer.visible,
    locked: false,
    opacity: psdLayer.opacity,
    blendMode: (psdLayer.blendMode?.toLowerCase() || "normal") as GlobalCompositeOperation,
    position: {
      x: psdLayer.left + offset.x,
      y: psdLayer.top + offset.y,
    },
    rotation: 0,
    scale: { x: 1, y: 1 },
    faceId: faceId as any,
    imageProperties: {
      src: psdLayer.imageDataUrl,
      naturalWidth: psdLayer.width,
      naturalHeight: psdLayer.height,
    },
  }
}

