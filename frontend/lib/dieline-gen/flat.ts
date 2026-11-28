// Batch T12 — flat sheet: a single flat panel with no
// folds. This is the construction shared by the nine
// catalogue products whose geometry is one flat
// rectangle (T12 Step 1 coverage): tissue paper, packing
// paper, label sheets, rectangle and square labels,
// business cards, loyalty cards, thank-you cards and
// menu cards.
//
// Spec contract for this type (stated here because it
// differs from the box types): length x width are the
// sheet's PLAN dimensions, and height is the nominal
// sheet thickness — a flat sheet's only third dimension
// is its material thickness, so height must equal
// thickness (validateSpec enforces both the range and
// the equality for this type only). The catalogue writes
// these products as length x 1 x height; a catalogue row
// maps as length = catalogue length, width = catalogue
// height, height = thickness = catalogue width.
//
// Stated limits: square corners only — the catalogue
// states no corner radius for the labels or cards, so
// none is modelled. No folds, scores, seals or features
// exist in this construction; the blank is the cut
// outline, and the bleed option applies as elsewhere in
// the library.

import type { BoxSpec, Dieline, DielineOptions } from "./types.ts"
import { finalize, rectPanel } from "./build.ts"

export function generateFlat(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W } = spec
  return finalize({
    type: "flat",
    spec,
    options,
    panels: [rectPanel("sheet", "SHEET", "panel", 0, 0, L, W)],
    folds: [],
    features: [],
    styleNote:
      "Flat sheet prototype: a single rectangular panel, no folds. Length x width are the plan dimensions; height is the nominal sheet thickness and equals thickness by this type's stated spec contract. Square corners only — no corner radius is stated in the catalogue for these products, so none is modelled.",
  })
}
