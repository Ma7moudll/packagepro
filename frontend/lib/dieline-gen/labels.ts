// Batch S2 Part 1 — dieline label layout.
//
// Every panel gets a label that is MEASURED, not just centred: the text
// box (estimated from the font size) must fit inside the panel polygon,
// clear of internal creases and cut features. Font size scales with the
// panel up to a blank-relative cap; the floor is MIN_LABEL_MM.
//
// MIN_LABEL_MM = 2.5 mm ≈ 7 pt — the smallest type that stays legible
// printed at arm's length. A panel that cannot fit its full two-line
// label (name + dimensions) at that size falls back to a short code at
// a legible size, with the full text in a legend below the blank.

import type { Dieline, Panel, Pt } from "./types.ts"
import { bbox, edges, pointOnBoundary, pointStrictlyInside, segmentsCrossProperly } from "./geometry.ts"

export const MIN_LABEL_MM = 2.5
export const LEGEND_LINE_H = 4.4
export const LEGEND_FONT_MM = 3
/** Average glyph advance for the label font (sans-serif, mixed case/digits). */
const CHAR_W = 0.62
/** Clearance kept between a label box and an obstacle (crease/feature). */
const CLEAR = 0.6

export interface LabelLayout {
  panelId: string
  mode: "full" | "code"
  code?: string
  lines: string[]
  fontSize: number
  cx: number
  cy: number
  boxW: number
  boxH: number
}

export interface LegendEntry {
  code: string
  text: string
}

function textWidth(lines: string[], size: number): number {
  return Math.max(...lines.map((l) => l.length)) * CHAR_W * size
}
function textHeight(lines: string[], size: number): number {
  return (lines.length === 1 ? 1.2 : 1.5) * size
}

function areaCentroid(poly: Pt[]): Pt {
  let a = 0,
    cx = 0,
    cy = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    const f = p.x * q.y - q.x * p.y
    a += f
    cx += (p.x + q.x) * f
    cy += (p.y + q.y) * f
  }
  if (Math.abs(a) < 1e-9) {
    const b = bbox(poly)
    return { x: b.minX + b.w / 2, y: b.minY + b.h / 2 }
  }
  return { x: cx / (3 * a), y: cy / (3 * a) }
}

interface Obstacles {
  segments: [Pt, Pt][]
  circles: { at: Pt; r: number }[]
  rects: { at: Pt; hw: number; hh: number }[]
}

function panelObstacles(d: Dieline, panel: Panel): Obstacles {
  const segments = d.folds
    .filter((f) => f.internal && f.between[0] === panel.id)
    .map((f) => [f.from, f.to] as [Pt, Pt])
  const feats = d.features.filter((f) => pointStrictlyInside(f.at, panel.polygon) || pointOnBoundary(f.at, panel.polygon))
  // Batch T3: round features (vents) stay circular obstacles, but
  // rectangular features (slots, tabs) are now modelled as their
  // actual rectangle grown by CLEAR. The previous circumscribed
  // circle (radius = half the slot's WIDTH in every direction)
  // blocked a 21 mm disc for a 20 × 3.5 mm slit — on the snap-lock
  // carton's small main flap no label anchor survived it, and the
  // code fallback placed the code on the slit itself.
  const circles = feats.filter((f) => f.r !== undefined).map((f) => ({ at: f.at, r: (f.r ?? 0) + CLEAR }))
  const rects = feats.filter((f) => f.r === undefined).map((f) => ({ at: f.at, hw: f.w / 2 + CLEAR, hh: f.h / 2 + CLEAR }))
  return { segments, circles, rects }
}

function boxCorners(cx: number, cy: number, w: number, h: number): Pt[] {
  return [
    { x: cx - w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy - h / 2 },
    { x: cx + w / 2, y: cy + h / 2 },
    { x: cx - w / 2, y: cy + h / 2 },
  ]
}

function segmentHitsBox(a: Pt, b: Pt, corners: Pt[]): boolean {
  const inside = (p: Pt) =>
    p.x >= corners[0].x - 1e-9 && p.x <= corners[2].x + 1e-9 && p.y >= corners[0].y - 1e-9 && p.y <= corners[2].y + 1e-9
  if (inside(a) || inside(b)) return true
  const boxEdges: [Pt, Pt][] = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]],
  ]
  return boxEdges.some(([e1, e2]) => segmentsCrossProperly(a, b, e1, e2))
}

