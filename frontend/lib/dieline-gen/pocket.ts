// Batch T14 — corrugated flat mailer: a FLAT PATTERN,
// not a production dieline. A pre-formed flat pocket
// modelled as two separate webs laid side by side with a
// stated layout gap: a back web with a top flap, and a
// front web. The bottom is a SEAL, not a fold (the point
// of difference from the batch T13 bag): the side seals
// and the bottom seal are features on the front web's
// outline, and the flap carries an adhesive strip
// feature. Flute direction and profile are material
// properties — the blank is the flat outline only.
//
// This pattern serves corrugated_envelope.
//
// Spec contract for this type (the flat-pattern
// contract, stated here): length x width are the plan
// dimensions (pocket width x pocket length) and height
// is the nominal thickness, which must equal thickness
// (validateSpec enforces it for this type). The
// catalogue writes this product as width x nominal x
// length; a catalogue row maps as length = catalogue
// length, width = catalogue height, height = thickness
// = catalogue middle field.
//
// Stated parameters, never verified values: layoutGap
// (default 10), sealWidth (default 10, reused from batch
// T13), flapHeight (default 40, reused from batch T11).
// The catalogue states none of them for this product.
// No manufacturing claims.

import type { BoxSpec, Dieline, DielineOptions, Feature } from "./types.ts"
import { finalize, fold, rectPanel } from "./build.ts"

export function generatePocket(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: B } = spec
  const seal = options.sealWidth
  const flapH = options.flapHeight
  const gap = options.layoutGap
  if (seal * 2 >= L) throw new RangeError(`side seals would overlap: sealWidth ${seal} mm on a ${L} mm wide pocket`)
  if (seal >= B) throw new RangeError(`bottom seal does not fit: sealWidth ${seal} mm on a ${B} mm long pocket`)
  if (flapH > B / 2) throw new RangeError(`flap is longer than half the pocket length: flapHeight ${flapH} mm, pocket length ${B} mm`)
  const frontX = L + gap
  const panels = [
    rectPanel("flap", "FLAP", "flap", 0, 0, L, flapH),
    rectPanel("back", "BACK WEB", "panel", 0, flapH, L, B),
    rectPanel("front", "FRONT WEB", "panel", frontX, flapH, L, B),
  ]
  const folds = [fold(0, flapH, L, flapH, "valley", "flap", "back")]
  const features: Feature[] = [
    { kind: "seal", at: { x: frontX + seal / 2, y: flapH + B / 2 }, w: seal, h: B },
    { kind: "seal", at: { x: frontX + L - seal / 2, y: flapH + B / 2 }, w: seal, h: B },
    { kind: "seal", at: { x: frontX + L / 2, y: flapH + B - seal / 2 }, w: L, h: seal },
    { kind: "seal", at: { x: L / 2, y: flapH / 4 }, w: L - 2 * seal, h: flapH / 2 },
  ]
  return finalize({
    type: "pocket",
    spec,
    options,
    panels,
    folds,
    features,
    styleNote:
      "Corrugated flat mailer prototype: a flat pattern of two separate webs (back web with flap, front web) with side and bottom seal features, not a production dieline. The bottom is a seal, not a fold. Length x width are the plan dimensions; height is the nominal thickness and equals thickness by this type's stated spec contract. Layout gap, seal width and flap height are stated parameters. No manufacturing claims.",
  })
}
