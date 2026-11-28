// Batch T13 — stand-up pouch: a FLAT FILM PATTERN, not a
// board dieline. One web, folded: a back panel, a bottom
// gusset strip with a centre crease (the fold that lets
// the pouch stand), and a front panel, in one column.
// Seals and closures are carried as features (rectangles
// centred on their `at` point, the library convention):
// side seals, a bottom seal across the gusset strip, top
// seals at both free edges, and — only when the stated
// options ask for them — zip strips inside the top
// seals, tear notches in the side seals, and a one-way
// valve on the front panel.
//
// This pattern serves the five stand-up pouch products
// in the T13 Step 1 model (stand_up_pouch, doypack_pouch,
// compostable_doypack, recyclable_doypack, doypack_valve
// — the valve product passes valve: true).
//
// Spec fields for this type: length = pouch width,
// width = bottom gusset depth (a stated mapping — the
// catalogue does not define the field), height = pouch
// height. Stated parameters, never verified values:
// sealWidth (default 10), zipHeight (default 0 = no
// zip), tearNotch (default off; notch height 3), valve
// (default off) and valveSize (default 20). The
// catalogue states no seal width, zip dimension, valve
// size or film thickness for these products.
//
// Limits: single-web folded construction only (a
// separate gusset film is not modelled); seal features
// are placement data — no seal strength, barrier or
// manufacturing claim is made or implied.

import type { BoxSpec, Dieline, DielineOptions, Feature } from "./types.ts"
import { finalize, fold, rectPanel } from "./build.ts"

export function generatePouch(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H } = spec
  const seal = options.sealWidth
  const zip = options.zipHeight
  if (seal * 2 >= L) throw new RangeError(`side seals would overlap: sealWidth ${seal} mm on a ${L} mm wide pouch`)
  if (seal > W) throw new RangeError(`bottom seal is wider than the gusset strip: sealWidth ${seal} mm, gusset depth ${W} mm`)
  if (zip > 0 && seal + zip >= H / 2) throw new RangeError(`zip does not fit: top seal ${seal} mm + zip ${zip} mm reaches halfway down a ${H} mm panel`)
  if (options.valve && (options.valveSize > L || options.valveSize > H / 2)) throw new RangeError(`valve does not fit: valveSize ${options.valveSize} mm on a ${L} x ${H} mm front panel`)

  const totalH = 2 * H + W
  const panels = [
    rectPanel("back", "BACK", "panel", 0, 0, L, H),
    rectPanel("gusset", "BOTTOM GUSSET", "panel", 0, H, L, W),
    rectPanel("front", "FRONT", "panel", 0, H + W, L, H),
  ]
  const folds = [
    fold(0, H, L, H, "valley", "back", "gusset"),
    fold(0, H + W, L, H + W, "valley", "gusset", "front"),
    fold(0, H + W / 2, L, H + W / 2, "valley", "gusset", "gusset", true),
  ]
  const features: Feature[] = [
    { kind: "seal", at: { x: seal / 2, y: totalH / 2 }, w: seal, h: totalH },
    { kind: "seal", at: { x: L - seal / 2, y: totalH / 2 }, w: seal, h: totalH },
    { kind: "seal", at: { x: L / 2, y: H + W / 2 }, w: L, h: seal },
    { kind: "seal", at: { x: L / 2, y: seal / 2 }, w: L, h: seal },
    { kind: "seal", at: { x: L / 2, y: totalH - seal / 2 }, w: L, h: seal },
  ]
  if (zip > 0) {
    features.push({ kind: "zip", at: { x: L / 2, y: seal + zip / 2 }, w: L - 2 * seal, h: zip })
    features.push({ kind: "zip", at: { x: L / 2, y: totalH - seal - zip / 2 }, w: L - 2 * seal, h: zip })
  }
  if (options.tearNotch) {
    features.push({ kind: "notch", at: { x: seal / 2, y: seal / 2 }, w: seal, h: 3 })
    features.push({ kind: "notch", at: { x: L - seal / 2, y: seal / 2 }, w: seal, h: 3 })
  }
  if (options.valve) {
    features.push({ kind: "valve", at: { x: L / 2, y: H + W + H / 4 }, w: options.valveSize, h: options.valveSize })
  }
  return finalize({
    type: "pouch",
    spec,
    options,
    panels,
    folds,
    features,
    styleNote:
      "Stand-up pouch prototype: a flat film pattern (one web — back, bottom gusset strip with centre crease, front), not a board dieline. Seal widths, zip height, notch size and valve size are stated parameters; the catalogue states none of them for these products. No manufacturing claims.",
  })
}
