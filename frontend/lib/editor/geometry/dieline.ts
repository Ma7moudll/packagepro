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
  /**
   * Machine-readable failure kind. `"unsupported-size"` marks the explicit,
   * detectable result for a blueprint whose declared topology cannot
   * produce a coherent net at the requested dimensions (see buildDieline);
   * it is distinct from a malformed blueprint (`"error"`) and from a
   * missing blueprint (`"no-blueprint"`, which never reaches this class).
   */
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = "DielineResolutionError"
    this.code = code
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
 * `facePanel(dims, faceId)`; positions follow the three-case layout in
 * step 1b below (authored positions at the authored size; fold-derived
 * positions where the declared topology is sufficient; validated legacy
 * positions — or an explicit coded unsupported-size failure — where it
 * is not). The blueprint is trusted input (validated at seed/API, M8-B);
 * a malformed blueprint raises `DielineResolutionError` deterministically.
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

  // 1b) Layout. Three cases, decided by evidence per blueprint and size:
  //
  // (a) AUTHORED SIZE. The blueprint's authored size is derived from its
  //     panel sizes (front/back give L×H, left/right W×H, top/bottom L×W;
  //     all declarations must agree). At that size the authored positions
  //     are used verbatim — the historical behaviour and the compatibility
  //     baseline for every blueprint, sufficient topology or not.
  //
  // (b) SUFFICIENT TOPOLOGY (every fold declaration reciprocal with equal
  //     edge lengths, all physical panels connected): positions are
  //     DERIVED from the fold relationships by walking them from the root
  //     panel (front, anchored at its authored position; inside_* panels
  //     mirror their base panel). Copying authored positions here is what
  //     made nets incoherent at other sizes; the derived layout stays
  //     coherent as dimensions vary, and at the authored size it
  //     reproduces the authored layout (asserted by tests).
  //
  // (c) INSUFFICIENT TOPOLOGY at a non-authored size: the legacy
  //     (authored-position) layout is computed and VALIDATED — no physical
  //     panel overlaps, and every declared adjacency that is realised as a
  //     shared edge in the authored layout must still share an edge.
  //     Sizes that pass keep the existing behaviour exactly (e.g. the
  //     rigid parts layout at smaller sizes). Sizes that fail produce an
  //     explicit unsupported-size result (code "unsupported-size") naming
  //     the failed check — never a silently wrong net. No flap, adjacency,
  //     glue or allowance value is invented in any case.
  const OPPOSITE_EDGE: Record<EdgeName, EdgeName> = {
    top: "bottom",
    bottom: "top",
    left: "right",
    right: "left",
  }
  const edgeLength = (panel: DielineGeometry["panels"][FaceId], edge: EdgeName): number =>
    edge === "top" || edge === "bottom" ? panel.w : panel.h
  const isPlacementFold = (decl: DielineGeometry["panels"][FaceId]["edges"][EdgeName]): boolean =>
    !!decl && decl.class === "fold" && !!decl.to && decl.to !== "glue_flap" && decl.to !== "none"
  const physicalFaces = faces.filter((faceId) => !faceId.startsWith("inside_"))
  const DIMS_TOLERANCE = 1e-6

  // The blueprint's authored size, when its panel sizes agree on one.
  const authoredDims = ((): { length: number; width: number; height: number } | undefined => {
    const axes: Record<"length" | "width" | "height", number[]> = { length: [], width: [], height: [] }
    for (const faceId of physicalFaces) {
      const raw = blueprint.panels[faceId]
      if (faceId === "front" || faceId === "back") { axes.length.push(raw.w); axes.height.push(raw.h) }
      if (faceId === "left" || faceId === "right") { axes.width.push(raw.w); axes.height.push(raw.h) }
      if (faceId === "top" || faceId === "bottom") { axes.length.push(raw.w); axes.width.push(raw.h) }
    }
    const pick = (values: number[]): number | undefined =>
      values.length > 0 && values.every((v) => Math.abs(v - values[0]) <= DIMS_TOLERANCE) ? values[0] : undefined
    const length = pick(axes.length)
    const width = pick(axes.width)
    const height = pick(axes.height)
    return length !== undefined && width !== undefined && height !== undefined ? { length, width, height } : undefined
  })()
  const atAuthoredSize =
    authoredDims !== undefined &&
    Math.abs(dims.length - authoredDims.length) <= DIMS_TOLERANCE &&
    Math.abs(dims.width - authoredDims.width) <= DIMS_TOLERANCE &&
    Math.abs(dims.height - authoredDims.height) <= DIMS_TOLERANCE

  if (!atAuthoredSize) {
    // Topology sufficiency: a specific reason string, or null when the
    // declared fold relationships can position every physical panel.
    let topologyFailure: string | undefined
    for (const faceId of physicalFaces) {
      if (topologyFailure) break
      const panel = panels[faceId]
      for (const edge of EDGE_ORDER) {
        const decl = panel.edges[edge]
        if (!isPlacementFold(decl)) continue
        const to = decl!.to as FaceId
        if (!physicalFaces.includes(to)) {
          topologyFailure = `blueprint fold ${faceId}.${edge} targets ${to}, which is not a physical panel`
          break
        }
        const back = panels[to].edges[OPPOSITE_EDGE[edge]]
        if (!isPlacementFold(back) || back!.to !== faceId) {
          topologyFailure =
            `blueprint fold adjacency is not reciprocal: ${faceId}.${edge} declares a fold to ${to}, ` +
            `but ${to}.${OPPOSITE_EDGE[edge]} does not declare a fold back`
          break
        }
        if (Math.abs(edgeLength(panel, edge) - edgeLength(panels[to], OPPOSITE_EDGE[edge])) > EPSILON) {
          topologyFailure =
            `blueprint fold edge length mismatch: ${faceId}.${edge} is ${edgeLength(panel, edge)}mm but ` +
            `${to}.${OPPOSITE_EDGE[edge]} is ${edgeLength(panels[to], OPPOSITE_EDGE[edge])}mm (partial-edge contact)`
          break
        }
      }
    }

    if (!topologyFailure) {
      // (b) Derive positions from the fold relationships.
      const root: FaceId = physicalFaces.includes("front")
        ? "front"
        : (physicalFaces.find((faceId) => blueprint.faceOrder.includes(faceId)) ?? physicalFaces[0])
      const placed = new Map<FaceId, { x: number; y: number }>()
      placed.set(root, { x: blueprint.panels[root].x, y: blueprint.panels[root].y })
      const queue: FaceId[] = [root]
      while (queue.length > 0 && !topologyFailure) {
        const current = queue.shift() as FaceId
        const currentPos = placed.get(current) as { x: number; y: number }
        const currentPanel = panels[current]
        for (const edge of EDGE_ORDER) {
          const decl = currentPanel.edges[edge]
          if (!isPlacementFold(decl)) continue
          const to = decl!.to as FaceId
          const targetPanel = panels[to]
          let nx = currentPos.x
          let ny = currentPos.y
          if (edge === "right") nx = currentPos.x + currentPanel.w
          if (edge === "left") nx = currentPos.x - targetPanel.w
          if (edge === "bottom") ny = currentPos.y + currentPanel.h
          if (edge === "top") ny = currentPos.y - targetPanel.h
          const existing = placed.get(to)
          if (existing) {
            if (Math.abs(existing.x - nx) > EPSILON || Math.abs(existing.y - ny) > EPSILON) {
              topologyFailure = `blueprint fold layout is inconsistent: ${to} is placed at (${existing.x}, ${existing.y}) and (${nx}, ${ny}) by different fold paths`
              break
            }
          } else {
            placed.set(to, { x: nx, y: ny })
            queue.push(to)
          }
        }
      }
      const unplaced = physicalFaces.filter((faceId) => !placed.has(faceId))
      if (!topologyFailure && unplaced.length > 0) {
        topologyFailure = `blueprint panels are not connected by fold relationships: ${unplaced.join(", ")} cannot be positioned from the declared topology`
      }
      if (!topologyFailure) {
        for (const faceId of faces) {
          if (faceId.startsWith("inside_")) {
            const base = faceId.slice("inside_".length) as FaceId
            const basePos = placed.get(base)
            if (!basePos) {
              topologyFailure = `inside panel ${faceId} has no placed base panel ${base}`
              break
            }
            panels[faceId].x = basePos.x
            panels[faceId].y = basePos.y
          } else {
            const pos = placed.get(faceId) as { x: number; y: number }
            panels[faceId].x = pos.x
            panels[faceId].y = pos.y
          }
        }
      }
      if (!topologyFailure) {
        for (let i = 0; i < physicalFaces.length && !topologyFailure; i += 1) {
          for (let j = i + 1; j < physicalFaces.length; j += 1) {
            if (aabbOverlap(panels[physicalFaces[i]], panels[physicalFaces[j]])) {
              topologyFailure = `derived fold layout overlaps panels ${physicalFaces[i]} and ${physicalFaces[j]}`
              break
            }
          }
        }
      }
    }

    if (topologyFailure) {
      // (c) Validate the legacy layout (panels still carry authored
      // positions at this point) before keeping it.
      let incoherence: string | undefined
      for (let i = 0; i < physicalFaces.length && !incoherence; i += 1) {
        for (let j = i + 1; j < physicalFaces.length; j += 1) {
          if (aabbOverlap(panels[physicalFaces[i]], panels[physicalFaces[j]])) {
            incoherence = `panels ${physicalFaces[i]} and ${physicalFaces[j]} overlap`
            break
          }
        }
      }
      if (!incoherence && authoredDims) {
        // Declared adjacencies realised as shared edges at the authored
        // size must still share an edge at this size.
        const authoredPanels = {} as DielineGeometry["panels"]
        for (const faceId of faces) {
          const raw = blueprint.panels[faceId]
          authoredPanels[faceId] = { faceId, x: raw.x, y: raw.y, w: raw.w, h: raw.h, rotation: raw.rotation, edges: raw.edges }
        }
        const sharesEdge = (
          set: DielineGeometry["panels"],
          a: FaceId,
          b: FaceId
        ): boolean => {
          for (const ea of EDGE_ORDER) {
            const [a1, a2] = edgePoints(set[a], ea)
            for (const eb of EDGE_ORDER) {
              const [b1, b2] = edgePoints(set[b], eb)
              const aHoriz = Math.abs(a1.y - a2.y) <= EPSILON
              const bHoriz = Math.abs(b1.y - b2.y) <= EPSILON
              if (aHoriz !== bHoriz) continue
              if (aHoriz) {
                if (Math.abs(a1.y - b1.y) > EPSILON) continue
                if (Math.min(a2.x, b2.x) - Math.max(a1.x, b1.x) > EPSILON) return true
              } else {
                if (Math.abs(a1.x - b1.x) > EPSILON) continue
                if (Math.min(a2.y, b2.y) - Math.max(a1.y, b1.y) > EPSILON) return true
              }
            }
          }
          return false
        }
        const declaredPairs = new Set<string>()
        for (const faceId of physicalFaces) {
          for (const edge of EDGE_ORDER) {
            const decl = blueprint.panels[faceId].edges[edge]
            if (!decl || !decl.to || decl.to === "glue_flap" || decl.to === "none") continue
            const to = decl.to as FaceId
            if (!physicalFaces.includes(to) || to === faceId) continue
            declaredPairs.add(faceId < to ? `${faceId}|${to}` : `${to}|${faceId}`)
          }
        }
        for (const pair of declaredPairs) {
          const [a, b] = pair.split("|") as [FaceId, FaceId]
          if (sharesEdge(authoredPanels, a, b) && !sharesEdge(panels, a, b)) {
            incoherence = `declared adjacency ${a}~${b} shares an edge at the authored size but not at ${dims.length}x${dims.width}x${dims.height}mm`
            break
          }
        }
      }
      if (incoherence) {
        throw new DielineResolutionError(
          `Unsupported size ${dims.length}x${dims.width}x${dims.height}mm for blueprint "${blueprint.boxType}": ${incoherence}. ` +
            `Topology: ${topologyFailure}. The blueprint resolves at its authored size` +
            (authoredDims ? ` ${authoredDims.length}x${authoredDims.width}x${authoredDims.height}mm` : "") +
            ` and at sizes where its declared layout stays coherent; no layout is generated for this size.`,
          "unsupported-size"
        )
      }
      // Coherent legacy layout: keep the authored positions as they are.
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

/** Canonical deep equality for geometry snapshots (key-order insensitive). */
export function canonicalGeometryEquals(a: DielineGeometry, b: DielineGeometry): boolean {
  const canon = (value: unknown): string =>
    JSON.stringify(value, (_key, v: unknown) => {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        return Object.fromEntries(
          Object.entries(v as Record<string, unknown>).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
        )
      }
      return v
    })
  return canon(a) === canon(b)
}