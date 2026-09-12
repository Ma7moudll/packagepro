# M8-H Report — Persistence & Reproducibility

**Commit:** `(pending)` — "M8-H persistence manifest and lifecycle save gate"
**Scope:** DESIGN-EDITOR §13 (M8-H) / M8_PLAN.md milestone H. A versioned
design-data envelope (`schemaVersion: 2`) carrying a **resolved-geometry
manifest** (product / variant / dims mm / faces / zones / prepress / optional
dieline incl. paths + `faceRelationships`) with provenance
(`manifestSource` `"blueprint"`|`"migrated"`, `reproducibility`
`"exact"`|`"best_effort"`), plus a backend lifecycle save gate (DRAFT-only).
Parent commit: `c0eb1e7` (M8-G).

---

## 1. Status

COMPLETE. Every save from the catalog editor persists a v2 envelope whose
`manifest` is a snapshot of **resolved geometry** (the M8-C/D/E `resolveDieline`
output), so reopen is deterministic even after blueprint edits (AMENDMENT 5).
Legacy v1 blobs migrate honestly as `migrated`/`best_effort` with artwork
preserved and zero exactness claims. The manifest is saved with the design and
**never** gated on an export artifact. A backend save gate rejects writes to
non-DRAFT sessions (AC4).

## 2. Exact scope

- **Envelope** (`frontend/lib/editor/services/dieline-manifest.ts`, pure module):
  ```
  designData = {
    schemaVersion: 2,
    manifestSource: "blueprint" | "migrated",
    reproducibility: "exact" | "best_effort",
    manifest: { product, variant{dimensions{…,unit:"mm"}}, faces, zones,
                prepress{bleedMm,safeMm,dpiMin,…product.prepress}, dieline? },
    …state,          // full DesignCoreState — top-level (M7 contract intact)
  }
  ```
  - `serializeDesignData(state)` — builds the manifest from `resolveDieline`
    (faces = resolved panels; `dieline` snapshot incl. cut/fold/score/glue/perf/
    outline + `faceRelationships`). No blueprint → best-effort faces from the
    canonical F42 face↔axis mapping (`facePanel`), `dieline` omitted.
    Provenance: carried from `state.manifestMetadata` (a previous load) or
    derived (`resolution.ok ? blueprint/exact : migrated/best_effort`). The
    in-memory marker is dropped from the persisted body.
  - `deserializeDesignData` — v2 splits envelope/meta from state returning
    state + provenance + manifest; **legacy blobs (no `schemaVersion`) return
    the state verbatim with `migrated`/`best_effort`** (AMENDMENT 3: historical
    geometry was never recorded → exactness never claimed).
  - `normalizeFromManifest` — manifest-first reopen: dims + canvas
    (`mmToPx(facePanel(dims, selectedFace))`) + product id/slug/boxType come
    from the persisted manifest, never the live seed.
- **Type model** (`state/types.ts`): `DesignCoreState.product.prepress?`
  (`caliperMm`/`fluteType`/`glueFlapToleranceMm`) and
  `manifestMetadata?` (`schemaVersion`/`manifestSource`/`reproducibility`);
  `initFromEditorConfig` carries `product.prepress` into core and clears the
  marker.
- **Storage wiring** (`storage.ts`): `ensureCloudSession` saves
  `serializeDesignData(state)`; `loadDesignFromCloud` runs
  `deserializeDesignData` → `normalizeFromManifest` → returns
  `{…restored, manifestMetadata: provenance}`.
- **Lifecycle save gate** (`backend/src/modules/designs/design.service.ts`):
  on update, load the design and reject non-DRAFT via
  `DesignLifecycleService.isEditableState` with
  `400 'Cannot save design in <STATE> status. Only DRAFT designs can be edited.'`
  — the client surfaces the message; no clobbering, no route change.
- **Tests** (unit, integration, e2e) detailed in §6–§8.

## 3. Files changed

| File | Change |
| --- | --- |
| `frontend/lib/editor/services/dieline-manifest.ts` | **New.** Envelope + manifest builder/deserializer + manifest-first normalize (Appendix A–F below, semantics in §5). |
| `frontend/lib/editor/state/types.ts` | `DesignCoreState.product.prepress?`, `manifestMetadata?`. |
| `frontend/lib/editor/state/store.ts` | `initFromEditorConfig` carries `product.prepress` into core + clears `manifestMetadata`. |
| `frontend/lib/editor/services/storage.ts` | Cloud save = `serializeDesignData(state)`; cloud load = `deserializeDesignData` → `normalizeFromManifest` → provenance marker. |
| `backend/src/modules/designs/design.service.ts` | DRAFT-only save gate (AC4). |
| `backend/src/modules/designs/design.save-gate.integration.test.ts` | **New.** 2 vitest+Prisma integration tests. |
| `frontend/tests/m8-h-persistence.test.ts` | **New.** 8 unit tests (A–H). Reuses seed fixture F42 115×70×38 (`custom-mailer-box`). |
| `frontend/e2e/m8-h-persistence.spec.ts` | **New.** 4 serial Playwright tests (A–D) against real Postgres. |
| `frontend/e2e/db.ts` | **New helpers:** `findDesignLifecycle`, `updateDesignLifecycle`, `insertLegacyDesignRow`, `deleteDesignBySession`. |
| `.specify/specs/029-design-editor/M8_H_REPORT.md` | **New** (this report). |

