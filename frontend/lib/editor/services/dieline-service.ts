// Dieline Service
//
// M8-C: canonical dieline SERIALIZER over DielineGeometry (M8_SPEC §7/§17):
//   - serializeSVG(geometry)  — mm SVG, <g data-face-id> per faceOrder, per-class
//     styles rendered FROM paths (cut/fold/score/glue/perf + outline)
//   - checkOverlaps(geometry) — real panel-AABB overlap in canonical mm space
//
// The legacy template/design API (static template catalogue + design-asset
// export) was retired with the M7 UI in M8-D — its only consumer, DielineEditor,
// now renders canonical geometry through DielineView. This module is the
// canonical geometry path and nothing else.

import type {
  DielineGeometry,
  DielineOverlap,
  DielinePath,
  DielinePoint,
  FaceId,
  LineClass,
} from "../../../../shared/types/index.ts"
import { flatBounds } from "../geometry/dieline.ts"

const CLASS_ORDER: LineClass[] = ["cut", "fold", "score", "glue", "perf"]

/**
 * Version of the canonical SVG serialization format. Version 1 is the
 * pre-origin-fix form (a "0 0" viewBox that clipped non-zero-origin
 * geometry); version 2 starts the viewBox at the real bounds origin.
 *
 * The version is deliberately NOT stamped into the SVG bytes: for
 * zero-origin geometry the v2 bytes must stay identical to v1 (the
 * certified F42 mailer's recorded geometry hash and the backend's byte
 * comparisons depend on that identity). The version is recorded where
 * records live — on the design record when a snapshot is written
 * (dielineSerializerVersion) and on the certified delivery receipt.
 *
 * Explicit gap: a version record identifies which serializer a SAVE or
 * a DELIVERY was produced under. It does not prove that a previously
 * delivered artifact's bytes are unchanged, and it is not evidence of
 * certification for historical artifacts — that recertification question
 * is open and intentionally not settled here.
 */
export const DIELINE_SERIALIZER_VERSION = 2

const CLASS_STYLE: Record<LineClass, string> = {
  cut: "stroke:#000000;fill:none;stroke-width:0.5",
  fold: "stroke:#666666;fill:none;stroke-width:0.3;stroke-dasharray:4 2",
  score: "stroke:#888888;fill:none;stroke-width:0.3;stroke-dasharray:2 2",
  glue: "stroke:#0a7a7a;fill:none;stroke-width:0.4;stroke-dasharray:6 2",
  perf: "stroke:#990099;fill:none;stroke-width:0.3;stroke-dasharray:1 2",
}

/** Deterministic mm number formatting (3-decimal rounding). */
const fmt = (n: number): string => String(Math.round(n * 1000) / 1000)

/** Deterministic SVG path `d` for a mm polyline. */
function toPathData(path: DielinePath): string {
  const parts = path.points.map(
    (p: DielinePoint) => `${fmt(p.x)} ${fmt(p.y)}`
  )
  if (parts.length === 0) return ""
  let d = `M ${parts[0]}`
  for (let i = 1; i < parts.length; i += 1) d += ` L ${parts[i]}`
  if (path.closed) d += " Z"
  return d
}

/**
 * Serialize resolved geometry to deterministic SVG at mm scale. Coordinates are
 * millimetres (no px factor); groups are keyed by canonical FaceId and match
 * the blueprint faceOrder; every path keeps its semantic LineClass.
 */
export function serializeSVG(geometry: DielineGeometry): string {
  const faces = Object.keys(geometry.panels) as FaceId[]
  const ordered =
    geometry.faceRelationships.length > 0
      ? geometry.faceRelationships.map((r) => r.faceId)
      : faces
  // Single shared bounds helper — the same flatBounds the dieline view
  // uses — so every canonical consumer agrees on the real origin.
  const { x0, y0, x1, y1 } = flatBounds(geometry)
  const width = x1 - x0
  const height = y1 - y0

  const renderPath = (path: DielinePath): string =>
    `<path d="${toPathData(path)}" data-path-id="${path.id}" class="dieline-${path.class}" style="${CLASS_STYLE[path.class]}" />`

  // The viewBox must start at the geometry's real bounds origin: panel
  // positions are absolute (authored layouts sit away from zero, and
  // derived layouts anchor on the root panel), so a "0 0" viewBox clips
  // every point outside the bounds size. Points keep their absolute
  // coordinates; a zero-origin layout serializes exactly as before.
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(width)}" height="${fmt(height)}" viewBox="${fmt(x0)} ${fmt(y0)} ${fmt(width)} ${fmt(height)}">`
  for (const faceId of ordered) {
    const owned: DielinePath[] = []
    for (const cls of CLASS_ORDER) {
      for (const path of geometry[`${cls}Paths`]) {
        if (path.faceId === faceId) owned.push(path)
      }
    }
    svg += `<g data-face-id="${faceId}">`
    for (const path of owned) svg += renderPath(path)
    svg += `</g>`
  }
  svg += `<g data-role="outline">`
  for (const path of geometry.outline) {
    svg += `<path d="${toPathData(path)}" data-path-id="${path.id}" class="dieline-outline" style="stroke:#000000;fill:none;stroke-width:0.3" />`
  }
  svg += `</g>`
  svg += `</svg>`
  return svg
}

/**
 * Real geometry-level overlap detection in canonical mm space. Only physical
 * (non `inside_*`) panels are compared — `inside_*` faces are the reverse side
 * of their outer sibling's material, not a separate physical piece. Touching
 * panels (band edges) are not overlaps.
 */
export function checkOverlaps(geometry: DielineGeometry): DielineOverlap[] {
  const physical: FaceId[] = Object.keys(geometry.panels).filter(
    (id): id is FaceId => !id.startsWith("inside_")
  )
  const overlaps: DielineOverlap[] = []
  for (let i = 0; i < physical.length; i += 1) {
    for (let j = i + 1; j < physical.length; j += 1) {
      const a = geometry.panels[physical[i]]
      const b = geometry.panels[physical[j]]
      const overlapsX = a.x < b.x + b.w && b.x < a.x + a.w
      const overlapsY = a.y < b.y + b.h && b.y < a.y + a.h
      if (overlapsX && overlapsY) {
        overlaps.push({ a: physical[i], b: physical[j] })
      }
    }
  }
  return overlaps
}