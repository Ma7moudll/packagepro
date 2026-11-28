// Batch T11R — rigid two-piece box (catalogue: rigid_box). A rigid
// ("setup") box is a loose-lid construction: a base tray and a
// separate lid, so no single connected blank exists. This generator
// lays the TWO pieces out side by side as one sheet of board panels:
// each piece is a cross, a bottom (or top) panel with four wall
// panels hinged to its four edges.
//
// Scope, stated plainly:
// - These are the BOARD panels as cut. The wrap paper, its turn-in
//   and corner mitres, the glue and the board-to-board gap at the
//   corners are NOT drawn.
// - Adjacent wall panels meet only at the corner point of the
//   bottom (the quadrant between them is empty), so the walls are
//   not joined to each other here; how they are held at the
//   corners is not drawn.
// - There is no hinge, magnet, ribbon or closure feature. The lid is
//   a plain loose cap.
//
// Formulae (internal L × W × H of the BASE TRAY, board t):
// - base: bottom (L + t) × (W + t); front and back walls
//   (L + t) × (H + t); left and right walls (W + t) × (H + t)
//   (the same score-span convention as the other generators);
// - lid: inner size = base OUTER size + 2 × 1 mm clearance, so
//   inner length L + 2t + 2, inner width W + 2t + 2; top panel
//   (inner + t) on each side; skirt walls (lid depth + t) tall;
// - lid depth = min(30, max(12, 0.3 × H)) mm;
// - the two pieces are 10 mm apart on the sheet;
// - rigid_magnetic (loose magnetic lid): the same sheet plus 4 magnet
//   pocket MARKS (2 per piece, in the front wall, 10 mm magnet + 0.1 mm
//   radial clearance, at +/- (L + t)/4 from the wall centre, centred
//   lidDepth/2 from the free edge or fold so the pairs face each other
//   when the lid is seated). The magnet size is a stated assumption.
//   No holding force, pole orientation or build-up is claimed.
// The 1 mm clearance, 12/30 mm depth limits and the 0.3 proportion
// are stated design choices, not production values.

import type { BoxSpec, Dieline, DielineOptions, Feature, FoldLine, Panel } from "./types.ts"
import { finalize, fold, rectPanel } from "./build.ts"

export const RIGID_CLEARANCE = 1
export const RIGID_PIECE_GAP = 10
// Loose-lid magnetic variant (rigid_magnetic): stated magnet size, not a
// supplier value. Two magnets, in the FRONT wall of each piece.
export const MAGNET_DIAMETER = 10
export const MAGNET_POCKET_CLEARANCE = 0.1 // pocket radius = magnet radius + this

export function rigidLidDepth(H: number): number {
  return Math.min(30, Math.max(12, H * 0.3))
}

export function generateRigid(spec: BoxSpec, options: DielineOptions, magnetic = false): Dieline {
  const { length: L, width: W, height: H, thickness: t } = spec
  const lidDepth = rigidLidDepth(H)
  const panels: Panel[] = []
  const folds: FoldLine[] = []

  // one cross: centre panel (cw × cd) with four walls of height wh
  const cross = (prefix: string, ox: number, oy: number, cw: number, cd: number, wh: number, centreId: string, centreName: string, centreKind: "panel" | "lid", pieceName: string) => {
    const cx = ox + wh
    const cy = oy + wh
    const gl = `${prefix}-length`
    const gw = `${prefix}-width`
    panels.push(rectPanel(centreId, `${pieceName} ${centreName}`, centreKind, cx, cy, cw, cd, { group: gl }))
    panels.push(rectPanel(`${prefix}-back`, `${pieceName} BACK WALL`, "wall", cx, cy - wh, cw, wh, { group: gl }))
    panels.push(rectPanel(`${prefix}-front`, `${pieceName} FRONT WALL`, "wall", cx, cy + cd, cw, wh, { group: gl }))
    panels.push(rectPanel(`${prefix}-left`, `${pieceName} LEFT WALL`, "wall", cx - wh, cy, wh, cd, { group: gw }))
    panels.push(rectPanel(`${prefix}-right`, `${pieceName} RIGHT WALL`, "wall", cx + cw, cy, wh, cd, { group: gw }))
    folds.push(fold(cx, cy, cx + cw, cy, "valley", centreId, `${prefix}-back`))
    folds.push(fold(cx, cy + cd, cx + cw, cy + cd, "valley", centreId, `${prefix}-front`))
    folds.push(fold(cx, cy, cx, cy + cd, "valley", centreId, `${prefix}-left`))
    folds.push(fold(cx + cw, cy, cx + cw, cy + cd, "valley", centreId, `${prefix}-right`))
    return cw + 2 * wh
  }

  const baseW = L + t
  const baseD = W + t
  const baseWall = H + t
  const used = cross("base", 0, 0, baseW, baseD, baseWall, "base-bottom", "BOTTOM", "panel", "BASE")

  const lidIn = { l: L + 2 * t + 2 * RIGID_CLEARANCE, w: W + 2 * t + 2 * RIGID_CLEARANCE }
  const lidWall = lidDepth + t
  const lidOx = used + RIGID_PIECE_GAP
  cross("lid", lidOx, 0, lidIn.l + t, lidIn.w + t, lidWall, "lid-top", "TOP", "lid", "LID")

  // Magnet pocket marks (loose-lid magnetic variant only). Marks, not
  // cuts: the pocket sits in the wall build-up, not through the outer
  // board, so the SVG draws them in their own layer. Seated lid: the
  // lid's skirt starts at the base wall's free edge, so a pocket
  // lidDepth/2 below the base wall's free edge faces a pocket lidDepth/2
  // below the lid's top-panel fold. Both are centred on the front wall,
  // at +/- (L + t)/4 from its centre.
  const features: Feature[] = []
  if (magnetic) {
    const r = MAGNET_DIAMETER / 2 + MAGNET_POCKET_CLEARANCE
    const off = baseW / 4
    const baseCx = baseWall + baseW / 2
    const baseFreeEdgeY = baseWall + baseD + baseWall
    const lidCx = lidOx + lidWall + (lidIn.l + t) / 2
    const lidFoldY = lidWall + (lidIn.w + t)
    for (const sgn of [-1, 1]) {
      features.push({ kind: "magnet", at: { x: baseCx + sgn * off, y: baseFreeEdgeY - lidDepth / 2 }, w: 2 * r, h: 2 * r, r })
      features.push({ kind: "magnet", at: { x: lidCx + sgn * off, y: lidFoldY + lidDepth / 2 }, w: 2 * r, h: 2 * r, r })
    }
  }

  return finalize({
    type: magnetic ? "rigid_magnetic" : "rigid",
    spec,
    options,
    panels,
    folds,
    features,
    styleNote:
      (magnetic ? "Magnetic variant: 2 stated-size (10 mm) magnet pocket marks in the front wall of each piece, no closure strength claimed. " : "") +
      "Rigid two-piece box, loose lid: base tray and lid laid out side by side as two crosses of board panels (bottom or top with four hinged walls). Board panels only: wrap paper, corner closure, hinge, magnet or ribbon are not drawn. Lid inner size = base outer size + 1 mm clearance per side; lid depth = min(30, max(12, 0.3 H)) mm.",
  })
}
