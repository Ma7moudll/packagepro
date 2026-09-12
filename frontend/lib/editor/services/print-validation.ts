// Print-ready Validation Service — M8-F: Unified Frontend Geometry Validation (UX mirror).
// AMENDMENT 4: geometry ONLY (bleed/safe/overlap/zone/face-bounds). The FE never certifies
// DPI/CMYK/font/corruption/compression — that authority is M8-I (backend prepress).

import {
  BLEED_MM,
  SAFE_MM,
  ZONE_MATCH_TOLERANCE_MM,
  pxToMm,
  facePanel,
} from "../geometry/units.ts"
import type { PhysicalDimensions } from "../geometry/units.ts"

export interface ValidationRule {
  id: string
  name: string
  description: string
  severity: "error" | "warning" | "info"
  category: "image" | "text" | "layout" | "color" | "file"
}

export interface ValidationResult {
  rule: ValidationRule
  passed: boolean
  message: string
  suggestions?: string[]
  elementId?: string
  details?: unknown
}

export interface ValidationReport {
  total: number
  errors: number
  warnings: number
  passed: number
  results: ValidationResult[]
  score: number // 0-100
  printReady: boolean
  perFace?: FaceValidationResult[]
}

export interface FaceValidationResult {
  faceId: string
  faceName: string
  layerCount: number
  errors: number
  warnings: number
  score: number
  printReady: boolean
  results: ValidationResult[]
  missingRequiredZones: string[]
}

export interface MmBounds {
  left: number
  top: number
  right: number
  bottom: number
}

export interface LayerGeometryInput {
  id?: string
  faceId?: string
  position?: { x: number; y: number }
  scale?: { x: number; y: number }
  width?: number
  height?: number
}

type ZoneAnchorList = Array<{ label: string; required: boolean; position: [number, number, number] }>

const geometryRule = (id: string): ValidationRule => PrintValidationService.getRule(id)

/**
 * Layer bounding box in mm relative to its face top-left. `width`/`height`
 * are the canvas logical px extent; the editor state only stores position +
 * scale, so an unstored size resolves to a point at the layer position.
 */
export const layerBoundsMm = (layer: LayerGeometryInput): MmBounds => {
  const pxLeft = layer.position?.x ?? 0
  const pxTop = layer.position?.y ?? 0
  const pxWidth = (layer.width ?? 0) * (layer.scale?.x ?? 1)
  const pxHeight = (layer.height ?? 0) * (layer.scale?.y ?? 1)
  return {
    left: pxToMm(pxLeft),
    top: pxToMm(pxTop),
    right: pxToMm(pxLeft + pxWidth),
    bottom: pxToMm(pxTop + pxHeight),
  }
}

/**
 * An element passes bleed when EVERY side near the trim edge (within
 * `BLEED_MM`) extends at least `BLEED_MM` beyond it. Deep-interior edges are
 * unrestricted. Bounds/trim are mm.
 */
export const checkElementExtendsBeyondBleed = (
  bounds: MmBounds,
  trimW: number,
  trimH: number,
  bleedMm: number = BLEED_MM,
): boolean => {
  const gapLeft = bounds.left
  const gapRight = trimW - bounds.right
  const gapTop = bounds.top
  const gapBottom = trimH - bounds.bottom
  if (gapLeft <= bleedMm && bounds.left > -bleedMm) return false
  if (gapRight <= bleedMm && bounds.right - trimW < bleedMm) return false
  if (gapTop <= bleedMm && bounds.top > -bleedMm) return false
  if (gapBottom <= bleedMm && bounds.bottom - trimH < bleedMm) return false
  return true
}

/**
 * An element is inside the safe area only when every edge lies strictly more
 * than `SAFE_MM` inside the trim (an edge exactly on the safe line fails).
 */
export const checkElementWithinSafeArea = (
  bounds: MmBounds,
  trimW: number,
  trimH: number,
  safeMm: number = SAFE_MM,
): boolean => {
  return (
    bounds.left > safeMm &&
    bounds.right < trimW - safeMm &&
    bounds.top > safeMm &&
    bounds.bottom < trimH - safeMm
  )
}

/** True when any pair of mm bounds intersects strictly (touching edges pass). */
export const checkForOverlaps = (boundsList: MmBounds[]): boolean => {
  for (let i = 0; i < boundsList.length; i++) {
    for (let j = i + 1; j < boundsList.length; j++) {
      const a = boundsList[i]
      const b = boundsList[j]
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) {
        return true
      }
    }
  }
  return false
}

