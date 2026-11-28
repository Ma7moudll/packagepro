// Batch T14 — cylinder tube wrap: a FLAT PATTERN, not a
// production dieline. The body wrap of a cardboard tube:
// a rectangle one circumference wide (pi x diameter, a
// stated pi relationship) by the tube height, plus a
// seam tab panel on one vertical edge, glued inside the
// opposite edge when the wrap is rolled. The blank has
// no curved edges — the curve is formed by rolling.
//
// This pattern serves tube and tube_metal_lid (the metal
// lid is a formed metal piece, not a flat pattern, and
// is not modelled; the body blank is the same). End
// closures are separate pieces; a bottom disc is the
// disc construction of this batch at the tube diameter.
//
// Spec fields for this type: length and width both carry
// the diameter (the catalogue writes these products as
// diameter x diameter x height), height = tube height.
// Stated parameter, never a verified value: seamOverlap
// (default 15). No manufacturing claims.

import type { BoxSpec, Dieline, DielineOptions } from "./types.ts"
import { finalize, fold, rectPanel } from "./build.ts"

export function generateTube(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: D, height: H } = spec
  const circ = Math.PI * D
  const overlap = options.seamOverlap
  if (overlap > circ) throw new RangeError(`seam tab is wider than the wrap: seamOverlap ${overlap} mm on a ${circ.toFixed(1)} mm wrap (pi x ${D} mm)`)
  const panels = [
    rectPanel("wrap", "TUBE WRAP", "panel", 0, 0, circ, H),
    rectPanel("tab", "SEAM TAB", "glue", circ, 0, overlap, H),
  ]
  const folds = [fold(circ, 0, circ, H, "valley", "wrap", "tab")]
  return finalize({
    type: "tube",
    spec,
    options,
    panels,
    folds,
    features: [],
    styleNote:
      "Cylinder tube wrap prototype: a flat pattern (circumference rectangle plus seam tab), not a production dieline. Length and width both carry the diameter; the wrap width is pi x diameter by stated relationship. End closures and any metal lid are separate formed pieces, not modelled. Seam overlap is a stated parameter. No manufacturing claims.",
  })
}
