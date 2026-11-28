// M8-D: single canonical geometry resolution point for the migrated dieline UI.
//
// The store carries the M8-B `DielineBlueprint` passthrough (product.dieline)
// plus ModelDimensions. This module turns that PAIR into mm `DielineGeometry`
// exactly once per resolution site via the M8-C engine — it is never a
// duplicate geometry model. UI components consume the RESULT (`DielineView`)
// and never re-derive panel positions, edge paths, outlines or overlaps
// themselves (cf. M8 ARCHITECTURE GAP AUDIT "no second model").
//
//   - blueprint present → resolution via buildDieline (M8_C §7/§17)
//   - blueprint absent  → { ok:false, reason:"no-blueprint" } — M7 compat
//     products render through the frozen legacy delegate M7DielineFallback
//   - size the blueprint's declared topology/layout cannot support
//                       → { ok:false, reason:"unsupported-size", error } —
//     an explicit, detectable result (NOT the legacy fallback): the UI
//     blocks with a message instead of rendering a wrong net
//   - malformed inputs  → { ok:false, reason:"error", error }

import { buildDieline, canonicalGeometryEquals, DielineResolutionError } from "./dieline.ts"
import type {
  DielineBlueprint,
  DielineGeometry,
} from "../../../../shared/types/index.ts"
import type { StoredDielineSnapshot } from "../state/types.ts"

export type DielineResolution =
  | {
      ok: true
      geometry: DielineGeometry
      /** "stored": the effective geometry is a restored saved snapshot
       *  (historical mode — see selectEffectiveDieline). Absent/"fresh":
       *  geometry was resolved from the current blueprint + dimensions. */
      source?: "fresh" | "stored"
    }
  | { ok: false; reason: "no-blueprint" | "unsupported-size" | "error"; error?: string }

/** Resolve a blueprint + mm dims to canonical geometry (M8-C engine, no-op absent). */
export function resolveDieline(
  blueprint: DielineBlueprint | undefined,
  dims: { length: number; width: number; height: number }
): DielineResolution {
  if (!blueprint) {
    return { ok: false, reason: "no-blueprint" }
  }
  try {
    return { ok: true, geometry: buildDieline(blueprint, dims) }
  } catch (err) {
    const message =
      err instanceof DielineResolutionError
        ? err.message
        : err instanceof Error
          ? err.message
          : String(err)
    if (err instanceof DielineResolutionError && err.code === "unsupported-size") {
      return { ok: false, reason: "unsupported-size", error: message }
    }
    return { ok: false, reason: "error", error: message }
  }
}

/**
 * True when a restored stored snapshot covers this product at these
 * dimensions — the precondition for historical mode. The snapshot's own
 * recorded dims are the authority (they are what was actually saved).
 */
export function storedSnapshotApplies(
  stored: StoredDielineSnapshot | undefined,
  productId: string | undefined,
  dims: { length: number; width: number; height: number }
): boolean {
  if (!stored) return false
  if (stored.productId && productId && stored.productId !== productId) return false
  return (
    Math.abs(stored.geometry.dims.length - dims.length) <= 1e-9 &&
    Math.abs(stored.geometry.dims.width - dims.width) <= 1e-9 &&
    Math.abs(stored.geometry.dims.height - dims.height) <= 1e-9
  )
}

/**
 * THE effective-geometry selector — the single decision every consumer
 * (editor display, SVG export, certified export, save) shares.
 *
 * Historical mode: a restored stored snapshot applies (same product, same
 * dimensions — geometry inputs unchanged since the save) AND the fresh
 * resolution either fails or produces different geometry than the saved
 * snapshot. The persisted snapshot is then the effective geometry,
 * returned with source:"stored", so what is displayed is what is
 * exported is what an unchanged save re-emits. When fresh resolution
 * reproduces the snapshot exactly, the fresh result is used (identical
 * geometry either way). Any geometry-input edit invalidates the carrier
 * in the store before it can reach this selector, so an edited design
 * never selects a stale snapshot.
 */
/**
 * Runtime dieline status for UI indicators, derived from the effective
 * resolution — the same selector result the dieline tab renders from, so
 * a status line can never disagree with the tab:
 *   "fresh"       — geometry resolved from the current blueprint + size
 *   "stored"      — historical mode: stored geometry from an earlier
 *                   version is the effective geometry
 *   "unsupported" — the blueprint cannot resolve at the current size
 *   "unavailable" — resolution failed for another reason
 *   undefined     — no blueprint (no runtime status to report; catalogue
 *                   readiness is the only statement available)
 */
export type DielineRuntimeStatus = "fresh" | "stored" | "unsupported" | "unavailable"

export function dielineRuntimeStatus(resolution: DielineResolution): DielineRuntimeStatus | undefined {
  if (resolution.ok) return resolution.source === "stored" ? "stored" : "fresh"
  if (resolution.reason === "unsupported-size") return "unsupported"
  if (resolution.reason === "error") return "unavailable"
  return undefined
}

export function selectEffectiveDieline(
  fresh: DielineResolution,
  args: {
    productId?: string
    dims: { length: number; width: number; height: number }
    stored?: StoredDielineSnapshot
  }
): DielineResolution {
  const stored = args.stored
  if (stored && storedSnapshotApplies(stored, args.productId, args.dims)) {
    if (!fresh.ok) {
      return { ok: true, geometry: stored.geometry, source: "stored" }
    }
    if (!canonicalGeometryEquals(fresh.geometry, stored.geometry)) {
      return { ok: true, geometry: stored.geometry, source: "stored" }
    }
  }
  return fresh.ok ? { ...fresh, source: "fresh" } : fresh
}