// M8-E: Display-only annotation derivation over canonical `DielineGeometry`.
//
// This module (and its React companion `DielineAnnotations`) is pure
// PRESENTATION. It NEVER fabricates physical geometry: every value below is
// either copied straight from the canonical geometry produced by the frozen
// `buildDieline` engine, derived 1:1 from that data (midpoints, leader
// endpoints, mm labels), or omitted when the canonical source does not contain
// enough information. It calls NO resolution/engine functions.
//
//   - fold angles      → derived from `adjacency` (class "fold") + the owning
//                        FaceId of each canonical `foldPaths` entry
//   - glue-tab leaders → derived from `gluePaths` (endpoint distance in mm)
//   - corner relief    → derived from the flat outline corners; when the
//                        blueprint declares no relief (all current blueprints),
//                        the DERIVED value is 0mm — never an invented radius
//
// All coordinates remain in millimeters; conversions via `units.ts` happen in
// the presentational layer only.

import { flatBounds } from "./dieline.ts"
import type {
  DielineGeometry,
  DielinePanel,
  DielinePoint,
  DielinePath,
  FaceId,
  EdgeName,
} from "../../../../shared/types/index.ts"

/** Presentation-only leader length (mm) from a glue line to its dimension label. */
const LEADER_OFFSET_MM = 14

export interface FoldAngleAnnotation {
  /** Canonical fold path id (from `geometry.foldPaths`). */
  pathId: string
  /** Owning canonical face (the face the fold path belongs to). */
  faceId: FaceId
  /** The face joined across this fold (from `adjacency`). */
  otherFaceId: FaceId
  /** Edge on the owning face (from `adjacency.via`). */
  via: EdgeName
  /** Fold angle in degrees (180 = coplanar, 90 = right angle). */
  angleDeg: number
  /** Display anchor = midpoint of the canonical fold path (mm). */
  at: DielinePoint
}

export interface GlueTabAnnotation {
  /** Canonical glue path id (from `geometry.gluePaths`). */
  pathId: string
  /** Owning canonical face when the path declares one. */
  faceId?: FaceId
  /** Anchor = midpoint of the canonical glue path (mm). */
  at: DielinePoint
  /** Distance between the canonical glue endpoints in mm. */
  lengthMm: number
  /** Formatted mm label, e.g. "70 mm". */
  labelMm: string
  /** Leader line endpoint offset away from the sheet center (mm). */
  leaderTo: DielinePoint
}

export interface CornerAnnotation {
  /** 0..3 starting top-left, clockwise. */
  index: number
  /** Flat-outline corner position (mm). */
  at: DielinePoint
  /** Derived relief — 0mm when no relief is declared in canonical data. */
  radiusMm: number
  /** Formatted relief label, e.g. "R0". */
  reliefLabel: string
  /** Canonical faces whose boundary passes through this corner. */
  faceIds: FaceId[]
}

/** Product-axis of a face — used only to classify fold angles. */
type Axis = "length" | "width" | "height"

const FACE_AXIS: Record<FaceId, Axis> = {
  front: "width",
  back: "width",
  left: "length",
  right: "length",
  top: "height",
  bottom: "height",
  inside_front: "width",
  inside_back: "width",
  inside_left: "length",
  inside_right: "length",
  inside_top: "height",
  inside_bottom: "height",
}

/** Fold angle between two canonical faces: 180 (coplanar) or 90. */
export function foldAngleDeg(a: FaceId, b: FaceId): number {
  const axisA = FACE_AXIS[a]
  const axisB = FACE_AXIS[b]
  if (axisA === undefined || axisB === undefined) return 90
  return axisA === axisB ? 180 : 90
}

/** One-decimal mm formatting, no trailing ".0" (e.g. 70 → "70"). */
export function formatMm(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
}

function onVerticalBoundary(panel: DielinePanel, pt: DielinePoint): boolean {
  const right = panel.x + panel.w
  const bottom = panel.y + panel.h
  return (
    (pt.x === panel.x || pt.x === right) &&
    pt.y >= panel.y &&
    pt.y <= bottom
  )
}

function onHorizontalBoundary(panel: DielinePanel, pt: DielinePoint): boolean {
  const right = panel.x + panel.w
  const bottom = panel.y + panel.h
  return (
    (pt.y === panel.y || pt.y === bottom) &&
    pt.x >= panel.x &&
    pt.x <= right
  )
}

