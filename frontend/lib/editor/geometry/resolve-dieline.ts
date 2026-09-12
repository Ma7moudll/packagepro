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
//   - malformed inputs  → { ok:false, reason:"error", error }

import { buildDieline, DielineResolutionError } from "./dieline.ts"
import type {
  DielineBlueprint,
  DielineGeometry,
} from "../../../../shared/types/index.ts"

export type DielineResolution =
  | { ok: true; geometry: DielineGeometry }
  | { ok: false; reason: "no-blueprint" | "error"; error?: string }

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
    return { ok: false, reason: "error", error: message }
  }
}