export class PrintValidationService {
  private static readonly VALIDATION_RULES: ValidationRule[] = [
    {
      id: "bleed-area",
      name: "Bleed Area",
      description: `Design elements near the trim must extend at least ${BLEED_MM}mm beyond it`,
      severity: "error",
      category: "layout",
    },
    {
      id: "safe-area",
      name: "Safe Area",
      description: `Design elements must stay within the ${SAFE_MM}mm safe area`,
      severity: "warning",
      category: "layout",
    },
    {
      id: "overlapping-elements",
      name: "Overlapping Elements",
      description: "Detect unintended overlapping element bounds",
      severity: "info",
      category: "layout",
    },
    {
      id: "required-zones",
      name: "Required Zones",
      description: `Each required face zone contains a layer within ${ZONE_MATCH_TOLERANCE_MM}mm of its anchor`,
      severity: "error",
      category: "layout",
    },
    {
      id: "face-bounds",
      name: "Face Bounds",
      description: "Every layer maps to a known canonical face",
      severity: "error",
      category: "layout",
    },
  ]

  static getRule(id: string): ValidationRule {
    const rule = this.VALIDATION_RULES.find((r) => r.id === id)
    if (!rule) throw new Error(`Unknown validation rule: ${id}`)
    return rule
  }

  static getValidationRules(): ValidationRule[] {
    return this.VALIDATION_RULES
  }

  private static faceGeometryResults(
    bounds: MmBounds,
    layer: LayerGeometryInput,
    trimW: number,
    trimH: number,
  ): ValidationResult[] {
    const results: ValidationResult[] = []

    const bleed = checkElementExtendsBeyondBleed(bounds, trimW, trimH)
    results.push({
      rule: geometryRule("bleed-area"),
      passed: bleed,
      message: bleed
        ? "Element covers the bleed area"
        : `Element does not extend ${BLEED_MM}mm beyond the trim`,
      suggestions: bleed ? undefined : [`Extend element ${BLEED_MM}mm beyond the trim`],
      elementId: layer.id,
    })

    const safe = checkElementWithinSafeArea(bounds, trimW, trimH)
    results.push({
      rule: geometryRule("safe-area"),
      passed: safe,
      message: safe
        ? "Element stays within the safe area"
        : "Element crosses the safe-area line",
      suggestions: safe ? undefined : [`Keep important elements inside the ${SAFE_MM}mm safe area`],
      elementId: layer.id,
    })

    return results
  }

  private static overlapResult(): ValidationResult {
    return {
      rule: geometryRule("overlapping-elements"),
      passed: false,
      message: "Two or more elements overlap",
      suggestions: ["Separate overlapping elements"],
    }
  }

  /**
   * Geometry engine across every canonical face (outer + inside_*; inside
   * bounds resolve through their outer sibling via `facePanel`).
   */
  static validateLayout(
    layers: LayerGeometryInput[],
    model: unknown,
    _canvas?: unknown,
  ): ValidationResult[] {
    const dims = (model as { dimensions?: PhysicalDimensions } | null)?.dimensions
    if (!dims) return []
    const faces = ((model as { faces?: Array<{ id: string; name: string }> } | null)?.faces ?? [])
    const results: ValidationResult[] = []

    for (const face of faces) {
      const faceLayers = layers.filter((l) => l.faceId === face.id)
      if (faceLayers.length === 0) continue
      const trim = facePanel(dims, face.id)
      const boundsList: MmBounds[] = []
      for (const layer of faceLayers) {
        const bounds = layerBoundsMm(layer)
        results.push(...this.faceGeometryResults(bounds, layer, trim.w, trim.h))
        boundsList.push(bounds)
      }
      if (checkForOverlaps(boundsList)) {
        results.push(this.overlapResult())
      }
    }
    return results
  }

