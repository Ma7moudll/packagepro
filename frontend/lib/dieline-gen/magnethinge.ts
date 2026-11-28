// Batch T11 — magnetic rigid box, hinged-flap variant
// (catalogue: rigid_magnetic_box, "Magnetic closure gift
// box"). ONE connected blank: a base tray, a hinge strip,
// a lid (top panel with front and side skirts) and a
// front flap that folds down over the base front wall.
// A magnet pair sits on the flap and on the base front
// wall. This file is deliberately self-contained (its own
// tray construction, built only on the library's shared
// build helpers) so the variant can be reviewed and
// merged on its own.
//
// Stated parameters (prototype values, NOT verified
// manufacturing values — the catalogue gives no board,
// hinge, flap or magnet data for this product):
// - Dimensions are the erected box's INTERNAL L x W x H,
//   the library convention; score spans are internal + t.
// - The total internal height H is split between the base
//   and the lid skirt by options.lidShare (default 0.3):
//   base internal depth = H x (1 - lidShare), lid
//   internal depth = H x lidShare; each wall's score
//   height is its internal depth + t, so the folded
//   internal height recovers as (base wall - t) + (lid
//   skirt - t).
// - The lid is sized off the base's OUTER size: lid
//   internal footprint = (L + 2t) x (W + 2t) plus
//   options.lidClearance (default 1 mm) on each side; the
//   lid top panel's score size is that plus t.
// - options.hingeWidth (default 6 mm) is the hinge strip
//   height; the strip spans the base back wall's score
//   width and is centred under the lid top panel.
// - options.flapHeight (default 40 mm) is the front
//   flap's height; the flap spans the lid top's score
//   width and hinges on the lid front skirt.
// - MAGNET MARKS ONLY, closure alignment NOT verified: the pair
//   does not meet when closed at the defaults (see the batch AV2
//   test that records the offsets).
// - Magnet placement is a stated parameter:
//   options.magnetDiameter (default 10 mm) is the disc
//   diameter; options.magnetInset (default 6 mm) is the
//   distance from the panel's free edge to the start of
//   the disc. The flap magnet sits inset + diameter / 2
//   from the flap's free edge; the base front wall magnet
//   sits inset + diameter / 2 from that wall's free edge.
//   Both blank positions are pinned by the checks; the
//   closed-state alignment of the pair is stated by this
//   placement rule, not verified by the flat checks.
// - The lid's back corners are unjoined in this
//   prototype: the side skirts glue only at the front
//   (onto the front skirt); the hinge strip carries the
//   back. No wrap allowance: this is a plain board
//   blank, like every other type in the library.
// - Corner glue flaps stop slotGap short of the wall
//   they fold onto: in the flat layout a flap's inner
//   edge would otherwise share a boundary with that
//   wall, and a shared boundary must be a fold.

import type { BoxSpec, Dieline, DielineOptions, Feature, Panel } from "./types.ts"
import { finalize, fold, rectPanel } from "./build.ts"

