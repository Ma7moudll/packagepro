// M8-H: versioned design snapshots — schemaVersion + resolved-geometry manifest.
//
// A `DielineBlueprint` alone is not reproducible history: it is a template that
// resolves against *current* dims, and seed changes silently alter what a saved
// design later re-opens as. M8-H persists a resolved-geometry snapshot so reopen
// is deterministic even after blueprint edits (AMENDMENT 5 — the manifest
// snapshots resolved geometry, not files, and saving never requires an export).
//
//   designData = {
//     schemaVersion: 2,
//     manifestSource: "blueprint" | "migrated",
//     reproducibility: "exact" | "best_effort",
//     manifest: { product, variant, faces, zones, prepress, dieline? },
//     ...state,                                  // full DesignCoreState, top-level
//   }
//
// The state fields stay top-level in the v2 payload so M7 consumers (e.g. the
// m7-e traceability contract reading `savedDesign.product` / `layers` directly
// off designData) are untouched — the envelope is additive only.
//
// Provenance (AMENDMENT 3): M8-native saves write `blueprint`/`exact`. Legacy v1
// blobs (no schemaVersion) keep `migrated`/`best_effort` even when a blueprint
// happens to be present — the historical geometry was never recorded, so
// exactness is never claimed. A fresh design with no blueprint is also
// `best_effort`: without a blueprint there is nothing to reproduce exactly.
//
// Pure module (no "use client"): unit-testable with the Node test runner;
// imported only by storage.ts. Never a duplicate geometry model — the resolve
// layer (M8-C/D/E, resolve-dieline.ts) is the single source of resolved geometry.

import { resolveDieline, selectEffectiveDieline } from "../geometry/resolve-dieline.ts"
import { checkOverlaps, DIELINE_SERIALIZER_VERSION } from "./dieline-service.ts"
import { BLEED_MM, DPI_MIN, SAFE_MM, facePanel, isTwoFaceSheet, mmToPx } from "../geometry/units.ts"
import { unsupportedSheetArtwork } from "../print-coverage.ts"
import type { DielineGeometry, FaceId } from "../../../../shared/types/index.ts"
import type { DesignCoreState, FaceZone } from "../state/types.ts"

export const DESIGN_DATA_SCHEMA_VERSION = 2 as const

export type DesignManifestSource = "blueprint" | "migrated"
export type DesignReproducibility = "exact" | "best_effort"

export interface DesignDataProvenance {
  schemaVersion: number
  manifestSource: DesignManifestSource
  reproducibility: DesignReproducibility
}

export interface DesignManifestPrepress {
  bleedMm: number
  safeMm: number
  dpiMin: number
  caliperMm?: number
  fluteType?: string
  glueFlapToleranceMm?: number
}

export interface DesignManifest {
  product: { id: string; slug: string; boxType: string }
  variant: {
    id?: string
    sku?: string
    dimensions: { length: number; width: number; height: number; unit: "mm" }
  }
  /** Resolved face extents (mm), keyed by canonical FaceId. */
  faces: Record<string, { w: number; h: number }>
  /** M7 required-zone snapshot (face key → zones). */
  zones: Record<string, FaceZone[]>
  /** Prepress baseline snapshot (mm). */
  prepress: DesignManifestPrepress
  /** Full resolved dieline snapshot — paths + faceRelationships. Absent when legacy migration cannot reconstruct. */
  dieline?: DielineGeometry
  /**
   * Panel-overlap pairs in the resolved blueprint geometry at the saved
   * dimensions, when any exist (a blueprint whose own authored layout
   * overlaps resolves with that overlap at its authored size). Recording
   * the pairs keeps the defect explicit in the saved record instead of
   * presenting the geometry as clean. Absent when the resolved layout is
   * coherent (and for no-blueprint designs, which carry no snapshot).
   */
  dielineOverlaps?: { a: string; b: string }[]
  /**
   * Present only when `dieline` is a STORED snapshot re-emitted verbatim
   * because the engine could not freshly resolve geometry at save time
   * (see serializeDesignData). Absent for freshly resolved snapshots, so
   * consumers can always tell stored geometry from computed geometry.
   */
  dielineSource?: "stored-snapshot"
  /**
   * Version of the canonical SVG serializer (see DIELINE_SERIALIZER_VERSION
   * in dieline-service) whose form this snapshot's geometry corresponds
   * to. Stamped when a fresh snapshot is written; preserved verbatim when
   * a stored snapshot is re-emitted. Absent on envelopes saved before
   * serializer versioning existed — those are version 1 by definition.
   * The record identifies the producing serializer for this save only:
   * it does not prove a previously delivered artifact's bytes are
   * unchanged, and it is not certification evidence for historical
   * artifacts (that recertification question is open).
   */
  dielineSerializerVersion?: number
  /**
   * Set when a two-face sheet design carries artwork on inside faces its
   * preview does not support. The artwork stays in the saved design data;
   * this flag is what stops a proof or export from looking complete —
   * proof generation refuses flagged designs until the user resolves it.
   */
  unsupportedArtwork?: { faces: string[]; layerCount: number; product?: "stand_up_pouch" | "frosted_ziplock_bag" | "menu_card" }
}

