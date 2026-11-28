// Batch T13 — flat sealed bag: a FLAT FILM PATTERN, not
// a board dieline. One blank folded at the bottom: an
// optional peel-and-seal flap, a back panel and a front
// panel. The bottom is a fold, so three sides are
// sealed: the two side seals (features) plus the top
// closure — an adhesive strip on the flap for the
// mailer bags, or top seals with zip strips inside them
// for the ziplock layout (flapHeight 0, zipHeight > 0).
// A plain heat-sealed top (no flap, no zip) is the third
// layout.
//
// This pattern serves the four flat sealed bag products
// in the T13 Step 1 model (paper_mailer_bag,
// poly_mailer_bag, bio_poly_mailer_bag with the flap
// layout; frosted_ziplock_bag with the zip layout).
//
// Spec contract for this type (the T12 flat contract,
// stated here): length x width are the plan dimensions
// — length = bag width, width = bag length — and height
// is the nominal filled thickness, which must equal
// thickness (validateSpec enforces it for this type).
// The catalogue writes these products as
// width x nominal x length; a catalogue row maps as
// length = catalogue length, width = catalogue height,
// height = thickness = catalogue middle field.
//
// Stated parameters, never verified values: sealWidth
// (default 10), flapHeight (default 40; 0 removes the
// flap), zipHeight (default 0 = no zip). The catalogue
// states no seal width, flap height or zip dimension
// for these products. Limits: seal features are
// placement data — no seal strength or manufacturing
// claim is made or implied; the flap's sides are not
// sealed (stated in the model).

import type { BoxSpec, Dieline, DielineOptions, Feature } from "./types.ts"
import { finalize, fold, rectPanel } from "./build.ts"

export function generateBag(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: B } = spec
  const seal = options.sealWidth
  const zip = options.zipHeight
  const flapH = options.flapHeight
  if (seal * 2 >= L) throw new RangeError(`side seals would overlap: sealWidth ${seal} mm on a ${L} mm wide bag`)
  if (flapH > 0 && zip > 0) throw new RangeError(`a bag takes one closure: flapHeight ${flapH} mm and zipHeight ${zip} mm are both set`)
  if (flapH > B / 2) throw new RangeError(`flap is longer than half the bag length: flapHeight ${flapH} mm, bag length ${B} mm`)
  if (zip > 0 && seal + zip >= B / 2) throw new RangeError(`zip does not fit: top seal ${seal} mm + zip ${zip} mm reaches halfway down a ${B} mm panel`)

  const panels = []
  if (flapH > 0) panels.push(rectPanel("flap", "PEEL FLAP", "flap", 0, 0, L, flapH))
  panels.push(rectPanel("back", "BACK", "panel", 0, flapH, L, B))
  panels.push(rectPanel("front", "FRONT", "panel", 0, flapH + B, L, B))
  const folds = []
  if (flapH > 0) folds.push(fold(0, flapH, L, flapH, "valley", "flap", "back"))
  folds.push(fold(0, flapH + B, L, flapH + B, "valley", "back", "front"))
  const features: Feature[] = [
    { kind: "seal", at: { x: seal / 2, y: flapH + B }, w: seal, h: 2 * B },
    { kind: "seal", at: { x: L - seal / 2, y: flapH + B }, w: seal, h: 2 * B },
  ]
  if (flapH > 0) {
    features.push({ kind: "seal", at: { x: L / 2, y: flapH / 4 }, w: L - 2 * seal, h: flapH / 2 })
  } else {
    features.push({ kind: "seal", at: { x: L / 2, y: seal / 2 }, w: L, h: seal })
    features.push({ kind: "seal", at: { x: L / 2, y: 2 * B - seal / 2 }, w: L, h: seal })
    if (zip > 0) {
      features.push({ kind: "zip", at: { x: L / 2, y: seal + zip / 2 }, w: L - 2 * seal, h: zip })
      features.push({ kind: "zip", at: { x: L / 2, y: 2 * B - seal - zip / 2 }, w: L - 2 * seal, h: zip })
    }
  }
  return finalize({
    type: "bag",
    spec,
    options,
    panels,
    folds,
    features,
    styleNote:
      "Flat sealed bag prototype: a flat film pattern (one blank, bottom fold, three sealed sides), not a board dieline. Length x width are the plan dimensions (bag width x bag length); height is the nominal filled thickness and equals thickness by this type's stated spec contract. Seal width, flap height and zip height are stated parameters; the catalogue states none of them. No manufacturing claims.",
  })
}