export function generateMagnethinge(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H, thickness: t } = spec
  const s = options.lidShare
  const c = options.lidClearance
  const flapH = options.flapHeight
  const hingeW = options.hingeWidth
  const baseWallH = H * (1 - s) + t
  const lidWallH = H * s + t
  const botL = L + t
  const botW = W + t
  const topL = L + 3 * t + 2 * c
  const topW = W + 3 * t + 2 * c
  const baseFlapLen = Math.min(baseWallH - t, botL / 2 - 1)
  const lidFlapLen = Math.min(lidWallH - t, topL / 2 - 1)
  if (baseFlapLen < 4 || lidFlapLen < 4) {
    throw new RangeError(
      `hinged two-piece glue flaps would be under 4 mm (base ${baseFlapLen.toFixed(1)}, lid ${lidFlapLen.toFixed(1)}): the box is too small or the lid share too extreme for this construction`,
    )
  }
  const dia = options.magnetDiameter
  const inset = options.magnetInset
  if (inset + dia > flapH || inset + dia > baseWallH) {
    throw new RangeError(
      `magnet (inset ${inset} + diameter ${dia}) does not fit the flap height ${flapH.toFixed(1)} or the base wall height ${baseWallH.toFixed(1)}`,
    )
  }

  const panels: Panel[] = []
  const folds = []

  // --- the column, top to bottom: flap, lid front skirt,
  // lid top, hinge, base back wall, base bottom, base
  // front wall. The lid sections are topL wide from x0;
  // the base sections are botL wide, centred under them.
  const x0 = lidWallH
  const hx = x0 + (topL - botL) / 2
  const hingeY = flapH + lidWallH + topW
  const by = hingeY + hingeW + baseWallH

  panels.push(rectPanel("flap", "FRONT FLAP", "flap", x0, 0, topL, flapH))
  panels.push(rectPanel("lid-front", "LID FRONT SKIRT", "wall", x0, flapH, topL, lidWallH))
  panels.push(rectPanel("lid-top", "LID TOP", "panel", x0, flapH + lidWallH, topL, topW))
  folds.push(fold(x0, flapH, x0 + topL, flapH, "valley", "flap", "lid-front"))
  folds.push(fold(x0, flapH + lidWallH, x0 + topL, flapH + lidWallH, "valley", "lid-front", "lid-top"))

  panels.push(rectPanel("lid-side-l", "LID SIDE SKIRT", "wall", 0, flapH + lidWallH, lidWallH, topW))
  panels.push(rectPanel("lid-side-r", "LID SIDE SKIRT", "wall", x0 + topL, flapH + lidWallH, lidWallH, topW))
  folds.push(fold(x0, flapH + lidWallH, x0, flapH + lidWallH + topW, "valley", "lid-top", "lid-side-l"))
  folds.push(fold(x0 + topL, flapH + lidWallH, x0 + topL, flapH + lidWallH + topW, "valley", "lid-top", "lid-side-r"))
  // lid corner glue flaps: front ends of the side skirts
  // only (the back corners are unjoined, see the header)
  const lgw = lidWallH - options.slotGap
  panels.push(rectPanel("lid-glue-lf", "CORNER GLUE FLAP", "glue", 0, flapH + lidWallH - lidFlapLen, lgw, lidFlapLen))
  panels.push(rectPanel("lid-glue-rf", "CORNER GLUE FLAP", "glue", x0 + topL + options.slotGap, flapH + lidWallH - lidFlapLen, lgw, lidFlapLen))
  folds.push(fold(0, flapH + lidWallH, lgw, flapH + lidWallH, "valley", "lid-side-l", "lid-glue-lf"))
  folds.push(fold(x0 + topL + options.slotGap, flapH + lidWallH, x0 + topL + lidWallH, flapH + lidWallH, "valley", "lid-side-r", "lid-glue-rf"))

  panels.push(rectPanel("hinge", "HINGE STRIP", "flap", hx, hingeY, botL, hingeW))
  folds.push(fold(hx, hingeY, hx + botL, hingeY, "valley", "lid-top", "hinge"))
  folds.push(fold(hx, hingeY + hingeW, hx + botL, hingeY + hingeW, "valley", "hinge", "base-back"))

  panels.push(rectPanel("base-back", "BASE BACK WALL", "wall", hx, hingeY + hingeW, botL, baseWallH))
  panels.push(rectPanel("base-bottom", "BASE BOTTOM", "panel", hx, by, botL, botW))
  panels.push(rectPanel("base-front", "BASE FRONT WALL", "wall", hx, by + botW, botL, baseWallH))
  folds.push(fold(hx, by, hx + botL, by, "valley", "base-back", "base-bottom"))
  folds.push(fold(hx, by + botW, hx + botL, by + botW, "valley", "base-bottom", "base-front"))

  panels.push(rectPanel("base-side-l", "BASE SIDE WALL", "wall", hx - baseWallH, by, baseWallH, botW))
  panels.push(rectPanel("base-side-r", "BASE SIDE WALL", "wall", hx + botL, by, baseWallH, botW))
  folds.push(fold(hx, by, hx, by + botW, "valley", "base-bottom", "base-side-l"))
  folds.push(fold(hx + botL, by, hx + botL, by + botW, "valley", "base-bottom", "base-side-r"))
  const bgw = baseWallH - options.slotGap
  panels.push(rectPanel("base-glue-lb", "CORNER GLUE FLAP", "glue", hx - baseWallH, by - baseFlapLen, bgw, baseFlapLen))
  panels.push(rectPanel("base-glue-lf", "CORNER GLUE FLAP", "glue", hx - baseWallH, by + botW, bgw, baseFlapLen))
  panels.push(rectPanel("base-glue-rb", "CORNER GLUE FLAP", "glue", hx + botL + options.slotGap, by - baseFlapLen, bgw, baseFlapLen))
  panels.push(rectPanel("base-glue-rf", "CORNER GLUE FLAP", "glue", hx + botL + options.slotGap, by + botW, bgw, baseFlapLen))
  folds.push(fold(hx - baseWallH, by, hx - baseWallH + bgw, by, "valley", "base-side-l", "base-glue-lb"))
  folds.push(fold(hx - baseWallH, by + botW, hx - baseWallH + bgw, by + botW, "valley", "base-side-l", "base-glue-lf"))
  folds.push(fold(hx + botL + options.slotGap, by, hx + botL + baseWallH, by, "valley", "base-side-r", "base-glue-rb"))
  folds.push(fold(hx + botL + options.slotGap, by + botW, hx + botL + baseWallH, by + botW, "valley", "base-side-r", "base-glue-rf"))

  const features: Feature[] = [
    { kind: "magnet", at: { x: x0 + topL / 2, y: inset + dia / 2 }, w: dia, h: dia },
    { kind: "magnet", at: { x: hx + botL / 2, y: by + botW + baseWallH - inset - dia / 2 }, w: dia, h: dia },
  ]

  return finalize({
    type: "magnethinge",
    spec,
    options,
    panels,
    folds,
    features,
    styleNote:
      "Magnetic rigid box prototype, hinged-flap variant: one connected blank — base tray, hinge strip, lid with skirts, and a front flap carrying one magnet of a stated pair (the other sits on the base front wall). Height split by the lidShare parameter (default 0.3 of the internal height to the lid skirt), lid oversized from the base outer size by the lidClearance parameter (default 1 mm per side), hinge strip height and flap height by their parameters (defaults 6 mm and 40 mm), magnet diameter and inset by their parameters (defaults 10 mm and 6 mm). All of these are stated parameters, not verified manufacturing values; no wrap allowance; the lid's back corners are unjoined in this prototype; MAGNET MARKS ONLY: closure alignment is NOT verified. At the defaults the flap magnet sits far below the lid top (about flap + skirt height less the inset) while the base magnet sits near the base rim, so the pair is not designed to meet when closed. No holding-force or closure claim.",
  })
}
