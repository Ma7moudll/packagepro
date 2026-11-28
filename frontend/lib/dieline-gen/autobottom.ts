// Batch T8 — auto-bottom carton (catalogue: auto_bottom_box,
// "auto-lock bottom wine box"). A one-piece folding carton from the
// same ECMA family as the tuck-end: a glued tube; the TOP closes
// with a tuck flap and two dust flaps exactly as the tuck-end's
// top; the BOTTOM is a crash-lock (auto-lock) bottom.
//
// The crash-lock bottom, as a flat pattern: all four bottom flaps
// fold in when the tube is squared. The two SIDE flaps fold first
// and nearly meet at the centre. The two MAIN flaps (front/back)
// fold over them; each main flap carries two diagonal scores, one
// at each hinge corner, and the corner triangle inside each
// diagonal is the glue zone: in the glued, flattened tube those
// triangles are bonded to the adjacent side flaps, so when the
// tube is squared the bottom assembles itself and the main flaps
// end up locked over the side flaps. The self-erecting action is
// a property of the glued assembly; the checks verify the flat-
// pattern design equations that produce it (the same division of
// labour as the snap-lock's tab/slit checks).
//
// Formulae (internal L × W × H — front width × depth × height,
// board t):
// - tube and top: exactly as the tuck-end (score widths L + t and
//   W + t, score height H + t, glue flap min(glueWidth, (W + t)/2)
//   with 45° bevels, tuck depth min(25, max(10, W/2)), dust length
//   (W + t)/2 − 1);
// - bottom side flaps: width = side panel score width − slotGap,
//   depth = (W + t)/2 − 1 (the folded pair leaves a 2 mm centre
//   gap, as the tuck-end's dust pairs do);
// - bottom main flaps: width = panel score width − slotGap,
//   depth = (W + t)/2 + 4 — past the centreline, so each main flap
//   covers the side flaps' centre gap when folded;
// - diagonal scores: on each main flap, from each hinge corner to
//   a point on the lead edge. The run is the flap depth, so each
//   diagonal sits at exactly 45° and each glue triangle has legs
//   = flap depth (area = depth² / 2) — but only while the flap is
//   at least twice as wide as it is deep. On a narrower flap the
//   two full-depth diagonals would cross inside the flap and the
//   glue triangles would overlap, so the run shortens to half
//   the flap width: the diagonals then meet at the lead edge's
//   centre point instead of crossing, the triangles share only
//   that point, and each still spans the full depth along its
//   side edge (area = run × depth / 2). Run =
//   min(flap depth, flap width / 2), for every slotGap — the
//   lead point therefore always lands on the lead edge.
//   (Batch T8b: the first version ran both diagonals at the full
//   depth unconditionally and crossed them on narrow flaps —
//   56 of 147 valid specs on a 14 × 14 grid — and its validation
//   rule, written against the default slotGap, let large
//   slotGaps push the lead point off the flap.)

import type { BoxSpec, Dieline, DielineOptions, Panel, Pt } from "./types.ts"
import { arcPoints } from "./geometry.ts"
import { finalize, fold, makePanel, rectPanel } from "./build.ts"
import { tuckDepthFor } from "./tuck.ts"

