// Batch R — Regular Slotted Container, FEFCO 0201 style.
// One blank: glue flap + four tube panels in a row, four flaps top and
// four bottom. All flaps share one length (0201: half the box width, so
// the outer flaps meet at the centre of the top/bottom face).
//
// Formulae (internal L × W × H, board t):
// - tube panel score widths: L + t, W + t alternating (centreline model);
// - tube score height: H + t;
// - flap length: W/2 + t/2 − meetGap/2 (hinge on the wall centreline to
//   the centre plane of the top face, less half the meeting gap);
// - flap width: panel score width − slotGap (slotGap/2 slot each side);
// - glue flap: width = min(glueWidth, (W + t)/3), free corners bevelled
//   45° by min(5, g/3); folded, it bonds over its whole area to the inside
//   of the last tube panel.

import type { BoxSpec, Dieline, DielineOptions, Panel } from "./types.ts"
import { finalize, fold, makePanel, rectPanel } from "./build.ts"

export function generateRsc(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H, thickness: t } = spec
  const sg = options.slotGap
  const g = Math.min(options.glueWidth, (W + t) / 3)
  const bevel = Math.min(5, g / 3)
  const bodyH = H + t
  const flapLen = W / 2 + t / 2 - options.meetGap / 2
  const widths = [L + t, W + t, L + t, W + t]
  const ids = ["panel-l1", "panel-w1", "panel-l2", "panel-w2"]
  const names = ["PANEL L1", "PANEL W1", "PANEL L2", "PANEL W2"]
  const groups = ["tube-l", "tube-w", "tube-l", "tube-w"]

  const panels: Panel[] = []
  const folds = []

  // Glue flap (left of the first panel), bevelled free corners.
  const bodyTop = flapLen
  panels.push(
    makePanel("glue", "GLUE FLAP", "glue", [
      { x: bevel, y: bodyTop },
      { x: g, y: bodyTop },
      { x: g, y: bodyTop + bodyH },
      { x: bevel, y: bodyTop + bodyH },
      { x: 0, y: bodyTop + bodyH - bevel },
      { x: 0, y: bodyTop + bevel },
    ]),
  )

  let x = g
  const panelX: number[] = []
  for (let i = 0; i < 4; i++) {
    panelX.push(x)
    panels.push(rectPanel(ids[i], names[i], "panel", x, bodyTop, widths[i], bodyH, { group: groups[i] }))
    // top and bottom flaps, inset by the slot gap
    panels.push(rectPanel(`${ids[i]}-flap-top`, `${names[i]} FLAP`, "flap", x + sg / 2, 0, widths[i] - sg, flapLen))
    panels.push(rectPanel(`${ids[i]}-flap-bottom`, `${names[i]} FLAP`, "flap", x + sg / 2, bodyTop + bodyH, widths[i] - sg, flapLen))
    // the fold line is the flap's own hinge segment (the rim segments
    // between flaps are cut edges of the slot, not folds)
    folds.push(fold(x + sg / 2, bodyTop, x + widths[i] - sg / 2, bodyTop, "valley", ids[i], `${ids[i]}-flap-top`))
    folds.push(fold(x + sg / 2, bodyTop + bodyH, x + widths[i] - sg / 2, bodyTop + bodyH, "valley", ids[i], `${ids[i]}-flap-bottom`))
    x += widths[i]
  }
  // vertical tube folds, including the glue flap joint
  const jointIds = ["glue", ...ids]
  for (let i = 0; i < 4; i++) {
    folds.push(fold(panelX[i], bodyTop, panelX[i], bodyTop + bodyH, "valley", jointIds[i], jointIds[i + 1]))
  }

  return finalize({
    type: "rsc",
    spec,
    options,
    panels,
    folds,
    features: [],
    styleNote:
      "FEFCO 0201 regular slotted container: one blank, manufacturer's glue joint, all eight flaps one length (half the internal width) meeting at the centre. Slots are the designed gaps between adjacent flaps.",
  })
}
