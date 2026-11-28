// Batch R — pizza box: one-piece folder in the FEFCO 0427 family.
// Central column: lid front flap, lid, back wall, bottom, front wall.
// The lid's front flap folds down OUTSIDE the front wall; two tabs on its
// lead edge snap into two slots cut in the front wall. The lid also has
// side flaps that fold down outside the single side walls. Dust flaps on
// the front and back walls fold in behind the side walls. Optional vent
// holes in the lid.
//
// Formulae (internal L × W × H, board t):
// - bottom / lid score size: (L + t) × (W + t); wall score height: H + t;
// - front flap: width (L + t) − 2t − 2 (clears the side walls), body
//   length 16, two 16 × 10 locking tabs on the lead edge with chamfered
//   tips; tab centres sit 21 mm from the hinge (16 + 10/2);
// - slots: 20 × 3.5 in the front wall, centres 21 mm inside the wall's
//   free edge at the tabs' x positions — the checks verify the alignment;
// - lid side flaps: length H + t − 2 (cover the side wall outside, clear
//   of the base), depth (W + t) − 2 corner clearance;
// - dust flaps: length (W + t)/2 − t − 1, tapered outer corners.

import type { BoxSpec, Dieline, DielineOptions, Feature, Panel, Pt } from "./types.ts"
import { finalize, fold, makePanel, rectPanel } from "./build.ts"