export function generateAutobottom(spec: BoxSpec, options: DielineOptions): Dieline {
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

  const panels: Panel[] = []
  const folds = []
  const tubeTop = tuckLen
  const tubeBottom = tubeTop + tubeH
  const mainDepth = span / 2 + 4
  const sideDepth = span / 2 - 1

  // glue flap left of the front panel (as the tuck-end)
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
  const jointX = [g, ...ids.slice(1).map((id) => panelX.get(id)!)]
  for (let i = 0; i < 4; i++) {
    folds.push(fold(jointX[i], tubeTop, jointX[i], tubeBottom, "valley", jointIds[i], jointIds[i + 1]))
  }

  // --- top end: tuck flap on the back panel, dust flaps on the
  // sides — the tuck-end's top construction, unchanged.
  {
    const hinge = "back"
    const hingeEdgeY = tubeTop
    const hx = panelX.get(hinge)!
    const hw = widths[ids.indexOf(hinge)]
    const closureW = hw - sg
    const cx0 = hx + (hw - closureW) / 2
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
    local.push(...arcPoints(tx0 + tongueW - leadR, span + shoulder + (tuckDepth - shoulder) - leadR, leadR, 0, 90, 3).slice(1))
    const leadY = tuckLen
    const midX = tx0 + tongueW / 2
    local.push({ x: midX + notchR, y: leadY })
    local.push(...arcPoints(midX, leadY, notchR, 0, -180, 6).slice(1, -1))
    local.push({ x: midX - notchR, y: leadY })
    local.push(...arcPoints(tx0 + leadR, leadY - leadR, leadR, 90, 180, 3).slice(1))
    local.push({ x: tx0, y: span + shoulder }, { x: cx0, y: span })
    const poly = local.map((p) => ({ x: p.x, y: hingeEdgeY - p.y }))
    panels.push(makePanel("tuck-top", "TUCK FLAP (TOP)", "tuck", poly, { hingePanel: hinge }))
    folds.push(fold(cx0, hingeEdgeY, cx0 + closureW, hingeEdgeY, "valley", hinge, "tuck-top"))
    const creaseY = hingeEdgeY - span
    folds.push(fold(cx0, creaseY, cx0 + closureW, creaseY, "valley", "tuck-top", "tuck-top", true))

    for (const sideId of ["side-r", "side-l"]) {
      const sx = panelX.get(sideId)!
      const sw = widths[ids.indexOf(sideId)]
      const taper = Math.min(4, dustLen * 0.2)
      const fx = sx + sg / 2
      const fw = sw - sg
      const poly: Pt[] = [
        { x: fx, y: hingeEdgeY },
        { x: fx + fw, y: hingeEdgeY },
        { x: fx + fw - taper, y: hingeEdgeY - dustLen },
        { x: fx + taper, y: hingeEdgeY - dustLen },
      ]
      panels.push(makePanel(`dust-top-${sideId}`, "DUST FLAP", "dust", poly))
      folds.push(fold(fx, hingeEdgeY, fx + fw, hingeEdgeY, "valley", sideId, `dust-top-${sideId}`))
    }
  }

  // --- bottom end: crash-lock flaps on all four panels.
  for (let i = 0; i < 4; i++) {
    const id = ids[i]
    const px = panelX.get(id)!
    const pw = widths[i]
    const isMain = id === "front" || id === "back"
    const depth = isMain ? mainDepth : sideDepth
    const fx = px + sg / 2
    const fw = pw - sg
    const flapId = isMain ? `bottom-main-${id}` : `bottom-side-${id}`
    panels.push(
      makePanel(flapId, isMain ? "MAIN FLAP (BOTTOM)" : "SIDE FLAP (BOTTOM)", "flap", [
        { x: fx, y: tubeBottom },
        { x: fx + fw, y: tubeBottom },
        { x: fx + fw, y: tubeBottom + depth },
        { x: fx, y: tubeBottom + depth },
      ]),
    )
    folds.push(fold(fx, tubeBottom, fx + fw, tubeBottom, "valley", id, flapId))
    if (isMain) {
      // diagonal scores: hinge corner -> lead edge; the run is
      // the flap depth (45°) or half the flap width on narrow
      // flaps, where the two diagonals meet at the lead centre
      // instead of crossing (see the header). The corner
      // triangles are the glue zones.
      const leg = Math.min(mainDepth, fw / 2)
      folds.push(fold(fx, tubeBottom, fx + leg, tubeBottom + mainDepth, "valley", flapId, flapId, true))
      folds.push(fold(fx + fw, tubeBottom, fx + fw - leg, tubeBottom + mainDepth, "valley", flapId, flapId, true))
    }
  }

  return finalize({
    type: "autobottom",
    spec,
    options,
    panels,
    folds,
    features: [],
    styleNote:
      "Auto-bottom (crash-lock) carton, ECMA folding-carton family: glued tube, tuck top as the tuck-end; crash-lock bottom — side flaps nearly meet at the centre, main flaps fold over them, and the main flaps' diagonal corner triangles (45° where the flap is at least twice as wide as deep, meeting at the lead centre on narrower flaps) are the glue zones that make the glued tube self-erect. The flat checks verify the pattern equations; the self-erecting action is a property of the glued assembly.",
  })
}