  /**
   * M7: per-face geometry + required-zone mirror. Layer positions are canvas
   * px, converted to mm via `pxToMm`; zone anchors are mm.
   */
  static async validatePerFace(
    layers: LayerGeometryInput[],
    model: unknown,
    zones?: Record<string, ZoneAnchorList>,
  ): Promise<FaceValidationResult[]> {
    const dims = (model as { dimensions?: PhysicalDimensions } | null)?.dimensions
    const faces = ((model as { faces?: Array<{ id: string; name: string }> } | null)?.faces ?? [])
    if (!dims || faces.length === 0) return []

    const knownIds = new Set(faces.map((f) => f.id))
    const unknownFaceLayers = layers.filter((l) => !l.faceId || !knownIds.has(l.faceId))
    const perFace: FaceValidationResult[] = []

    for (const face of faces) {
      const faceLayers = layers.filter((l) => l.faceId === face.id)
      const trim = facePanel(dims, face.id)
      const results: ValidationResult[] = []
      const boundsList: MmBounds[] = []

      for (const layer of faceLayers) {
        const bounds = layerBoundsMm(layer)
        results.push(...this.faceGeometryResults(bounds, layer, trim.w, trim.h))
        boundsList.push(bounds)
      }

      if (checkForOverlaps(boundsList)) {
        results.push(this.overlapResult())
      }

      const requiredZones = (zones?.[face.id] ?? []).filter((z) => z.required)
      const missingRequiredZones: string[] = []
      for (const zone of requiredZones) {
        const [zx, zy] = zone.position
        const hit = faceLayers.some((layer) => {
          const px = layer.position?.x ?? 0
          const py = layer.position?.y ?? 0
          return (
            Math.abs(pxToMm(px) - zx) <= ZONE_MATCH_TOLERANCE_MM &&
            Math.abs(pxToMm(py) - zy) <= ZONE_MATCH_TOLERANCE_MM
          )
        })
        if (!hit) {
          missingRequiredZones.push(zone.label)
          results.push({
            rule: geometryRule("required-zones"),
            passed: false,
            message: `Face "${face.name}" is missing required zone "${zone.label}"`,
            elementId: face.id,
          })
        }
      }

      if (face.id === faces[0].id) {
        for (const layer of unknownFaceLayers) {
          results.push({
            rule: geometryRule("face-bounds"),
            passed: false,
            message: `Element "${layer.id}" references unknown face "${layer.faceId}"`,
            elementId: layer.id,
          })
        }
      }

      const errors = results.filter((r) => r.rule.severity === "error" && !r.passed).length
      const warnings = results.filter((r) => r.rule.severity === "warning" && !r.passed).length
      const passed = results.filter((r) => r.passed).length
      const score = results.length ? Math.round((passed / results.length) * 100) : 100

      perFace.push({
        faceId: face.id,
        faceName: face.name,
        layerCount: faceLayers.length,
        errors,
        warnings,
        score,
        printReady: errors === 0 && score >= 80,
        results,
        missingRequiredZones,
      })
    }
    return perFace
  }

  /** M7: aggregate per-face results into a single report. */
  static async validatePrintReady(
    layers: LayerGeometryInput[],
    model: unknown,
    canvas?: unknown,
    zones?: Record<string, ZoneAnchorList>,
  ): Promise<ValidationReport> {
    const perFace = await this.validatePerFace(layers, model, zones)
    const allResults = perFace.flatMap((f) => f.results)
    const errors = perFace.reduce((sum, f) => sum + f.errors, 0)
    const warnings = perFace.reduce((sum, f) => sum + f.warnings, 0)
    const passed = allResults.filter((r) => r.passed).length
    const total = allResults.length
    const score = total ? Math.round((passed / total) * 100) : 100
    return {
      total,
      errors,
      warnings,
      passed,
      results: allResults,
      score,
      printReady: errors === 0 && score >= 80,
      perFace,
    }
  }

  /** Geometry-only quick subset (bleed mirror feedback on layer changes). */
  static async quickValidate(
    layers: LayerGeometryInput[],
    model?: unknown,
    _canvas?: unknown,
  ): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []
    const dims = (model as { dimensions?: PhysicalDimensions } | null)?.dimensions
    if (!dims) return results
    const faces = ((model as { faces?: Array<{ id: string; name: string }> } | null)?.faces ?? [])

    for (const face of faces) {
      if (results.length >= 10) break
      const trim = facePanel(dims, face.id)
      for (const layer of layers.filter((l) => l.faceId === face.id)) {
        if (results.length >= 10) break
        const bounds = layerBoundsMm(layer)
        const bleed = checkElementExtendsBeyondBleed(bounds, trim.w, trim.h)
        results.push({
          rule: geometryRule("bleed-area"),
          passed: bleed,
          message: bleed
            ? "Element covers the bleed area"
            : `Element does not extend ${BLEED_MM}mm beyond the trim`,
          elementId: layer.id,
        })
      }
    }
    return results
  }
}