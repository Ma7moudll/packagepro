"use client"

import { Layer, Face } from "@/lib/editor/state/types"

export type ValidationSeverity = "error" | "warning" | "info"

export interface ValidationIssue {
  id: string
  severity: ValidationSeverity
  message: string
  layerId?: string
  faceId?: string
  suggestion?: string
}

export interface ValidationResult {
  issues: ValidationIssue[]
  passed: boolean
  summary: {
    errors: number
    warnings: number
    info: number
  }
}

const MIN_DPI = 300
const MIN_FONT_SIZE = 6 // pt
const MIN_FONT_SIZE_SMALL = 8 // pt for small text
const BLEED_SIZE = 3 // mm
const SAFE_ZONE_SIZE = 3 // mm

export function validateDesign(
  layers: Layer[],
  faces: Face[],
  dimensions: { length: number; width: number; height: number }
): ValidationResult {
  const issues: ValidationIssue[] = []

  // Check each layer
  layers.forEach((layer) => {
    if (!layer.visible) return

    // Resolution check for images
    if (layer.type === "image" && layer.imageProperties) {
      const dpi = calculateImageDPI(
        layer.imageProperties.naturalWidth || 0,
        layer.imageProperties.naturalHeight || 0,
        dimensions
      )
      if (dpi < MIN_DPI) {
        issues.push({
          id: `resolution-${layer.id}`,
          severity: "warning",
          message: `Image resolution is ${Math.round(dpi)} DPI. Recommended: ${MIN_DPI}+ DPI for print quality.`,
          layerId: layer.id,
          faceId: layer.faceId,
          suggestion: "Use a higher resolution image or upscale the current image.",
        })
      }
    }

    // Font size check for text
    if (layer.type === "text" && layer.textProperties) {
      const fontSize = layer.textProperties.fontSize
      if (fontSize < MIN_FONT_SIZE) {
        issues.push({
          id: `font-size-${layer.id}`,
          severity: "error",
          message: `Text font size is ${fontSize}pt. Minimum recommended: ${MIN_FONT_SIZE}pt for readability.`,
          layerId: layer.id,
          faceId: layer.faceId,
          suggestion: `Increase font size to at least ${MIN_FONT_SIZE}pt.`,
        })
      } else if (fontSize < MIN_FONT_SIZE_SMALL) {
        issues.push({
          id: `font-size-small-${layer.id}`,
          severity: "warning",
          message: `Text font size is ${fontSize}pt. Recommended: ${MIN_FONT_SIZE_SMALL}+ pt for small text.`,
          layerId: layer.id,
          faceId: layer.faceId,
          suggestion: `Consider increasing font size to ${MIN_FONT_SIZE_SMALL}pt or larger.`,
        })
      }
    }

    // Safe zone check
    const faceDimensions = getFaceDimensions(layer.faceId, dimensions)
    if (
      layer.position.x < SAFE_ZONE_SIZE ||
      layer.position.y < SAFE_ZONE_SIZE ||
      layer.position.x + getLayerWidth(layer) > faceDimensions.width - SAFE_ZONE_SIZE ||
      layer.position.y + getLayerHeight(layer) > faceDimensions.height - SAFE_ZONE_SIZE
    ) {
      issues.push({
        id: `safe-zone-${layer.id}`,
        severity: "warning",
        message: "Element is close to or outside the safe zone. May be cut off during printing.",
        layerId: layer.id,
        faceId: layer.faceId,
        suggestion: `Move element at least ${SAFE_ZONE_SIZE}mm away from edges.`,
      })
    }

    // Bleed check
    if (
      layer.position.x > -BLEED_SIZE ||
      layer.position.y > -BLEED_SIZE ||
      layer.position.x + getLayerWidth(layer) < faceDimensions.width + BLEED_SIZE ||
      layer.position.y + getLayerHeight(layer) < faceDimensions.height + BLEED_SIZE
    ) {
      // Check if important content extends to bleed
      if (layer.type === "text" || (layer.type === "image" && layer.imageProperties)) {
        issues.push({
          id: `bleed-${layer.id}`,
          severity: "info",
          message: "Element does not extend to bleed area. This is fine for most designs.",
          layerId: layer.id,
          faceId: layer.faceId,
          suggestion: "For edge-to-edge designs, extend elements 3mm beyond cut lines.",
        })
      }
    }

    // Color mode check (would need actual color detection)
    if (layer.type === "text" && layer.textProperties) {
      const color = layer.textProperties.color
      if (color && !isCMYKCompatible(color)) {
        issues.push({
          id: `color-mode-${layer.id}`,
          severity: "info",
          message: "RGB colors will be converted to CMYK for printing. Some color shifts may occur.",
          layerId: layer.id,
          faceId: layer.faceId,
          suggestion: "Use CMYK color values for more accurate print colors.",
        })
      }
    }
  })

  const errors = issues.filter((i) => i.severity === "error").length
  const warnings = issues.filter((i) => i.severity === "warning").length
  const info = issues.filter((i) => i.severity === "info").length

  return {
    issues,
    passed: errors === 0,
    summary: {
      errors,
      warnings,
      info,
    },
  }
}

function calculateImageDPI(
  naturalWidth: number,
  naturalHeight: number,
  dimensions: { length: number; width: number; height: number }
): number {
  // Simplified calculation - assumes image is used at full face size
  const faceWidthMM = dimensions.length
  const faceWidthInches = faceWidthMM / 25.4
  return naturalWidth / faceWidthInches
}

function getFaceDimensions(
  faceId: string,
  dimensions: { length: number; width: number; height: number }
): { width: number; height: number } {
  // Simplified - assumes front/back are length x height, sides are width x height
  if (faceId === "front" || faceId === "back") {
    return { width: dimensions.length, height: dimensions.height }
  } else if (faceId === "left" || faceId === "right") {
    return { width: dimensions.width, height: dimensions.height }
  } else {
    // top/bottom
    return { width: dimensions.length, height: dimensions.width }
  }
}

function getLayerWidth(layer: Layer): number {
  if (layer.type === "text" && layer.textProperties) {
    // Estimate based on font size and content length
    return layer.textProperties.content.length * (layer.textProperties.fontSize / 2)
  } else if (layer.type === "image" && layer.imageProperties) {
    return (layer.imageProperties.naturalWidth || 100) * layer.scale.x
  } else if (layer.type === "shape" && layer.shapeProperties) {
    return 100 * layer.scale.x // Default shape width
  }
  return 100
}

function getLayerHeight(layer: Layer): number {
  if (layer.type === "text" && layer.textProperties) {
    return layer.textProperties.fontSize * 1.2
  } else if (layer.type === "image" && layer.imageProperties) {
    return (layer.imageProperties.naturalHeight || 100) * layer.scale.y
  } else if (layer.type === "shape" && layer.shapeProperties) {
    return 100 * layer.scale.y // Default shape height
  }
  return 100
}

function isCMYKCompatible(color: string): boolean {
  // Simplified check - in reality would need proper color space detection
  return false // Assume RGB for now
}

