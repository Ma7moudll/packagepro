// Batch R — tuck-end carton (ECMA catalogue family; FEFCO does not
// catalogue folding cartons). A glued tube of four panels; each end
// closes with one tuck flap and two dust flaps. STRAIGHT tuck: both tuck
// flaps hinge on the same (back) panel. REVERSE tuck: the top tuck
// hinges on the back panel, the bottom tuck on the front panel.
//
// Formulae (internal L × W × H — front width × depth × height, board t):
// - tube score widths: L + t (front/back), W + t (sides); tube score
//   height: H + t; glue flap width min(glueWidth, (W + t)/2), 45° bevels;
// - tuck flap: closure width = hinge panel score width − slotGap; the
//   closure spans the opening (W + t), then a narrower tongue (width
//   L − 2t − 1: the clear width inside the tube is L − 2t — a board
//   thickness at EACH end, wall plus folded dust flap — less 1 mm
//   working clearance; also capped at closure width − 1) continues for
//   tuckDepth = min(25, max(10, W/2)); 45° shoulders, rounded lead
//   corners, thumb notch on the lead edge. A crease crosses the flap at
//   the span line, where the tongue bends down inside;
//   (Batch S2 addendum: this header previously said L − t − 1. The
//   code's L − 2t − 1 is the correct one — L − t − 1 budgets for only
//   one end wall and the tongue would jam against the far wall/dust
//   flap wherever the closure cap does not hide the difference, e.g.
//   at t = 2 it is 2 mm too wide. Header corrected to match the code.)
// - dust flaps: length (W + t)/2 − 1 (the pair nearly meets), width =
//   side panel score width − slotGap, outer corners tapered.

import type { BoxSpec, Dieline, DielineOptions, Panel, Pt } from "./types.ts"
import { arcPoints } from "./geometry.ts"
import { finalize, fold, makePanel, rectPanel } from "./build.ts"

export function tuckDepthFor(W: number): number {
  return Math.min(25, Math.max(10, W / 2))
}

