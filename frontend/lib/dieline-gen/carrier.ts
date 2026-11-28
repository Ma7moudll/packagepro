// Batch T14 — paper carrier bag: a FLAT PATTERN, not a
// production dieline. A gusseted carrier bag laid out as
// a tube row in one blank: side gusset, front, side
// gusset, back. Each gusset carries a centre crease (the
// fold that lets the gusset tuck in, the pouch gusset
// precedent from batch T13). The bottom is closed by a
// seal feature across the row; the handles are die-cut
// slot features on the front and back panels (the slot
// kind is drawn by the SVG renderer).
//
// This pattern serves paper_bag (the Releaf paper bag).
//
// Spec fields for this type: length = bag width,
// width = side gusset depth, height = bag height.
// Stated parameters, never verified values: sealWidth
// (default 10, reused from batch T13), handleWidth
// (default 100), handleHeight (default 25) and
// handleInset (default 20, from the top edge to the
// handle's top). The catalogue states no handle size or
// position and no seal width for this product. No
// manufacturing claims.

import type { BoxSpec, Dieline, DielineOptions, Feature } from "./types.ts"
import { finalize, fold, rectPanel } from "./build.ts"

export function generateCarrier(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H } = spec
  const seal = options.sealWidth
  const hw = options.handleWidth
  const hh = options.handleHeight
  const hi = options.handleInset
  if (hw >= L) throw new RangeError(`handle does not fit: handleWidth ${hw} mm on a ${L} mm wide panel`)
  if (hi + hh >= H / 2) throw new RangeError(`handle does not fit: handleInset ${hi} mm + handleHeight ${hh} mm reaches halfway down a ${H} mm panel`)
  if (seal >= H) throw new RangeError(`bottom seal does not fit: sealWidth ${seal} mm on a ${H} mm tall bag`)
  const panels = [
    rectPanel("gusset-l", "SIDE GUSSET", "panel", 0, 0, W, H),
    rectPanel("front", "FRONT", "panel", W, 0, L, H),
    rectPanel("gusset-r", "SIDE GUSSET", "panel", W + L, 0, W, H),
    rectPanel("back", "BACK", "panel", W + L + W, 0, L, H),
  ]
  const folds = [
    fold(W, 0, W, H, "valley", "gusset-l", "front"),
    fold(W + L, 0, W + L, H, "valley", "front", "gusset-r"),
    fold(W + L + W, 0, W + L + W, H, "valley", "gusset-r", "back"),
    fold(W / 2, 0, W / 2, H, "valley", "gusset-l", "gusset-l", true),
    fold(W + L + W / 2, 0, W + L + W / 2, H, "valley", "gusset-r", "gusset-r", true),
  ]
  const totalW = 2 * L + 2 * W
  const handleY = hi + hh / 2
  const features: Feature[] = [
    { kind: "seal", at: { x: totalW / 2, y: H - seal / 2 }, w: totalW, h: seal },
    { kind: "slot", at: { x: W + L / 2, y: handleY }, w: hw, h: hh },
    { kind: "slot", at: { x: W + L + W + L / 2, y: handleY }, w: hw, h: hh },
  ]
  return finalize({
    type: "carrier",
    spec,
    options,
    panels,
    folds,
    features,
    styleNote:
      "Paper carrier bag prototype: a flat pattern (tube row — gusset, front, gusset, back — with gusset centre creases, a bottom seal feature and die-cut handle slots), not a production dieline. Handle size and position and the seal width are stated parameters; the catalogue states none of them. No manufacturing claims.",
  })
}
