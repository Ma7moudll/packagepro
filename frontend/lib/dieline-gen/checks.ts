// Batch R — geometric self-checks for a generated dieline.
// Returns a structured report; nothing here trusts the generators' own
// arithmetic — folded dimensions are recomputed from the panel polygons
// and compared with the requested internal dimensions.

import type { Dieline, Panel, Pt } from "./types.ts"
import { arcPoints, edges, pointOnBoundary, pointStrictlyInside, polygonsOverlap, segmentContainedInEdge, signedArea } from "./geometry.ts"

export interface CheckReport {
  ok: boolean
  overlaps: { a: string; b: string }[]
  /** Folded glue-flap bond area (the designed overlap), mm². 0 when the style has no glue flap. */
  glueOverlapMm2: number
  foldedInternal: { length: number; width: number; height: number }
  foldedOuter: { length: number; width: number; height: number }
  failures: string[]
  warnings: string[]
}

// Batch S2 addendum: the dimension tolerance is 0.05 mm — well below
// the thinnest board (0.5 mm). The previous 0.51 mm let a whole board
// thickness of error pass (tube height H + 2t read as H). Every
// comparison in this file is exact arithmetic on the same inputs
// (measured deltas are 0 across the reference configurations), so the
// tight tolerance costs nothing and catches sub-millimetre drift.
const TOL = 0.05

// Batch T5b: arc pinning helpers. An on-circle test alone lets
// angle/step mutants ride the circle (a mutation run measured
// up to 1.34 mm vertex shift and 2.87 mm² area change from them).
// The fan area of an arc — the polygon area between the arc
// polyline and its centre — is therefore pinned against the
// design sampling: for vertices at angles θ0..θn around centre C,
// fan = (1/2) Σ cross(vᵢ − C, vᵢ₊₁ − C); for the design's uniform
// sampling (total sweep A over n steps) fan = (r²/2) · n ·
// sin(A/n). The sequence is anchored at the DESIGN endpoints, so
// a mutant that rotates or re-samples the arc changes the fan
// even when every vertex stays on the circle.
function arcFanArea(seq: { x: number; y: number }[], c: { x: number; y: number }): number {
  let a = 0
  for (let i = 0; i + 1 < seq.length; i++) {
    a += (seq[i].x - c.x) * (seq[i + 1].y - c.y) - (seq[i + 1].x - c.x) * (seq[i].y - c.y)
  }
  return Math.abs(a) / 2
}
function expectedFan(r: number, totalDeg: number, steps: number): number {
  return ((r * r) / 2) * steps * Math.sin(((totalDeg / steps) * Math.PI) / 180)
}
function anchoredSeq(
  designStart: { x: number; y: number },
  designEnd: { x: number; y: number },
  vertsInPolygonOrder: { x: number; y: number }[],
): { x: number; y: number }[] {
  const seq = [designStart, ...vertsInPolygonOrder, designEnd]
  return seq.filter((v, i) => i === 0 || Math.hypot(v.x - seq[i - 1].x, v.y - seq[i - 1].y) > 1e-9)
}

// Batch T6: design-outline pin. The T5b fan pins leave one class
// alive: an arc start/end-angle mutant that redistributes the
// uniform steps barely changes the fan (sin is flat near the 30°
// step: a +3° redistribution of a 90°/3-step arc moves the fan by
// ≈0.002–0.03 mm², under the 0.05 tolerance) while moving sampled
// vertices by up to 0.21 mm and the panel area by up to 0.92 mm²
// (measured in the T5b survivor-shifts table, snaplock.ts:104/110,
// envelope.ts:86/88). The outline pin therefore compares the whole
// flap outline against the design outline restated here from the
// design terms (placements, radii, sweeps, step counts, slice
// rules): vertex count, every design vertex present within TOL,
// every outline vertex matched within TOL, and the enclosed area
// within 0.05 mm². Vertex spacing on every pinned arc is ≥ 1.29 mm
// (r = 2.5 at 30° steps), so nearest-vertex matching is unambiguous.
function outlinePin(failures: string[], label: string, actual: Pt[], expected: Pt[]): void {
  if (actual.length !== expected.length) {
    failures.push(`${label}: outline carries ${actual.length} vertices, the design carries ${expected.length}`)
  }
  const nearest = (v: Pt, set: Pt[]) => Math.min(...set.map((w) => Math.hypot(v.x - w.x, v.y - w.y)))
  const missing = expected.find((e) => nearest(e, actual) > TOL)
  if (missing) failures.push(`${label}: design vertex (${missing.x.toFixed(2)}, ${missing.y.toFixed(2)}) is missing from the outline`)
  const extra = actual.find((a) => nearest(a, expected) > TOL)
  if (extra) failures.push(`${label}: outline vertex (${extra.x.toFixed(2)}, ${extra.y.toFixed(2)}) does not match any design vertex`)
  const aAct = Math.abs(signedArea(actual))
  const aExp = Math.abs(signedArea(expected))
  if (Math.abs(aAct - aExp) > 0.05) failures.push(`${label}: outline area ${aAct.toFixed(2)} ≠ design outline area ${aExp.toFixed(2)}`)
}

// The tuck flap's design outline in blank coordinates, shared by
// the tuck-end (both ends) and the snaplock's top flap, whose
// construction is identical. hingeY is the hinge fold's row and
// away the direction the flap grows from it (+1 down, −1 up), both
// taken from the dieline's own folds, as in the tongue checks.
function tuckFlapDesignOutline(hinge: Panel, hingeY: number, away: number, L: number, W: number, t: number, sg: number): Pt[] {
  const span = W + t
  const td = Math.min(25, Math.max(10, W / 2))
  const leadY = span + td
  const hingeMinX = Math.min(...hinge.polygon.map((v) => v.x))
  const closureW = hinge.width - sg
  const cx0 = hingeMinX + (hinge.width - closureW) / 2
  const tongueW = Math.min(L - 2 * t - 1, closureW - 1)
  const tx0 = hingeMinX + (hinge.width - tongueW) / 2
  const shoulder = (closureW - tongueW) / 2
  const leadR = Math.min(2.5, td / 3)
  const notchR = Math.min(5, tongueW / 6)
  const midX = tx0 + tongueW / 2
  const local: Pt[] = [
    { x: cx0, y: 0 },
    { x: cx0 + closureW, y: 0 },
    { x: cx0 + closureW, y: span },
    { x: tx0 + tongueW, y: span + shoulder },
    // the corner centre's depth is span + td − leadR: the
    // generator's span + shoulder + (td − shoulder) − leadR with
    // the shoulder cancelling, stated here in its design form
    ...arcPoints(tx0 + tongueW - leadR, span + td - leadR, leadR, 0, 90, 3).slice(1),
    { x: midX + notchR, y: leadY },
    ...arcPoints(midX, leadY, notchR, 0, -180, 6).slice(1, -1),
    { x: midX - notchR, y: leadY },
    ...arcPoints(tx0 + leadR, leadY - leadR, leadR, 90, 180, 3).slice(1),
    { x: tx0, y: span + shoulder },
    { x: cx0, y: span },
  ]
  return local.map((p) => ({ x: p.x, y: hingeY + away * p.y }))
}

function byId(d: Dieline, id: string): Panel {
  const p = d.panels.find((p) => p.id === id)
  if (!p) throw new Error(`check: panel ${id} missing`)
  return p
}

function foldedInternal(d: Dieline): { length: number; width: number; height: number } {
  const t = d.spec.thickness
  switch (d.type) {
    case "rsc": {
      const tube = d.panels.filter((p) => p.kind === "panel")
      return { length: tube[0].width - t, width: tube[1].width - t, height: tube[0].height - t }
    }
    case "mailer":
    case "pizza": {
      const bottom = byId(d, "bottom")
      const back = byId(d, "back-wall")
      return { length: bottom.width - t, width: bottom.height - t, height: back.height - t }
    }
    case "tuck": {
      const front = byId(d, "front")
      const side = byId(d, "side-r")
      return { length: front.width - t, width: side.width - t, height: front.height - t }
    }
    case "snaplock": {
      const front = byId(d, "front")
      const side = byId(d, "side-r")
      return { length: front.width - t, width: side.width - t, height: front.height - t }
    }
    case "autobottom": {
      const front = byId(d, "front")
      const side = byId(d, "side-r")
      return { length: front.width - t, width: side.width - t, height: front.height - t }
    }
    case "rigid":
    case "rigid_magnetic": {
      const front = byId(d, "base-front")
      const side = byId(d, "base-left")
      // the side wall runs along the width: its HEIGHT is W + t, its width is the wall height
      return { length: front.width - t, width: side.height - t, height: front.height - t }
    }
    case "pillow": {
      const face = byId(d, "face-a")
      const side = byId(d, "side-a")
      // finished length = blank length less the two end flaps, whose
      // depth at the face centres is H + t by the stated model
      return { length: face.height - 2 * (d.spec.height + t), width: face.width - t, height: side.width - t }
    }
    case "sleeve": {
      const front = byId(d, "front")
      const side = byId(d, "side-a")
      // the band width is a cut dimension: no score allowance
      return { length: front.width - t, width: front.height, height: side.width - t }
    }
    case "envelope": {
      const body = byId(d, "body")
      const top = byId(d, "top-flap")
      return { length: body.width - t, width: body.height - t, height: top.height }
    }
    case "cup": {
      const wrap = byId(d, "wrap")
      const poly = wrap.polygon
      const N = poly.length / 2 - 1
      const P0 = poly[0]
      const PN = poly[N]
      const QN = poly[N + 1]
      const Q0 = poly[poly.length - 1]
      // the apex is the intersection of the two radial edge lines
      const d1x = Q0.x - P0.x
      const d1y = Q0.y - P0.y
      const d2x = QN.x - PN.x
      const d2y = QN.y - PN.y
      const den = d1x * d2y - d1y * d2x
      // den is zero only if the radial edges are parallel,
      // which a genuine sector's never are; guard the
      // division and let the dimension check judge the
      // degenerate result
      const u = Math.abs(den) < 1e-12 ? 0 : ((PN.x - P0.x) * d2y - (PN.y - P0.y) * d2x) / den
      const ax = P0.x + u * d1x
      const ay = P0.y + u * d1y
      const R = Math.hypot(P0.x - ax, P0.y - ay)
      const r = Math.hypot(Q0.x - ax, Q0.y - ay)
      // the sector angle is accumulated step by step around the
      // apex: a squat, wide frustum unrolls past a semicircle,
      // where a single acos would return the reflex complement
      let theta = 0
      for (let i = 0; i < N; i++) {
        const ax1 = poly[i].x - ax
        const ay1 = poly[i].y - ay
        const ax2 = poly[i + 1].x - ax
        const ay2 = poly[i + 1].y - ay
        theta += Math.atan2(ax1 * ay2 - ay1 * ax2, ax1 * ax2 + ay1 * ay2)
      }
      theta = Math.abs(theta)
      const Dt = (R * theta) / Math.PI
      const Db = (r * theta) / Math.PI
      const slant = R - r
      const H = Math.sqrt(Math.max(0, slant * slant - ((Dt - Db) / 2) * ((Dt - Db) / 2)))
      return { length: Db, width: Dt, height: H }
    }
    case "tube": {
      const wrap = byId(d, "wrap")
      const D = wrap.width / Math.PI
      return { length: D, width: D, height: wrap.height }
    }
    case "carrier": {
      const front = byId(d, "front")
      const gusset = byId(d, "gusset-l")
      return { length: front.width, width: gusset.width, height: front.height }
    }
    case "pocket": {
      const back = byId(d, "back")
      return { length: back.width, width: back.height, height: t }
    }
    case "disc": {
      const disc = byId(d, "disc")
      return { length: disc.width, width: disc.height, height: t }
    }
    case "pouch": {
      const back = byId(d, "back")
      const gusset = byId(d, "gusset")
      const front = byId(d, "front")
      return { length: back.width, width: gusset.height, height: front.height }
    }
    case "bag": {
      const back = byId(d, "back")
      const front = byId(d, "front")
      // flat-pattern contract: plan dimensions from the
      // panels, third dimension is the nominal thickness
      return { length: back.width, width: front.height, height: t }
    }
    case "flat": {
      const sheet = byId(d, "sheet")
      // a flat sheet's folded state is itself: plan
      // dimensions from the panel, third dimension is
      // the material thickness
      return { length: sheet.width, width: sheet.height, height: t }
    }
    case "magnethinge": {
      const bottom = byId(d, "base-bottom")
      const baseFront = byId(d, "base-front")
      const lidFront = byId(d, "lid-front")
      // one blank, two stacked pieces when erected: the
      // internal height is the base's internal depth plus
      // the lid skirt's internal depth
      return { length: bottom.width - t, width: bottom.height - t, height: baseFront.height - t + (lidFront.height - t) }
    }
  }
}

