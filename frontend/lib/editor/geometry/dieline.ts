/**
 * M8-C: canonical dieline geometry engine (M8_SPEC §7, AMENDMENT 1 + 2).
 *
 * `buildDieline(blueprint, dims)` resolves a packaging blueprint into mm
 * `DielineGeometry`:
 *   - semantic `panels` (blueprint positions/rotation/edges + SPEC §7
 *     `facePanel(dims, faceId)` sizing — the ONLY mapping used to size faces),
 *   - physical `cutPaths/foldPaths/scorePaths/gluePaths/perfPaths` (mm
 *     polylines, deduplicated by physical line so shared edges never double),
 *   - a closed `outline` derived from the resolved panels' bounding box
 *     (never copied/hardcoded),
 *   - `adjacency` (face-pair assembly, deduplicated, a<b) and
 *     `faceRelationships` (AMENDMENT 1 — 0..N MeshPartIds, never a new FaceId).
 *
 * Curves are future-capable but not implemented in M8 (AMENDMENT 2). Units are
 * millimeters only; no px factors enter this module.
 */

import { facePanel } from "./units.ts"
import type {
  DielineAdjacencyEntry,
  DielineBlueprint,
  DielineFaceRelationship,
  DielineGeometry,
  DielinePath,
  DielinePoint,
  EdgeName,
  FaceId,
  LineClass,
} from "../../../../shared/types/index.ts"

/** Raised when the blueprint/dims cannot be resolved to valid mm geometry. */
export class DielineResolutionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DielineResolutionError"
  }
}

export interface FlatBounds {
  x0: number
  y0: number
  x1: number
  y1: number
}

export type DielineDims = { length: number; width: number; height: number }

const EDGE_ORDER: EdgeName[] = ["top", "right", "bottom", "left"]
const EPSILON = 1e-9

/** Ordered list of every panel face: faceOrder first, remaining keys sorted. */
function orderedFaceIds(blueprint: DielineBlueprint): FaceId[] {
  const seen = new Set<FaceId>()
  const ordered: FaceId[] = []
  for (const faceId of blueprint.faceOrder) {
    if (!seen.has(faceId)) {
      seen.add(faceId)
      ordered.push(faceId)
    }
  }
  const remaining = Object.keys(blueprint.panels)
    .filter((k): k is FaceId => !seen.has(k as FaceId))
    .sort()
  for (const faceId of remaining) {
    seen.add(faceId)
    ordered.push(faceId)
  }
  return ordered
}

/** Endpoints of a panel rect edge, in flat mm space (rotation is metadata). */
function edgePoints(panel: DielineBlueprint["panels"][FaceId], edge: EdgeName): [DielinePoint, DielinePoint] {
  const { x, y, w, h } = panel
  switch (edge) {
    case "top":
      return [{ x, y }, { x: x + w, y }]
    case "right":
      return [{ x: x + w, y }, { x: x + w, y: y + h }]
    case "bottom":
      return [{ x, y: y + h }, { x: x + w, y: y + h }]
    case "left":
      return [{ x, y }, { x, y: y + h }]
  }
}

/** Canonical key for a physical line (endpoints sorted → shared edges dedupe). */
function lineKey(points: [DielinePoint, DielinePoint]): string {
  const [p1, p2] = [...points].sort((m, n) => m.x - n.x || m.y - n.y)
  return `${p1.x}|${p1.y}|${p2.x}|${p2.y}`
}

/**
 * Resolve the blueprint to mm `DielineGeometry`. Panel sizes come from
 * `facePanel(dims, faceId)`; positions come from the blueprint's authored flat
 * layout. The blueprint is trusted input (validated at seed/API, M8-B); a
 * malformed blueprint raises `DielineResolutionError` deterministically.
 */
