// Batch T3 — wrap-around sleeve (catalogue: sleeve, "mailer box with
// printed sleeve"). One-piece flat band that wraps a box and closes
// with a single glue seam; open at both ends.
//
// Input convention: the sleeve fits a box of length L and height H;
// W = the sleeve's band width (how much of the box's length it
// covers); t = board thickness.
//
// Formulae:
// - wrap segments (score-to-score): the box's cross-section — sides
//   H + t, front/back L + t, alternating, starting and ending with
//   the two L faces around the front;
// - panel height = W exactly: the band's long edges are CUT edges,
//   not scores, so no centreline allowance applies across the band;
// - glue flap min(glueWidth, (H + t)/2), 45° bevels, bonding to the
//   back panel.

import type { BoxSpec, Dieline, DielineOptions, Panel } from "./types.ts"
import { finalize, fold, makePanel, rectPanel } from "./build.ts"

export function generateSleeve(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H, thickness: t } = spec
  const g = Math.min(options.glueWidth, (H + t) / 2)
  const bevel = Math.min(4, g / 3)

  const widths = [H + t, L + t, H + t, L + t]
  const ids = ["side-a", "front", "side-b", "back"]
  const names = ["SIDE", "FRONT", "SIDE", "BACK"]
  const groups = ["wrap-h", "wrap-l", "wrap-h", "wrap-l"]

  const panels: Panel[] = []
  const folds = []
  panels.push(
    makePanel("glue", "GLUE FLAP", "glue", [
      { x: bevel, y: 0 },
      { x: g, y: 0 },
      { x: g, y: W },
      { x: bevel, y: W },
      { x: 0, y: W - bevel },
      { x: 0, y: bevel },
    ]),
  )
  let x = g
  const panelX = new Map<string, number>()
  for (let i = 0; i < 4; i++) {
    panelX.set(ids[i], x)
    panels.push(rectPanel(ids[i], names[i], "panel", x, 0, widths[i], W, { group: groups[i] }))
    x += widths[i]
  }
  const jointIds = ["glue", ...ids]
  const jointX = [g, ...ids.slice(1).map((id) => panelX.get(id)!)]
  for (let i = 0; i < 4; i++) {
    folds.push(fold(jointX[i], 0, jointX[i], W, "valley", jointIds[i], jointIds[i + 1]))
  }

  return finalize({
    type: "sleeve",
    spec,
    options,
    panels,
    folds,
    features: [],
    styleNote:
      "Wrap-around sleeve: one-piece band, single glue seam, open ends. Wrap segments follow the box cross-section (L + t and H + t score spans); band width W is a cut dimension with no score allowance.",
  })
}
