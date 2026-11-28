// Batch T14 — flat disc: a FLAT PATTERN, not a
// production dieline. One panel: a regular polygon
// approximating a circle — vertices on the true circle,
// edges are chords inside it. The library has no
// true-arc primitive, so a circle is only ever this
// approximation; with the stated default of 48 segments
// the chord deviation (sagitta) on a 25 mm radius is
// about 0.05 mm. The segment count is a stated
// parameter (arcSegments, default 48, divisible by 4 so
// the bounding box is the exact diameter).
//
// This pattern serves circle_label, and it is also the
// bottom-disc construction cross-referenced by the cup
// and tube patterns of this batch.
//
// Spec contract for this type (the flat-pattern
// contract, stated here): length and width both carry
// the diameter, and height is the nominal thickness,
// which must equal thickness (validateSpec enforces it
// for this type). The catalogue writes the label as
// diameter x nominal x diameter. No manufacturing
// claims.

import type { BoxSpec, Dieline, DielineOptions, Pt } from "./types.ts"
import { finalize, makePanel } from "./build.ts"

export function generateDisc(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: D } = spec
  const N = options.arcSegments
  const R = D / 2
  const poly: Pt[] = []
  for (let i = 0; i < N; i++) {
    const a = (i / N) * 2 * Math.PI
    poly.push({ x: R + R * Math.cos(a), y: R + R * Math.sin(a) })
  }
  const panels = [makePanel("disc", "DISC", "panel", poly)]
  return finalize({
    type: "disc",
    spec,
    options,
    panels,
    folds: [],
    features: [],
    styleNote:
      "Flat disc prototype: a flat pattern — a regular polygon approximating the circle (vertices on the true circle, chord edges), not a true arc and not a production dieline. Length and width both carry the diameter; height is the nominal thickness and equals thickness by this type's stated spec contract. Segment count is a stated parameter. No manufacturing claims.",
  })
}
