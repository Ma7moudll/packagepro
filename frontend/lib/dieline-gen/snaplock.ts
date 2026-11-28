// Batch T3 — snap-lock carton (catalogue: snap_lock_box, "product box
// with snap lock bottom"). One-piece folding carton from the same ECMA
// family as the tuck-end: a glued tube; the TOP closes with a tuck flap
// and two dust flaps exactly as the tuck-end's top; the BOTTOM is a
// snap lock (1-2-3 bottom): the two side panels carry tab flaps that
// fold in first, then the front and back main flaps fold over them and
// each main flap's slit engages the tab on its side.
//
// Formulae (internal L × W × H — front width × depth × height, board t):
// - tube: score widths L + t (front/back), W + t (sides); score height
//   H + t; glue flap min(glueWidth, (W + t)/2), 45° bevels — as tuck;
// - top tuck: closure = hinge score width − slotGap; tongue width
//   L − 2t − 1 capped at closure − 1; depth min(25, max(10, W/2))
//   beyond the span (W + t) — as tuck; dust flaps (W + t)/2 − 1;
// - bottom main flaps (front/back): width = panel score width −
//   slotGap, depth = (W + t) − t − 2 (nearly the full depth, so the
//   pair overlaps at the centre and locks); each carries ONE slit
//   (tab width + 4 by 3.5) whose centre sits span/2 from the hinge and
//   (tabDepth + 5) from the flap's left edge — the folded position of
//   the adjacent side flap's tab centre;
// - bottom tab flaps (sides): width = panel score width − slotGap,
//   body depth = (W + t)/2 + 6, with a 16 mm wide tab protruding a
//   further 10 mm from the lead edge (chamfered tip, part of the
//   flap outline, as on the pizza box's front flap); the tab centre
//   sits (tabDepth + 5) from the hinge.
// The tab/slit engagement is a property of the folded bottom; the
// checks verify the flat-pattern design equations that produce it.

import type { BoxSpec, Dieline, DielineOptions, Panel, Pt } from "./types.ts"
import { arcPoints } from "./geometry.ts"
import { finalize, fold, makePanel, rectPanel } from "./build.ts"
import { tuckDepthFor } from "./tuck.ts"

