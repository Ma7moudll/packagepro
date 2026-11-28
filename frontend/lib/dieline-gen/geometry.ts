// Batch R — small polygon toolkit for the dieline generator.
// Pure functions over Pt[] polygons in blank coordinates (mm, y down).
// All comparisons use a 1e-6 absolute epsilon; shared edges are built from
// the same coordinate variables by the generators, so they agree exactly.

import type { Pt } from "./types.ts"

export const EPS = 1e-6

export function bbox(poly: Pt[]): { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number } {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const p of poly) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY }
}

/** Signed area (shoelace). Sign follows the abstract plane orientation. */
export function signedArea(poly: Pt[]): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i]
    const q = poly[(i + 1) % poly.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

export function edges(poly: Pt[]): [Pt, Pt][] {
  const out: [Pt, Pt][] = []
  for (let i = 0; i < poly.length; i++) out.push([poly[i], poly[(i + 1) % poly.length]])
  return out
}

function orient(a: Pt, b: Pt, c: Pt): number {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
}

/** True when segments p1p2 and p3p4 cross at a point interior to both. */
export function segmentsCrossProperly(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d1 = orient(p3, p4, p1)
  const d2 = orient(p3, p4, p2)
  const d3 = orient(p1, p2, p3)
  const d4 = orient(p1, p2, p4)
  return ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS))
}

function onSegment(a: Pt, b: Pt, p: Pt): boolean {
  if (Math.abs(orient(a, b, p)) > 1e-7 * Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))) return false
  return (
    p.x >= Math.min(a.x, b.x) - EPS &&
    p.x <= Math.max(a.x, b.x) + EPS &&
    p.y >= Math.min(a.y, b.y) - EPS &&
    p.y <= Math.max(a.y, b.y) + EPS
  )
}

/** True when p lies on the polygon boundary. */
export function pointOnBoundary(p: Pt, poly: Pt[]): boolean {
  return edges(poly).some(([a, b]) => onSegment(a, b, p))
}

/** Strict interior test: boundary points are NOT inside. */
export function pointStrictlyInside(p: Pt, poly: Pt[]): boolean {
  if (pointOnBoundary(p, poly)) return false
  let inside = false
  for (const [a, b] of edges(poly)) {
    if (a.y > p.y !== b.y > p.y) {
      const xInt = a.x + ((p.y - a.y) / (b.y - a.y)) * (b.x - a.x)
      if (xInt > p.x) inside = !inside
    }
  }
  return inside
}

/**
 * Area overlap test between two polygons: true when any edges cross
 * properly or any vertex of one lies strictly inside the other. Panels
 * that merely share an edge or a corner do not count as overlapping.
 */
export function polygonsOverlap(a: Pt[], b: Pt[]): boolean {
  for (const [a1, a2] of edges(a)) {
    for (const [b1, b2] of edges(b)) {
      if (segmentsCrossProperly(a1, a2, b1, b2)) return true
    }
  }
  if (a.some((p) => pointStrictlyInside(p, b))) return true
  if (b.some((p) => pointStrictlyInside(p, a))) return true
  // Edge midpoints: two rectangles with identical y-extents overlapping
  // side by side meet only at boundary points (no proper crossing, no
  // strictly-inside vertex) — their edge midpoints land strictly inside
  // the other polygon, which catches that case.
  const mid = (p: Pt, q: Pt): Pt => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 })
  if (edges(a).some(([p, q]) => pointStrictlyInside(mid(p, q), b))) return true
  if (edges(b).some(([p, q]) => pointStrictlyInside(mid(p, q), a))) return true
  return false
}

/** True when segment f is collinear with edge e and contained in it. */
export function segmentContainedInEdge(f: [Pt, Pt], e: [Pt, Pt]): boolean {
  const [f1, f2] = f
  const [e1, e2] = e
  if (!onSegment(e1, e2, f1) || !onSegment(e1, e2, f2)) return false
  return true
}

const key = (p: Pt) => `${Math.round(p.x * 1e4)},${Math.round(p.y * 1e4)}`

interface Atom {
  a: Pt
  b: Pt
  ka: string
  kb: string
}

/**
 * The outer silhouette of a set of tiling polygons: collect every edge,
 * split edges at vertices lying on them (T-junctions), cancel edges that
 * appear twice (shared between two panels), then chain what remains into
 * loops. Returns the loops; the silhouette is the largest-area one.
 */
