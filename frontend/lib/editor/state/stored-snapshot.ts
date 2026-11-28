// Stored-snapshot carrier invalidation — the revision boundary for
// historical dieline geometry.
//
// A restored design carries its saved dieline snapshot in memory
// (DesignCoreState.storedDielineSnapshot). While the geometry inputs are
// unchanged, that snapshot is the design's effective geometry (see
// selectEffectiveDieline). An explicit geometry-input edit starts a NEW
// revision: the carrier must die at that commit, so a later change back
// to the old inputs resolves fresh geometry instead of resurrecting the
// old snapshot. Only undo/redo — which restore whole revisions verbatim
// and never pass through this helper — may bring a carrier back.
//
// The rule is deliberately narrow:
//   - the incoming core carries the SAME carrier object as the current
//     present (an edit that spread the previous core), AND
//   - a geometry input actually changed (product, blueprint, box type,
//     model type, material, dimensions).
// A restore installs a NEW carrier object, so it is never stripped here;
// layer/artwork edits change no geometry input, so they keep the
// carrier. Pure and side-effect free: unit-tested directly, wired into
// the store's single history commit (pushToHistory).

import type { DesignCoreState } from "./types.ts"

function geometryInputsChanged(previous: DesignCoreState, next: DesignCoreState): boolean {
  if ((previous.product?.id ?? "") !== (next.product?.id ?? "")) return true
  if ((previous.product?.boxType ?? "") !== (next.product?.boxType ?? "")) return true
  if (JSON.stringify(previous.product?.dieline ?? null) !== JSON.stringify(next.product?.dieline ?? null)) return true
  if (previous.model.type !== next.model.type) return true
  if (previous.model.material !== next.model.material) return true
  const a = previous.model.dimensions
  const b = next.model.dimensions
  return a.length !== b.length || a.width !== b.width || a.height !== b.height
}

/**
 * Return `next` with its stored-snapshot carrier removed when the commit
 * is a geometry-input edit of the revision that carrier belongs to.
 * Returns `next` unchanged in every other case.
 */
export function invalidateStaleStoredSnapshot(
  previous: DesignCoreState,
  next: DesignCoreState
): DesignCoreState {
  const carrier = next.storedDielineSnapshot
  if (!carrier) return next
  if (carrier !== previous.storedDielineSnapshot) return next
  if (!geometryInputsChanged(previous, next)) return next
  const stripped: DesignCoreState = { ...next }
  delete stripped.storedDielineSnapshot
  return stripped
}