Unchanged (frozen): `resolve-dieline.ts`, `dieline.ts`, `units.ts` (incl.
`PX_PER_MM=3`, `mmToPx`, `facePanel`, `BLEED_MM`/`SAFE_MM`/`DPI_MIN`), shared
types (`DielineGeometry`), backend Prisma/seed, `exportDesign*` path.

## 4. Architecture before / after

Before (M7/M8-G): the editor saved raw core state (`designData` = unversioned
JSON). A `DielineBlueprint` alone is **not** reproducible history — it resolves
against *current* dims, and a future seed edit silently changes what a saved
design reopens as. Nothing recorded resolved geometry, provenance, or the
lifecycle boundary at write time.

After (M8-H):

```
history.present (DesignCoreState) ──▶ serializeDesignData            ──▶ POST /designs/save
                                            │ schemaVersion 2           backend gate: DRAFT-only (AC4)
                                            │ manifest (resolved)       durable designs.designData
                                            ▼
                                   loadDesignFromCloud ◀── GET /designs/session/:id
                                   deserializeDesignData → normalizeFromManifest
                                   manifest-first reopen (dims/canvas/product from snapshot)
                                   provenance rides into manifestMetadata → next save keeps lineage
```

The envelope is **additive**: state stays top-level so M7 consumers (m7-e reads
`designData.product`/`productConfig`/`zones`/`layers`) are untouched — verified
at unit and e2e level (§6, §8). The manifest is independent of export: saving
never requires an export artifact, and the manifest is stored with the design.

## 5. Semantics

- **Provenance rules (AMENDMENT 3):**
  - M8-native save with a blueprint → `blueprint`/`exact`.
  - Fresh design without a blueprint → `migrated`/`best_effort` (nothing to
    reproduce exactly).
  - Legacy v1 blob re-saved → `migrated`/`best_effort` even when a blueprint is
    present in the state; the restored `dieline` snapshot is *present-resolved*,
    exactness is still not claimed.
- **`resolveFaces`:** resolved `panels` when a blueprint resolves; otherwise the
  canonical 12-face mapping (`facePanel`) — an approximation, never exactness.
- **`prepress`:** baseline `BLEED_MM`/`SAFE_MM`/`DPI_MIN` snapshotted per save,
  overlaid with `product.prepress` (caliper/flute/tolerance).
- **Manifest-first reopen:** dims (`manifest.variant.dimensions`, mm), canvas
  extent (`mmToPx(facePanel(dims, ui.selectedFace))`), and product identity
  id/slug/boxType all derive from the persisted manifest, not the live seed.

## 6. Unit tests (`npm run test:units`)

**60 passed / 0 failed** (52 pre-existing + 8 new M8-H). New suite
`tests/m8-h-persistence.test.ts` (fixture = seed `MAILER_DIELINE_TEMPLATE`
F42 115×70×38):

- **A** v2 envelope written: `blueprint`/`exact`.
- **B** manifest faces == resolved panels; dieline snapshot `deepEqual`s the
  resolved geometry; spot dims front 115×38 / top 115×70 / left 70×38; dieline
  counts cut=9 / fold=5 / glue=5; `faceRelationships > 0`; prepress
  bleed 3 / safe 5 / dpi 300 / caliper 0.5.
- **C** legacy layers preserved under `migrated`/`best_effort` re-serialize.
- **D** mutated dims 999 + blueprint outline `{500,500}` → normalize restores
  115×70×38, canvas 345×114, product id/slug; re-serialize manifest faces equal.
- **E** provenance round-trips (`{schemaVersion:2, blueprint, exact}`).
- **F** state stays top-level (`product`/`productConfig`/`zones`/`layers`
  `deepEqual`); envelope refactor is additive.
- **G** manifest independence: UI/layer noise ignored → deterministic output.
- **H** no-blueprint → `migrated`/`best_effort`; faces
  `{115,38}/{115,70}/{70,38}/{115,38}`; dieline omitted.

## 7. Backend integration tests (`npx vitest run src/modules/designs/design.save-gate.integration.test.ts`)

Full backend suite: **8 files / 67 tests pass**. The gate suite (vitest +
Prisma + AppError, auto-cleanup by sessionId):

