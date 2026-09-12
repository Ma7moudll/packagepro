/**
 * Canonical units and geometry primitives (M8-A, SPEC §6/§7).
 *
 * All physical packaging geometry is expressed in millimeters. The workspace
 * logical-pixel factor is PX_PER_MM (AD-4) and the 3D texture sampling
 * resolution is a separate named factor, TEXTURE_PX_PER_MM. No other px/mm
 * conversion factor is permitted in the editor.
 *
 * This module is intentionally dependency-free (pure functions + constants)
 * so it can be unit-tested with the Node test runner without bundling.
 */

export const MM_UNIT = "mm"
export const PX_PER_MM = 3 // workspace factor (AD-4)
export const TEXTURE_PX_PER_MM = 5 // 3D texture sampling resolution (AD-4)
export const MM_PER_CM = 10
export const DPI_MIN = 300 // SPEC-005 ≥300
export const BLEED_MM = 3 // SPEC-005 ≥3mm
export const SAFE_MM = 5 // SPEC-005 ≥5mm
export const ZONE_MATCH_TOLERANCE_MM = 5 // required-zone anchor tolerance

/** Convert a physical mm dimension to workspace logical pixels (rounded). */
export const mmToPx = (mm: number) => Math.round(mm * PX_PER_MM)

/** Convert workspace logical pixels back to physical mm. */
export const pxToMm = (px: number) => px / PX_PER_MM

/** Pixel extent of an mm dimension at a print DPI (rounded). */
export const pixelsAt = (mm: number, dpi: number) => Math.round((mm * dpi) / 25.4)

export interface PhysicalDimensions {
  length: number
  width: number
  height: number
}

/**
 * Face ↔ product-axis mapping (SPEC §7) — the ONLY mapping used to size faces.
 * `inside_*` maps to its outer sibling. Unknown faces fall back to the
 * front-face geometry (length × height).
 */
export const facePanel = (
  dims: PhysicalDimensions,
  faceId: string
): { w: number; h: number } => {
  const id = faceId.replace(/^inside_/, "")
  switch (id) {
    case "left":
    case "right":
      return { w: dims.width, h: dims.height }
    case "top":
    case "bottom":
      return { w: dims.length, h: dims.width }
    default:
      return { w: dims.length, h: dims.height }
  }
}