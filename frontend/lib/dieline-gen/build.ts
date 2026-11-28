// Batch R — panel / fold constructors shared by the four generators.

import type { FoldLine, Panel, PanelKind, Pt } from "./types.ts"
import { bbox } from "./geometry.ts"

export const fmt = (n: number): string => {
  const r = Math.round(n * 10) / 10
  return Number.isInteger(r) ? String(r) : r.toFixed(1)
}

export function makePanel(
  id: string,
  name: string,
  kind: PanelKind,
  polygon: Pt[],
  extra?: { hingePanel?: string; group?: string },
): Panel {
  const b = bbox(polygon)
  return {
    id,
    name,
    kind,
    polygon,
    width: b.w,
    height: b.h,
    labelAt: { x: b.minX + b.w / 2, y: b.minY + b.h / 2 },
    dimsLabel: `${fmt(b.w)} × ${fmt(b.h)}`,
    hingePanel: extra?.hingePanel,
    group: extra?.group,
  }
}

export function rectPanel(
  id: string,
  name: string,
  kind: PanelKind,
  x: number,
  y: number,
  w: number,
  h: number,
  extra?: { hingePanel?: string; group?: string },
): Panel {
  return makePanel(
    id,
    name,
    kind,
    [
      { x, y },
      { x: x + w, y },
      { x: x + w, y: y + h },
      { x, y: y + h },
    ],
    extra,
  )
}

export function fold(x1: number, y1: number, x2: number, y2: number, crease: "valley" | "mountain", a: string, b: string, internal = false): FoldLine {
  return { from: { x: x1, y: y1 }, to: { x: x2, y: y2 }, crease, between: [a, b], internal }
}

import type { Dieline } from "./types.ts"

/**
 * Normalise a finished dieline: translate every panel, fold and feature
 * so the blank's bounding box starts at (0, 0), and set blankWidth /
 * blankHeight from the actual geometry. Generators lay out panels from
 * a centre column; attachments that reach further than the column's own
 * side assemblies (pizza dust flaps are the case that bit) would
 * otherwise fall outside the declared blank.
 */
export function finalize(d: Omit<Dieline, "blankWidth" | "blankHeight">): Dieline {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity
  for (const p of d.panels) {
    const b = bbox(p.polygon)
    minX = Math.min(minX, b.minX)
    minY = Math.min(minY, b.minY)
    maxX = Math.max(maxX, b.maxX)
    maxY = Math.max(maxY, b.maxY)
  }
  const dx = -minX
  const dy = -minY
  const shift = (p: Pt): Pt => ({ x: p.x + dx, y: p.y + dy })
  return {
    ...d,
    panels: d.panels.map((p) => ({ ...p, polygon: p.polygon.map(shift), labelAt: shift(p.labelAt) })),
    folds: d.folds.map((f) => ({ ...f, from: shift(f.from), to: shift(f.to) })),
    features: d.features.map((f) => ({ ...f, at: shift(f.at) })),
    blankWidth: maxX - minX,
    blankHeight: maxY - minY,
  }
}