export function buildDieline(
  blueprint: DielineBlueprint,
  dims: DielineDims
): DielineGeometry {
  if (!Number.isFinite(dims.length) || !Number.isFinite(dims.width) || !Number.isFinite(dims.height)) {
    throw new DielineResolutionError("dims must be finite numbers")
  }
  if (dims.length <= 0 || dims.width <= 0 || dims.height <= 0) {
    throw new DielineResolutionError("dims must be positive (mm)")
  }
  if (!Number.isFinite(blueprint.schemaVersion) || typeof blueprint.boxType !== "string") {
    throw new DielineResolutionError("blueprint must carry schemaVersion and boxType")
  }
  if (!blueprint.outline || blueprint.outline.w <= 0 || blueprint.outline.h <= 0) {
    throw new DielineResolutionError("blueprint outline must be positive")
  }

  const faces = orderedFaceIds(blueprint)

  // 1) Resolve semantic panels (SPEC §7 sizing + blueprint layout).
  const panels = {} as DielineGeometry["panels"]
  for (const faceId of faces) {
    const raw = blueprint.panels[faceId]
    if (!raw) {
      throw new DielineResolutionError(`panel missing for ${faceId}`)
    }
    if (raw.faceId !== faceId || raw.w <= 0 || raw.h <= 0) {
      throw new DielineResolutionError(`panel invalid for ${faceId}`)
    }
    const size = facePanel(dims, faceId)
    panels[faceId] = {
      faceId,
      x: raw.x,
      y: raw.y,
      w: size.w,
      h: size.h,
      rotation: raw.rotation,
      edges: raw.edges,
    }
  }

  // 2) Edge -> physical mm paths, deduplicated by physical line.
  const byClass: Record<LineClass, DielinePath[]> = {
    cut: [],
    fold: [],
    score: [],
    glue: [],
    perf: [],
  }
  const seenLines = new Set<string>()
  for (const faceId of faces) {
    const panel = panels[faceId]
    for (const edge of EDGE_ORDER) {
      const decl = panel.edges[edge]
      if (!decl) continue
      const pts = edgePoints(panel, edge)
      const key = lineKey(pts)
      if (seenLines.has(key)) continue // shared physical edge — emit once
      seenLines.add(key)
      byClass[decl.class].push({
        id: `${faceId}-${edge}`,
        faceId,
        class: decl.class,
        points: pts,
      })
    }
  }

  // 3) Adjacency — every edge pointing at a FaceId, deduplicated (a<b).
  const adjacencyMap = new Map<string, DielineAdjacencyEntry>()
  for (const faceId of faces) {
    const panel = panels[faceId]
    for (const edge of EDGE_ORDER) {
      const decl = panel.edges[edge]
      if (!decl || !decl.to) continue
      if (decl.to === "glue_flap" || decl.to === "none") continue
      const [a, b] = faceId < decl.to ? [faceId, decl.to] : [decl.to, faceId]
      const key = `${a}|${b}`
      if (!adjacencyMap.has(key)) {
        adjacencyMap.set(key, { a, b, via: edge, class: decl.class })
      }
    }
  }
  const adjacency: DielineAdjacencyEntry[] = [...adjacencyMap.values()]

  // 4) faceRelationships (AMENDMENT 1) — blueprint faces only, no invented ids.
  const faceRelationships: DielineFaceRelationship[] = faces.map((faceId) => ({
    faceId,
    meshPartIds: [`${faceId}_panel`],
  }))

  const bounds = boundsOfPanels(panels)
  const outline: DielinePath[] = [
    {
      id: "outline",
      class: "cut",
      points: [
        { x: bounds.x0, y: bounds.y0 },
        { x: bounds.x1, y: bounds.y0 },
        { x: bounds.x1, y: bounds.y1 },
        { x: bounds.x0, y: bounds.y1 },
      ],
      closed: true,
    },
  ]

  return {
    schemaVersion: blueprint.schemaVersion,
    boxType: blueprint.boxType,
    dims: { length: dims.length, width: dims.width, height: dims.height, unit: "mm" },
    panels,
    cutPaths: byClass.cut,
    foldPaths: byClass.fold,
    scorePaths: byClass.score,
    gluePaths: byClass.glue,
    perfPaths: byClass.perf,
    outline,
    adjacency,
    faceRelationships,
  }
}

/** Bounding box of every panel in the geometry (mm). */
export function boundsOfPanels(
  panels: Record<string, { x: number; y: number; w: number; h: number }>
): FlatBounds {
  let init = false
  let x0 = 0
  let y0 = 0
  let x1 = 0
  let y1 = 0
  for (const key of Object.keys(panels)) {
    const p = panels[key]
    if (!init) {
      x0 = p.x
      y0 = p.y
      x1 = p.x + p.w
      y1 = p.y + p.h
      init = true
    } else {
      x0 = Math.min(x0, p.x)
      y0 = Math.min(y0, p.y)
      x1 = Math.max(x1, p.x + p.w)
      y1 = Math.max(y1, p.y + p.h)
    }
  }
  if (!init) throw new DielineResolutionError("geometry has no panels")
  return { x0, y0, x1, y1 }
}

/** Bounding box of the geometry's resolved panels (mm). */
export function flatBounds(geometry: DielineGeometry): FlatBounds {
  return boundsOfPanels(geometry.panels)
}

/** True when the physical (non-inside) panel AABBs strictly overlap in mm. */
export function aabbOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return (
    a.x < b.x + b.w - EPSILON &&
    b.x < a.x + a.w - EPSILON &&
    a.y < b.y + b.h - EPSILON &&
    b.y < a.y + a.h - EPSILON
  )
}

/** Panel face ids that are physical pieces (inside_* are reverse-side mirrors). */
export function physicalFaceIds(geometry: DielineGeometry): FaceId[] {
  return Object.keys(geometry.panels).filter(
    (id): id is FaceId => !id.startsWith("inside_")
  )
}