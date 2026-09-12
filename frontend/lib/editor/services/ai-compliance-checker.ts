"use client"

import { Layer, Face } from "@/lib/editor/state/types"

export interface ComplianceRule {
  id: string
  name: string
  description: string
  severity: "error" | "warning" | "info"
  check: (layers: Layer[], faces: Face[], dimensions: any) => ComplianceResult
}

export interface ComplianceResult {
  passed: boolean
  message: string
  severity: "error" | "warning" | "info"
  suggestions?: string[]
}

export interface ComplianceReport {
  overall: "pass" | "fail" | "warning"
  score: number
  results: Array<ComplianceResult & { ruleId: string; ruleName: string }>
  summary: {
    passed: number
    warnings: number
    errors: number
  }
}

/**
 * Design compliance rules
 */
const COMPLIANCE_RULES: ComplianceRule[] = [
  {
    id: "min-text-size",
    name: "Minimum Text Size",
    description: "All text must be at least 6pt for readability",
    severity: "error",
    check: (layers) => {
      const smallText = layers.filter(
        (l) =>
          l.type === "text" &&
          l.textProperties &&
          l.textProperties.fontSize < 6 &&
          l.visible
      )

      if (smallText.length > 0) {
        return {
          passed: false,
          message: `${smallText.length} text element(s) are too small (< 6pt)`,
          severity: "error",
          suggestions: ["Increase font size to at least 6pt for print readability"],
        }
      }

      return {
        passed: true,
        message: "All text meets minimum size requirements",
        severity: "info",
      }
    },
  },
  {
    id: "color-contrast",
    name: "Color Contrast",
    description: "Text must have sufficient contrast with background",
    severity: "warning",
    check: (layers) => {
      // Simplified contrast check
      const lowContrast: Layer[] = []
      layers.forEach((layer) => {
        if (layer.type === "text" && layer.textProperties) {
          const textColor = layer.textProperties.color
          const bgColor = "#ffffff" // Default background
          const contrast = calculateContrast(textColor, bgColor)

          if (contrast < 4.5) {
            lowContrast.push(layer)
          }
        }
      })

      if (lowContrast.length > 0) {
        return {
          passed: false,
          message: `${lowContrast.length} text element(s) have low contrast`,
          severity: "warning",
          suggestions: ["Increase contrast between text and background colors"],
        }
      }

      return {
        passed: true,
        message: "All text has sufficient contrast",
        severity: "info",
      }
    },
  },
  {
    id: "safe-zone",
    name: "Safe Zone Compliance",
    description: "Important elements should be within safe zone",
    severity: "warning",
    check: (layers, faces, dimensions) => {
      const safeZone = 3 // mm
      const violations: Layer[] = []

      layers.forEach((layer) => {
        if (layer.type === "text" && layer.visible) {
          const faceDims = getFaceDimensions(layer.faceId, dimensions)
          if (
            layer.position.x < safeZone ||
            layer.position.y < safeZone ||
            layer.position.x > faceDims.width - safeZone ||
            layer.position.y > faceDims.height - safeZone
          ) {
            violations.push(layer)
          }
        }
      })

      if (violations.length > 0) {
        return {
          passed: false,
          message: `${violations.length} element(s) outside safe zone`,
          severity: "warning",
          suggestions: ["Move important elements at least 3mm from edges"],
        }
      }

      return {
        passed: true,
        message: "All elements within safe zone",
        severity: "info",
      }
    },
  },
  {
    id: "image-resolution",
    name: "Image Resolution",
    description: "Images should be at least 300 DPI for print",
    severity: "warning",
    check: (layers) => {
      const lowResImages = layers.filter(
        (l) =>
          l.type === "image" &&
          l.imageProperties &&
          l.imageProperties.naturalWidth &&
          l.imageProperties.naturalWidth < 1000 &&
          l.visible
      )

      if (lowResImages.length > 0) {
        return {
          passed: false,
          message: `${lowResImages.length} image(s) may have low resolution`,
          severity: "warning",
          suggestions: ["Use images with at least 300 DPI for print quality"],
        }
      }

      return {
        passed: true,
        message: "All images meet resolution requirements",
        severity: "info",
      }
    },
  },
  {
    id: "bleed-coverage",
    name: "Bleed Coverage",
    description: "Edge-to-edge designs should extend to bleed area",
    severity: "info",
    check: (layers, faces, dimensions) => {
      const bleedSize = 3 // mm
      const hasBleed = layers.some(
        (l) =>
          l.visible &&
          (l.position.x < -bleedSize ||
            l.position.y < -bleedSize ||
            (l.type === "image" && l.imageProperties))
      )

      if (!hasBleed) {
        return {
          passed: true,
          message: "Design extends to bleed area where needed",
          severity: "info",
        }
      }

      return {
        passed: true,
        message: "Bleed coverage looks good",
        severity: "info",
      }
    },
  },
]

/**
 * Run compliance check on design
 */
export function checkDesignCompliance(
  layers: Layer[],
  faces: Face[],
  dimensions: { length: number; width: number; height: number }
): ComplianceReport {
  const results = COMPLIANCE_RULES.map((rule) => ({
    ...rule.check(layers, faces, dimensions),
    ruleId: rule.id,
    ruleName: rule.name,
  }))

  const passed = results.filter((r) => r.passed).length
  const warnings = results.filter((r) => !r.passed && r.severity === "warning").length
  const errors = results.filter((r) => !r.passed && r.severity === "error").length

  const score = Math.round((passed / COMPLIANCE_RULES.length) * 100)
  const overall = errors > 0 ? "fail" : warnings > 0 ? "warning" : "pass"

  return {
    overall,
    score,
    results,
    summary: {
      passed,
      warnings,
      errors,
    },
  }
}

/**
 * Calculate contrast ratio between two colors
 */
function calculateContrast(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = hexToRgb(hex)
    if (!rgb) return 0

    const [r, g, b] = [rgb.r / 255, rgb.g / 255, rgb.b / 255].map((val) => {
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null
}

function getFaceDimensions(
  faceId: string,
  dimensions: { length: number; width: number; height: number }
): { width: number; height: number } {
  if (faceId === "front" || faceId === "back") {
    return { width: dimensions.length, height: dimensions.height }
  } else if (faceId === "left" || faceId === "right") {
    return { width: dimensions.width, height: dimensions.height }
  } else {
    return { width: dimensions.length, height: dimensions.width }
  }
}

