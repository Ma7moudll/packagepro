// Batch T3 — board envelope (catalogue: envelope, "rigid cardboard
// envelope"; the corrugated envelope is the same blank in thicker
// board). A flat die-cut blank: a body panel, two side glue flaps, a
// bottom flap that folds up over them, and a top seal flap.
//
// Input convention: L × W = the finished envelope's INTERNAL size
// (what it holds); H = the top seal flap's depth; t = board thickness.
//
// Formulae:
// - body panel score size (L + t) × (W + t) (centreline convention);
// - side glue flaps: width min(glueWidth, (W + t)/3), full body
//   height, 45° bevels on the outer corners;
// - bottom flap: width = body score width − slotGap (centred), depth
//   = (W + t)/2 − 2 (folds up to just past the body's middle), outer
//   corners tapered;
// - top seal flap: width = body score width − slotGap (centred),
//   depth = H, lead corners rounded. The adhesive strip a real
//   envelope carries on this flap is not modelled.

import type { BoxSpec, Dieline, DielineOptions, Panel, Pt } from "./types.ts"
import { arcPoints } from "./geometry.ts"
import { finalize, fold, makePanel, rectPanel } from "./build.ts"

export function generateEnvelope(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H, thickness: t } = spec
  const sg = options.slotGap
  const bodyW = L + t
  const bodyH = W + t
  const g = Math.min(options.glueWidth, bodyH / 3)
  const bevel = Math.min(4, g / 3)
  const bottomDepth = bodyH / 2 - 2
  const flapW = bodyW - sg

  const panels: Panel[] = []
  const folds = []
  const bodyX = g
  const bodyY = H // top flap grows upward from the body
  panels.push(rectPanel("body", "BODY", "panel", bodyX, bodyY, bodyW, bodyH))

  // side glue flaps
  panels.push(
    makePanel("glue-l", "GLUE FLAP", "glue", [
      { x: bodyX - g, y: bodyY + bevel },
      { x: bodyX, y: bodyY },
      { x: bodyX, y: bodyY + bodyH },
      { x: bodyX - g, y: bodyY + bodyH - bevel },
    ]),
  )
  panels.push(
    makePanel("glue-r", "GLUE FLAP", "glue", [
      { x: bodyX + bodyW, y: bodyY },
      { x: bodyX + bodyW + g, y: bodyY + bevel },
      { x: bodyX + bodyW + g, y: bodyY + bodyH - bevel },
      { x: bodyX + bodyW, y: bodyY + bodyH },
    ]),
  )
  folds.push(fold(bodyX, bodyY, bodyX, bodyY + bodyH, "valley", "glue-l", "body"))
  folds.push(fold(bodyX + bodyW, bodyY, bodyX + bodyW, bodyY + bodyH, "valley", "body", "glue-r"))

  // bottom flap
  {
    const fx = bodyX + sg / 2
    const taper = Math.min(4, bottomDepth * 0.2)
    const y0 = bodyY + bodyH
    panels.push(
      makePanel("bottom-flap", "BOTTOM FLAP", "flap", [
        { x: fx, y: y0 },
        { x: fx + flapW, y: y0 },
        { x: fx + flapW - taper, y: y0 + bottomDepth },
        { x: fx + taper, y: y0 + bottomDepth },
      ]),
    )
    folds.push(fold(fx, y0, fx + flapW, y0, "valley", "body", "bottom-flap"))
  }

  // top seal flap with rounded lead corners
  {
    const fx = bodyX + sg / 2
    const r = Math.min(6, H / 3)
    const yTop = bodyY - H
    const poly: Pt[] = [
      { x: fx, y: bodyY },
      { x: fx + flapW, y: bodyY },
      { x: fx + flapW, y: yTop + r },
    ]
    poly.push(...arcPoints(fx + flapW - r, yTop + r, r, 0, -90, 3).slice(1))
    poly.push({ x: fx + r, y: yTop })
    poly.push(...arcPoints(fx + r, yTop + r, r, -90, -180, 3).slice(1))
    panels.push(makePanel("top-flap", "SEAL FLAP", "flap", poly))
    folds.push(fold(fx, bodyY, fx + flapW, bodyY, "valley", "top-flap", "body"))
  }

  return finalize({
    type: "envelope",
    spec,
    options,
    panels,
    folds,
    features: [],
    styleNote:
      "Board envelope: body panel with two side glue flaps, a bottom flap folding up over them, and a top seal flap (adhesive strip not modelled). Same blank serves the catalogue's corrugated envelope at a larger board thickness.",
  })
}
