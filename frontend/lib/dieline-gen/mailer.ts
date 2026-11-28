// Batch R — mailer box, FEFCO 0427 style (roll-end tuck front).
// One piece, no manufacturer's joint. Central column: tuck flap, lid,
// back wall, bottom, front wall. The bottom carries the two side walls;
// each side wall carries an inner roll panel that folds back down inside
// (the "roll end", a mountain crease). Front and back walls carry dust
// flaps that fold in behind the side walls.
//
// Formulae (internal L × W × H, board t):
// - bottom / lid score size: (L + t) × (W + t); wall score height: H + t;
// - tuck flap: length H − t − 2 (hangs inside the front wall, clear of
//   the bottom), width (L + t) − 2t − 2 (slides between the side walls),
//   angled lead corners and a thumb notch on the lead edge;
// - inner roll panel: length H − t − 1 (clear of the bottom inside),
//   depth (W + t) − 2t − 2 (fits between the front/back inner faces);
// - dust flaps: length (W + t)/2 − t − 1 (reach ~half the depth, clear of
//   the opposite wall), outer corners tapered for clearance.

import type { BoxSpec, Dieline, DielineOptions, Panel, Pt } from "./types.ts"
import { arcPoints } from "./geometry.ts"
import { finalize, fold, makePanel, rectPanel } from "./build.ts"

export function generateMailer(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H, thickness: t } = spec
  const wallH = H + t
  const botW = L + t
  const botD = W + t
  const tuckLen = H - t - 2
  const tuckW = botW - 2 * t - 2
  const rollLen = H - t - 1
  const rollD = botD - 2 * t - 2
  const dustLen = botD / 2 - t - 1
  const taper = Math.min(5, wallH * 0.15)

  const cx = rollLen + wallH // centre column left edge
  const panels: Panel[] = []
  const folds = []

  // --- central column, top to bottom: tuck, lid, back wall, bottom, front wall
  const tuckX = cx + (botW - tuckW) / 2
  const notchR = Math.min(6, tuckW / 6)
  const ang = Math.min(8, tuckW * 0.1)
  const tuckPoly: Pt[] = [
    { x: tuckX, y: tuckLen },
    { x: tuckX + tuckW, y: tuckLen },
    { x: tuckX + tuckW, y: ang },
    { x: tuckX + tuckW - ang, y: 0 },
    ...arcPoints(tuckX + tuckW / 2 + notchR, 0, notchR, 180, 0, 6).slice(1, -1).reverse(),
    { x: tuckX + ang, y: 0 },
    { x: tuckX, y: ang },
  ]
  panels.push(makePanel("tuck", "TUCK FLAP", "tuck", tuckPoly, { hingePanel: "lid" }))

  let y = tuckLen
  panels.push(rectPanel("lid", "LID", "lid", cx, y, botW, botD))
  folds.push(fold(tuckX, y, tuckX + tuckW, y, "valley", "tuck", "lid"))
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

  // --- dust flaps on the back and front walls (left and right)
  const dustRows: [string, number][] = [
    ["back-wall", backRowY],
    ["front-wall", frontRowY],
  ]
  for (const [wallId, rowY] of dustRows) {
    const side = wallId === "back-wall" ? "back" : "front"
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

  // --- side walls + inner roll panels on the bottom row
  panels.push(rectPanel("side-wall-l", "SIDE WALL", "wall", cx - wallH, bottomRowY, wallH, botD))
  panels.push(rectPanel("side-wall-r", "SIDE WALL", "wall", cx + botW, bottomRowY, wallH, botD))
  folds.push(fold(cx, bottomRowY, cx, bottomRowY + botD, "valley", "bottom", "side-wall-l"))
  folds.push(fold(cx + botW, bottomRowY, cx + botW, bottomRowY + botD, "valley", "bottom", "side-wall-r"))
  const rollY = bottomRowY + (botD - rollD) / 2
  panels.push(rectPanel("roll-l", "INNER ROLL", "roll", cx - wallH - rollLen, rollY, rollLen, rollD))
  panels.push(rectPanel("roll-r", "INNER ROLL", "roll", cx + botW + wallH, rollY, rollLen, rollD))
  folds.push(fold(cx - wallH, rollY, cx - wallH, rollY + rollD, "mountain", "side-wall-l", "roll-l"))
  folds.push(fold(cx + botW + wallH, rollY, cx + botW + wallH, rollY + rollD, "mountain", "side-wall-r", "roll-r"))

  return finalize({
    type: "mailer",
    spec,
    options,
    panels,
    folds,
    features: [],
    styleNote:
      "FEFCO 0427 roll-end tuck-front mailer: one piece, hinged lid tucking into the front, double (rolled) side walls, dust flaps on the front and back walls. The lid carries no side flaps in this generator (a documented simplification).",
  })
}