export interface DesignDataV2 {
  schemaVersion: typeof DESIGN_DATA_SCHEMA_VERSION
  manifestSource: DesignManifestSource
  reproducibility: DesignReproducibility
  manifest: DesignManifest
  [key: string]: unknown
}

export interface DeserializedDesignData {
  state: DesignCoreState
  provenance: DesignDataProvenance
  manifest?: DesignManifest
}

const LEGACY_PROVENANCE: DesignDataProvenance = {
  schemaVersion: 1,
  manifestSource: "migrated",
  reproducibility: "best_effort",
}

/** Canonical F42 face set used for best-effort extents when no blueprint exists. */
const CANONICAL_FACE_IDS: readonly FaceId[] = [
  "front",
  "back",
  "left",
  "right",
  "top",
  "bottom",
  "inside_front",
  "inside_back",
  "inside_left",
  "inside_right",
  "inside_top",
  "inside_bottom",
]

function resolveFaces(state: DesignCoreState, storedGeometry?: DielineGeometry): Record<string, { w: number; h: number }> {
  const faces: Record<string, { w: number; h: number }> = {}
  // A stored snapshot that this save re-emits (see serializeDesignData)
  // supplies the face extents — the saved faces must not be rewritten by
  // fresh resolution or the best-effort reconstruction while the
  // snapshot itself is kept verbatim.
  if (storedGeometry) {
    for (const [faceId, panel] of Object.entries(storedGeometry.panels)) {
      faces[faceId] = { w: panel.w, h: panel.h }
    }
    return faces
  }
  const resolution = resolveDieline(state.product?.dieline, state.model.dimensions)
  if (resolution.ok) {
    for (const [faceId, panel] of Object.entries(resolution.geometry.panels)) {
      faces[faceId] = { w: panel.w, h: panel.h }
    }
    return faces
  }
  // best_effort reconstruction from the canonical face↔axis mapping (mm) — no
  // blueprint present, so this is an approximation, never historical exactness.
  // Scope exception: a two-face sheet (isTwoFaceSheet — the business
  // card's seeded structure, coverage-tolerant) persists exactly front
  // and back, even if a restored face list still carries inside_front /
  // inside_back entries that coverage normalization has not stripped
  // faces — inventing the remaining box faces would persist degenerate
  // 1mm panels for it. EVERY other no-blueprint product keeps the
  // canonical 12-face manifest exactly as before, including boxes
  // carrying a six-face editor list: proof/prepress consumers iterate
  // these keys into plates, so the saved format for boxes does not change.
  const faceIds = isTwoFaceSheet(state.model.faces)
    ? ["front", "back"]
    : CANONICAL_FACE_IDS
  for (const faceId of faceIds) {
    const { w, h } = facePanel(state.model.dimensions, faceId)
    faces[faceId] = { w, h }
  }
  return faces
}

/**
 * Build the v2 design-data envelope for persistence. Provenance is carried from
 * a previous load (state.manifestMetadata) or derived for fresh sessions.
 */