export function silhouetteLoops(polygons: Pt[][]): Pt[][] {
  const vertices: Pt[] = []
  for (const poly of polygons) vertices.push(...poly)
  const atoms: Atom[] = []
  const counts = new Map<string, number>()
  for (const poly of polygons) {
    for (const [a, b] of edges(poly)) {
      // split points: vertices strictly between a and b on this edge
      const splits = vertices
        .filter((v) => key(v) !== key(a) && key(v) !== key(b) && onSegment(a, b, v))
        .sort((u, v) => Math.hypot(u.x - a.x, u.y - a.y) - Math.hypot(v.x - a.x, v.y - a.y))
      const chain = [a, ...splits, b]
      for (let i = 0; i + 1 < chain.length; i++) {
        const atom: Atom = { a: chain[i], b: chain[i + 1], ka: key(chain[i]), kb: key(chain[i + 1]) }
        if (atom.ka === atom.kb) continue
        const uk = atom.ka < atom.kb ? `${atom.ka}|${atom.kb}` : `${atom.kb}|${atom.ka}`
        counts.set(uk, (counts.get(uk) ?? 0) + 1)
        atoms.push(atom)
      }
    }
  }
  const boundary = atoms.filter((atom) => {
    const uk = atom.ka < atom.kb ? `${atom.ka}|${atom.kb}` : `${atom.kb}|${atom.ka}`
    return counts.get(uk) === 1
  })
  // Chain atoms into loops with directed half-edges. At each vertex the
  // walk keeps the material on one side by choosing, among the half-edges
  // leaving the vertex, the one reached by the smallest counter-clockwise
  // sweep from the direction pointing back along the edge just traversed
  // (the standard face-traversal rule). A greedy "first unused edge"
  // walk takes wrong turns where a flap edge, a panel edge and a
  // protrusion edge meet at one vertex — that produced a diagonal
  // self-crossing outline on the first mailer render, hence this rule.
  interface Half {
    from: Pt
    to: Pt
    angle: number
    atom: Atom
  }
  const halves: Half[] = []
  const byStart = new Map<string, Half[]>()
  for (const atom of boundary) {
    for (const [from, to] of [
      [atom.a, atom.b],
      [atom.b, atom.a],
    ] as const) {
      const h: Half = { from, to, angle: Math.atan2(to.y - from.y, to.x - from.x), atom }
      halves.push(h)
      const k = key(from)
      if (!byStart.has(k)) byStart.set(k, [])
      byStart.get(k)!.push(h)
    }
  }
  const TAU = Math.PI * 2
  const usedAtoms = new Set<Atom>()
  const loops: Pt[][] = []
  for (const start of halves) {
    if (usedAtoms.has(start.atom)) continue
    const loop: Pt[] = [start.from]
    let current: Half | undefined = start
    let guard = 0
    while (current && guard++ < 100000) {
      usedAtoms.add(current.atom)
      loop.push(current.to)
      if (key(current.to) === key(loop[0])) break
      const back = Math.atan2(current.from.y - current.to.y, current.from.x - current.to.x)
      let best: Half | undefined
      let bestDelta = Infinity
      for (const cand of byStart.get(key(current.to)) ?? []) {
        if (cand.to === current.from && cand.from === current.to) continue // the reverse half-edge
        let delta = (cand.angle - back) % TAU
        if (delta < 0) delta += TAU
        if (delta < bestDelta) {
          bestDelta = delta
          best = cand
        }
      }
      current = best && !usedAtoms.has(best.atom) ? best : undefined
      if (best && usedAtoms.has(best.atom) && key(best.to) !== key(loop[0])) current = undefined
    }
    if (loop.length > 3 && key(loop[loop.length - 1]) === key(loop[0])) loops.push(loop.slice(0, -1))
  }
  return loops
}

/** The largest-area silhouette loop (the blank outline). */
export function outerSilhouette(polygons: Pt[][]): Pt[] {
  const loops = silhouetteLoops(polygons)
  let best: Pt[] = []
  let bestArea = -1
  for (const loop of loops) {
    const area = Math.abs(signedArea(loop))
    if (area > bestArea) {
      bestArea = area
      best = loop
    }
  }
  return best
}

/**
 * Offset a simple polygon outward by d (mm), miter joins. The loop is
 * normalised to positive signed area first; in the abstract plane the
 * outward normal of a directed edge (dx, dy) is then (dy, −dx)/len.
 * Rounded corners in the source are approximated by their chords — the
 * bleed outline is a production guide, not a cutting path.
 */
export function offsetPolygon(loop: Pt[], d: number): Pt[] {
  let poly = loop
  if (signedArea(poly) < 0) poly = [...poly].reverse()
  const n = poly.length
  const normals: Pt[] = []
  for (let i = 0; i < n; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % n]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    normals.push({ x: dy / len, y: -dx / len })
  }
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const v = poly[i]
    const n1 = normals[(i - 1 + n) % n]
    const n2 = normals[i]
    const denom = 1 + n1.x * n2.x + n1.y * n2.y
    let ox = d * n1.x
    let oy = d * n1.y
    if (Math.abs(denom) >= 1e-6) {
      ox = (d * (n1.x + n2.x)) / denom
      oy = (d * (n1.y + n2.y)) / denom
    }
    // clamp the miter to 2× the offset: at tight steps in the outline
    // (flap roots, dust-flap junctions) an unclamped miter shoots a long
    // spike past the neighbouring offset edge; the clamp turns it into a
    // short bevel. The bleed outline is a guide, not a cutting path.
    const len = Math.hypot(ox, oy)
    const maxLen = 2 * d
    if (len > maxLen) {
      ox = (ox / len) * maxLen
      oy = (oy / len) * maxLen
    }
    out.push({ x: v.x + ox, y: v.y + oy })
  }
  return out
}

/** Points along a semicircle from angle a0 to a1 (degrees), for notches/arcs. */
export function arcPoints(cx: number, cy: number, r: number, a0: number, a1: number, steps: number): Pt[] {
  const pts: Pt[] = []
  for (let i = 0; i <= steps; i++) {
    const a = ((a0 + ((a1 - a0) * i) / steps) * Math.PI) / 180
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) })
  }
  return pts
}