export function checkDieline(d: Dieline): CheckReport {
  const failures: string[] = []
  const warnings: string[] = []
  const { length: L, width: W, height: H, thickness: t } = d.spec

  // (a) overlap: no two panels may overlap (shared edges/corners are fine)
  const overlaps: { a: string; b: string }[] = []
  for (let i = 0; i < d.panels.length; i++) {
    for (let j = i + 1; j < d.panels.length; j++) {
      if (polygonsOverlap(d.panels[i].polygon, d.panels[j].polygon)) {
        overlaps.push({ a: d.panels[i].id, b: d.panels[j].id })
      }
    }
  }
  if (overlaps.length > 0) failures.push(`overlap: ${overlaps.map((o) => `${o.a} × ${o.b}`).join(", ")}`)

  // glue flap: the designed folded overlap is the flap's whole area,
  // and it must fit the panel it bonds to
  let glueOverlapMm2 = 0
  const glue = d.panels.find((p) => p.kind === "glue")
  if (glue) {
    glueOverlapMm2 = Math.abs(signedArea(glue.polygon))
    const hostIds: Partial<Record<Dieline["type"], string>> = {
      rsc: "panel-w2",
      tuck: "side-l",
      snaplock: "side-l",
      pillow: "side-b",
      sleeve: "back",
      envelope: "bottom-flap",
    }
    // Batch T11: magnethinge's glue flaps bond to several hosts (the
    // two-piece trays); their flap-to-host agreement is restated in
    // its own section below. Every other type keeps the original
    // lookup with the "side-l" default.
    // Batch BC: cup and tube have one seam tab on their single wrap panel,
    // no side-l host; their tab fit is not restated by this lookup.
    if (d.type !== "magnethinge" && d.type !== "cup" && d.type !== "tube") {
      const host = byId(d, hostIds[d.type] ?? "side-l")
      if (glue.width > host.width + TOL) failures.push(`glue flap (${glue.width} mm) is wider than the panel it bonds to (${host.width} mm)`)
    }
  }

  // (b) folded dimensions, recomputed from the polygons
  const folded = foldedInternal(d)
  const dims: [string, number, number][] = [
    ["length", folded.length, L],
    ["width", folded.width, W],
    ["height", folded.height, H],
  ]
  for (const [name, got, want] of dims) {
    if (Math.abs(got - want) > TOL) failures.push(`dimension: folded internal ${name} is ${got.toFixed(2)} mm, input is ${want} mm`)
  }

  // panels that must be equal are equal (grouped widths)
  const groups = new Map<string, Panel[]>()
  for (const p of d.panels) {
    if (!p.group) continue
    if (!groups.has(p.group)) groups.set(p.group, [])
    groups.get(p.group)!.push(p)
  }
  for (const [g, ps] of groups) {
    const w0 = ps[0].width
    for (const p of ps) {
      if (Math.abs(p.width - w0) > 0.01) failures.push(`panels in group ${g} have unequal widths: ${ps.map((q) => `${q.id}=${q.width.toFixed(2)}`).join(", ")}`)
    }
  }

  // fold lines connect panel edges (containment), internal creases lie in their panel
  const panelById = new Map(d.panels.map((p) => [p.id, p]))
  for (const f of d.folds) {
    if (f.internal) {
      const host = panelById.get(f.between[0])
      const mid = { x: (f.from.x + f.to.x) / 2, y: (f.from.y + f.to.y) / 2 }
      // Batch T3: the crease must lie in the panel — endpoints and
      // midpoint inside or on the boundary. (Batch R required the
      // endpoints ON the boundary, which only fits a single-segment
      // crease; the pillow box's curved end scores are polylines whose
      // interior vertices lie strictly inside the panel by design.
      // The property being checked is unchanged.)
      const inPanel = (p: { x: number; y: number }) => !!host && (pointStrictlyInside(p, host.polygon) || pointOnBoundary(p, host.polygon))
      if (!host || !inPanel(f.from) || !inPanel(f.to) || !inPanel(mid)) {
        failures.push(`fold: internal crease on ${f.between[0]} does not lie inside the panel`)
      }
      continue
    }
    const [a, b] = f.between
    const pa = panelById.get(a)
    const pb = panelById.get(b)
    if (!pa || !pb) {
      failures.push(`fold: unknown panel in fold ${a} / ${b}`)
      continue
    }
    const inA = edges(pa.polygon).some((e) => segmentContainedInEdge([f.from, f.to], e))
    const inB = edges(pb.polygon).some((e) => segmentContainedInEdge([f.from, f.to], e))
    if (!inA || !inB) failures.push(`fold: line between ${a} and ${b} does not connect panel edges`)
  }

  // ---- fold completeness (batch T2): the converse direction. Every
  // boundary segment two panels share (collinear overlap > 1 mm) must
  // be backed by a fold between them. Connectivity alone cannot see a
  // MISSING fold — a mutant that dropped three of the four tuck tube
  // folds survived the whole suite before this check existed. Verified
  // against the unmutated generators: 138 shared segments across the
  // 12 reference configurations, every one fold-backed.
  for (let i = 0; i < d.panels.length; i++) {
    for (let j = i + 1; j < d.panels.length; j++) {
      const A = d.panels[i]
      const B = d.panels[j]
      for (const [p1, p2] of edges(A.polygon)) {
        for (const [q1, q2] of edges(B.polygon)) {
          const vert = Math.abs(p1.x - p2.x) < 1e-9 && Math.abs(q1.x - q2.x) < 1e-9 && Math.abs(p1.x - q1.x) < 1e-6
          const horz = !vert && Math.abs(p1.y - p2.y) < 1e-9 && Math.abs(q1.y - q2.y) < 1e-9 && Math.abs(p1.y - q1.y) < 1e-6
          if (!vert && !horz) continue
          const lo = vert ? Math.max(Math.min(p1.y, p2.y), Math.min(q1.y, q2.y)) : Math.max(Math.min(p1.x, p2.x), Math.min(q1.x, q2.x))
          const hi = vert ? Math.min(Math.max(p1.y, p2.y), Math.max(q1.y, q2.y)) : Math.min(Math.max(p1.x, p2.x), Math.max(q1.x, q2.x))
          if (hi - lo <= 1) continue
          const backed = d.folds.some((f) => {
            if (f.internal || !f.between.includes(A.id) || !f.between.includes(B.id)) return false
            if (vert) return Math.abs(f.from.x - p1.x) < 1e-6 && Math.abs(Math.min(f.from.y, f.to.y) - lo) < TOL && Math.abs(Math.max(f.from.y, f.to.y) - hi) < TOL
            return Math.abs(f.from.y - p1.y) < 1e-6 && Math.abs(Math.min(f.from.x, f.to.x) - lo) < TOL && Math.abs(Math.max(f.from.x, f.to.x) - hi) < TOL
          })
          if (!backed) failures.push(`panels ${A.id} and ${B.id} share a ${(hi - lo).toFixed(1)} mm boundary with no fold between them`)
        }
      }
    }
  }

  // flap agreement per type
  if (d.type === "rsc") {
    const expected = W / 2 + t / 2 - d.options.meetGap / 2
    for (const f of d.panels.filter((p) => p.kind === "flap")) {
      if (Math.abs(f.height - expected) > TOL) failures.push(`flap ${f.id} length ${f.height.toFixed(2)} ≠ 0201 flap length ${expected.toFixed(2)}`)
    }
  }
  if (d.type === "mailer") {
    const tuck = byId(d, "tuck")
    if (Math.abs(tuck.height - (H - t - 2)) > TOL) failures.push(`mailer tuck flap length ${tuck.height.toFixed(2)} ≠ H − t − 2`)
    // Batch T2 coverage: tuck width, roll depth and dust length were
    // previously unmeasured. Independent restatements:
    // tuck width = bottom score width − 2t − 2 (slides between the
    // side walls); roll depth = bottom score depth − 2t − 2 (fits
    // between the front/back inner faces); dust length = half the
    // bottom score depth − t − 1 (pair reaches ~halfway, clear of the
    // opposite wall).
    if (Math.abs(tuck.width - (L + t - 2 * t - 2)) > TOL) failures.push(`mailer tuck flap width ${tuck.width.toFixed(2)} ≠ (L + t) − 2t − 2`)
    for (const r of d.panels.filter((p) => p.kind === "roll")) {
      if (Math.abs(r.width - (H - t - 1)) > TOL) failures.push(`roll panel ${r.id} length ${r.width.toFixed(2)} ≠ H − t − 1`)
      if (Math.abs(r.height - (W + t - 2 * t - 2)) > TOL) failures.push(`roll panel ${r.id} depth ${r.height.toFixed(2)} ≠ (W + t) − 2t − 2`)
    }
    for (const p of d.panels.filter((p) => p.kind === "dust")) {
      if (Math.abs(p.width - ((W + t) / 2 - t - 1)) > TOL) failures.push(`mailer dust flap ${p.id} length ${p.width.toFixed(2)} ≠ (W + t)/2 − t − 1`)
    }
    // Centring (batch T2): the tuck flap is centred on the lid and the
    // roll panels are centred on the bottom's depth — a changed /2 in
    // the generator moved them silently before this.
    const lid = byId(d, "lid")
    const bottom = byId(d, "bottom")
    if (Math.abs(tuck.labelAt.x - lid.labelAt.x) > TOL) failures.push("mailer tuck flap is not centred on the lid")
    for (const r of d.panels.filter((p) => p.kind === "roll")) {
      if (Math.abs(r.labelAt.y - bottom.labelAt.y) > TOL) failures.push(`roll panel ${r.id} is not centred on the bottom depth`)
    }
    // Dust flap lead extent (batch T6): the lead edge spans the
    // wall height less the two tapered corners — the taper term
    // (min(5, wallH × 0.15)) was unmeasured before this; a +3 mm
    // change to its cap moved every dust flap's lead edge and
    // survived (T5b survivor table, mailer.ts:32).
    const taperM = Math.min(5, (H + t) * 0.15)
    for (const p of d.panels.filter((p) => p.kind === "dust")) {
      const leadX = p.labelAt.x < bottom.labelAt.x ? Math.min(...p.polygon.map((v) => v.x)) : Math.max(...p.polygon.map((v) => v.x))
      const leadYs = p.polygon.filter((v) => Math.abs(v.x - leadX) <= TOL).map((v) => v.y)
      const extent = Math.max(...leadYs) - Math.min(...leadYs)
      if (Math.abs(extent - (H + t - 2 * taperM)) > TOL) {
        failures.push(`mailer dust flap ${p.id} lead extent ${extent.toFixed(2)} ≠ wall height − 2 × taper (${(H + t - 2 * taperM).toFixed(2)})`)
      }
    }
    // Tuck flap outline (batch T6): the whole outline against its
    // design restatement — this pins the angled lead corners and
    // the thumb notch's centre, radius, sweep and sampling. The
    // notch centre term (tuckW/2 + notchR) is the T5b survivor
    // table's largest mailer shift (94.8 mm at +3, with zero area
    // change, so no area or bounding check could see it); the
    // design vertices place it exactly.
    {
      const botW = L + t
      const tuckW = botW - 2 * t - 2
      const tuckLen = H - t - 2
      const notchRM = Math.min(6, tuckW / 6)
      const angM = Math.min(8, tuckW * 0.1)
      const lidMinX = Math.min(...lid.polygon.map((v) => v.x))
      const lidMinY = Math.min(...lid.polygon.map((v) => v.y))
      const tuckX = lidMinX + (botW - tuckW) / 2
      const y0 = lidMinY - tuckLen
      const expected: Pt[] = [
        { x: tuckX, y: lidMinY },
        { x: tuckX + tuckW, y: lidMinY },
        { x: tuckX + tuckW, y: y0 + angM },
        { x: tuckX + tuckW - angM, y: y0 },
        ...arcPoints(tuckX + tuckW / 2 + notchRM, y0, notchRM, 180, 0, 6).slice(1, -1).reverse(),
        { x: tuckX + angM, y: y0 },
        { x: tuckX, y: y0 + angM },
      ]
      outlinePin(failures, "mailer tuck flap", tuck.polygon, expected)
    }
  }
  if (d.type === "pizza") {
    const tabs = d.features.filter((f) => f.kind === "tab")
    const slots = d.features.filter((f) => f.kind === "slot")
    if (tabs.length !== slots.length) failures.push(`pizza: ${tabs.length} locking tabs but ${slots.length} slots`)
    const lid = byId(d, "lid")
    const front = byId(d, "front-wall")
    const lidTopY = lid.polygon.reduce((m, p) => Math.min(m, p.y), Infinity)
    const frontFreeY = front.polygon.reduce((m, p) => Math.max(m, p.y), -Infinity)
    for (const tab of tabs) {
      const slot = slots.find((s) => Math.abs(s.at.x - tab.at.x) <= TOL)
      if (!slot) {
        failures.push(`pizza: no slot aligned with the tab at x=${tab.at.x.toFixed(1)}`)
        continue
      }
      const reach = lidTopY - tab.at.y
      const depth = frontFreeY - slot.at.y
      if (Math.abs(reach - depth) > TOL) failures.push(`pizza: tab reach ${reach.toFixed(2)} ≠ slot depth ${depth.toFixed(2)}`)
    }
    // Slot width, previously unchecked (a 20 → 8 mm change survived):
    // independent expectation — the slot takes the tab plus 2 mm of
    // clearance on each side.
    for (const slot of slots) {
      const tab = tabs.find((s) => Math.abs(s.at.x - slot.at.x) <= TOL) ?? tabs[0]
      if (!tab) continue
      const expectedSlotW = tab.w + 4
      if (Math.abs(slot.w - expectedSlotW) > TOL) {
        failures.push(`pizza: slot width ${slot.w.toFixed(2)} ≠ tab width ${tab.w.toFixed(2)} + 4 clearance (${expectedSlotW.toFixed(2)})`)
      }
    }
    // Dust flap length — batch S2 addendum mutant M7 (+3 mm) survived
    // here because nothing measured it. Independent restatement: the
    // pair reaches half the bottom score depth, less one board
    // thickness and 1 mm clearance.
    for (const p of d.panels.filter((p) => p.kind === "dust")) {
      if (Math.abs(p.width - ((W + t) / 2 - t - 1)) > TOL) {
        failures.push(`pizza dust flap ${p.id} length ${p.width.toFixed(2)} ≠ (W + t)/2 − t − 1 (${((W + t) / 2 - t - 1).toFixed(2)})`)
      }
    }
    // Design-outline pins (batch T7): the dust flaps' tapered
    // corners and the lid front flap's tab outline were measured
    // only by width/centring above, so the taper clamp (pizza.ts:29)
    // and every tab/chamfer literal (pizza.ts:38, 56–61) survived
    // mutation with shifts up to 4.8 mm. Restate both outlines from
    // the design terms and pin them whole; the wall rows anchor on
    // the wall panels' own positions, as elsewhere in this file.
    {
      const wallH = H + t
      const botW = L + t
      const botD = W + t
      const cx = wallH
      const dustLen = botD / 2 - t - 1
      const taper = Math.min(5, wallH * 0.15)
      const flapW = botW - 2 * t - 2
      const flapLen = 16
      const tabW = 16
      const tabLen = 10
      const tabInset = 14
      const cham = 2
      const hingeY = tabLen + flapLen
      // finalize() translates the blank by (-minX, -minY); recover
      // that shift from the lid, whose design position is
      // (cx, hingeY), so the restatements below land in the
      // dieline's own coordinates at every size.
      const lidPoly = byId(d, "lid").polygon
      const dx = Math.min(...lidPoly.map((v) => v.x)) - cx
      const dy = Math.min(...lidPoly.map((v) => v.y)) - hingeY
      const pt = (x: number, y: number): Pt => ({ x: x + dx, y: y + dy })
      const rowOf = (id: string) => Math.min(...byId(d, id).polygon.map((v) => v.y))
      for (const [side, rowY] of [["back", rowOf("back-wall")], ["front", rowOf("front-wall")]] as const) {
        outlinePin(failures, `pizza dust flap dust-${side}-l`, byId(d, `dust-${side}-l`).polygon, [
          pt(cx, rowY - dy),
          pt(cx, rowY - dy + wallH),
          pt(cx - dustLen, rowY - dy + wallH - taper),
          pt(cx - dustLen, rowY - dy + taper),
        ])
        outlinePin(failures, `pizza dust flap dust-${side}-r`, byId(d, `dust-${side}-r`).polygon, [
          pt(cx + botW, rowY - dy),
          pt(cx + botW + dustLen, rowY - dy + taper),
          pt(cx + botW + dustLen, rowY - dy + wallH - taper),
          pt(cx + botW, rowY - dy + wallH),
        ])
      }
      // Lid front flap: body plus the two chamfered locking tabs,
      // restated vertex for vertex (tabs are built right-to-left).
      const flapX = cx + (botW - flapW) / 2
      const tabCentresX = [flapX + tabInset + tabW / 2, flapX + flapW - tabInset - tabW / 2]
      const flapExpected: Pt[] = [
        pt(flapX, hingeY),
        pt(flapX + flapW, hingeY),
        pt(flapX + flapW, tabLen),
      ]
      for (const tcx of [...tabCentresX].reverse()) {
        flapExpected.push(
          pt(tcx + tabW / 2, tabLen),
          pt(tcx + tabW / 2, cham),
          pt(tcx + tabW / 2 - cham, 0),
          pt(tcx - tabW / 2 + cham, 0),
          pt(tcx - tabW / 2, cham),
          pt(tcx - tabW / 2, tabLen),
        )
      }
      flapExpected.push(pt(flapX, tabLen))
      outlinePin(failures, "pizza lid front flap", byId(d, "lid-front-flap").polygon, flapExpected)
      // Vent positions (batch T7): the fractions placing the lid
      // vents (pizza.ts:97–98) were checked only for lying inside
      // the lid, so +0.5 mutants of 0.28 / 0.32 / 0.44 survived.
      // Restate the design positions exactly.
      if (d.options.vents) {
        const lidTopY = Math.min(...byId(d, "lid").polygon.map((v) => v.y))
        const vents = d.features.filter((f) => f.kind === "vent")
        const expectedVents = [0.32, 0.44, 0.56, 0.68].map((fx) => ({ x: cx + botW * fx + dx, y: lidTopY + botD * 0.28 }))
        for (const e of expectedVents) {
          if (!vents.some((v) => Math.hypot(v.at.x - e.x, v.at.y - e.y) <= TOL)) {
            failures.push(`pizza: vent at design position (${e.x.toFixed(2)}, ${e.y.toFixed(2)}) is missing`)
          }
        }
        for (const v of vents) {
          if (!expectedVents.some((e) => Math.hypot(v.at.x - e.x, v.at.y - e.y) <= TOL)) {
            failures.push(`pizza: vent at (${v.at.x.toFixed(2)}, ${v.at.y.toFixed(2)}) matches no design position`)
          }
        }
      }
    }
    // Centring (batch T2): the front flap is centred on the lid and
    // the lid side flaps are centred on the lid's depth.
    const lidP = byId(d, "lid")
    const frontFlap = byId(d, "lid-front-flap")
    if (Math.abs(frontFlap.labelAt.x - lidP.labelAt.x) > TOL) failures.push("pizza front flap is not centred on the lid")
    for (const sf of d.panels.filter((p) => p.id.startsWith("lid-flap-"))) {
      if (Math.abs(sf.labelAt.y - lidP.labelAt.y) > TOL) failures.push(`pizza ${sf.id} is not centred on the lid depth`)
    }
    // Every cut feature's centre must lie inside its host panel
    // (vents in the lid, tabs on the front flap, slots in the front
    // wall) — a displaced feature otherwise renders outside the board.
    const hosts: [string, string][] = [
      ["vent", "lid"],
      ["tab", "lid-front-flap"],
      ["slot", "front-wall"],
    ]
    for (const [kind, hostId] of hosts) {
      const host = byId(d, hostId)
      for (const f of d.features.filter((x) => x.kind === kind)) {
        if (!pointStrictlyInside(f.at, host.polygon) && !pointOnBoundary(f.at, host.polygon)) {
          failures.push(`pizza: ${kind} at (${f.at.x.toFixed(1)}, ${f.at.y.toFixed(1)}) lies outside ${hostId}`)
        }
      }
    }
  }
  if (d.type === "tuck" || d.type === "autobottom") {
    // Independent restatement of the tuck-depth rule, written for this
    // check (batch S2 addendum): depth = W/2 clamped into [10, 25].
    // Batch T8: the auto-bottom's top end is this same construction
    // (one tuck flap, two dust flaps, the same glue flap), so these
    // restatements cover its top end unchanged; its bottom end has
    // its own block below.
    // The previous version called the generator's own tuckDepthFor, so
    // the check restated the code it was checking — a +3 mm change to
    // that function passed both sides and survived.
    const expectedDepth = Math.min(25, Math.max(10, W / 2))
    const expectedTuck = W + t + expectedDepth
    for (const p of d.panels.filter((p) => p.kind === "tuck")) {
      if (Math.abs(p.height - expectedTuck) > TOL) failures.push(`tuck flap ${p.id} length ${p.height.toFixed(2)} ≠ span + tuck depth ${expectedTuck.toFixed(2)}`)
    }
    // Tongue width, previously unchecked. Measured it from the flap
    // polygon: the x-extent of the vertices beyond the flap's internal
    // crease (the span line). Independent expectation: the tongue must
    // clear BOTH side walls inside the tube — clear width L − 2t, less
    // 1 mm working clearance — and stay narrower than the closure
    // (hinge score width − slotGap − 1).
    for (const p of d.panels.filter((p) => p.kind === "tuck")) {
      const crease = d.folds.find((f) => f.internal && f.between[0] === p.id)
      const hingeFold = d.folds.find((f) => !f.internal && f.between[1] === p.id)
      const hinge = p.hingePanel ? panelById.get(p.hingePanel) : undefined
      if (!crease || !hingeFold || !hinge) {
        failures.push(`tuck flap ${p.id}: cannot locate crease/hinge for the tongue check`)
        continue
      }
      const away = Math.sign(crease.from.y - hingeFold.from.y)
      const beyond = p.polygon.filter((v) => (v.y - crease.from.y) * away > 0.01)
      const tongueW = Math.max(...beyond.map((v) => v.x)) - Math.min(...beyond.map((v) => v.x))
      const closureW = hinge.width - d.options.slotGap
      const expectedTongue = Math.min(L - 2 * t - 1, closureW - 1)
      if (Math.abs(tongueW - expectedTongue) > TOL) {
        failures.push(`tuck flap ${p.id} tongue width ${tongueW.toFixed(2)} ≠ ${expectedTongue.toFixed(2)} (L − 2t − 1, capped by closure − 1)`)
      }
      // Centring (batch T2): the flap is centred on its hinge panel
      // and the tongue is centred within the flap.
      const tongueCx = (Math.max(...beyond.map((v) => v.x)) + Math.min(...beyond.map((v) => v.x))) / 2
      if (Math.abs(p.labelAt.x - hinge.labelAt.x) > TOL) failures.push(`tuck flap ${p.id} is not centred on its hinge panel`)
      if (Math.abs(tongueCx - p.labelAt.x) > TOL) failures.push(`tuck flap ${p.id} tongue is not centred within the flap`)
      // Batch T6: the flap's whole outline against its design
      // restatement (see tuckFlapDesignOutline). The tuck-end had
      // no outline-treatment checks at all before this — the
      // shoulder divisor, the lead/notch radius caps, the notch
      // centre term (tongueW/2, a 35.1 mm shift at +3 in the T5b
      // survivor table) and every arc angle/step/slice term on the
      // flap were unmeasured.
      outlinePin(failures, `tuck flap ${p.id}`, p.polygon, tuckFlapDesignOutline(hinge, hingeFold.from.y, away, L, W, t, d.options.slotGap))
    }
    // Dust flaps are centred on their side panels (batch T2).
    for (const p of d.panels.filter((p) => p.kind === "dust")) {
      const hostFold = d.folds.find((f) => !f.internal && f.between.includes(p.id))
      const host = hostFold ? panelById.get(hostFold.between[0] === p.id ? hostFold.between[1] : hostFold.between[0]) : undefined
      if (host && Math.abs(p.labelAt.x - host.labelAt.x) > TOL) {
        failures.push(`dust flap ${p.id} is not centred on ${host.id}`)
      }
    }
    const expectedDust = (W + t) / 2 - 1
    for (const p of d.panels.filter((p) => p.kind === "dust")) {
      if (Math.abs(p.height - expectedDust) > TOL) failures.push(`dust flap ${p.id} length ${p.height.toFixed(2)} ≠ ${expectedDust.toFixed(2)}`)
    }
    // Glue flap area (batch T6): the area pins the bevel and the
    // two x = 0 vertices, which the bounding width (taken at the
    // unbevelled middle) cannot see — the same restatement the
    // snaplock section carries. A +3 change to the bevel cap or
    // its divisor, or to either x = 0 vertex, survived before this
    // (T5b survivor table, tuck.ts:43/65/66).
    {
      const glueP = byId(d, "glue")
      const gExp = Math.min(d.options.glueWidth, (W + t) / 2)
      const bevelExp = Math.min(4, gExp / 3)
      const expectedGlueArea = gExp * (H + t) - bevelExp * bevelExp
      const glueArea = Math.abs(signedArea(glueP.polygon))
      if (Math.abs(glueArea - expectedGlueArea) > 0.05) failures.push(`tuck: glue flap area ${glueArea.toFixed(2)} ≠ width × tube height − bevel² (${expectedGlueArea.toFixed(2)})`)
    }
    // Dust flap lead width (batch T6): pins the taper term
    // (min(4, dust length × 0.2)), unmeasured before this — the
    // same restatement the snaplock section carries for its dust
    // flaps (T5b survivor table, tuck.ts:134).
    for (const p of d.panels.filter((p) => p.kind === "dust")) {
      const hostFold = d.folds.find((f) => !f.internal && f.between.includes(p.id))
      const host = hostFold ? panelById.get(hostFold.between[0] === p.id ? hostFold.between[1] : hostFold.between[0]) : undefined
      if (!host || !hostFold) continue
      const taperExp = Math.min(4, expectedDust * 0.2)
      const hingeY = hostFold.from.y
      const far = Math.max(...p.polygon.map((v) => Math.abs(v.y - hingeY)))
      const leadXs = p.polygon.filter((v) => Math.abs(Math.abs(v.y - hingeY) - far) <= TOL).map((v) => v.x)
      const leadW = Math.max(...leadXs) - Math.min(...leadXs)
      const expLead = host.width - d.options.slotGap - 2 * taperExp
      if (Math.abs(leadW - expLead) > TOL) failures.push(`tuck dust flap ${p.id} lead width ${leadW.toFixed(2)} ≠ panel width − slotGap − 2 × taper (${expLead.toFixed(2)})`)
    }
  }

  if (d.type === "snaplock") {
    // Top end: same independent expectations as the tuck-end's top.
    const expectedDepth = Math.min(25, Math.max(10, W / 2))
    const expectedTuck = W + t + expectedDepth
    for (const p of d.panels.filter((p) => p.kind === "tuck")) {
      if (Math.abs(p.height - expectedTuck) > TOL) failures.push(`snaplock tuck flap ${p.id} length ${p.height.toFixed(2)} ≠ span + tuck depth ${expectedTuck.toFixed(2)}`)
    }
    const expectedDust = (W + t) / 2 - 1
    for (const p of d.panels.filter((p) => p.kind === "dust")) {
      if (Math.abs(p.height - expectedDust) > TOL) failures.push(`snaplock dust flap ${p.id} length ${p.height.toFixed(2)} ≠ ${expectedDust.toFixed(2)}`)
    }
    // Tongue width, measured from the flap polygon past its crease —
    // the same independent restatement as the tuck-end's (clear width
    // L − 2t less 1 mm, capped by the closure).
    for (const p of d.panels.filter((p) => p.kind === "tuck")) {
      const crease = d.folds.find((f) => f.internal && f.between[0] === p.id)
      const hingeFold = d.folds.find((f) => !f.internal && f.between[1] === p.id)
      const hinge = p.hingePanel ? panelById.get(p.hingePanel) : undefined
      if (!crease || !hingeFold || !hinge) {
        failures.push(`snaplock tuck flap ${p.id}: cannot locate crease/hinge for the tongue check`)
        continue
      }
      const away = Math.sign(crease.from.y - hingeFold.from.y)
      const beyond = p.polygon.filter((v) => (v.y - crease.from.y) * away > 0.01)
      const tongueW = Math.max(...beyond.map((v) => v.x)) - Math.min(...beyond.map((v) => v.x))
      const closureW = hinge.width - d.options.slotGap
      const expectedTongue = Math.min(L - 2 * t - 1, closureW - 1)
      if (Math.abs(tongueW - expectedTongue) > TOL) {
        failures.push(`snaplock tuck flap ${p.id} tongue width ${tongueW.toFixed(2)} ≠ ${expectedTongue.toFixed(2)} (L − 2t − 1, capped by closure − 1)`)
      }
      // Centring (batch T3, closing a mutation gap): the flap is
      // centred on its hinge panel and the tongue within the flap —
      // the /2 terms that place them were unmeasured before this.
      const tongueCx = (Math.max(...beyond.map((v) => v.x)) + Math.min(...beyond.map((v) => v.x))) / 2
      if (Math.abs(p.labelAt.x - hinge.labelAt.x) > TOL) failures.push(`snaplock tuck flap ${p.id} is not centred on its hinge panel`)
      if (Math.abs(tongueCx - p.labelAt.x) > TOL) failures.push(`snaplock tuck flap ${p.id} tongue is not centred within the flap`)
      // Batch T5 — the tuck flap's outline treatments, measured in
      // the flap's own coordinates (depth from its hinge fold): the
      // shoulder vertices sit exactly (closure − tongue)/2 past the
      // internal crease; the lead corners lie on circles of the
      // stated lead radius; the centre notch lies on its stated
      // circle, is centred on the tongue, and bites exactly its
      // radius deep. These pin the /2 placements and radii that
      // bounding boxes cannot see.
      const span2 = W + t
      const td = Math.min(25, Math.max(10, W / 2))
      const leadLocal = span2 + td
      const shoulderExp = (closureW - tongueW) / 2
      const leadR = Math.min(2.5, td / 3)
      const notchR = Math.min(5, tongueW / 6)
      const localY = (v: { y: number }) => hingeFold.from.y - v.y
      const shoulderVerts = p.polygon.filter((v) => Math.abs(localY(v) - (span2 + shoulderExp)) <= TOL)
      if (shoulderVerts.length !== 2) failures.push(`snaplock tuck flap ${p.id}: ${shoulderVerts.length} shoulder vertices at crease + (closure − tongue)/2 (expected 2)`)
      const tx0 = tongueCx - tongueW / 2
      const cornerCentres = [
        { x: tx0 + leadR, y: leadLocal - leadR },
        { x: tx0 + tongueW - leadR, y: leadLocal - leadR },
      ]
      const cornerCounts = [0, 0]
      const cornerVerts: { x: number; y: number }[][] = [[], []]
      for (const v of p.polygon) {
        if (Math.abs(v.x - tongueCx) <= notchR + TOL) continue
        if (localY(v) <= leadLocal - leadR - TOL) continue
        const k = v.x > tongueCx ? 1 : 0
        const dist = Math.abs(Math.hypot(v.x - cornerCentres[k].x, localY(v) - cornerCentres[k].y) - leadR)
        if (dist > TOL) failures.push(`snaplock tuck flap ${p.id}: lead corner vertex (${v.x.toFixed(2)}, ${localY(v).toFixed(2)}) is not on its corner circle (r = ${leadR})`)
        else { cornerCounts[k]++; cornerVerts[k].push({ x: v.x, y: localY(v) }) }
      }
      if (cornerCounts[0] < 3 || cornerCounts[1] < 3) failures.push(`snaplock tuck flap ${p.id}: lead corner arcs carry ${cornerCounts[0]}/${cornerCounts[1]} vertices (expected at least 3 per corner)`)
      // Batch T5b: pin the lead arcs' fan areas, anchored at the
      // design endpoints (see the helpers at the top of this file),
      // and pin the lead-edge endpoints themselves, which are real
      // outline vertices. (The tongue-side endpoints are not
      // outline vertices — the outline leaves the shoulder straight
      // to the first arc point — so they serve as fan anchors only.)
      const leadEnds = [
        [{ x: tx0 + leadR, y: leadLocal }, { x: tx0, y: leadLocal - leadR }],
        [{ x: tx0 + tongueW, y: leadLocal - leadR }, { x: tx0 + tongueW - leadR, y: leadLocal }],
      ]
      for (let k = 0; k < 2; k++) {
        // Only corner 2's lead-edge endpoint is an outline vertex:
        // its arc ENDS on the lead edge. Corner 1's arc STARTS on
        // the lead edge and the generator slices that point off, so
        // there is no vertex to assert — its fan anchor still pins
        // the geometry.
        if (k === 1) {
          const leadPt = leadEnds[1][1]
          if (!p.polygon.some((v) => Math.hypot(v.x - leadPt.x, localY(v) - leadPt.y) <= TOL)) {
            failures.push(`snaplock tuck flap ${p.id}: lead corner 2 arc endpoint (${leadPt.x.toFixed(2)}, ${leadPt.y.toFixed(2)}) is missing from the outline`)
          }
        }
        const fan = arcFanArea(anchoredSeq(leadEnds[k][0], leadEnds[k][1], cornerVerts[k]), cornerCentres[k])
        const exp = expectedFan(leadR, 90, 3)
        if (Math.abs(fan - exp) > 0.05) failures.push(`snaplock tuck flap ${p.id}: lead corner ${k + 1} arc fan area ${fan.toFixed(2)} ≠ ${exp.toFixed(2)} (r = ${leadR}, 3 × 30°)`)
      }
      const biteVerts = p.polygon.filter((v) => Math.abs(v.x - tongueCx) <= notchR + TOL && localY(v) > leadLocal - notchR - TOL && localY(v) < leadLocal - 0.01)
      if (biteVerts.length < 3) {
        failures.push(`snaplock tuck flap ${p.id}: notch carries ${biteVerts.length} vertices (expected at least 3)`)
      } else {
        for (const v of biteVerts) {
          const dist = Math.abs(Math.hypot(v.x - tongueCx, localY(v) - leadLocal) - notchR)
          if (dist > TOL) failures.push(`snaplock tuck flap ${p.id}: notch vertex (${v.x.toFixed(2)}, ${localY(v).toFixed(2)}) is not on the notch circle (r = ${notchR})`)
        }
        const biteDepth = leadLocal - Math.min(...biteVerts.map((v) => localY(v)))
        if (Math.abs(biteDepth - notchR) > TOL) failures.push(`snaplock tuck flap ${p.id}: notch bites ${biteDepth.toFixed(2)} deep ≠ its radius ${notchR.toFixed(2)}`)
        const biteCx = (Math.max(...biteVerts.map((v) => v.x)) + Math.min(...biteVerts.map((v) => v.x))) / 2
        if (Math.abs(biteCx - tongueCx) > TOL) failures.push(`snaplock tuck flap ${p.id}: notch is centred at ${biteCx.toFixed(2)} ≠ tongue centre ${tongueCx.toFixed(2)}`)
        // Batch T5b: pin the notch arc's fan area, anchored at its
        // mouth endpoints (both real outline vertices).
        const notchFan = arcFanArea(
          anchoredSeq({ x: tongueCx + notchR, y: leadLocal }, { x: tongueCx - notchR, y: leadLocal }, biteVerts.map((v) => ({ x: v.x, y: localY(v) }))),
          { x: tongueCx, y: leadLocal },
        )
        const notchExp = expectedFan(notchR, 180, 6)
        if (Math.abs(notchFan - notchExp) > 0.05) failures.push(`snaplock tuck flap ${p.id}: notch arc fan area ${notchFan.toFixed(2)} ≠ ${notchExp.toFixed(2)} (r = ${notchR}, 6 × 30°)`)
      }
      // Batch T6: the flap's whole outline against its design
      // restatement. The fan pins above leave the lead corners'
      // step-redistribution mutants alive (a +3° change to a
      // corner arc's start or end angle moves its fan by ≈0.002
      // mm² but its vertices by 0.087 mm and the flap's area by
      // up to 0.92 mm² — T5b survivor table, snaplock.ts:104/110);
      // the outline pin's vertex and area comparisons catch them.
      outlinePin(failures, `snaplock tuck flap ${p.id}`, p.polygon, tuckFlapDesignOutline(hinge, hingeFold.from.y, away, L, W, t, d.options.slotGap))
    }
    // Centring for the remaining flaps (batch T3): dust flaps on
    // their side panels, main flaps and tab flaps on their panels.
    for (const p of d.panels.filter((p) => p.kind === "dust")) {
      const hostFold = d.folds.find((f) => !f.internal && f.between.includes(p.id))
      const host = hostFold ? panelById.get(hostFold.between[0] === p.id ? hostFold.between[1] : hostFold.between[0]) : undefined
      if (host && Math.abs(p.labelAt.x - host.labelAt.x) > TOL) failures.push(`snaplock dust flap ${p.id} is not centred on ${host.id}`)
    }
    for (const p of d.panels.filter((p) => p.id.startsWith("main-") || p.id.startsWith("tabflap-"))) {
      const host = panelById.get(p.id.replace("main-", "").replace("tabflap-", ""))
      if (host && Math.abs(p.labelAt.x - host.labelAt.x) > TOL) failures.push(`snaplock flap ${p.id} is not centred on ${host.id}`)
    }

    // Bottom end (batch T3): independent restatements of the lock
    // geometry. Main flap depth = full span less one board thickness
    // and 2 mm; tab flap depth = half span + 6; the tab's reach (its
    // centre's distance from its hinge) must equal the slit's offset
    // from the main flap's left edge, and the slit must sit at mid
    // span — those equalities are what make the folded lock engage.
    const span = W + t
    const expectedMain = span - t - 2
    const expectedTabDepth = span / 2 + 6
    // the tab flap's bounding height is body depth + the 10 mm tab
    const expectedTabTotal = expectedTabDepth + 10
    const expectedReach = expectedTabDepth + 5
    for (const p of d.panels.filter((p) => p.id.startsWith("main-"))) {
      if (Math.abs(p.height - expectedMain) > TOL) failures.push(`snaplock main flap ${p.id} depth ${p.height.toFixed(2)} ≠ (W + t) − t − 2 (${expectedMain.toFixed(2)})`)
    }
    for (const p of d.panels.filter((p) => p.id.startsWith("tabflap-"))) {
      if (Math.abs(p.height - expectedTabTotal) > TOL) failures.push(`snaplock tab flap ${p.id} total depth ${p.height.toFixed(2)} ≠ body (W + t)/2 + 6 plus 10 tab (${expectedTabTotal.toFixed(2)})`)
    }
    const tabs = d.features.filter((f) => f.kind === "tab")
    const slots = d.features.filter((f) => f.kind === "slot")
    if (tabs.length !== 2 || slots.length !== 2) failures.push(`snaplock: ${tabs.length} tabs and ${slots.length} slits (expected 2 and 2)`)
    for (const slot of slots) {
      const tab = tabs[0]
      if (tab && Math.abs(slot.w - (tab.w + 4)) > TOL) failures.push(`snaplock: slit width ${slot.w.toFixed(2)} ≠ tab width ${tab.w.toFixed(2)} + 4 clearance`)
    }
    for (const p of d.panels.filter((p) => p.id.startsWith("main-"))) {
      const b = { minX: Math.min(...p.polygon.map((v) => v.x)), minY: Math.min(...p.polygon.map((v) => v.y)) }
      const slot = slots.find((s) => pointStrictlyInside(s.at, p.polygon) || pointOnBoundary(s.at, p.polygon))
      if (!slot) {
        failures.push(`snaplock: no slit found on main flap ${p.id}`)
        continue
      }
      const offset = slot.at.x - b.minX
      if (Math.abs(offset - expectedReach) > TOL) failures.push(`snaplock: slit on ${p.id} sits ${offset.toFixed(2)} mm from the flap's left edge ≠ tab reach ${expectedReach.toFixed(2)}`)
      const v = slot.at.y - b.minY
      if (Math.abs(v - span / 2) > TOL) failures.push(`snaplock: slit on ${p.id} sits ${v.toFixed(2)} mm from its hinge ≠ mid span ${(span / 2).toFixed(2)}`)
    }
    for (const p of d.panels.filter((p) => p.id.startsWith("tabflap-"))) {
      const b = { minY: Math.min(...p.polygon.map((v) => v.y)) }
      const tab = tabs.find((s) => pointStrictlyInside(s.at, p.polygon) || pointOnBoundary(s.at, p.polygon))
      if (!tab) {
        failures.push(`snaplock: no tab found on tab flap ${p.id}`)
        continue
      }
      const reach = tab.at.y - b.minY
      if (Math.abs(reach - expectedReach) > TOL) failures.push(`snaplock: tab on ${p.id} reach ${reach.toFixed(2)} ≠ ${expectedReach.toFixed(2)}`)
      if (Math.abs(tab.at.x - p.labelAt.x) > TOL) failures.push(`snaplock: tab on ${p.id} is not centred on the flap`)
    }
    // The tab's CUT width, measured from the tab flap's polygon at
    // the lead edge (the middle pair of the four vertices there),
    // must match the tab feature and leave the slit exactly the
    // tab + 4 clearance (batch T3: the feature markers alone were
    // checked before; the polygon is what gets cut).
    for (const p of d.panels.filter((p) => p.id.startsWith("tabflap-"))) {
      const hingeY = Math.min(...p.polygon.map((v) => v.y))
      const leadY = hingeY + expectedTabDepth
      const xs = p.polygon
        .filter((v) => Math.abs(v.y - leadY) <= TOL)
        .map((v) => v.x)
        .sort((a, b) => a - b)
      if (xs.length !== 4) {
        failures.push(`snaplock: tab flap ${p.id} has ${xs.length} vertices at its lead edge (expected 4)`)
        continue
      }
      const cutTabW = xs[2] - xs[1]
      const tab = tabs.find((s) => pointStrictlyInside(s.at, p.polygon) || pointOnBoundary(s.at, p.polygon))
      if (tab && Math.abs(cutTabW - tab.w) > TOL) failures.push(`snaplock: cut tab width on ${p.id} is ${cutTabW.toFixed(2)} ≠ tab feature width ${tab.w.toFixed(2)}`)
      // Batch T5: the body width at the same lead edge (outermost
      // pair) pins the tab flap's taper, which the bounding width
      // (taken at the hinge) cannot see.
      const host = panelById.get(p.id.replace("tabflap-", ""))
      const taperTab = Math.min(4, expectedTabDepth * 0.15)
      if (host && Math.abs(xs[3] - xs[0] - (host.width - d.options.slotGap - 2 * taperTab)) > TOL) {
        failures.push(`snaplock: tab flap ${p.id} body lead width ${(xs[3] - xs[0]).toFixed(2)} ≠ panel width − slotGap − 2 × taper (${(host.width - d.options.slotGap - 2 * taperTab).toFixed(2)})`)
      }
      for (const slot of slots) {
        if (Math.abs(slot.w - (cutTabW + 4)) > TOL) failures.push(`snaplock: slit width ${slot.w.toFixed(2)} ≠ cut tab width ${cutTabW.toFixed(2)} + 4 clearance`)
      }
    }
    // Batch T5 — glue area, flap lead widths, tab outline: the
    // glue flap's AREA pins its bevel and both x = 0 vertices (the
    // bounding width, taken at the unbevelled middle, cannot see
    // them); each flap's lead-edge width pins its taper; the tab's
    // tip width and chamfer-row width pin the chamfer, and the
    // polygon's protrusion must equal the tab feature's height.
    {
      const glueP = byId(d, "glue")
      const gExp = Math.min(d.options.glueWidth, span / 2)
      const bevelExp = Math.min(4, gExp / 3)
      const expectedGlueArea = gExp * byId(d, "front").height - bevelExp * bevelExp
      const glueArea = Math.abs(signedArea(glueP.polygon))
      if (Math.abs(glueArea - expectedGlueArea) > 0.05) failures.push(`snaplock: glue flap area ${glueArea.toFixed(2)} ≠ width × tube height − bevel² (${expectedGlueArea.toFixed(2)})`)
    }
    const rowWidth = (poly: { x: number; y: number }[], y: number) => {
      const xs = poly.filter((v) => Math.abs(v.y - y) <= TOL).map((v) => v.x)
      return xs.length ? Math.max(...xs) - Math.min(...xs) : NaN
    }
    for (const p of d.panels.filter((p) => p.id.startsWith("main-"))) {
      const host = panelById.get(p.id.replace("main-", ""))
      if (!host) continue
      const leadY = Math.max(...p.polygon.map((v) => v.y))
      const taper = Math.min(4, expectedMain * 0.15)
      const expected = host.width - d.options.slotGap - 2 * taper
      const w = rowWidth(p.polygon, leadY)
      if (!(Math.abs(w - expected) <= TOL)) failures.push(`snaplock: main flap ${p.id} lead width ${w.toFixed(2)} ≠ panel width − slotGap − 2 × taper (${expected.toFixed(2)})`)
    }
    for (const p of d.panels.filter((p) => p.kind === "dust")) {
      const hostFold = d.folds.find((f) => !f.internal && f.between.includes(p.id))
      const host = hostFold ? panelById.get(hostFold.between[0] === p.id ? hostFold.between[1] : hostFold.between[0]) : undefined
      if (!host) continue
      const leadY = Math.min(...p.polygon.map((v) => v.y))
      const taper = Math.min(4, expectedDust * 0.2)
      const expected = host.width - d.options.slotGap - 2 * taper
      const w = rowWidth(p.polygon, leadY)
      if (!(Math.abs(w - expected) <= TOL)) failures.push(`snaplock: dust flap ${p.id} lead width ${w.toFixed(2)} ≠ panel width − slotGap − 2 × taper (${expected.toFixed(2)})`)
    }
    for (const p of d.panels.filter((p) => p.id.startsWith("tabflap-"))) {
      const tab = tabs.find((s) => pointStrictlyInside(s.at, p.polygon) || pointOnBoundary(s.at, p.polygon))
      const tipY = Math.max(...p.polygon.map((v) => v.y))
      const hingeY = Math.min(...p.polygon.map((v) => v.y))
      const chamExp = Math.min(3, 16 / 4)
      const tipW = rowWidth(p.polygon, tipY)
      if (!(Math.abs(tipW - (16 - 2 * chamExp)) <= TOL)) failures.push(`snaplock: tab tip width on ${p.id} is ${tipW.toFixed(2)} ≠ tab width 16 − 2 × chamfer (${(16 - 2 * chamExp).toFixed(2)})`)
      const chamRowW = rowWidth(p.polygon, tipY - chamExp)
      if (!(Math.abs(chamRowW - 16) <= TOL)) failures.push(`snaplock: tab width at the chamfer row on ${p.id} is ${chamRowW.toFixed(2)} ≠ 16`)
      const protrusion = tipY - (hingeY + expectedTabDepth)
      if (Math.abs(protrusion - 10) > TOL) failures.push(`snaplock: tab on ${p.id} protrudes ${protrusion.toFixed(2)} past the flap body ≠ 10`)
      if (tab && Math.abs(tab.h - protrusion) > TOL) failures.push(`snaplock: tab feature height ${tab.h.toFixed(2)} ≠ the polygon's protrusion ${protrusion.toFixed(2)} on ${p.id}`)
    }
  }
  if (d.type === "autobottom") {
    // Crash-lock bottom (batch T8), restated from the design terms:
    // side flaps (W + t)/2 − 1 deep, main flaps (W + t)/2 + 4 deep
    // (past the centreline), each main flap carrying two diagonal
    // scores (run restated below, rise = the main depth), the
    // corner triangles being the glue zones. The self-erecting
    // action of the glued bottom is not a flat-pattern property
    // and is not claimed here.
    const span = W + t
    const mainDepth = span / 2 + 4
    const sideDepth = span / 2 - 1
    const bottoms = d.panels.filter((p) => p.id.startsWith("bottom-"))
    if (bottoms.length !== 4) failures.push(`autobottom: ${bottoms.length} bottom flaps, the design carries 4`)
    for (const p of bottoms) {
      const isMain = p.id.startsWith("bottom-main-")
      const depth = isMain ? mainDepth : sideDepth
      const hingeFold = d.folds.find((f) => !f.internal && f.between[1] === p.id)
      if (!hingeFold) {
        failures.push(`autobottom: ${p.id} has no hinge fold`)
        continue
      }
      // Anchor the outline on the HOST PANEL, not on the flap's own
      // hinge fold: the fold is generated from the same fx as the
      // polygon, so a fold-anchored pin moves with a sideways flap
      // shift and sees nothing (the first T8 mutation run's two
      // unpinned autobottom rows were exactly this, 0.300/0.900 mm).
      const host = byId(d, p.id.replace("bottom-main-", "").replace("bottom-side-", ""))
      const fx = Math.min(...host.polygon.map((v) => v.x)) + d.options.slotGap / 2
      const fw = host.width - d.options.slotGap
      const hy = Math.max(...host.polygon.map((v) => v.y))
      outlinePin(failures, `autobottom flap ${p.id}`, p.polygon, [
        { x: fx, y: hy },
        { x: fx + fw, y: hy },
        { x: fx + fw, y: hy + depth },
        { x: fx, y: hy + depth },
      ])
      const diagonals = d.folds.filter((f) => f.internal && f.between[0] === p.id && f.between[1] === p.id)
      if (!isMain) {
        if (diagonals.length !== 0) failures.push(`autobottom: side flap ${p.id} carries ${diagonals.length} diagonal scores, the design carries none`)
        continue
      }
      if (diagonals.length !== 2) {
        failures.push(`autobottom: main flap ${p.id} carries ${diagonals.length} diagonal scores, the design carries 2`)
        continue
      }
      // Diagonal run (batch T8b): the flap depth (45°) where the
      // flap is at least twice as wide as deep, else half the
      // flap width — the two diagonals then meet at the lead
      // centre instead of crossing and the glue triangles stay
      // disjoint. The rise is the flap depth on both branches.
      const leg = Math.min(mainDepth, fw / 2)
      const expectedDiagonals: [Pt, Pt][] = [
        [
          { x: fx, y: hy },
          { x: fx + leg, y: hy + mainDepth },
        ],
        [
          { x: fx + fw, y: hy },
          { x: fx + fw - leg, y: hy + mainDepth },
        ],
      ]
      for (const [e0, e1] of expectedDiagonals) {
        const hit = diagonals.some(
          (f) =>
            Math.hypot(f.from.x - e0.x, f.from.y - e0.y) <= TOL && Math.hypot(f.to.x - e1.x, f.to.y - e1.y) <= TOL,
        )
        if (!hit) {
          failures.push(
            `autobottom: main flap ${p.id} is missing its diagonal score from (${e0.x.toFixed(2)}, ${e0.y.toFixed(2)}) to (${e1.x.toFixed(2)}, ${e1.y.toFixed(2)})`,
          )
        }
        // The endpoints fix the glue triangle completely: hinge
        // corner, lead point one depth along the lead edge, and the
        // 45° run between them (legs = depth, area = depth²/2).
      }
    }
  }
  if (d.type === "rigid" || d.type === "rigid_magnetic") {
    // Rigid two-piece box (batch T11R), restated from the stated
    // terms: base cross (L + t) x (W + t), walls H + t; lid cross
    // with inner size = base outer + 1 mm clearance per side, wall
    // height lidDepth + t, lidDepth = min(30, max(12, 0.3 H)). The
    // wrap, the corner closure and any hinge or magnet are not
    // drawn and are not checked.
    const lidDepth = Math.min(30, Math.max(12, H * 0.3))
    const want: Record<string, [number, number]> = {
      "base-bottom": [L + t, W + t],
      "base-back": [L + t, H + t],
      "base-front": [L + t, H + t],
      "base-left": [H + t, W + t],
      "base-right": [H + t, W + t],
      "lid-top": [L + 2 * t + 2 + t, W + 2 * t + 2 + t],
      "lid-back": [L + 2 * t + 2 + t, lidDepth + t],
      "lid-front": [L + 2 * t + 2 + t, lidDepth + t],
      "lid-left": [lidDepth + t, W + 2 * t + 2 + t],
      "lid-right": [lidDepth + t, W + 2 * t + 2 + t],
    }
    if (d.panels.length !== 10) failures.push(`rigid: ${d.panels.length} panels, the design carries 10 (two crosses of 5)`)
    for (const [id, [w, h]] of Object.entries(want)) {
      const p = d.panels.find((q) => q.id === id)
      if (!p) {
        failures.push(`rigid: panel ${id} is missing`)
        continue
      }
      if (Math.abs(p.width - w) > TOL || Math.abs(p.height - h) > TOL) {
        failures.push(`rigid: panel ${id} is ${p.width.toFixed(2)} x ${p.height.toFixed(2)} mm, the design is ${w.toFixed(2)} x ${h.toFixed(2)} mm`)
      }
    }
    const hinged = d.folds.filter((f) => !f.internal)
    if (hinged.length !== 8) failures.push(`rigid: ${hinged.length} fold lines, the design carries 8`)
    if (d.type === "rigid") {
      if (d.features.length !== 0) failures.push(`rigid: ${d.features.length} features, the design draws none (no hinge, magnet or closure)`)
    } else {
      // Magnetic loose-lid variant: exactly 4 round magnet pocket marks,
      // restated from the panels (2 per front wall at +/- (L + t)/4 from
      // its centre, lidDepth/2 from the free edge (base) or fold (lid)),
      // and each must lie fully inside its wall with 0.5 mm to spare.
      const r = 5 + 0.1
      if (d.features.length !== 4 || d.features.some((f) => f.kind !== "magnet")) {
        failures.push(`rigid_magnetic: ${d.features.length} features, the design carries 4 magnet pocket marks and nothing else`)
      }
      const bf = byId(d, "base-front")
      const lf = byId(d, "lid-front")
      const mid = (p: Panel) => (Math.min(...p.polygon.map((v) => v.x)) + Math.max(...p.polygon.map((v) => v.x))) / 2
      const expected: { id: string; x: number; y: number }[] = []
      for (const sgn of [-1, 1]) {
        expected.push({ id: "base-front", x: mid(bf) + (sgn * (L + t)) / 4, y: Math.max(...bf.polygon.map((v) => v.y)) - lidDepth / 2 })
        expected.push({ id: "lid-front", x: mid(lf) + (sgn * (L + t)) / 4, y: Math.min(...lf.polygon.map((v) => v.y)) + lidDepth / 2 })
      }
      for (const e of expected) {
        const hit = d.features.find((f) => f.kind === "magnet" && Math.hypot(f.at.x - e.x, f.at.y - e.y) <= TOL)
        if (!hit) {
          failures.push(`rigid_magnetic: magnet pocket on ${e.id} is missing at (${e.x.toFixed(2)}, ${e.y.toFixed(2)})`)
          continue
        }
        if (hit.r === undefined || Math.abs(hit.r - r) > TOL) failures.push(`rigid_magnetic: pocket on ${e.id} has radius ${hit.r}, the design is ${r} mm`)
      }
      // Margin (batch AY): checked for EVERY magnet mark on its own, not only
      // those found at a design position, so a displaced pocket is also
      // caught here. Each mark must lie inside one of the two front walls,
      // 0.5 mm clear of that wall's edges.
      for (const f of d.features.filter((x) => x.kind === "magnet")) {
        const fr = f.r ?? 0
        const inside = (w: Panel) => {
          const x0 = Math.min(...w.polygon.map((v) => v.x)), x1 = Math.max(...w.polygon.map((v) => v.x))
          const y0 = Math.min(...w.polygon.map((v) => v.y)), y1 = Math.max(...w.polygon.map((v) => v.y))
          return f.at.x >= x0 && f.at.x <= x1 && f.at.y >= y0 && f.at.y <= y1
        }
        const host = [bf, lf].find(inside)
        if (!host) {
          failures.push(`rigid_magnetic: magnet mark at (${f.at.x.toFixed(2)}, ${f.at.y.toFixed(2)}) is not inside a front wall`)
          continue
        }
        const x0 = Math.min(...host.polygon.map((v) => v.x)), x1 = Math.max(...host.polygon.map((v) => v.x))
        const y0 = Math.min(...host.polygon.map((v) => v.y)), y1 = Math.max(...host.polygon.map((v) => v.y))
        if (f.at.x - fr < x0 + 0.5 || f.at.x + fr > x1 - 0.5 || f.at.y - fr < y0 + 0.5 || f.at.y + fr > y1 - 0.5) {
          failures.push(`rigid_magnetic: magnet pocket on ${host.id} comes within 0.5 mm of the wall edge`)
        }
      }
      // facing pairs: the pocket on the lid and the pocket on the base sit at the same offset from their wall centres
      const bx = d.features.filter((f) => Math.abs(f.at.y - (Math.max(...bf.polygon.map((v) => v.y)) - lidDepth / 2)) <= TOL).map((f) => f.at.x - mid(bf)).sort((a, b) => a - b)
      const lx = d.features.filter((f) => Math.abs(f.at.y - (Math.min(...lf.polygon.map((v) => v.y)) + lidDepth / 2)) <= TOL).map((f) => f.at.x - mid(lf)).sort((a, b) => a - b)
      if (bx.length !== 2 || lx.length !== 2 || bx.some((v, i) => Math.abs(v - lx[i]) > TOL)) failures.push("rigid_magnetic: base and lid pockets do not face each other")
    }
    const bb = byId(d, "base-right")
    const lw = byId(d, "lid-left")
    const gap = Math.min(...lw.polygon.map((v) => v.x)) - Math.max(...bb.polygon.map((v) => v.x))
    if (Math.abs(gap - 10) > TOL) failures.push(`rigid: the pieces are ${gap.toFixed(2)} mm apart, the design is 10 mm`)
    // the two pieces are top-aligned on the sheet: the back walls start at the same y
    const topY = (id: string) => {
      const p = d.panels.find((q) => q.id === id)
      return p ? Math.min(...p.polygon.map((v) => v.y)) : NaN
    }
    if (Math.abs(topY("base-back") - topY("lid-back")) > TOL) {
      failures.push(`rigid: base and lid are not top-aligned (back walls start ${topY("base-back").toFixed(2)} and ${topY("lid-back").toFixed(2)} mm from the sheet top)`)
    }
    // lid fit: lid inner (top panel less t) minus base outer = 2 x 1 mm
    const lidInnerL = byId(d, "lid-top").width - t
    const baseOuterL = byId(d, "base-bottom").width + t
    if (Math.abs(lidInnerL - baseOuterL - 2) > TOL) failures.push(`rigid: lid inner length ${lidInnerL.toFixed(2)} mm leaves ${(lidInnerL - baseOuterL).toFixed(2)} mm total clearance, the design is 2 mm`)
    const lidInnerW = byId(d, "lid-top").height - t
    const baseOuterW = byId(d, "base-bottom").height + t
    if (Math.abs(lidInnerW - baseOuterW - 2) > TOL) failures.push(`rigid: lid inner width ${lidInnerW.toFixed(2)} mm leaves ${(lidInnerW - baseOuterW).toFixed(2)} mm total clearance, the design is 2 mm`)
  }

  if (d.type === "pillow") {
    // End-curve depths (batch T3), measured from the fold polylines:
    // at the wide-face centres the curve must reach H + t from the
    // blank's end edge; at the segment boundaries (H + t)/2.
    const endFlap = H + t
    for (const fid of ["face-a", "face-b"]) {
      const own = d.folds.filter((f) => f.internal && f.between[0] === fid)
      const topPts = own.flatMap((f) => [f.from, f.to]).filter((p) => p.y < d.blankHeight / 2)
      const botPts = own.flatMap((f) => [f.from, f.to]).filter((p) => p.y >= d.blankHeight / 2)
      if (topPts.length === 0 || botPts.length === 0) {
        failures.push(`pillow: ${fid} is missing an end curve`)
        continue
      }
      const topDeep = Math.max(...topPts.map((p) => p.y))
      const topShallow = Math.min(...topPts.map((p) => p.y))
      if (Math.abs(topDeep - endFlap) > TOL) failures.push(`pillow: ${fid} top curve reaches ${topDeep.toFixed(2)} mm at the face centre ≠ H + t (${endFlap.toFixed(2)})`)
      if (Math.abs(topShallow - endFlap / 2) > TOL) failures.push(`pillow: ${fid} top curve sits ${topShallow.toFixed(2)} mm at the segment boundary ≠ (H + t)/2 (${(endFlap / 2).toFixed(2)})`)
      const botDeep = Math.max(...botPts.map((p) => d.blankHeight - p.y))
      if (Math.abs(botDeep - endFlap) > TOL) failures.push(`pillow: ${fid} bottom curve reaches ${botDeep.toFixed(2)} mm at the face centre ≠ H + t (${endFlap.toFixed(2)})`)
    }
    // Side curves: centre depth is the stated model's 0.75 × endFlap.
    for (const sid of ["side-a", "side-b"]) {
      const own = d.folds.filter((f) => f.internal && f.between[0] === sid)
      const topPts = own.flatMap((f) => [f.from, f.to]).filter((p) => p.y < d.blankHeight / 2)
      const botPts = own.flatMap((f) => [f.from, f.to]).filter((p) => p.y >= d.blankHeight / 2)
      if (topPts.length === 0 || botPts.length === 0) {
        failures.push(`pillow: ${sid} is missing an end curve`)
        continue
      }
      const expected = endFlap * 0.75
      const topDeep = Math.max(...topPts.map((p) => p.y))
      const botDeep = Math.max(...botPts.map((p) => d.blankHeight - p.y))
      if (Math.abs(topDeep - expected) > TOL) failures.push(`pillow: ${sid} top curve reaches ${topDeep.toFixed(2)} mm at the side centre ≠ 0.75 × (H + t) (${expected.toFixed(2)})`)
      if (Math.abs(botDeep - expected) > TOL) failures.push(`pillow: ${sid} bottom curve reaches ${botDeep.toFixed(2)} mm at the side centre ≠ 0.75 × (H + t) (${expected.toFixed(2)})`)
    }
  }
  if (d.type === "sleeve") {
    // The band width is uniform: every panel's height is W.
    for (const p of d.panels) {
      if (Math.abs(p.height - W) > TOL) failures.push(`sleeve: panel ${p.id} height ${p.height.toFixed(2)} ≠ band width ${W}`)
    }
  }
  if (d.type === "envelope") {
    const body = byId(d, "body")
    const expectedBottom = (W + t) / 2 - 2
    const bottom = byId(d, "bottom-flap")
    if (Math.abs(bottom.height - expectedBottom) > TOL) failures.push(`envelope: bottom flap depth ${bottom.height.toFixed(2)} ≠ (W + t)/2 − 2 (${expectedBottom.toFixed(2)})`)
    const expectedFlapW = L + t - d.options.slotGap
    for (const fid of ["bottom-flap", "top-flap"]) {
      const f = byId(d, fid)
      if (Math.abs(f.width - expectedFlapW) > TOL) failures.push(`envelope: ${fid} width ${f.width.toFixed(2)} ≠ body score width − slotGap (${expectedFlapW.toFixed(2)})`)
      if (Math.abs(f.labelAt.x - body.labelAt.x) > TOL) failures.push(`envelope: ${fid} is not centred on the body`)
    }
    const expectedGlue = Math.min(d.options.glueWidth, (W + t) / 3)
    for (const gp of d.panels.filter((p) => p.kind === "glue")) {
      if (Math.abs(gp.width - expectedGlue) > TOL) failures.push(`envelope: glue flap ${gp.id} width ${gp.width.toFixed(2)} ≠ min(glueWidth, (W + t)/3) (${expectedGlue.toFixed(2)})`)
    }
    // Batch T5 — measured-area restatements (these close the
    // mutation survivors that touched areas and flap dimensions):
    // the glue flap's AREA pins its bevel and every vertex; the
    // bottom flap's lead width and area pin its taper; the seal
    // flap's flat top edge pins the corner radius, and every
    // non-hinge vertex of the seal flap must lie on one of the two
    // corner circles, with each arc actually sampled.
    const bevelEnv = Math.min(4, expectedGlue / 3)
    for (const gp of d.panels.filter((p) => p.kind === "glue")) {
      // each bevelled corner removes a (width × bevel)/2 triangle —
      // the bevel runs diagonally across the flap's full width
      const expected = expectedGlue * (body.height - bevelEnv)
      const a = Math.abs(signedArea(gp.polygon))
      if (Math.abs(a - expected) > 0.05) failures.push(`envelope: glue flap ${gp.id} area ${a.toFixed(2)} ≠ width × (body height − bevel) (${expected.toFixed(2)})`)
    }
    {
      const taperB = Math.min(4, expectedBottom * 0.2)
      const leadY = Math.max(...bottom.polygon.map((v) => v.y))
      const leadXs = bottom.polygon.filter((v) => Math.abs(v.y - leadY) <= TOL).map((v) => v.x)
      const leadW = Math.max(...leadXs) - Math.min(...leadXs)
      if (Math.abs(leadW - (expectedFlapW - 2 * taperB)) > TOL) failures.push(`envelope: bottom flap lead width ${leadW.toFixed(2)} ≠ flap width − 2 × taper (${(expectedFlapW - 2 * taperB).toFixed(2)})`)
      const expectedArea = expectedBottom * (expectedFlapW - taperB)
      const a = Math.abs(signedArea(bottom.polygon))
      if (Math.abs(a - expectedArea) > 0.05) failures.push(`envelope: bottom flap area ${a.toFixed(2)} ≠ depth × (width − taper) (${expectedArea.toFixed(2)})`)
    }
    {
      const top = byId(d, "top-flap")
      const r = Math.min(6, H / 3)
      const ys = top.polygon.map((v) => v.y)
      const yTop = Math.min(...ys)
      const hingeY = Math.max(...ys)
      const topXs = top.polygon.filter((v) => Math.abs(v.y - yTop) <= TOL).map((v) => v.x)
      if (topXs.length !== 2) {
        failures.push(`envelope: seal flap has ${topXs.length} vertices on its top edge (expected 2)`)
      } else if (Math.abs(Math.max(...topXs) - Math.min(...topXs) - (expectedFlapW - 2 * r)) > TOL) {
        failures.push(`envelope: seal flap top edge ${(Math.max(...topXs) - Math.min(...topXs)).toFixed(2)} ≠ flap width − 2r (${(expectedFlapW - 2 * r).toFixed(2)})`)
      }
      const fx = Math.min(...top.polygon.map((v) => v.x))
      const centres = [
        { x: fx + r, y: yTop + r },
        { x: fx + expectedFlapW - r, y: yTop + r },
      ]
      const counts = [0, 0]
      for (const v of top.polygon) {
        if (Math.abs(v.y - hingeY) <= TOL) continue
        const ds = centres.map((c) => Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - r))
        const k = ds[0] <= ds[1] ? 0 : 1
        if (ds[k] > TOL) failures.push(`envelope: seal flap vertex (${v.x.toFixed(2)}, ${v.y.toFixed(2)}) lies on neither corner circle (r = ${r})`)
        else counts[k]++
      }
      if (counts[0] < 4 || counts[1] < 4) failures.push(`envelope: seal flap corner arcs carry ${counts[0]}/${counts[1]} vertices (expected at least 4 per corner)`)
      // Batch T5b: pin each corner arc's endpoints and fan area
      // (see the helpers at the top of this file). Aligned with
      // centres[] above: corner 1 = left, endpoints (fx + r, yTop)
      // -> (fx, yTop + r); corner 2 = right, endpoints
      // (fx + flapW, yTop + r) -> (fx + flapW - r, yTop). (A first
      // version of this block paired the centres with the opposite
      // corners' endpoints and computed a flap-spanning fan of
      // 643.5 against the expected 27 — caught by the suite on the
      // valid configurations.)
      const cornerEnds = [
        [{ x: fx + r, y: yTop }, { x: fx, y: yTop + r }],
        [{ x: fx + expectedFlapW, y: yTop + r }, { x: fx + expectedFlapW - r, y: yTop }],
      ]
      for (let k = 0; k < 2; k++) {
        const c = centres[k]
        for (const e of cornerEnds[k]) {
          if (!top.polygon.some((v) => Math.hypot(v.x - e.x, v.y - e.y) <= TOL)) {
            failures.push(`envelope: seal flap corner ${k + 1} arc endpoint (${e.x.toFixed(2)}, ${e.y.toFixed(2)}) is missing from the outline`)
          }
        }
        const verts = top.polygon.filter((v) => Math.abs(v.y - hingeY) > TOL && Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - r) <= TOL)
        const fan = arcFanArea(anchoredSeq(cornerEnds[k][0], cornerEnds[k][1], verts), c)
        const exp = expectedFan(r, 90, 3)
        if (Math.abs(fan - exp) > 0.05) failures.push(`envelope: seal flap corner ${k + 1} arc fan area ${fan.toFixed(2)} ≠ ${exp.toFixed(2)} (r = ${r}, 3 × 30°)`)
        // Batch T6: pin each sampled vertex's ANGLE around the
        // design centre. The fan is nearly invariant under a
        // start/end-angle change that redistributes the steps
        // (a +3° redistribution moves this fan by ≈0.03 mm²,
        // under tolerance, and the flap's area by only 0.008 mm²)
        // while moving the interior vertices 0.21 mm (T5b
        // survivor table, envelope.ts:86/88). The design samples
        // sit at 30° increments from each arc's start angle; a
        // vertex further than 0.05 mm of arc from every design
        // sample fails.
        const designAngles = k === 0 ? [-90, -120, -150, -180] : [0, -30, -60, -90]
        const angTolDeg = (0.05 / r) * (180 / Math.PI)
        for (const v of verts) {
          const a = (Math.atan2(v.y - c.y, v.x - c.x) * 180) / Math.PI
          const dmin = Math.min(
            ...designAngles.map((da) => {
              const dd = Math.abs(a - da)
              return Math.min(dd, 360 - dd)
            }),
          )
          if (dmin > angTolDeg) {
            failures.push(`envelope: seal flap corner ${k + 1} vertex (${v.x.toFixed(2)}, ${v.y.toFixed(2)}) sits ${dmin.toFixed(2)}° off the design sampling (30° steps from the arc start)`)
          }
        }
      }
    }
  }

  // ---- magnethinge (batch T11): the hinged-flap magnetic
  // variant. One connected blank: flap, lid front skirt,
  // lid top, hinge strip, base back wall, base bottom,
  // base front wall in a single column, with side panels
  // and corner glue flaps. Every panel outline is pinned
  // against its design restatement; the translation is
  // recovered from the base bottom panel, whose design
  // position is (hx, by) in the layout. The magnet pair is
  // restated from the stated parameters.
  if (d.type === "magnethinge") {
    const s2 = d.options.lidShare
    const c = d.options.lidClearance
    const flapH = d.options.flapHeight
    const hingeW = d.options.hingeWidth
    const sg = d.options.slotGap
    const baseWallH = H * (1 - s2) + t
    const lidWallH = H * s2 + t
    const botL = L + t
    const botW = W + t
    const topL = L + 3 * t + 2 * c
    const topW = W + 3 * t + 2 * c
    const baseFlapLen = Math.min(baseWallH - t, botL / 2 - 1)
    const lidFlapLen = Math.min(lidWallH - t, topL / 2 - 1)
    const x0 = lidWallH
    const hx = x0 + (topL - botL) / 2
    const hingeY = flapH + lidWallH + topW
    const by = hingeY + hingeW + baseWallH
    const bottom = byId(d, "base-bottom")
    const bMinX = Math.min(...bottom.polygon.map((v) => v.x))
    const bMinY = Math.min(...bottom.polygon.map((v) => v.y))
    const tx = bMinX - hx
    const ty = bMinY - by
    const rect = (x: number, y: number, w: number, h: number): Pt[] => [
      { x: x + tx, y: y + ty },
      { x: x + w + tx, y: y + ty },
      { x: x + w + tx, y: y + h + ty },
      { x: x + tx, y: y + h + ty },
    ]
    const table: [string, number, number, number, number][] = [
      ["flap", x0, 0, topL, flapH],
      ["lid-front", x0, flapH, topL, lidWallH],
      ["lid-top", x0, flapH + lidWallH, topL, topW],
      ["lid-side-l", 0, flapH + lidWallH, lidWallH, topW],
      ["lid-side-r", x0 + topL, flapH + lidWallH, lidWallH, topW],
      ["lid-glue-lf", 0, flapH + lidWallH - lidFlapLen, lidWallH - sg, lidFlapLen],
      ["lid-glue-rf", x0 + topL + sg, flapH + lidWallH - lidFlapLen, lidWallH - sg, lidFlapLen],
      ["hinge", hx, hingeY, botL, hingeW],
      ["base-back", hx, hingeY + hingeW, botL, baseWallH],
      ["base-bottom", hx, by, botL, botW],
      ["base-front", hx, by + botW, botL, baseWallH],
      ["base-side-l", hx - baseWallH, by, baseWallH, botW],
      ["base-side-r", hx + botL, by, baseWallH, botW],
      ["base-glue-lb", hx - baseWallH, by - baseFlapLen, baseWallH - sg, baseFlapLen],
      ["base-glue-lf", hx - baseWallH, by + botW, baseWallH - sg, baseFlapLen],
      ["base-glue-rb", hx + botL + sg, by - baseFlapLen, baseWallH - sg, baseFlapLen],
      ["base-glue-rf", hx + botL + sg, by + botW, baseWallH - sg, baseFlapLen],
    ]
    for (const [id, x, y, w, h] of table) {
      outlinePin(failures, `magnethinge panel ${id}`, byId(d, id).polygon, rect(x, y, w, h))
    }
    // the lid fit identity: lid internal footprint minus
    // base outer footprint is exactly twice the stated
    // clearance, on both axes
    const lidTop = byId(d, "lid-top")
    const fitL = lidTop.width - t - (bottom.width + t)
    const fitW = lidTop.height - t - (bottom.height + t)
    if (Math.abs(fitL - 2 * c) > TOL) failures.push(`magnethinge lid fit (length): internal minus base outer is ${fitL.toFixed(2)} mm, stated clearance implies ${(2 * c).toFixed(2)}`)
    if (Math.abs(fitW - 2 * c) > TOL) failures.push(`magnethinge lid fit (width): internal minus base outer is ${fitW.toFixed(2)} mm, stated clearance implies ${(2 * c).toFixed(2)}`)
    // glue flap agreement: each flap's reach along its host
    // wall is at most half the host's score span
    for (const p of d.panels.filter((p) => p.kind === "glue")) {
      const reach = p.height
      const hostSpan = p.id.startsWith("lid-") ? topL : botL
      if (reach > hostSpan / 2 + TOL) failures.push(`magnethinge glue flap ${p.id} reach ${reach.toFixed(2)} exceeds half the host span ${(hostSpan / 2).toFixed(2)}`)
    }
    // the magnet pair, restated from the stated parameters:
    // flap magnet at inset + diameter / 2 below the flap's
    // free edge (its top edge in the blank); base magnet at
    // inset + diameter / 2 above the base front wall's free
    // edge (its bottom edge in the blank); both centred on
    // their panel's width
    const dia = d.options.magnetDiameter
    const inset = d.options.magnetInset
    const magnets = d.features.filter((f) => f.kind === "magnet")
    if (d.features.length !== 2 || magnets.length !== 2) {
      failures.push(`magnethinge: expected exactly 2 magnet features, got ${d.features.length} features (${magnets.length} magnets)`)
    }
    const flap = byId(d, "flap")
    const front = byId(d, "base-front")
    for (const [panel, label, fromTop] of [[flap, "front flap", true], [front, "base front wall", false]] as const) {
      const xs = panel.polygon.map((v) => v.x)
      const ys = panel.polygon.map((v) => v.y)
      const m = magnets.find((f) => f.at.x >= Math.min(...xs) - TOL && f.at.x <= Math.max(...xs) + TOL && f.at.y >= Math.min(...ys) - TOL && f.at.y <= Math.max(...ys) + TOL)
      if (!m) {
        failures.push(`magnethinge: no magnet inside the ${label}`)
        continue
      }
      if (Math.abs(m.w - dia) > TOL || Math.abs(m.h - dia) > TOL) failures.push(`magnethinge: magnet on the ${label} is ${m.w.toFixed(2)}x${m.h.toFixed(2)}, stated diameter is ${dia.toFixed(2)}`)
      if (Math.abs(m.at.x - panel.labelAt.x) > TOL) failures.push(`magnethinge: magnet on the ${label} is not centred on the panel width`)
      const expectedY = fromTop ? Math.min(...ys) + inset + dia / 2 : Math.max(...ys) - inset - dia / 2
      if (Math.abs(m.at.y - expectedY) > TOL) failures.push(`magnethinge: magnet on the ${label} sits ${m.at.y.toFixed(2)}, stated placement puts it at ${expectedY.toFixed(2)}`)
    }
  }

  // ---- cup / tube / carrier / pocket / disc (batch T14):
  // flat patterns. Panel outlines (every vertex, for the
  // segmented-arc panels), fold endpoints and features
  // are restated from the spec and the stated options.
  if (d.type === "cup") {
    const o = d.options
    const N = o.arcSegments
    const slant = Math.sqrt(H * H + ((W - L) / 2) * ((W - L) / 2))
    const R = (slant * W) / (W - L)
    const r = R - slant
    const theta = (Math.PI * W) / R
    const alpha = o.seamOverlap / R
    const phi0 = Math.PI / 2 - theta / 2
    const phi1 = phi0 + theta
    const arcPt = (rad: number, phi: number) => ({ x: rad * Math.cos(phi), y: rad * Math.sin(phi) })
    const wrap = byId(d, "wrap")
    const tab = byId(d, "tab")
    const p0 = arcPt(R, phi0)
    const sx = wrap.polygon[0].x - p0.x
    const sy = wrap.polygon[0].y - p0.y
    const expWrap: { x: number; y: number }[] = []
    for (let i = 0; i <= N; i++) expWrap.push(arcPt(R, phi0 + (i / N) * theta))
    for (let i = N; i >= 0; i--) expWrap.push(arcPt(r, phi0 + (i / N) * theta))
    if (wrap.polygon.length !== expWrap.length) failures.push(`cup: wrap has ${wrap.polygon.length} vertices, expected ${expWrap.length}`)
    wrap.polygon.forEach((v, i) => {
      const e = expWrap[i]
      if (!e) return
      if (Math.abs(v.x - (e.x + sx)) > TOL || Math.abs(v.y - (e.y + sy)) > TOL) failures.push(`cup: wrap vertex ${i} is (${v.x}, ${v.y}), expected (${e.x + sx}, ${e.y + sy})`)
    })
    const M = Math.max(1, Math.round((N * alpha) / theta))
    const expTab: { x: number; y: number }[] = []
    for (let j = 0; j <= M; j++) expTab.push(arcPt(R, phi1 + (j / M) * alpha))
    for (let j = M; j >= 0; j--) expTab.push(arcPt(r, phi1 + (j / M) * alpha))
    if (tab.polygon.length !== expTab.length) failures.push(`cup: seam tab has ${tab.polygon.length} vertices, expected ${expTab.length}`)
    tab.polygon.forEach((v, i) => {
      const e = expTab[i]
      if (!e) return
      if (Math.abs(v.x - (e.x + sx)) > TOL || Math.abs(v.y - (e.y + sy)) > TOL) failures.push(`cup: tab vertex ${i} is (${v.x}, ${v.y}), expected (${e.x + sx}, ${e.y + sy})`)
    })
    if (d.features.length !== 0) failures.push(`cup: expected no features, got ${d.features.length}`)
    if (d.folds.length !== 1) failures.push(`cup: expected 1 fold, got ${d.folds.length}`)
    const f0 = d.folds[0]
    if (f0) {
      const ia = arcPt(r, phi1)
      const oa = arcPt(R, phi1)
      if (Math.abs(f0.from.x - (ia.x + sx)) > TOL || Math.abs(f0.from.y - (ia.y + sy)) > TOL || Math.abs(f0.to.x - (oa.x + sx)) > TOL || Math.abs(f0.to.y - (oa.y + sy)) > TOL) failures.push("cup: the seam fold does not run along the shared radial edge")
      if (f0.between[0] !== "wrap" || f0.between[1] !== "tab") failures.push("cup: the seam fold is not between wrap and tab")
    }
  }

  if (d.type === "tube") {
    const o = d.options
    const wrap = byId(d, "wrap")
    const tab = byId(d, "tab")
    const sx = Math.min(...wrap.polygon.map((v) => v.x))
    const sy = Math.min(...wrap.polygon.map((v) => v.y))
    const rect = (x: number, y: number, w: number, h: number) => [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
    outlinePin(failures, "tube wrap", wrap.polygon, rect(sx, sy, Math.PI * L, H))
    outlinePin(failures, "tube tab", tab.polygon, rect(sx + Math.PI * L, sy, o.seamOverlap, H))
    // Batch BD: the glue-host lookup does not cover the tube, so the tab fit is stated here:
    // the seam tab cannot be wider than the wrap it bonds to.
    if (tab.width > wrap.width + TOL) failures.push(`tube: seam tab (${tab.width.toFixed(2)} mm) is wider than the wrap it bonds to (${wrap.width.toFixed(2)} mm)`)
    if (d.features.length !== 0) failures.push(`tube: expected no features, got ${d.features.length}`)
    if (d.folds.length !== 1) failures.push(`tube: expected 1 fold, got ${d.folds.length}`)
  }

  if (d.type === "carrier") {
    const o = d.options
    const seal = o.sealWidth
    const front = byId(d, "front")
    const sx = Math.min(...front.polygon.map((v) => v.x)) - W
    const sy = Math.min(...front.polygon.map((v) => v.y))
    const rect = (x: number, y: number, w: number, h: number) => [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
    outlinePin(failures, "carrier gusset-l", byId(d, "gusset-l").polygon, rect(sx, sy, W, H))
    outlinePin(failures, "carrier front", front.polygon, rect(sx + W, sy, L, H))
    outlinePin(failures, "carrier gusset-r", byId(d, "gusset-r").polygon, rect(sx + W + L, sy, W, H))
    outlinePin(failures, "carrier back", byId(d, "back").polygon, rect(sx + W + L + W, sy, L, H))
    const expFolds: [number, number, number, number, string, string, boolean][] = [
      [sx + W, sy, sx + W, sy + H, "gusset-l", "front", false],
      [sx + W + L, sy, sx + W + L, sy + H, "front", "gusset-r", false],
      [sx + W + L + W, sy, sx + W + L + W, sy + H, "gusset-r", "back", false],
      [sx + W / 2, sy, sx + W / 2, sy + H, "gusset-l", "gusset-l", true],
      [sx + W + L + W / 2, sy, sx + W + L + W / 2, sy + H, "gusset-r", "gusset-r", true],
    ]
    if (d.folds.length !== expFolds.length) failures.push(`carrier: expected ${expFolds.length} folds, got ${d.folds.length}`)
    d.folds.forEach((f, i) => {
      const e = expFolds[i]
      if (!e) return
      if (Math.abs(f.from.x - e[0]) > TOL || Math.abs(f.from.y - e[1]) > TOL || Math.abs(f.to.x - e[2]) > TOL || Math.abs(f.to.y - e[3]) > TOL) failures.push(`carrier: fold ${i} endpoints differ from the restated row geometry`)
      if (f.between[0] !== e[4] || f.between[1] !== e[5]) failures.push(`carrier: fold ${i} is between ${f.between}, expected ${e[4]}/${e[5]}`)
      if (!!f.internal !== e[6]) failures.push(`carrier: fold ${i} internal flag is ${f.internal}, expected ${e[6]}`)
    })
    const totalW = 2 * L + 2 * W
    const exp: [string, number, number, number, number][] = [
      ["seal", sx + totalW / 2, sy + H - seal / 2, totalW, seal],
      ["slot", sx + W + L / 2, sy + o.handleInset + o.handleHeight / 2, o.handleWidth, o.handleHeight],
      ["slot", sx + W + L + W + L / 2, sy + o.handleInset + o.handleHeight / 2, o.handleWidth, o.handleHeight],
    ]
    if (d.features.length !== exp.length) failures.push(`carrier: expected ${exp.length} features, got ${d.features.length}`)
    d.features.forEach((f, i) => {
      const e = exp[i]
      if (!e) return
      if (f.kind !== e[0]) failures.push(`carrier: feature ${i} kind is ${f.kind}, expected ${e[0]}`)
      if (Math.abs(f.at.x - e[1]) > TOL || Math.abs(f.at.y - e[2]) > TOL) failures.push(`carrier: feature ${i} (${e[0]}) centre is (${f.at.x}, ${f.at.y}), expected (${e[1]}, ${e[2]})`)
      if (Math.abs(f.w - e[3]) > TOL || Math.abs(f.h - e[4]) > TOL) failures.push(`carrier: feature ${i} (${e[0]}) size is ${f.w} x ${f.h}, expected ${e[3]} x ${e[4]}`)
      if (f.at.x - f.w / 2 < -TOL || f.at.x + f.w / 2 > d.blankWidth + TOL || f.at.y - f.h / 2 < -TOL || f.at.y + f.h / 2 > d.blankHeight + TOL) failures.push(`carrier: feature ${i} (${e[0]}) lies outside the blank`)
    })
  }

  if (d.type === "pocket") {
    const o = d.options
    const seal = o.sealWidth
    const flapH = o.flapHeight
    const gap = o.layoutGap
    const back = byId(d, "back")
    const front = byId(d, "front")
    const sx = Math.min(...back.polygon.map((v) => v.x))
    const sy = Math.min(...back.polygon.map((v) => v.y)) - flapH
    const rect = (x: number, y: number, w: number, h: number) => [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
    outlinePin(failures, "pocket flap", byId(d, "flap").polygon, rect(sx, sy, L, flapH))
    outlinePin(failures, "pocket back", back.polygon, rect(sx, sy + flapH, L, W))
    outlinePin(failures, "pocket front", front.polygon, rect(sx + L + gap, sy + flapH, L, W))
    if (d.folds.length !== 1) failures.push(`pocket: expected 1 fold (flap to back), got ${d.folds.length}`)
    const pf = d.folds[0]
    if (pf) {
      if (Math.abs(pf.from.x - sx) > TOL || Math.abs(pf.from.y - (sy + flapH)) > TOL || Math.abs(pf.to.x - (sx + L)) > TOL || Math.abs(pf.to.y - (sy + flapH)) > TOL) failures.push(`pocket: the flap fold does not run along the flap-to-back edge`)
      if (pf.between[0] !== "flap" || pf.between[1] !== "back") failures.push(`pocket: fold 0 is between ${pf.between}, expected flap/back`)
    }
    const fx = sx + L + gap
    const exp: [string, number, number, number, number][] = [
      ["seal", fx + seal / 2, sy + flapH + W / 2, seal, W],
      ["seal", fx + L - seal / 2, sy + flapH + W / 2, seal, W],
      ["seal", fx + L / 2, sy + flapH + W - seal / 2, L, seal],
      ["seal", sx + L / 2, sy + flapH / 4, L - 2 * seal, flapH / 2],
    ]
    if (d.features.length !== exp.length) failures.push(`pocket: expected ${exp.length} features, got ${d.features.length}`)
    d.features.forEach((f, i) => {
      const e = exp[i]
      if (!e) return
      if (f.kind !== e[0]) failures.push(`pocket: feature ${i} kind is ${f.kind}, expected ${e[0]}`)
      if (Math.abs(f.at.x - e[1]) > TOL || Math.abs(f.at.y - e[2]) > TOL) failures.push(`pocket: feature ${i} (${e[0]}) centre is (${f.at.x}, ${f.at.y}), expected (${e[1]}, ${e[2]})`)
      if (Math.abs(f.w - e[3]) > TOL || Math.abs(f.h - e[4]) > TOL) failures.push(`pocket: feature ${i} (${e[0]}) size is ${f.w} x ${f.h}, expected ${e[3]} x ${e[4]}`)
      if (f.at.x - f.w / 2 < -TOL || f.at.x + f.w / 2 > d.blankWidth + TOL || f.at.y - f.h / 2 < -TOL || f.at.y + f.h / 2 > d.blankHeight + TOL) failures.push(`pocket: feature ${i} (${e[0]}) lies outside the blank`)
    })
  }

  if (d.type === "disc") {
    const o = d.options
    const N = o.arcSegments
    const R = L / 2
    const disc = byId(d, "disc")
    const v0 = { x: 2 * R, y: R }
    const sx = disc.polygon[0].x - v0.x
    const sy = disc.polygon[0].y - v0.y
    if (disc.polygon.length !== N) failures.push(`disc: expected ${N} vertices, got ${disc.polygon.length}`)
    disc.polygon.forEach((v, i) => {
      const a = (i / N) * 2 * Math.PI
      const ex = R + R * Math.cos(a) + sx
      const ey = R + R * Math.sin(a) + sy
      if (Math.abs(v.x - ex) > TOL || Math.abs(v.y - ey) > TOL) failures.push(`disc: vertex ${i} is (${v.x}, ${v.y}), expected (${ex}, ${ey})`)
    })
    if (d.folds.length !== 0) failures.push(`disc: expected no folds, got ${d.folds.length}`)
    if (d.features.length !== 0) failures.push(`disc: expected no features, got ${d.features.length}`)
  }

  // ---- pouch (batch T13): a flat film pattern — back,
  // gusset strip, front in one column. Panel outlines
  // are pinned against the column restated from the
  // spec; every seal / zip / notch / valve feature is
  // restated from the spec and the stated options, and
  // every feature must lie inside the film blank.
  if (d.type === "pouch") {
    const o = d.options
    const seal = o.sealWidth
    const zip = o.zipHeight
    const back = byId(d, "back")
    const gusset = byId(d, "gusset")
    const front = byId(d, "front")
    const sx = Math.min(...back.polygon.map((v) => v.x))
    const sy = Math.min(...back.polygon.map((v) => v.y))
    const rect = (x: number, y: number, w: number, h: number) => [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
    outlinePin(failures, "pouch back", back.polygon, rect(sx, sy, L, H))
    outlinePin(failures, "pouch gusset", gusset.polygon, rect(sx, sy + H, L, W))
    outlinePin(failures, "pouch front", front.polygon, rect(sx, sy + H + W, L, H))
    const expFolds: [number, number, number, number, string, string, boolean][] = [
      [sx, sy + H, sx + L, sy + H, "back", "gusset", false],
      [sx, sy + H + W, sx + L, sy + H + W, "gusset", "front", false],
      [sx, sy + H + W / 2, sx + L, sy + H + W / 2, "gusset", "gusset", true],
    ]
    if (d.folds.length !== expFolds.length) failures.push(`pouch: expected ${expFolds.length} folds, got ${d.folds.length}`)
    d.folds.forEach((f, i) => {
      const e = expFolds[i]
      if (!e) return
      if (Math.abs(f.from.x - e[0]) > TOL || Math.abs(f.from.y - e[1]) > TOL || Math.abs(f.to.x - e[2]) > TOL || Math.abs(f.to.y - e[3]) > TOL) failures.push(`pouch: fold ${i} runs (${f.from.x}, ${f.from.y}) to (${f.to.x}, ${f.to.y}), expected (${e[0]}, ${e[1]}) to (${e[2]}, ${e[3]})`)
      if (f.between[0] !== e[4] || f.between[1] !== e[5]) failures.push(`pouch: fold ${i} is between ${f.between}, expected ${e[4]}/${e[5]}`)
      if (!!f.internal !== e[6]) failures.push(`pouch: fold ${i} internal flag is ${f.internal}, expected ${e[6]}`)
    })
    const totalH = 2 * H + W
    const exp: [string, number, number, number, number][] = [
      ["seal", sx + seal / 2, sy + totalH / 2, seal, totalH],
      ["seal", sx + L - seal / 2, sy + totalH / 2, seal, totalH],
      ["seal", sx + L / 2, sy + H + W / 2, L, seal],
      ["seal", sx + L / 2, sy + seal / 2, L, seal],
      ["seal", sx + L / 2, sy + totalH - seal / 2, L, seal],
    ]
    if (zip > 0) {
      exp.push(["zip", sx + L / 2, sy + seal + zip / 2, L - 2 * seal, zip])
      exp.push(["zip", sx + L / 2, sy + totalH - seal - zip / 2, L - 2 * seal, zip])
    }
    if (o.tearNotch) {
      exp.push(["notch", sx + seal / 2, sy + seal / 2, seal, 3])
      exp.push(["notch", sx + L - seal / 2, sy + seal / 2, seal, 3])
    }
    if (o.valve) exp.push(["valve", sx + L / 2, sy + H + W + H / 4, o.valveSize, o.valveSize])
    if (d.features.length !== exp.length) failures.push(`pouch: expected ${exp.length} features, got ${d.features.length}`)
    d.features.forEach((f, i) => {
      const e = exp[i]
      if (!e) return
      if (f.kind !== e[0]) failures.push(`pouch: feature ${i} kind is ${f.kind}, expected ${e[0]}`)
      if (Math.abs(f.at.x - e[1]) > TOL || Math.abs(f.at.y - e[2]) > TOL) failures.push(`pouch: feature ${i} (${e[0]}) centre is (${f.at.x}, ${f.at.y}), expected (${e[1]}, ${e[2]})`)
      if (Math.abs(f.w - e[3]) > TOL || Math.abs(f.h - e[4]) > TOL) failures.push(`pouch: feature ${i} (${e[0]}) size is ${f.w} x ${f.h}, expected ${e[3]} x ${e[4]}`)
      if (f.at.x - f.w / 2 < -TOL || f.at.x + f.w / 2 > d.blankWidth + TOL || f.at.y - f.h / 2 < -TOL || f.at.y + f.h / 2 > d.blankHeight + TOL) failures.push(`pouch: feature ${i} (${e[0]}) lies outside the film blank`)
    })
  }

  // ---- bag (batch T13): a flat film pattern — optional
  // flap, back, front in one column, bottom fold. Panel
  // outlines pinned; seal / zip features restated from
  // the spec and the stated options; every feature must
  // lie inside the film blank.
  if (d.type === "bag") {
    const o = d.options
    const seal = o.sealWidth
    const zip = o.zipHeight
    const flapH = o.flapHeight
    const back = byId(d, "back")
    const front = byId(d, "front")
    const sx = Math.min(...back.polygon.map((v) => v.x))
    const sy = Math.min(...back.polygon.map((v) => v.y)) - flapH
    const rect = (x: number, y: number, w: number, h: number) => [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ]
    if (flapH > 0) {
      const flap = byId(d, "flap")
      outlinePin(failures, "bag flap", flap.polygon, rect(sx, sy, L, flapH))
    }
    outlinePin(failures, "bag back", back.polygon, rect(sx, sy + flapH, L, W))
    outlinePin(failures, "bag front", front.polygon, rect(sx, sy + flapH + W, L, W))
    const expFolds: [number, number, number, number, string, string][] = []
    if (flapH > 0) expFolds.push([sx, sy + flapH, sx + L, sy + flapH, "flap", "back"])
    expFolds.push([sx, sy + flapH + W, sx + L, sy + flapH + W, "back", "front"])
    if (d.folds.length !== expFolds.length) failures.push(`bag: expected ${expFolds.length} folds, got ${d.folds.length}`)
    d.folds.forEach((f, i) => {
      const e = expFolds[i]
      if (!e) return
      if (Math.abs(f.from.x - e[0]) > TOL || Math.abs(f.from.y - e[1]) > TOL || Math.abs(f.to.x - e[2]) > TOL || Math.abs(f.to.y - e[3]) > TOL) failures.push(`bag: fold ${i} runs (${f.from.x}, ${f.from.y}) to (${f.to.x}, ${f.to.y}), expected (${e[0]}, ${e[1]}) to (${e[2]}, ${e[3]})`)
      if (f.between[0] !== e[4] || f.between[1] !== e[5]) failures.push(`bag: fold ${i} is between ${f.between}, expected ${e[4]}/${e[5]}`)
    })
    const exp: [string, number, number, number, number][] = [
      ["seal", sx + seal / 2, sy + flapH + W, seal, 2 * W],
      ["seal", sx + L - seal / 2, sy + flapH + W, seal, 2 * W],
    ]
    if (flapH > 0) {
      exp.push(["seal", sx + L / 2, sy + flapH / 4, L - 2 * seal, flapH / 2])
    } else {
      exp.push(["seal", sx + L / 2, sy + seal / 2, L, seal])
      exp.push(["seal", sx + L / 2, sy + 2 * W - seal / 2, L, seal])
      if (zip > 0) {
        exp.push(["zip", sx + L / 2, sy + seal + zip / 2, L - 2 * seal, zip])
        exp.push(["zip", sx + L / 2, sy + 2 * W - seal - zip / 2, L - 2 * seal, zip])
      }
    }
    if (d.features.length !== exp.length) failures.push(`bag: expected ${exp.length} features, got ${d.features.length}`)
    d.features.forEach((f, i) => {
      const e = exp[i]
      if (!e) return
      if (f.kind !== e[0]) failures.push(`bag: feature ${i} kind is ${f.kind}, expected ${e[0]}`)
      if (Math.abs(f.at.x - e[1]) > TOL || Math.abs(f.at.y - e[2]) > TOL) failures.push(`bag: feature ${i} (${e[0]}) centre is (${f.at.x}, ${f.at.y}), expected (${e[1]}, ${e[2]})`)
      if (Math.abs(f.w - e[3]) > TOL || Math.abs(f.h - e[4]) > TOL) failures.push(`bag: feature ${i} (${e[0]}) size is ${f.w} x ${f.h}, expected ${e[3]} x ${e[4]}`)
      if (f.at.x - f.w / 2 < -TOL || f.at.x + f.w / 2 > d.blankWidth + TOL || f.at.y - f.h / 2 < -TOL || f.at.y + f.h / 2 > d.blankHeight + TOL) failures.push(`bag: feature ${i} (${e[0]}) lies outside the film blank`)
    })
  }

  // ---- flat (batch T12): a single panel, no folds, no
  // features. The panel outline is pinned against the
  // plan rectangle restated from the spec, anchored at
  // the panel's own min corner.
  if (d.type === "flat") {
    if (d.panels.length !== 1) failures.push(`flat: expected exactly 1 panel, got ${d.panels.length}`)
    if (d.folds.length !== 0) failures.push(`flat: a flat sheet has no fold lines, got ${d.folds.length}`)
    if (d.features.length !== 0) failures.push(`flat: a flat sheet has no features, got ${d.features.length}`)
    const sheet = byId(d, "sheet")
    const minX = Math.min(...sheet.polygon.map((v) => v.x))
    const minY = Math.min(...sheet.polygon.map((v) => v.y))
    outlinePin(failures, "flat sheet", sheet.polygon, [
      { x: minX, y: minY },
      { x: minX + L, y: minY },
      { x: minX + L, y: minY + W },
      { x: minX, y: minY + W },
    ])
  }

  return {
    ok: failures.length === 0,
    overlaps,
    glueOverlapMm2,
    foldedInternal: folded,
    // A flat sheet is not a tray: it has no walls, so its outer size is its
    // plan size and its single thickness (batch AX). Every other type keeps
    // the box formula, internal + 2t. Batch AZ: a sealed bag follows the same
    // flat-pattern contract as flat (height = thickness), so it is treated
    // the same. Batch BA: the pouch too. Its panels are film with no
    // walls and its internal size is already the stated size, so the
    // box formula would add two thicknesses that no panel has.
    foldedOuter:
      d.type === "flat" || d.type === "bag" || d.type === "pouch"
        ? { length: folded.length, width: folded.width, height: folded.height }
        : { length: folded.length + 2 * t, width: folded.width + 2 * t, height: folded.height + 2 * t },
    failures,
    warnings,
  }
}