export function serializeDesignData(state: DesignCoreState): DesignDataV2 {
  const resolution = resolveDieline(state.product?.dieline, state.model.dimensions)

  // Stored-snapshot preservation, decided by the SAME effective-geometry
  // selector the display and export paths use (selectEffectiveDieline),
  // so save can never diverge from what the editor shows: when the
  // selector is in historical mode (source "stored" — a restored snapshot
  // for the same product at the same dimensions whose geometry fresh
  // resolution fails to reproduce, or reproduces differently), the
  // snapshot is re-emitted verbatim, marked dielineSource:
  // "stored-snapshot". A geometry-input edit invalidates the carrier in
  // the store before serialize runs, and a dimension edit also falls out
  // of the selector's dims match — either way an edited design is written
  // as a fresh revision, never as the stored snapshot.
  const stored = state.storedDielineSnapshot
  const dims = state.model.dimensions
  const effective = selectEffectiveDieline(resolution, {
    productId: state.product?.id,
    dims,
    stored,
  })
  const storedGeometry = effective.ok && effective.source === "stored" ? effective.geometry : undefined

  const manifestSource: DesignManifestSource =
    state.manifestMetadata?.manifestSource ?? (resolution.ok ? "blueprint" : "migrated")
  // Provenance describes the geometry actually persisted: a carried
  // "exact" survives only when this envelope reproduces geometry exactly
  // (fresh resolution, or the stored snapshot re-emitted verbatim). When
  // neither holds, claiming exact reproducibility would be false.
  const reproducibility: DesignReproducibility =
    state.manifestMetadata?.reproducibility ?? (resolution.ok ? "exact" : "best_effort")
  const effectiveReproducibility: DesignReproducibility =
    reproducibility === "exact" && !resolution.ok && !storedGeometry ? "best_effort" : reproducibility

  // Persist the full state body, but drop the in-memory provenance markers —
  // the envelope (below) is the authority for lineage.
  const stateBody: Record<string, unknown> = { ...state }
  delete stateBody.manifestMetadata
  delete stateBody.storedDielineSnapshot

  const unsupportedArtwork = unsupportedSheetArtwork(state.model.faces, state.layers, state.model.type)
  const manifest: DesignManifest = {
    product: {
      id: state.product?.id ?? "",
      slug: state.product?.slug ?? "",
      boxType: state.product?.boxType ?? "",
    },
    variant: {
      id: state.productConfig?.variantId,
      sku: state.productConfig?.sku,
      dimensions: { length: dims.length, width: dims.width, height: dims.height, unit: "mm" },
    },
    faces: resolveFaces(state, storedGeometry),
    zones: state.zones ?? {},
    prepress: { bleedMm: BLEED_MM, safeMm: SAFE_MM, dpiMin: DPI_MIN, ...(state.product?.prepress ?? {}) },
    ...(resolution.ok && !storedGeometry
      ? { dieline: resolution.geometry, dielineSerializerVersion: DIELINE_SERIALIZER_VERSION }
      : {}),
    ...(resolution.ok
      ? (() => {
          const overlaps = checkOverlaps(resolution.geometry)
          return overlaps.length > 0 ? { dielineOverlaps: overlaps } : {}
        })()
      : {}),
    // Stored snapshot re-emission (see above): the saved geometry and its
    // recorded overlaps survive the resave, explicitly marked as stored.
    // Overlaps recorded at the original save are kept; when the stored
    // envelope predates that field, they are recomputed from the stored
    // geometry itself (never from fresh geometry).
    ...(storedGeometry
      ? {
          dieline: storedGeometry,
          dielineSource: "stored-snapshot" as const,
          // The stored snapshot keeps the serializer version it was saved
          // under (absent = pre-versioning), never the current one.
          ...(stored!.serializerVersion
            ? { dielineSerializerVersion: stored!.serializerVersion }
            : {}),
          ...(() => {
            const recorded =
              stored!.dielineOverlaps && stored!.dielineOverlaps.length > 0
                ? stored!.dielineOverlaps
                : checkOverlaps(storedGeometry)
            return recorded.length > 0 ? { dielineOverlaps: recorded } : {}
          })(),
        }
      : {}),
    // Inside-face artwork on a two-face sheet is preserved in the saved
    // state body above; flag it on the manifest so no consumer (proof,
    // export) can present this design as complete while it is unresolved.
    ...(unsupportedArtwork ? { unsupportedArtwork } : {}),
  }

  return {
    schemaVersion: DESIGN_DATA_SCHEMA_VERSION,
    manifestSource,
    reproducibility: effectiveReproducibility,
    manifest,
    ...stateBody,
  }
}