/** True when `pt` lies exactly on the canonical panel boundary (mm-equality). */
function boundaryContains(panel: DielinePanel, pt: DielinePoint): boolean {
  return onVerticalBoundary(panel, pt) || onHorizontalBoundary(panel, pt)
}

function pathMidpoint(points: DielinePoint[]): DielinePoint {
  const first = points[0]
  const last = points[points.length - 1]
  return { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 }
}

function pathLengthMm(points: DielinePoint[]): number {
  const first = points[0]
  const last = points[points.length - 1]
  return Math.hypot(last.x - first.x, last.y - first.y)
}

function boundsMidpoint(geometry: DielineGeometry): DielinePoint {
  const b = flatBounds(geometry)
  return { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2 }
}

/** Leader endpoint offset away from the sheet center (mm). */
function offsetAwayFrom(point: DielinePoint, center: DielinePoint): DielinePoint {
  const dx = point.x - center.x
  const dy = point.y - center.y
  const len = Math.hypot(dx, dy)
  if (len === 0) return { x: point.x, y: point.y - LEADER_OFFSET_MM }
  const ux = dx / len
  const uy = dy / len
  return {
    x: point.x + ux * LEADER_OFFSET_MM,
    y: point.y + uy * LEADER_OFFSET_MM,
  }
}

/**
 * Fold-angle markers for every canonical fold path. Each entry is tied to the
 * path id / FaceId it is derived from. Unmatched or non-canonical folds are
 * skipped rather than being assigned a guessed angle.
 */
export function deriveFoldAngleAnnotations(
  geometry: DielineGeometry,
): FoldAngleAnnotation[] {
  const result: FoldAngleAnnotation[] = []
  for (const path of geometry.foldPaths) {
    const matched = matchAdjacencyForPath(geometry, path)
    if (!matched) continue
    const faceId = path.faceId ?? matched.a
    const otherFaceId = path.faceId === matched.a ? matched.b : matched.a
    result.push({
      pathId: path.id,
      faceId,
      otherFaceId,
      via: matched.via,
      angleDeg: foldAngleDeg(faceId, otherFaceId),
      at: pathMidpoint(path.points),
    })
  }
  return result
}

function matchAdjacencyForPath(
  geometry: DielineGeometry,
  path: DielinePath,
): { a: FaceId; b: FaceId; via: EdgeName } | undefined {
  const p0 = path.points[0]
  const p1 = path.points[path.points.length - 1]
  for (const adj of geometry.adjacency) {
    if (adj.class !== "fold") continue
    const panelA = geometry.panels[adj.a]
    const panelB = geometry.panels[adj.b]
    if (!panelA || !panelB) continue
    if (
      boundaryContains(panelA, p0) &&
      boundaryContains(panelA, p1) &&
      boundaryContains(panelB, p0) &&
      boundaryContains(panelB, p1)
    ) {
      return { a: adj.a, b: adj.b, via: adj.via }
    }
  }
  return undefined
}

/**
 * Glue-tab leader lines + mm distance labels for every canonical glue path.
 * The displayed distance is the canonical endpoint distance — never invented.
 */
export function deriveGlueTabAnnotations(
  geometry: DielineGeometry,
): GlueTabAnnotation[] {
  const center = boundsMidpoint(geometry)
  return geometry.gluePaths.map((path) => {
    const at = pathMidpoint(path.points)
    const lengthMm = pathLengthMm(path.points)
    return {
      pathId: path.id,
      faceId: path.faceId,
      at,
      lengthMm,
      labelMm: `${formatMm(lengthMm)} mm`,
      leaderTo: offsetAwayFrom(at, center),
    }
  })
}

/**
 * Corner / relief annotations derived from the flat outline. Blueprints do not
 * declare a relief value, so the derived relief is 0mm ("R0") and the marker
 * stays tied to the canonical outline corners and any faces touching them.
 */
export function deriveCornerAnnotations(
  geometry: DielineGeometry,
): CornerAnnotation[] {
  const b = flatBounds(geometry)
  const corners: DielinePoint[] = [
    { x: b.x0, y: b.y0 },
    { x: b.x1, y: b.y0 },
    { x: b.x1, y: b.y1 },
    { x: b.x0, y: b.y1 },
  ]
  return corners.map((at, index) => ({
    index,
    at,
    radiusMm: 0,
    reliefLabel: `R${formatMm(0)}`,
    faceIds: Object.values(geometry.panels)
      .filter((panel) => boundaryContains(panel, at))
      .map((panel) => panel.faceId),
  }))
}