export function generateSnaplock(spec: BoxSpec, options: DielineOptions): Dieline {
  const { length: L, width: W, height: H, thickness: t } = spec
  const sg = options.slotGap
  const tubeH = H + t
  const span = W + t
  const tuckDepth = tuckDepthFor(W)
  const tuckLen = span + tuckDepth
  const dustLen = span / 2 - 1
  const g = Math.min(options.glueWidth, span / 2)
  const bevel = Math.min(4, g / 3)

  const tabW = 16
  const tabH = 10
  const tabLen = 10
  const tabDepth = span / 2 + 6
  const mainDepth = span - t - 2

  const widths = [L + t, W + t, L + t, W + t]
  const ids = ["front", "side-r", "back", "side-l"]
  const names = ["FRONT", "SIDE", "BACK", "SIDE"]
  const groups = ["tube-l", "tube-w", "tube-l", "tube-w"]

  const panels: Panel[] = []
  const folds = []
  const features = []
  const tubeTop = tuckLen
  const tubeBottom = tubeTop + tubeH

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
  const jointIds = ["glue", ...ids]
  const jointX = [g, ...ids.slice(1).map((id) => panelX.get(id)!)]
  for (let i = 0; i < 4; i++) {
    folds.push(fold(jointX[i], tubeTop, jointX[i], tubeBottom, "valley", jointIds[i], jointIds[i + 1]))
  }

  // --- top end: tuck flap on the back panel + dust flaps (as tuck-end)
  {
    const hinge = "back"
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
    const poly = local.map((p) => ({ x: p.x, y: tubeTop - p.y }))
    panels.push(makePanel("tuck-top", "TUCK FLAP (TOP)", "tuck", poly, { hingePanel: hinge }))
    folds.push(fold(cx0, tubeTop, cx0 + closureW, tubeTop, "valley", hinge, "tuck-top"))
    folds.push(fold(cx0, tubeTop - span, cx0 + closureW, tubeTop - span, "valley", "tuck-top", "tuck-top", true))
    for (const sideId of ["side-r", "side-l"]) {
      const sx = panelX.get(sideId)!
      const sw = widths[ids.indexOf(sideId)]
      const taper = Math.min(4, dustLen * 0.2)
      const fx = sx + sg / 2
      const fw = sw - sg
      const poly: Pt[] = [
        { x: fx, y: tubeTop },
        { x: fx + fw, y: tubeTop },
        { x: fx + fw - taper, y: tubeTop - dustLen },
        { x: fx + taper, y: tubeTop - dustLen },
      ]
      panels.push(makePanel(`dust-top-${sideId}`, "DUST FLAP", "dust", poly))
      folds.push(fold(fx, tubeTop, fx + fw, tubeTop, "valley", sideId, `dust-top-${sideId}`))
    }
  }

  // --- bottom end: snap lock. Main flaps on front/back, tab flaps on sides.
  for (const mainId of ["front", "back"]) {
    const mx = panelX.get(mainId)!
    const mw = widths[ids.indexOf(mainId)]
    const fw = mw - sg
    const fx = mx + sg / 2
    const taper = Math.min(4, mainDepth * 0.15)
    panels.push(
      makePanel(`main-${mainId}`, "SNAP-LOCK FLAP", "flap", [
        { x: fx, y: tubeBottom },
        { x: fx + fw, y: tubeBottom },
        { x: fx + fw - taper, y: tubeBottom + mainDepth },
        { x: fx + taper, y: tubeBottom + mainDepth },
      ]),
    )
    folds.push(fold(fx, tubeBottom, fx + fw, tubeBottom, "valley", mainId, `main-${mainId}`))
    // the slit this flap's lock engages: centre span/2 from the hinge,
    // (tabDepth + tabLen/2) from the flap's left edge — the folded
    // position of the adjacent side flap's tab centre
    features.push({ kind: "slot" as const, at: { x: fx + tabDepth + tabLen / 2, y: tubeBottom + span / 2 }, w: tabW + 4, h: 3.5 })
  }
  for (const sideId of ["side-r", "side-l"]) {
    const sx = panelX.get(sideId)!
    const sw = widths[ids.indexOf(sideId)]
    const fw = sw - sg
    const fx = sx + sg / 2
    const taper = Math.min(4, tabDepth * 0.15)
    const tabCx = fx + fw / 2
    const cham = Math.min(3, tabW / 4)
    const leadY = tubeBottom + tabDepth
    const tipY = leadY + tabLen
    panels.push(
      makePanel(`tabflap-${sideId}`, "TAB FLAP", "flap", [
        { x: fx, y: tubeBottom },
        { x: fx + fw, y: tubeBottom },
        { x: fx + fw - taper, y: leadY },
        { x: tabCx + tabW / 2, y: leadY },
        { x: tabCx + tabW / 2, y: tipY - cham },
        { x: tabCx + tabW / 2 - cham, y: tipY },
        { x: tabCx - tabW / 2 + cham, y: tipY },
        { x: tabCx - tabW / 2, y: tipY - cham },
        { x: tabCx - tabW / 2, y: leadY },
        { x: fx + taper, y: leadY },
      ]),
    )
    folds.push(fold(fx, tubeBottom, fx + fw, tubeBottom, "valley", sideId, `tabflap-${sideId}`))
    features.push({ kind: "tab" as const, at: { x: tabCx, y: leadY + tabLen / 2 }, w: tabW, h: tabH })
  }

  return finalize({
    type: "snaplock",
    spec,
    options,
    panels,
    folds,
    features,
    styleNote:
      "Snap-lock carton (ECMA folding-carton family): glued tube, tuck top with dust flaps, 1-2-3 snap-lock bottom — side tab flaps fold in first, front/back main flaps fold over and their slits engage the tabs. Simplified: one slit per main flap, positioned at the folded location of the adjacent side tab.",
  })
}