function boxFits(panel: Panel, obs: Obstacles, cx: number, cy: number, w: number, h: number): boolean {
  const corners = boxCorners(cx, cy, w, h)
  for (const c of corners) {
    if (!pointStrictlyInside(c, panel.polygon) && !pointOnBoundary(c, panel.polygon)) return false
  }
  const boxEdges: [Pt, Pt][] = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]],
  ]
  for (const [e1, e2] of edges(panel.polygon)) {
    for (const [b1, b2] of boxEdges) {
      if (segmentsCrossProperly(e1, e2, b1, b2)) return false
    }
  }
  for (const [s1, s2] of obs.segments) {
    if (segmentHitsBox(s1, s2, corners)) return false
  }
  for (const circ of obs.circles) {
    const nx = Math.max(corners[0].x, Math.min(circ.at.x, corners[2].x))
    const ny = Math.max(corners[0].y, Math.min(circ.at.y, corners[2].y))
    if (Math.hypot(circ.at.x - nx, circ.at.y - ny) < circ.r) return false
  }
  for (const rect of obs.rects) {
    const bw = (corners[2].x - corners[0].x) / 2
    const bh = (corners[2].y - corners[0].y) / 2
    const cx = (corners[0].x + corners[2].x) / 2
    const cy = (corners[0].y + corners[2].y) / 2
    if (Math.abs(rect.at.x - cx) < rect.hw + bw && Math.abs(rect.at.y - cy) < rect.hh + bh) return false
  }
  return true
}

/** Largest size ≤ cap whose text box fits at one of the anchor candidates. */
function fitSize(panel: Panel, obs: Obstacles, lines: string[], cap: number): { size: number; cx: number; cy: number } {
  const b = bbox(panel.polygon)
  const centroid = areaCentroid(panel.polygon)
  const anchors: Pt[] = [
    centroid,
    { x: b.minX + b.w / 2, y: b.minY + b.h / 2 },
    { x: centroid.x, y: b.minY + b.h * 0.35 },
    { x: centroid.x, y: b.minY + b.h * 0.65 },
    { x: b.minX + b.w * 0.35, y: centroid.y },
    { x: b.minX + b.w * 0.65, y: centroid.y },
  ]
  let best = { size: 0, cx: centroid.x, cy: centroid.y }
  for (const a of anchors) {
    for (let step = 0; step <= 28; step++) {
      const size = cap - (step * (cap - 0.4)) / 28
      if (size <= best.size) break
      // Batch T3: the box must fit with CLEAR to spare on every side.
      // The text box is an ESTIMATE (average glyph advance); a box
      // that merely touches the panel boundary renders with its
      // glyphs crossing the cut line in a real font — a 15 mm glue
      // flap whose full label "fit" with 0.25 mm to spare clipped on
      // both sides in the pillow-box proof render.
      if (boxFits(panel, obs, a.x, a.y, textWidth(lines, size) + 2 * CLEAR, textHeight(lines, size) + 2 * CLEAR)) {
        best = { size, cx: a.x, cy: a.y }
        break
      }
    }
  }
  return best
}

const BASE_CODE: Record<string, string> = {
  glue: "GF",
  dust: "DF",
  tuck: "TF",
  roll: "IR",
  lid: "LD",
  flap: "FL",
  wall: "WL",
  panel: "PN",
}

export function maxLabelMm(d: Dieline): number {
  return Math.max(6, Math.min(26, d.blankWidth * 0.012))
}