export function generateTuck(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H, thickness: t } = spec
  const sg = options.slotGap
  const tubeH = H + t
  const span = W + t
  const tuckDepth = tuckDepthFor(W)
  const tuckLen = span + tuckDepth
  const dustLen = span / 2 - 1
  const g = Math.min(options.glueWidth, span / 2)
  const bevel = Math.min(4, g / 3)

  const widths = [L + t, W + t, L + t, W + t]
  const ids = ["front", "side-r", "back", "side-l"]
  const names = ["FRONT", "SIDE", "BACK", "SIDE"]
  const groups = ["tube-l", "tube-w", "tube-l", "tube-w"]
  const topHinge = "back"
  const bottomHinge = options.tuckStyle === "straight" ? "back" : "front"

  const panels: Panel[] = []
  const folds = []
  const topSection = tuckLen
  const tubeTop = topSection
  const tubeBottom = tubeTop + tubeH

  // glue flap left of the front panel
  panels.push(
    makePanel("glue", "GLUE FLAP", "glue", [
      { x: bevel, y: tubeTop },
      { x: g, y: tubeTop },
      { x: g, y: tubeBottom },
      { x: bevel, y: tubeBottom },
      { x: 0, y: tubeBottom - bevel },
      { x: 0, y: tubeTop + bevel },
    ]),
  )

  let x = g
  const panelX = new Map<string, number>()
  for (let i = 0; i < 4; i++) {
    panelX.set(ids[i], x)
    panels.push(rectPanel(ids[i], names[i], "panel", x, tubeTop, widths[i], tubeH, { group: groups[i] }))
    x += widths[i]
  }

  // vertical tube folds
  const jointIds = ["glue", ...ids]
  // fold x positions: the glue joint (front's left edge), then each
  // subsequent panel's left edge
  const jointX = [g, ...ids.slice(1).map((id) => panelX.get(id)!)]
  for (let i = 0; i < 4; i++) {
    folds.push(fold(jointX[i], tubeTop, jointX[i], tubeBottom, "valley", jointIds[i], jointIds[i + 1]))
  }

  // --- one closure end: tuck flap on the hinge panel, dust flaps on the sides
  const buildEnd = (end: "top" | "bottom", hinge: string) => {
    const dir = end === "top" ? -1 : 1 // polygon grows away from the tube
    const hingeEdgeY = end === "top" ? tubeTop : tubeBottom
    const hx = panelX.get(hinge)!
    const hw = widths[ids.indexOf(hinge)]
    // tuck flap polygon, built in local coords (u across, v away from hinge)
    const closureW = hw - sg
    const cx0 = hx + (hw - closureW) / 2
    // the tongue slides inside between the side walls (clear width
    // L − 2t, less 1 mm) and must stay narrower than the closure part,
    // or the shoulders would flare outward instead of stepping in
    const tongueW = Math.min(L - 2 * t - 1, closureW - 1)
    const tx0 = hx + (hw - tongueW) / 2
    const shoulder = (closureW - tongueW) / 2
    const leadR = Math.min(2.5, tuckDepth / 3)
    const notchR = Math.min(5, tongueW / 6)
    const local: Pt[] = [
      { x: cx0, y: 0 },
      { x: cx0 + closureW, y: 0 },
      { x: cx0 + closureW, y: span },
      { x: tx0 + tongueW, y: span + shoulder },
    ]
    // rounded lead corner (right)
    local.push(...arcPoints(tx0 + tongueW - leadR, span + shoulder + (tuckDepth - shoulder) - leadR, leadR, 0, 90, 3).slice(1))
    // lead edge with thumb notch (a bite into the tongue)
    const leadY = tuckLen
    const midX = tx0 + tongueW / 2
    local.push({ x: midX + notchR, y: leadY })
    // negative sweep: the bite goes toward the hinge (into the tongue)
    local.push(...arcPoints(midX, leadY, notchR, 0, -180, 6).slice(1, -1))
    local.push({ x: midX - notchR, y: leadY })
    // rounded lead corner (left)
    local.push(...arcPoints(tx0 + leadR, leadY - leadR, leadR, 90, 180, 3).slice(1))
    local.push({ x: tx0, y: span + shoulder }, { x: cx0, y: span })
    const poly = local.map((p) => ({ x: p.x, y: hingeEdgeY + dir * p.y }))
    if (dir === 1) poly.reverse()
    panels.push(makePanel(`tuck-${end}`, `TUCK FLAP (${end.toUpperCase()})`, "tuck", poly, { hingePanel: hinge }))
    folds.push(fold(cx0, hingeEdgeY, cx0 + closureW, hingeEdgeY, "valley", hinge, `tuck-${end}`))
    // the tongue crease at the span line, inside the flap
    const creaseY = hingeEdgeY + dir * span
    folds.push(fold(cx0, creaseY, cx0 + closureW, creaseY, "valley", `tuck-${end}`, `tuck-${end}`, true))

    // dust flaps on the two side panels
    for (const sideId of ["side-r", "side-l"]) {
      const sx = panelX.get(sideId)!
      const sw = widths[ids.indexOf(sideId)]
      const taper = Math.min(4, dustLen * 0.2)
      const fx = sx + sg / 2
      const fw = sw - sg
      const y0 = hingeEdgeY
      const y1 = hingeEdgeY + dir * dustLen
      const poly: Pt[] =
        dir === -1
          ? [
              { x: fx, y: y0 },
              { x: fx + fw, y: y0 },
              { x: fx + fw - taper, y: y1 },
              { x: fx + taper, y: y1 },
            ]
          : [
              { x: fx, y: y0 },
              { x: fx + taper, y: y1 },
              { x: fx + fw - taper, y: y1 },
              { x: fx + fw, y: y0 },
            ]
      panels.push(makePanel(`dust-${end}-${sideId}`, "DUST FLAP", "dust", poly))
      folds.push(fold(fx, hingeEdgeY, fx + fw, hingeEdgeY, "valley", sideId, `dust-${end}-${sideId}`))
    }
  }
  buildEnd("top", topHinge)
  buildEnd("bottom", bottomHinge)

  return finalize({
    type: "tuck",
    spec,
    options,
    panels,
    folds,
    features: [],
    styleNote: `Tuck-end carton (ECMA folding-carton family): glued tube, ${options.tuckStyle} tuck — top tuck on the ${topHinge} panel, bottom tuck on the ${bottomHinge} panel; two dust flaps per end.`,
  })
}