/** Detect a v2 envelope vs a legacy (v1) raw core-state blob. */
export function isDesignDataV2(data: unknown): data is DesignDataV2 {
  return (
    !!data &&
    typeof data === "object" &&
    (data as Record<string, unknown>).schemaVersion === DESIGN_DATA_SCHEMA_VERSION
  )
}

/**
 * Split a persisted designData blob into its editable state + provenance.
 * v2 envelopes strip the manifest/meta keys; legacy blobs are returned verbatim
 * with `migrated`/`best_effort` provenance.
 */
export function deserializeDesignData(data: unknown): DeserializedDesignData {
  if (isDesignDataV2(data)) {
    const record = data as Record<string, unknown>
    const { schemaVersion, manifestSource, reproducibility, manifest, ...stateBody } = record
    return {
      state: stateBody as unknown as DesignCoreState,
      provenance: {
        schemaVersion: Number(schemaVersion) || DESIGN_DATA_SCHEMA_VERSION,
        manifestSource: (manifestSource as DesignManifestSource) ?? "blueprint",
        reproducibility: (reproducibility as DesignReproducibility) ?? "exact",
      },
      manifest: manifest as DesignManifest | undefined,
    }
  }
  return { state: data as unknown as DesignCoreState, provenance: LEGACY_PROVENANCE }
}

/**
 * Manifest-first restore (deterministic reopen). Dimensions, canvas extent and
 * product identity come from the persisted manifest snapshot — never from the
 * live seed. `blueprint`/`exact` reopens reproduce the saved geometry exactly;
 * `migrated`/`best_effort` reopen is faithful preservation (state is untouched
 * beyond this normalization).
 */
export function normalizeFromManifest(
  state: DesignCoreState,
  manifest?: DesignManifest
): DesignCoreState {
  // Carry the saved dieline snapshot into the restored state (in-memory
  // only) so a later save can re-emit it when the engine cannot freshly
  // resolve at the restored dimensions — see serializeDesignData. The
  // geometry itself is never merged into live panels or re-derived here.
  const snapshot = manifest?.dieline
    ? {
        storedDielineSnapshot: {
          geometry: manifest.dieline,
          ...(manifest.dielineOverlaps ? { dielineOverlaps: manifest.dielineOverlaps } : {}),
          ...(manifest.product?.id ? { productId: manifest.product.id } : {}),
          ...(manifest.dielineSerializerVersion
            ? { serializerVersion: manifest.dielineSerializerVersion }
            : {}),
        },
      }
    : {}
  if (!manifest?.variant?.dimensions) return { ...state, ...snapshot }
  const mDim = manifest.variant.dimensions
  const length = Number(mDim.length) || state.model.dimensions.length
  const width = Number(mDim.width) || state.model.dimensions.width
  const height = Number(mDim.height) || state.model.dimensions.height
  const dims = { length, width, height }
  const panel = facePanel(dims, state.ui.selectedFace)
  return {
    ...state,
    ...snapshot,
    model: { ...state.model, dimensions: dims },
    canvas: { ...state.canvas, width: mmToPx(panel.w), height: mmToPx(panel.h) },
    product:
      manifest.product?.id && manifest.product.slug
        ? ({
            ...(state.product ?? {}),
            id: manifest.product.id,
            slug: manifest.product.slug,
            boxType: manifest.product.boxType || state.product?.boxType,
          } as NonNullable<DesignCoreState["product"]>)
        : state.product,
  }
}