export function layoutLabels(d: Dieline): { labels: LabelLayout[]; legend: LegendEntry[] } {
  const cap = maxLabelMm(d)
  const labels: LabelLayout[] = []
  const codePanels: { panel: Panel; base: string; fit: { size: number; cx: number; cy: number } }[] = []

  for (const panel of d.panels) {
    const obs = panelObstacles(d, panel)
    const lines = [panel.name, panel.dimsLabel]
    const fit = fitSize(panel, obs, lines, cap)
    if (fit.size >= MIN_LABEL_MM) {
      labels.push({
        panelId: panel.id,
        mode: "full",
        lines,
        fontSize: Math.round(fit.size * 10) / 10,
        cx: fit.cx,
        cy: fit.cy,
        boxW: textWidth(lines, fit.size),
        boxH: textHeight(lines, fit.size),
      })
    } else {
      codePanels.push({ panel, base: BASE_CODE[panel.kind] ?? "PN", fit: { size: 0, cx: 0, cy: 0 } })
      labels.push({
        panelId: panel.id,
        mode: "code",
        lines: [],
        fontSize: 0,
        cx: 0,
        cy: 0,
        boxW: 0,
        boxH: 0,
      })
    }
  }

  // assign unique codes (numbered when different parts share a base code)
  const groups = new Map<string, { panel: Panel }[]>()
  for (const cp of codePanels) {
    if (!groups.has(cp.base)) groups.set(cp.base, [])
    groups.get(cp.base)!.push({ panel: cp.panel })
  }
  const legend: LegendEntry[] = []
  const codeOf = new Map<string, string>()
  for (const [base, members] of groups) {
    const distinct = new Map<string, { panel: Panel }[]>()
    for (const m of members) {
      const key = `${m.panel.name}|${m.panel.dimsLabel}`
      if (!distinct.has(key)) distinct.set(key, [])
      distinct.get(key)!.push(m)
    }
    let i = 0
    for (const [, same] of distinct) {
      i++
      const code = distinct.size === 1 ? base : `${base}${i}`
      for (const m of same) codeOf.set(m.panel.id, code)
      legend.push({ code, text: `${same[0].panel.name} ${same[0].panel.dimsLabel}` })
    }
  }
  for (const cp of codePanels) {
    const code = codeOf.get(cp.panel.id)!
    const obs = panelObstacles(d, cp.panel)
    const fit = fitSize(cp.panel, obs, [code], Math.min(cap, 6))
    const label = labels.find((l) => l.panelId === cp.panel.id)!
    label.code = code
    label.lines = [code]
    label.fontSize = Math.round(Math.max(fit.size, MIN_LABEL_MM) * 10) / 10
    label.cx = fit.cx || areaCentroid(cp.panel.polygon).x
    label.cy = fit.cy || areaCentroid(cp.panel.polygon).y
    label.boxW = textWidth([code], label.fontSize)
    label.boxH = textHeight([code], label.fontSize)
  }

  return { labels, legend }
}

/**
 * Measured label checks: font floor, box inside the panel polygon, and
 * no intersection with any fold line or cut feature. Returns failures.
 */
export function checkLabels(d: Dieline, labels: LabelLayout[]): string[] {
  const failures: string[] = []
  const panelById = new Map(d.panels.map((p) => [p.id, p]))
  for (const l of labels) {
    const panel = panelById.get(l.panelId)
    if (!panel) {
      failures.push(`label for unknown panel ${l.panelId}`)
      continue
    }
    if (l.fontSize < MIN_LABEL_MM - 1e-9) {
      failures.push(`label for ${l.panelId} is ${l.fontSize}mm, below the ${MIN_LABEL_MM}mm readable minimum`)
    }
    const corners = boxCorners(l.cx, l.cy, l.boxW, l.boxH)
    const inside = corners.every((c) => pointStrictlyInside(c, panel.polygon) || pointOnBoundary(c, panel.polygon))
    const boxEdges: [Pt, Pt][] = [
      [corners[0], corners[1]],
      [corners[1], corners[2]],
      [corners[2], corners[3]],
      [corners[3], corners[0]],
    ]
    const crossed = edges(panel.polygon).some(([e1, e2]) => boxEdges.some(([b1, b2]) => segmentsCrossProperly(e1, e2, b1, b2)))
    if (!inside || crossed) failures.push(`label box overflows panel ${l.panelId}`)
    for (const f of d.folds) {
      if (segmentHitsBox(f.from, f.to, corners)) {
        failures.push(`label for ${l.panelId} overlaps a fold line (${f.between[0]}|${f.between[1]})`)
        break
      }
    }
    for (const feat of d.features) {
      // Batch T3: round features test as circles; rectangular
      // features (slots, tabs) test as their actual rectangle —
      // the same obstacle model the layout uses.
      if (feat.r !== undefined) {
        const nx = Math.max(corners[0].x, Math.min(feat.at.x, corners[2].x))
        const ny = Math.max(corners[0].y, Math.min(feat.at.y, corners[2].y))
        if (Math.hypot(feat.at.x - nx, feat.at.y - ny) < feat.r) {
          failures.push(`label for ${l.panelId} overlaps a cut feature (${feat.kind})`)
          break
        }
      } else if (
        Math.abs(feat.at.x - l.cx) < feat.w / 2 + l.boxW / 2 &&
        Math.abs(feat.at.y - l.cy) < feat.h / 2 + l.boxH / 2
      ) {
        failures.push(`label for ${l.panelId} overlaps a cut feature (${feat.kind})`)
        break
      }
    }
  }
  return failures
}
