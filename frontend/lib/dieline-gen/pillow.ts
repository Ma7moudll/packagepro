// Batch T3 — pillow box (catalogue: pillow_box, "curved pillow-style
// gift box"). One-piece die-cut blank: a scored band that wraps into a
// tube (one glue seam), closed at both ends by folding along CURVED
// scores — the curve is what gives the erected box its pillow shape.
//
// Input convention: L = finished length between the two end curves,
// measured at the centres of the wide faces; W = the wide face width;
// H = the maximum depth of the erected pillow (at the centre of the
// end curves); t = board thickness.
//
// Formulae:
// - wrap segments (score-to-score): wide faces W + t, sides H + t,
//   alternating; glue flap min(glueWidth, (H + t)/2), 45° bevels;
// - blank length = L + 2 × (H + t): at the centre of each wide face
//   the end flap reaches H + t past the finished length;
// - end curves: the score at each end is a smooth curve across the
//   whole wrap. Its depth (distance from the blank's straight end
//   edge) is (H + t)/2 at every segment boundary, (H + t) at wide-face
//   centres and (H + t) × 0.75 at side centres, interpolated with a
//   parabola per segment and drawn as internal fold segments.
// Stated approximation: the wrap uses the rectangular perimeter
// 2(W + t) + 2(H + t) of the cross-section; a real pillow's curved
// cross-section has a slightly smaller perimeter, absorbed by the
// board's give at the curved ends. The curve profile itself (0.75 at
// side centres) is this generator's stated model, not a standard's.
//
// Batch T5 — the blank's OUTLINE stays a plain rectangle, on purpose:
// the erected pillow profile is fully determined by the curved
// SCORES (checked: depths at face centres, side centres and segment
// boundaries at both ends). The straight end edge is the free edge
// of the material that folds in along those scores; its shape does
// not change the folded profile, only how much material sits inside
// the closed end. Shaping the outline (e.g. an edge parallel to the
// score at a constant offset) would add a second, independent curve
// convention with no catalogue or standard source behind it —
// invented geometry — so the perimeter stays rectangular and the
// flap depth simply varies along the end, from (H + t)/2 at the
// segment boundaries to H + t at the wide-face centres.

import type { BoxSpec, Dieline, DielineOptions, Panel } from "./types.ts"
import { finalize, fold, rectPanel, makePanel } from "./build.ts"

export function generatePillow(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H, thickness: t } = spec
  const endFlap = H + t
  const blankLen = L + 2 * endFlap
  const g = Math.min(options.glueWidth, endFlap / 2)
  const bevel = Math.min(4, g / 3)

  const widths = [W + t, H + t, W + t, H + t]
  const ids = ["face-a", "side-a", "face-b", "side-b"]
  const names = ["FACE", "SIDE", "FACE", "SIDE"]
  const groups = ["wrap-w", "wrap-h", "wrap-w", "wrap-h"]
  const centres = [endFlap, endFlap * 0.75, endFlap, endFlap * 0.75]

  const panels: Panel[] = []
  const folds = []
  panels.push(
    makePanel("glue", "GLUE FLAP", "glue", [
      { x: bevel, y: 0 },
      { x: g, y: 0 },
      { x: g, y: blankLen },
      { x: bevel, y: blankLen },
      { x: 0, y: blankLen - bevel },
      { x: 0, y: bevel },
    ]),
  )
  let x = g
  const panelX = new Map<string, number>()
  for (let i = 0; i < 4; i++) {
    panelX.set(ids[i], x)
    panels.push(rectPanel(ids[i], names[i], "panel", x, 0, widths[i], blankLen, { group: groups[i] }))
    x += widths[i]
  }
  const jointIds = ["glue", ...ids]
  const jointX = [g, ...ids.slice(1).map((id) => panelX.get(id)!)]
  for (let i = 0; i < 4; i++) {
    folds.push(fold(jointX[i], 0, jointX[i], blankLen, "valley", jointIds[i], jointIds[i + 1]))
  }

  // curved end scores, per segment: depth at the segment edges is
  // endFlap/2, at the centre the segment's centre depth; a parabola
  // through those three points, drawn as 4 internal fold segments.
  for (let i = 0; i < 4; i++) {
    const px = panelX.get(ids[i])!
    const pw = widths[i]
    const edge = endFlap / 2
    const centre = centres[i]
    const depthAt = (u: number) => edge + (centre - edge) * (1 - Math.pow((2 * u) / pw - 1, 2))
    for (const end of ["top", "bottom"] as const) {
      let prev: { x: number; y: number } | null = null
      for (let s = 0; s <= 4; s++) {
        const u = (pw * s) / 4
        const d = depthAt(u)
        const pt = { x: px + u, y: end === "top" ? d : blankLen - d }
        if (prev) folds.push(fold(prev.x, prev.y, pt.x, pt.y, "valley", ids[i], ids[i], true))
        prev = pt
      }
    }
  }

  return finalize({
    type: "pillow",
    spec,
    options,
    panels,
    folds,
    features: [],
    styleNote:
      "Pillow box: one-piece scored band with a single glue seam; both ends close along curved scores (depth H + t at wide-face centres, (H + t)/2 at segment boundaries, 0.75 × (H + t) at side centres). Wrap perimeter uses the rectangular cross-section approximation stated in the generator header.",
  })
}
