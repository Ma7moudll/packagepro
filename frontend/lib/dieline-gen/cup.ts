// Batch T14 — cup frustum wrap: a FLAT PATTERN, not a
// production dieline. The lateral surface of a truncated
// cone, unrolled: an annular sector (outer arc = top rim,
// inner arc = bottom) plus a seam tab strip on one radial
// edge, glued over the opposite edge when the wrap is
// rolled. Curved edges are segmented polygons — the
// library's existing curve representation (the pillow and
// snaplock arc fans); there is no true-arc primitive, so
// the arcs are chords between vertices on the true
// circles, with a stated segment count.
//
// This pattern serves cup and smoothie_cup. The separate
// bottom disc of a paper cup is the disc construction of
// this batch at the bottom diameter; the curled rim is a
// formed edge, not a flat pattern element, and is not
// modelled.
//
// Spec fields for this type (stated reading — the
// catalogue does not define them): length = bottom
// diameter, width = top diameter (the top is the wider
// one in both catalogue rows), height = cup height.
// Stated parameters, never verified values: seamOverlap
// (default 15, the tab's arc length at the outer radius)
// and arcSegments (default 48). Every angle derives from
// the diameters and the height; no angle is stated
// directly. No manufacturing claims.

import type { BoxSpec, Dieline, DielineOptions, Pt } from "./types.ts"
import { finalize, fold, makePanel } from "./build.ts"

export function generateCup(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: Db, width: Dt, height: H } = spec
  if (Dt <= Db) throw new RangeError(`top diameter must exceed bottom diameter for a frustum wrap (got top ${Dt}, bottom ${Db}); a cylinder is the tube type`)
  const N = options.arcSegments
  const slant = Math.sqrt(H * H + ((Dt - Db) / 2) * ((Dt - Db) / 2))
  const R = (slant * Dt) / (Dt - Db)
  const r = R - slant
  const theta = (Math.PI * Dt) / R
  const alpha = options.seamOverlap / R
  if (alpha >= theta / 2) throw new RangeError(`seam tab would cover half the wrap or more: seamOverlap ${options.seamOverlap} mm on a top diameter of ${Dt} mm`)
  const phi0 = Math.PI / 2 - theta / 2
  const phi1 = phi0 + theta
  const arcPt = (rad: number, phi: number): Pt => ({ x: rad * Math.cos(phi), y: rad * Math.sin(phi) })
  const wrapPoly: Pt[] = []
  for (let i = 0; i <= N; i++) wrapPoly.push(arcPt(R, phi0 + (i / N) * theta))
  for (let i = N; i >= 0; i--) wrapPoly.push(arcPt(r, phi0 + (i / N) * theta))
  const M = Math.max(1, Math.round((N * alpha) / theta))
  const tabPoly: Pt[] = []
  for (let j = 0; j <= M; j++) tabPoly.push(arcPt(R, phi1 + (j / M) * alpha))
  for (let j = M; j >= 0; j--) tabPoly.push(arcPt(r, phi1 + (j / M) * alpha))
  const inner1 = arcPt(r, phi1)
  const outer1 = arcPt(R, phi1)
  const panels = [
    makePanel("wrap", "CUP WRAP", "panel", wrapPoly),
    makePanel("tab", "SEAM TAB", "glue", tabPoly),
  ]
  const folds = [fold(inner1.x, inner1.y, outer1.x, outer1.y, "valley", "wrap", "tab")]
  return finalize({
    type: "cup",
    spec,
    options,
    panels,
    folds,
    features: [],
    styleNote:
      "Cup frustum wrap prototype: a flat pattern (annular sector plus seam tab), not a production dieline. Arcs are segmented polygons with a stated segment count, not true arcs. Length = bottom diameter, width = top diameter (stated field reading); the bottom disc is the disc pattern at the bottom diameter and the curled rim is not modelled. Seam overlap is a stated parameter. No manufacturing claims.",
  })
}