export function generatePizza(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H, thickness: t } = spec
  const wallH = H + t
  const botW = L + t
  const botD = W + t
  const dustLen = botD / 2 - t - 1
  const taper = Math.min(5, wallH * 0.15)
  const flapW = botW - 2 * t - 2
  const flapLen = 16
  const tabW = 16
  const tabLen = 10
  const tabInset = 14 // flap end → tab edge distance along the lead edge
  const tabReach = flapLen + tabLen / 2 // hinge → tab centre = 21
  const slotW = 20
  const slotH = 3.5
  const cham = 2

  const cx = wallH // centre column left edge (side walls attach to the bottom)
  const panels: Panel[] = []
  const folds = []
  const features: Feature[] = []

  // --- lid front flap: body y ∈ [tabLen, tabLen + flapLen], tabs above it
  const flapX = cx + (botW - flapW) / 2
  const hingeY = tabLen + flapLen
  const tabCentresX = [flapX + tabInset + tabW / 2, flapX + flapW - tabInset - tabW / 2]
  const flapPoly: Pt[] = [
    { x: flapX, y: hingeY },
    { x: flapX + flapW, y: hingeY },
    { x: flapX + flapW, y: tabLen },
  ]
  for (const tcx of [...tabCentresX].reverse()) {
    flapPoly.push(
      { x: tcx + tabW / 2, y: tabLen },
      { x: tcx + tabW / 2, y: cham },
      { x: tcx + tabW / 2 - cham, y: 0 },
      { x: tcx - tabW / 2 + cham, y: 0 },
      { x: tcx - tabW / 2, y: cham },
      { x: tcx - tabW / 2, y: tabLen },
    )
  }
  flapPoly.push({ x: flapX, y: tabLen })
  panels.push(makePanel("lid-front-flap", "LID FRONT FLAP", "tuck", flapPoly, { hingePanel: "lid" }))
  for (const tcx of tabCentresX) {
    features.push({ kind: "tab", at: { x: tcx, y: tabLen / 2 }, w: tabW, h: tabLen })
  }

  // --- central column: lid, back wall, bottom, front wall
  let y = hingeY
  const lidTopY = y
  panels.push(rectPanel("lid", "LID", "lid", cx, y, botW, botD))
  folds.push(fold(flapX, y, flapX + flapW, y, "valley", "lid-front-flap", "lid"))
  y += botD
  panels.push(rectPanel("back-wall", "BACK WALL", "wall", cx, y, botW, wallH))
  folds.push(fold(cx, y, cx + botW, y, "valley", "lid", "back-wall"))
  const backRowY = y
  y += wallH
  panels.push(rectPanel("bottom", "BOTTOM", "panel", cx, y, botW, botD))
  folds.push(fold(cx, y, cx + botW, y, "valley", "back-wall", "bottom"))
  const bottomRowY = y
  y += botD
  panels.push(rectPanel("front-wall", "FRONT WALL", "wall", cx, y, botW, wallH))
  folds.push(fold(cx, y, cx + botW, y, "valley", "bottom", "front-wall"))
  const frontRowY = y
  const blankHeight = y + wallH
  const frontFreeY = blankHeight // the front wall's free edge is the blank's bottom edge

  // slots in the front wall, centres tabReach inside the free edge
  for (const tcx of tabCentresX) {
    features.push({ kind: "slot", at: { x: tcx, y: frontFreeY - tabReach }, w: slotW, h: slotH })
  }

  // vents in the lid
  if (options.vents) {
    const vy = lidTopY + botD * 0.28 // off-centre, so the vents clear the lid label
    for (const fx of [0.32, 0.44, 0.56, 0.68]) {
      features.push({ kind: "vent", at: { x: cx + botW * fx, y: vy }, w: 8, h: 8, r: 4 })
    }
  }

  // --- lid side flaps (fold down outside the side walls)
  const lidFlapLen = H + t - 2
  const lidFlapD = botD - 2
  const lidFlapY = lidTopY + (botD - lidFlapD) / 2
  panels.push(rectPanel("lid-flap-l", "LID SIDE FLAP", "flap", cx - lidFlapLen, lidFlapY, lidFlapLen, lidFlapD))
  panels.push(rectPanel("lid-flap-r", "LID SIDE FLAP", "flap", cx + botW, lidFlapY, lidFlapLen, lidFlapD))
  folds.push(fold(cx, lidFlapY, cx, lidFlapY + lidFlapD, "valley", "lid", "lid-flap-l"))
  folds.push(fold(cx + botW, lidFlapY, cx + botW, lidFlapY + lidFlapD, "valley", "lid", "lid-flap-r"))

  // --- dust flaps on back and front walls
  for (const [wallId, rowY, side] of [
    ["back-wall", backRowY, "back"],
    ["front-wall", frontRowY, "front"],
  ] as const) {
    panels.push(
      makePanel(`dust-${side}-l`, "DUST FLAP", "dust", [
        { x: cx, y: rowY },
        { x: cx, y: rowY + wallH },
        { x: cx - dustLen, y: rowY + wallH - taper },
        { x: cx - dustLen, y: rowY + taper },
      ]),
    )
    panels.push(
      makePanel(`dust-${side}-r`, "DUST FLAP", "dust", [
        { x: cx + botW, y: rowY },
        { x: cx + botW + dustLen, y: rowY + taper },
        { x: cx + botW + dustLen, y: rowY + wallH - taper },
        { x: cx + botW, y: rowY + wallH },
      ]),
    )
    folds.push(fold(cx, rowY, cx, rowY + wallH, "valley", wallId, `dust-${side}-l`))
    folds.push(fold(cx + botW, rowY, cx + botW, rowY + wallH, "valley", wallId, `dust-${side}-r`))
  }

  // --- side walls on the bottom row
  panels.push(rectPanel("side-wall-l", "SIDE WALL", "wall", cx - wallH, bottomRowY, wallH, botD))
  panels.push(rectPanel("side-wall-r", "SIDE WALL", "wall", cx + botW, bottomRowY, wallH, botD))
  folds.push(fold(cx, bottomRowY, cx, bottomRowY + botD, "valley", "bottom", "side-wall-l"))
  folds.push(fold(cx + botW, bottomRowY, cx + botW, bottomRowY + botD, "valley", "bottom", "side-wall-r"))

  return finalize({
    type: "pizza",
    spec,
    options,
    panels,
    folds,
    features,
    styleNote:
      "One-piece pizza box in the FEFCO 0427 folder family: hinged lid, front flap with two locking tabs engaging slots in the front wall, single side walls with dust flaps, optional lid vents. Tab/slot alignment is verified by the checks.",
  })
}