- **A/C** DRAFT save persists the v2 envelope (schemaVersion 2 /
  blueprint / exact / `manifest.faces.front {115,38}` / `manifest.dieline`
  truthy / top-level `layers`+`product` intact).
- **B** SUBMITTED session 400s with `Cannot save design in SUBMITTED status`
  and `designData` untouched (SUBMITTED set via `prisma.design.update`, restored
  afterwards).

## 8. E2E (Playwright, real Postgres) — `e2e/m8-h-persistence.spec.ts`

**4 passed** (`npx playwright test e2e/m8-h-persistence.spec.ts`):

- **A** save → DB `designData`: schemaVersion 2 / blueprint / exact;
  `manifest.faces.front {w:115,h:38}`; `manifest.dieline` present with
  `cutPaths` + `faceRelationships`; prepress `{bleedMm:3,safeMm:5,dpiMin:300}`;
  top-level `product`/`productConfig`/`layers` intact.
- **B** manifest-first reopen (`?sessionId` only, no catalog) → canvas
  345×114 px; re-save yields an **identical** manifest (reproducible, seed
  independent — AMENDMENT 5; the manifest is stored with the design, no export).
- **C** DB-set `SUBMITTED` → real `POST /designs/save` → **400** with
  `Cannot save design in SUBMITTED status`; persisted `designData` untouched;
  DRAFT restored afterwards.
- **D** faithful legacy v1 blob (live core-state synthesized pre-envelope) →
  load renders, artwork survives, re-save → v2 `migrated`/`best_effort`;
  faces front/top/left/back `{115,38}/{115,70}/{70,38}/{115,38}`; the
  present-day blueprint resolves into a dieline snapshot while exactness stays
  unclaimed (AMENDMENT 3 nuance).

**M7 contract regression (the envelope must not break traceability):**
`npx playwright test e2e/m7-e-traceability.spec.ts` → **5/5 pass**, including
test E which reads top-level `designData.product` / `productConfig` / `zones` /
`layers` off the now-v2 envelope.

## 9. Typecheck & build

- Frontend `npx tsc --noEmit` — clean (0 errors).
- Backend `npm run build` (tsc) — clean.
- (Full Next.js/production build was exercised by the Playwright preflight
  `npm run build` on both servers for every e2e run above.)

## 10. Design-governance compliance

- **No new test layer**: backend follows the existing vitest + Prisma
  integration pattern (no supertest / fastify.inject); frontend units use the
  `node --test --experimental-strip-types` runner; e2e reuses
  `loginViaApi`/`attachQaListeners`/`waitForEditor`/`editorState` + the
  `db.ts` helper pattern from M7-E.
- **White-glove typing**: `DesignCoreState` gains only optional fields; the
  editor init path (pure `EditorConfig`) is untouched; the "C2 flow" `type `
  import-modifier discipline in frontend tests is preserved.
- **Frozen geometry core**: `resolve-dieline.ts`/`dieline.ts`/`units.ts` and
  `shared/types` are read-only inputs; the manifest module is a pure consumer,
  never a duplicate geometry model.
- No new npm packages.

## 11. Commit hash

`(pending)` — single focused commit on parent `c0eb1e7`. Working tree contains
unrelated untracked QA/spec artifacts (`*.REPORT.md` from prior milestones,
`.qa-tmp/`, `QA_REPORT.md`, `frontend/playwright-report/`,
`frontend/test-results/`) that are **not** part of this commit.

## 12. Known limitations

- **`manifest.dieline` is a resolved-geometry snapshot, not a stored facts
  table.** Exact reopen is deterministic because dims/canvas/product come from
  the manifest; full path-level identity (`faceRelationships`) is snapshotted
  for the export layer, but the editor UI always re-renders from the canonical
  geometry model.
- **Legacy migration is preservation, not exact reconstruction.** Best-effort
  faces come from the canonical face↔axis mapping; any historical anomaly that
  the axis map does not cover is lost — which is precisely why
  `best_effort` provenance is asserted, never `exact`.
- **The save gate is lifecycle-only.** A session is editable while DRAFT
  regardless of who owns it; ownership-driven authorization is out of scope
  (M8-H concern is the write boundary after submit/review, per AC4).
- **`exportDesign*` is untouched**: the manifest is written on save and is
  independent of export; export-gated regeneration/consumption of the manifest
  belongs to a later milestone, not M8-H.

## Explicitly NOT performed (M8-H boundary)

Export requires the manifest / export-gated persistence, print-quality
certification (DPI/CMYK/spots/fonts — M8-I), approval/handoff/production gate
wiring beyond the DRAFT save gate, vendor/catalog/webhook integration, catalog
redesign, admin dashboards, offline/cache, 3D folding, and any change to
`dieline.ts`/`units.ts`/`resolve-dieline.ts`/shared types/Prisma/seed. No new
npm packages.