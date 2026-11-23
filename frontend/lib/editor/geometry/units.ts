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

/**
 * A product whose printable face set is the two sides of one flat sheet —
 * front and back — as seeded for the business card's structure. This is
 * THE rule shared by print-coverage normalization, the store's canvas
 * resync, and the saved dieline manifest.
 *
 * The rule is coverage-tolerant: inside_front / inside_back entries —
 * which coverage handling can append to a restored or crafted face list —
 * do not change what the product is; the sheet's outside faces are still
 * exactly front and back. Box products never match: their outside face
 * set is the six box faces, with or without inside coverage faces, and
 * flat-labelled products on six-face editor defaults do not match either.
 */
export const isTwoFaceSheet = (
  faces: readonly { id: string }[] | undefined
): boolean => {
  if (!faces || faces.length === 0) return false
  const ids = new Set(faces.map((f) => f.id))
  for (const id of ids) {
    if (id !== "front" && id !== "back" && id !== "inside_front" && id !== "inside_back") {
      return false
    }
  }
  return ids.has("front") && ids.has("back")
}