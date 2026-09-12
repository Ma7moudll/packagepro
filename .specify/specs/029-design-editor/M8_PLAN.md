# M8 Plan — Milestone-by-Milestone Implementation Plan

**Branch:** design-editor M8 | **Spec:** [M8_SPEC.md](./M8_SPEC.md) | **Source input:** [M8_ARCHITECTURE_GAP_AUDIT.md](./M8_ARCHITECTURE_GAP_AUDIT.md)
**Status:** Approved for planning — no implementation.
**Rule:** Spec/planning only. No source, Prisma, API, dependency, or M7 changes during planning.

Constants ratified by the spec (used verbatim below): `PX_PER_MM=3`, `TEXTURE_PX_PER_MM=5`,
`MM_PER_CM=10`, `DPI_MIN=300`, `BLEED_MM=3`, `SAFE_MM=5`, `ZONE_MATCH_TOLERANCE_MM=5`.

Vertical slice = **`prod-mailer-box`** (the only product with a full `structure` today), referenced in
every milestone as the acceptance target.

---

## M8-A — Physical Geometry Foundation

### Objective
Establish a single canonical mm-unit model and a single workspace px factor; fix the canvas-size
defect in the 2D editor so every later milestone measures real millimeters.

### Why it exists
Audit §6 (four competing px/mm factors, hardcoded `800×600` canvas), §9 (zone px/mm mix), §10
(dead constants groundwork). This is the root-unblocking milestone.

### Dependencies
None (must be first — every later milestone consumes `units.ts`).

### Inputs
- `frontend/components/editor/canvas/DesignCanvas2D.tsx` (hardcoded `width=800,height=600`, ignores `store.canvas`)
- `frontend/components/editor/canvas/ZoneOverlays.tsx` (`scale=3` literal)
- `frontend/lib/editor/state/store.ts` (`* 3` literals, already correct semantics)
- `frontend/lib/editor/services/texture-generator.ts` (`5` px/mm literal)
- `frontend/components/design-editor/validation/DesignValidator.ts` (legacy, `3.779`)

### Outputs
- `frontend/lib/editor/geometry/units.ts` (new): `PX_PER_MM`, `TEXTURE_PX_PER_MM`, `MM_PER_CM`,
  `DPI_MIN`, `BLEED_MM`, `SAFE_MM`, `ZONE_MATCH_TOLERANCE_MM`, `mmToPx`, `pxToMm`, `pixelsAt`, `facePanel`.
- `DesignCanvas2D.tsx`: canvas sized from `store.canvas.width/height`; 800×600 removed.
- `ZoneOverlays.tsx`: `scale` replaced by `mmToPx`; zone rendering proven in mm.
- `store.ts` + `texture-generator.ts`: literals replaced by named constants (no behavior change).
- Legacy `DesignValidator.ts` deleted; its importers redirected to `print-validation.ts` (which M8-F completes).

### Files likely affected
`frontend/lib/editor/geometry/units.ts` (new), `DesignCanvas2D.tsx`, `ZoneOverlays.tsx`, `store.ts`,
`texture-generator.ts`, and any file importing `DesignValidator`.

### Backend impact
None. (No backend file touched.)

### Frontend impact
2D canvas, zone overlays, texture generator, store constants, deletion of legacy validator.

### Persistence impact
None.

### Acceptance Criteria
1. Given F42 mailer front face (`115 × 38`mm), the canvas reports exactly `345 × 114` logical px
   (`Math.round(115×3) × Math.round(38×3)`).
2. Given `PX_PER_MM = 3`, a 3mm bleed box renders exactly 9px wide and 5mm safe exactly 15px.
3. No remaining literal `800`, `600`, `3.779`, or raw `* 3` / `* 5` px scale outside the constants
   module (grep clean except `units.ts`).
4. `mmToPx(115) === 345`, `pxToMm(345) === 115`, `pixelsAt(115, 300) === 1358` (`115×300/25.4 = 1358.27`)`.
5. M7 e2e (`editor-flow`, `m7-c-multiface`) green.

### E2E / tests
- Unit: `units.ts` conversion table (incl. `pixelsAt` rounding).
- E2E: assert `window.__fabricCanvas.getWidth()/getHeight()` matches §1 above for F42 front face.

### Regression
`m7-a…e` + `editor-flow.spec.ts` green.

---

## M8-B — Packaging Blueprint & Dieline Template

### Objective
Make the product blueprint explicit and versioned inside `Product.editorDefaults`, adding the
`dieline` panel template and `prepress` options, so every consumer has one authoritative input.

### Why it exists
Audit §2 (structure coverage/units), §4 (single authority), §5 (face dims naming), §12 (no dieline
options model). Resolves competing geometry sources by declaring the blueprint the source of truth.

### Dependencies
M8-A (units/versioning constants that the blueprint records).

### Inputs
- `backend/prisma/seed.ts` (`MAILER_BOX_STRUCTURE`; write a `MAILER_DIELINE_TEMPLATE`)
- `backend/src/modules/catalog/catalog.service.ts` `getEditorConfig` (pass-through of blueprint fields)
- `frontend/lib/editor/state/store.ts` `EditorConfigLike` (additive `dieline/schemaVersion/unit`)

### Outputs
- `editorDefaults.schemaVersion = 1`, `editorDefaults.unit = "mm"`.
- `editorDefaults.dieline` for mailer: `faceOrder`, `panels` (mm), `outline`, per-edge `LineClass`
  (cut/fold/score/glue), fold adjacency, glue flaps — shape per M8_SPEC §7.
- `editorDefaults.prepress = { caliperMm, fluteType, glueFlapToleranceMm }`.
- `getEditorConfig` returns `dieline` + `schemaVersion` + `unit` additively.
- Store: `EditorConfigLike` extended; `initFromEditorConfig` tolerates missing `dieline` (fallback).

### Files likely affected
`backend/prisma/seed.ts`, `backend/src/modules/catalog/catalog.service.ts`,
`frontend/lib/editor/state/store.ts`.

### Backend impact
JSON-only. Seed data + response fields added; no route/shape removals.

### Frontend impact
Store init path (additive optional fields).

### Persistence impact
None yet (manifest snapshot arrives in M8-H; blueprint itself is seed data).

### Acceptance Criteria
1. `GET /catalog/custom-mailer-box/editor-config` returns `product.structure.faces.front` =
   `{w:115,h:38}`, `dieline.schemaVersion=1`, `dieline.panels.top` = `{w:115,h:70}`, `unit:"mm"`.
2. Every dieline edge carries a `LineClass`; every non-gluing panel edge references a `FaceId`, `glue_flap`,
   or `none`.
3. Products without a `dieline` still load in the editor via the current fallback (12-default faces).

### E2E / tests
- Integration (Supertest): editor-config response fields.
- Unit: DielineBlueprint typeguard; edge adjacency completeness for mailer.

### Regression
`m7-b-routes.spec.ts`, `m7-editor-catalog.spec.ts` green.

---

## M8-C — Canonical Dieline Geometry Engine

### Objective
Produce the canonical mm-space dieline from the blueprint as **data**: semantic panels plus physical
cut/fold/score/glue/perf **paths** (first-class geometry, not rect lists), consumed by 2D overlay, 3D
mesh, and export. Retire the stub `dieline-service.ts` and the `0.5` display mode.

### Why it exists
Audit §3 (dieline capability: non-mm generator + stub service). AMENDMENT 2 makes non-rectangular
dieline geometry representable from the start.

### Dependencies
M8-B (blueprint template to consume).

### Inputs
- `frontend/lib/editor/utils/dieline-generator.ts` (refactor to mm; drop 0.5)
- `frontend/lib/editor/services/dieline-service.ts` (stub — replace with serializer)
- `frontend/components/editor/canvas/DielineCanvas.tsx`
- `frontend/components/editor/panels/DielineEditor.tsx`
- `frontend/lib/editor/geometry/units.ts`

### Outputs
- `frontend/lib/editor/geometry/dieline.ts` (new): `buildDieline(blueprint, dims)` → mm
  `DielineGeometry` =
  - `panels`: semantic face rectangles `{faceId,x,y,w,h,rotation,edges}` (metadata for FaceId/UV resolution)
  - `cutPaths`/`foldPaths`/`scorePaths`/`gluePaths`/`perfPaths`: physical mm polylines (the geometry consumed by 2D/export)
  - `outline` (mm closed path), `faceRelationships` (`faceId → MeshPartId[]`), `panels` mm
  - curves are future-capable (path segments), not required for the mailer slice
- `dieline-generator.ts` re-exported through the engine (or retired).
- `dieline-service.ts` rewritten: `serializeSVG(DielineGeometry)` with `data-face-id` groups,
  per-class styles rendered **from paths**; `checkOverlaps(DielineGeometry)` real (path/panel overlap).
- `DielineCanvas`/`DielineEditor` render only mm geometry; view transform is zoom/pan.

### Files likely affected
`geometry/dieline.ts` (new), `dieline-generator.ts`, `dieline-service.ts`, `DielineCanvas.tsx`,
`DielineEditor.tsx`.

### Backend impact
None.

### Frontend impact
Dieline generator, dieline service, dieline canvas/panel.

### Persistence impact
None (the manifest snapshot of resolved `DielineGeometry` lands in M8-H).

### Acceptance Criteria
1. For F42, `buildDieline` reports `top` panel `115×70` mm and `left` panel `70×38` mm exactly.
2. `cutPaths` only where blueprint says `cut`; `foldPaths` only `fold`/`score`; `gluePaths` only `glue`.
3. **Path capability (AMENDMENT 2):** a fabricated non-rectangular panel (e.g. a hexagonal/circular
   dieline fixture) produces valid `cutPaths` in mm and serializes to a closed SVG path — geometry is
   not limited to panel rectangles.
4. `faceRelationships` maps every `FaceId` to its mesh part ids and contains no invented FaceIds
   (AMENDMENT 1).
5. `serializeSVG` output contains a `<g data-face-id="top">` with millimetre coordinates; groups match
   `faceOrder`.
6. `checkOverlaps` returns non-empty for a fabricated overlapping panel layout, empty for the mailer
   blueprint.
7. Dieline view mode shows panels at mm scale in a mm ruler (zoom-independent).

### E2E / tests
- Unit: engine matrices (panels/paths/edges), serializer, overlap detector, non-rectangular path
  fixture.
- E2E: dieline mode renders; flap count matches blueprint `faceOrder`.

### Regression
`editor-flow.spec.ts` (dieline view), `m7-d-face-picking.spec.ts`.

---

## M8-D — 2D Editor Integration

### Objective
Wire the canonical geometry into the daily 2D editing surface: mm-sized canvas for the selected face,
dieline + zone overlays in mm, consistent layer math.

### Why it exists
Audit §7 (2D geometry: 800×600 + dead export sizing + no overlay), §9 (zones).

### Dependencies
M8-A (units + canvas sizing), M8-C (dieline geometry).

### Inputs
- `DesignCanvas2D.tsx` (canvas sizing + overlay hooks)
- `ZoneOverlays.tsx` (mm-scaled zones from `store.zones` + `BLEED_MM`/`SAFE_MM`)
- `store.ts` (`setSelectedFace` canvas emitters already correct — verify wiring)
- `geometry/dieline.ts` (overlay data)

### Outputs
- Face switching re-sizes the fabric canvas from `store.canvas` (front → `345×114` px for F42).
- Dieline overlay drawn on the work canvas (cut/fold/glue rendered from `buildDieline`), not a
  separate stale surface only.
- ZoneOverlays render `store.zones` at mm→px; bleed/safe overlays measure `BLEED_MM`/`SAFE_MM`.
- `addLayer` centering uses `store.canvas` midpoint (consistent with mm center).

### Files likely affected
`DesignCanvas2D.tsx`, `ZoneOverlays.tsx`, `store.ts` (only wiring).

### Backend impact
None.

### Frontend impact
4 2D canvas, overlays, layer placement math.

### Persistence impact
None (positions remain relative px; semantics now mm-derived).

### Acceptance Criteria
1. Switching to front → canvas `345×114`; switching to top → `345×210` (`115×3 × 70×3`); left → `210×114`.
2. A layer added with default position lands at `store.canvas` midpoint (mm center of the face).
3. With a zone at `position=[57.5,15]`mm, its overlay renders at `[172.5,45]`px.
4. M7-C multi-face spec still passes (per-face art unaffected).

### E2E / tests
- E2E: canvas dims per face; zone overlay px position; screenshot geometry assert.
- Unit: `facePanel` + `mmToPx` integration via store.

### Regression
`m7-c-multiface.spec.ts`, `m7-d-face-picking.spec.ts`, `editor-flow.spec.ts`.

---

## M8-E — 3D Deterministic Mapping & Texture Parity

### Objective
One identity contract across dieline → 2D → mesh → texture for all supported types: `FaceId` =
editor/print identity (canonical 12-set, not expanded), `MeshPartId` = mesh topology ids (unique per
mesh; `faceId → 0..N MeshPartId → mesh → texture`). Fix the mailer flap defect; bind textures for
every box type.

### Why it exists
Audit §8 (3D mapping: only MailerBox binds textures; non-box types lack `userData.faceId`; flaps
report `"top"`; half-size flap UV mismatch). AMENDMENT 1 resolves the FaceId/MeshPartId conflation.

### Dependencies
M8-C (dieline geometry as mesh source).

### Inputs
- `frontend/components/design-editor/models/BoxModels.tsx` (`MailerBox`, `ShippingBox`, `RigidBox`,
  `FoldingCarton`, `PizzaBox`, non-box types)
- `frontend/components/editor/canvas/DesignCanvas3D.tsx` (`getBoxModel`, `useFaceValidity`)
- `frontend/lib/editor/services/texture-generator.ts` (`TEXTURE_PX_PER_MM`)
- `geometry/dieline.ts` (`faceRelationships`)

### Outputs
- Every rendered type assigns `mesh.userData.MeshPartId` from the blueprint-derived topology
  (`top_panel`, `top_flap_a`, `top_flap_b`, …), unique across meshes and NEVER shared by two distinct
  meshes.
- Texture lookup stays keyed by `FaceId`; each mesh resolves `FaceId` via `faceRelationships`
  (`FaceId → MeshPartId[]`). No invented FaceIds are added for flaps/panels (AMENDMENT 1).
- Flap meshes carry their own MeshPartId AND reference the owner face FaceId; flap UV is a sub-region
  of the owner FaceId artwork (texture scaled to flap area, not full-panel).
- All six box types consume `textures` prop (per-face materials).
- Mailer flap fix: flap geometry sized to match the dieline flap panel area so UVs are undistorted.
- Mesh dims from blueprint dims; store `model.dimensions` as fallback.

### Files likely affected
`BoxModels.tsx`, `DesignCanvas3D.tsx`, `texture-generator.ts`.

### Backend impact
None.

### Frontend impact
3D model file, 3D view, texture generator.

### Persistence impact
None.

### Acceptance Criteria
1. For MailerBox, scene-graph inspection shows unique MeshPartIds across all meshes; `faceRelationships`
   maps each canonical FaceId to its panels+flaps; no flap reports `"top"` as its FaceId when it is a
   distinct mesh part (AMENDMENT 1).
2. A flap mesh with a full-width owner-face texture applied renders `top_flap_a` as a sub-region of the
   face artwork (UV area == dieline flap panel area), not a wrongly-perturbed full panel.
3. Picking front/back/left/right/top/bottom (M7-D) opens the matching 2D face and shows the same art;
   picking a flap resolves to its owner FaceId face.
4. `ShippingBox`/`FoldingCarton`/`RigidBox`/`PizzaBox` render face art (texture binding), verified by
   screenshot diff vs untextured baseline.
5. Non-box types without declared structure do NOT fake geometry — they render generic blank or a
   documented deferred placeholder (per §14), with neither invented MeshPartIds nor invented FaceIds.

### E2E / tests
- E2E: scene-graph assertion (unique MeshPartIds + correct FaceId mapping); M7-D suite re-run; texture
  parity screenshots.
- Unit: FaceId↔MeshPartId relationship matrix; flap UV area == dieline panel area for mailer.

### Regression
`m7-d-face-picking.spec.ts` (must stay green), `editor-flow.spec.ts`.

---

## M8-F — Unified Frontend Validation Engine

### Objective
Replace stubbed geometry checks with real bleed/safe/overlap validation in one FE engine — **geometry
only (UX mirror), no authoritative claims**; remove dead constants; delete the legacy validator.

### Why it exists
Audit §9 (px/mm zone bug), §10 (dead `SAFE_MARGIN`/`BLEED_MARGIN`, stub geometry checks, duplicate
legacy path). AMENDMENT 4 draws the FE/BE authority boundary: M8-F never certifies
CMYK/fonts/corruption/DPI — production prepress authority is M8-I only.

### Dependencies
M8-A (mm math), M8-C (mm geometry), M8-H (persisted manifest the FE mirror reads for geometry).

### Inputs
- `frontend/lib/editor/services/print-validation.ts`
- `frontend/components/design-editor/validation/DesignValidator.ts` (legacy, deleted)
- `frontend/components/editor/panels/ValidationPanel.tsx`

### Outputs
- `validatePerFace` fixed: `Math.abs(pxToMm(layerX) - zoneX) <= ZONE_MATCH_TOLERANCE_MM`, six faces,
  `inside_*` via outer sibling fallback.
- Real `checkElementExtendsBeyondBleed` (mm), `checkElementWithinSafeArea` (mm), `checkForOverlaps`
  (true bbox intersection in mm) implemented; verify thresholds are the constants, not stray
  `10`/`4`.
- **Scope guard (AMENDMENT 4):** M8-F checks bleed/safe/overlap/zone/face-bounds geometry and
  geometry-vs-dieline consistency ONLY. No DPI/CMYK/font/corruption/compression checks in FE — those
  land in M8-I. Shared constants + shared semantic contract; the FE is intentionally lighter.
- `validateLayout`/`validatePerFace` become the single FE engine; `ValidationPanel` consumes results.
- `DesignValidator.ts` + its 3.779 math removed from all imports.

### Files likely affected
`print-validation.ts`, `ValidationPanel.tsx`, deletion of `DesignValidator.ts` (+ import cleanup).

### Backend impact
None (FE mirror only; backend authority lands in M8-I).

### Frontend impact
Validation panel + export gating.

### Persistence impact
None.

### Acceptance Criteria
1. A layer edge at 2.5mm from the face edge fails bleed (expect ≤ `BLEED_MM`-2.5 <3mm); a layer at
   3.5mm passes.
2. A layer crossing the 5mm safe line fails safe-zone where the zone is required; at 5.5mm passes.
3. Two intersecting layers report an overlap; after separation by >0 they pass.
4. Zone anchor within `ZONE_MATCH_TOLERANCE_MM = 5`mm labels the required zone satisfied.
5. **No FE authority claim (AMENDMENT 4):** a CMYK/RGB or low-DPI test asset produces NO FE failure —
   those assertions exist only in M8-I backend tests. `rg "SAFE_MARGIN|BLEED_MARGIN|3.779" frontend/`
   returns no matches.

### E2E / tests
- Unit: rule matrix (bleed/safe/overlap/zone tolerance) both faces of each boundary; a
  file-quality-assertion test is absent in the FE suite by contract.
- E2E: failing design shows validation issues; passing design exports.

### Regression
`editor-flow.spec.ts` (validation panel path), `m7-c-multiface.spec.ts`.

---

## M8-G — Export & Soft-proof Foundation (Frontend)

### Objective
Deterministic mm→DPI export with per-face pages, crop marks, and dieline overlay; structured SVG whose
path bodies come from `DielineGeometry` paths; honest AI/EPS foundation.

### Why it exists
Audit §7 (export fabricates `(dpi/72)*800`, single-face PNG, mislabeled AI/EPS). AMENDMENT 2: SVG/PDF
overlays are derived from dieline **paths**, not panel rectangles.

### Dependencies
M8-C (dieline geometry — panels + paths), M8-F (validation gate), M8-H (persisted manifest consumed
for reproducible export; export does NOT feed the manifest).

### Inputs
- `frontend/lib/editor/services/export.ts`, `vector-export.ts`
- `frontend/components/editor/export/ExportDialog.tsx`
- `frontend/lib/editor/services/texture-generator.ts` (now mm→px via `pixelsAt`)

### Outputs
- `exportPDF`: per-face pages sized `round(mm×dpi/25.4)`; bleed expansion `BLEED_MM`; crop marks;
  dieline overlay drawn from `DielineGeometry` paths (cut/fold/glue); all printed faces incl. inside
  when `printSides=2`.
- `exportImage` (PNG/JPG): exports all faces (composite or per-file), white bg for JPG.
- `exportSVG`: structured vector groups `data-face-id`, mm coordinates, **`<path>` bodies emitted from
  `cutPaths`/`foldPaths`/`scorePaths`/`gluePaths`** — never a raw `fabric.toSVG()` re-export
  (AMENDMENT 2).
- AI/EPS: PostScript shell embedding the structured SVG (foundation); labeled "vector foundation, not
  print CMYK" in the dialog copy.
- `ExportDialog`: disabled unless `validatePerFace` ok && `canExport`.

### Files likely affected
`export.ts`, `vector-export.ts`, `ExportDialog.tsx`.

### Backend impact
None (server worker stays defer, §21).

### Frontend impact
Export dialog + services.

### Persistence impact
None (export consumes the manifest; the manifest never depends on an export artifact — AMENDMENT 5).

### Acceptance Criteria
1. `pixelsAt(115, 300) === 1358`; F42 front face PNG is exactly `1358 × 449` px
   (`115×300/25.4=1358.27→1358`, `38×300/25.4=448.8→449`).
2. PDF contains one page per printed face; page media size = face mm + 2×`BLEED_MM`.
3. Crop marks at ±bleed; dieline lines present on page (visual + PDF text/vector stamp).
4. PNG exports all faces (count == `model.faces.length`).
5. **SVG path contract (AMENDMENT 2):** exported SVG groups carry `data-face-id` AND their geometry
   is a `DielineGeometry`-derived `<path>` (fixture assert: path `d` matches mm cut/fold coordinates);
   a panel-rectangle synthetic is a test failure.
6. AI/EPS output opens in a rasterizer and preserves faceId groups (foundation-level check).
7. Export blocked when validation fails; export blocked when `canExport` false (dialog disabled state).
8. Saving a design with no export performed still persists the full manifest (manifest independence).

### E2E / tests
- Unit: pixel math; PDF page count/size; SVG group + path-body check; manifest-without-export
  roundtrip.
- E2E: trigger export → assert downloaded file name and probe a page (via pdf-lib or sharp on the
  saved fixture pairs with computed sizes).

### Regression
`editor-flow.spec.ts` (export dialog), `cart-checkout.spec.ts` unchanged (env-only note preserved).

---

## M8-H — Persistence & Reproducibility

### Objective
Versioned, reproducible design snapshots: `schemaVersion` + a resolved-geometry manifest with
provenance (`blueprint`/`exact` vs `migrated`/`best_effort`), independent of export; deterministic
reopen after blueprint changes; lifecycle save gate.

### Why it exists
Audit §11 (opaque blob), §12 (no manifest/dieline persistence); M8_SPEC §13 guarantee. AMENDMENT 3+5:
legacy migration is honest `best_effort`, and the manifest snapshots resolved geometry, not files.

### Dependencies
M8-C (resolved `DielineGeometry`), M8-D/E (resolved faces/zones + FaceId/MeshPartId mapping) —
the manifest is the snapshot of C→D/E **resolved geometry** (AMENDMENT 5). It does NOT depend on
M8-G; saving never requires an export artifact. M8-B provides the blueprint to snapshot.

### Inputs
- `backend/src/modules/designs/design.service.ts` (`saveDesign`, `createSession`)
- `frontend/lib/editor/state/store.ts` (save/load serialization)
- `frontend/lib/editor/services/storage.ts` (autosave)
- `backend/src/services/design-lifecycle/design-lifecycle.service.ts` (`isEditableState`)

### Outputs
- `designData.schemaVersion: 2` + full resolved-geometry manifest
  (product/variant/dims mm/faces/zones/prepress/dieline **incl. paths** + `faceRelationships`)
  persisted on every save.
- Provenance fields (AMENDMENT 3): M8-native saves write
  `manifestSource:"blueprint"`, `reproducibility:"exact"`; legacy `1` blobs migrate with
  `manifestSource:"migrated"`, `reproducibility:"best_effort"` — migration preserves
  artwork/layers/text/transforms/product+variant identity and reconstructs geometry from the current
  blueprint WITHOUT claiming historical exactness.
- Manifest independence (AMENDMENT 5): manifest written from the resolve layer; a DRAFT with zero
  exports still persists; export is downstream.
- Load path: manifest-first (deterministic reopen for `blueprint`; faithful preserved reopen for
  `migrated`).
- `saveDesign` rejects non-DRAFT sessions (message returned; client toast; no route change).

### Files likely affected
`design.service.ts`, `store.ts`, `storage.ts`.

### Backend impact
API change (guard behavior on existing endpoint — no route change). Optional: log transition.

### Frontend impact
Save/load serialization, autosave, hidden migration path.

### Persistence impact
`Design.designData` now carries versioned manifest with provenance. No Prisma migration (Json column
already exists).

### Acceptance Criteria
1. After save, `designData.schemaVersion === 2`, `manifestSource:"blueprint"`,
   `reproducibility:"exact"`, and manifest faces match the blueprint (incl. resolved dieline paths)
   for F42.
2. Reopen → store re-inits from manifest; canvas `345×114` front face.
3. **Livelihood test:** change `editorDefaults.structure` in seed (or a test override) → reopen an old
   saved design → geometry identical to pre-change manifest (DB assert on `designData.manifest.faces`).
4. `POST /designs/:id/save` on a SUBMITTED design returns the lifecycle rejection; DRAFT saves succeed.
5. Legacy blob (no schemaVersion) loads via migration without data loss (layers preserved) and is
   flagged `migrated`/`best_effort`; its geometry is never reported as historically exact
   (AMENDMENT 3).
6. A manifest persists with zero export calls (manifest is independent of export — AMENDMENT 5).

### E2E / tests
- E2E + DB: save→reopen→manifest equality; blueprint-edit reproducibility; provenance flags on a
  migrated legacy design; lifecycle save gate (uses `e2e/db.ts` assertions pattern from M7-E).
- Integration (Supertest): save gate responses; save-without-export manifest present.

### Regression
`m7-e-traceability.spec.ts` 5/5 (contract untouched), `editor-flow.spec.ts`.

---

## M8-I — Backend Prepress (Authoritative) & Soft Proof

### Objective
Make the backend prepress service **authoritative** (AMENDMENT 4): production checks
(resolution/DPI, color mode, fonts embedded/outlined, corruption, compression) **plus** geometry
validation against the persisted manifest; `fixedAutomatically` populated; proof embedding print pages;
keep the FE engine as a UX mirror only.

### Why it exists
Audit §10 (backend bleed/safe/font stubs; `fixedAutomatically` unused); SPEC-005 required subset;
proof-generator placeholder ("Print file will be embedded here"). Backend is the final authority — no
FE test substitutes for a production check.

### Dependencies
M8-H (persisted manifest — primary input, H→I), M8-F (FE mirror rules to mirror). Also consumes
production files from M8-G where a proof is generated.

### Inputs
- `backend/src/services/pre-press-checker/prepress.service.ts` (stubs at lines ~107–109)
- `backend/src/services/pre-press-checker/proof-generator.ts` (REUSE — replace embed placeholder)
- `backend/src/services/pre-press-checker/validators/{resolution,color}.validator.ts` (REUSE)
- `backend/src/modules/prepress/prepress.controller.ts` / `prepress.routes.ts`
- `backend/src/services/file-processor/processor.service.ts` (REUSE `checkPrintRequirements`)

### Outputs
- `PrePressCheckResult.bleedMarginsOk/safeZoneOk` computed from the **persisted manifest** geometry
  (resolved faces/zones/dieline paths), not hardcoded `true`.
- Authoritative file checks: `resolution` (≥`DPI_MIN`), `color` (RGB reject / CMYK per SPEC-005),
  `fontsEmbedded` (outlined/embedded on the exported proof), `corruption` (uploaded file parses),
  `compression` (quality ≥80% raster) — all computed, not stubbed.
- `fixedAutomatically` populated when the engine auto-corrects (e.g., safe-zone clamp emulation).
- `ProofGeneratorService.createFlattenedPDF` embeds actual per-face print pages + dieline paths + bars.
- `checkOrderDesign`/`getPrePressResults` return authoritative results; `prepress.controller.ts`
  unchanged in shape.

### Files likely affected
`prepress.service.ts`, `proof-generator.ts` (+ a manifest→geometry helper),
`prepress.controller.ts` (only if needed for input binding).

### Backend impact
API change (computed results replace stubs; existing endpoints unchanged), worker/media handling
within the service (no new worker; proof runs synchronously on request for M8).

### Frontend impact
None required (mirror already gated in M8-F; may surface backend results in ValidationPanel).

### Persistence impact
`PrePressCheck` row now carries real geometry + file-quality results + `fixedAutomatically`.
No Prisma change.

### Acceptance Criteria
1. `checkOrderDesign` returns `bleedMarginsOk:false` for a manifest with 2.5mm bleed; `true` at 3.5mm.
2. `safeZoneOk:false` when a required-zone layer is inside `SAFE_MM`, `true` otherwise.
3. Authoritative file checks (AMENDMENT 4): `@72` DPI file fails; RGB uploaded file rejected/flagged
   per SPEC-005; non-embedded font reflects `fontsEmbedded:false`; corrupt file fails; raster below
   quality threshold warns. These are asserted ONLY in backend tests.
4. `fixedAutomatically` is `true` when the check applied an auto-fix, `false` otherwise (was always
   default).
5. `generateProof` outputs a PDF whose pages embed the print file (not the placeholder string) and
   overlay dieline paths.
6. `getPrePressResults` returns the stored row for an existing order.
7. Manifest is the primary geometry input: changing live `ProductStructure` does not alter prepress
   results for an already-persisted order (reproducibility).

### E2E / tests
- Unit (backend, Vitest): check-result matrix on synthetic manifests + file fixtures
  (DPI/color/font/corruption).
- Integration (Supertest): `checkOrderDesign` via controller; `generateProof` non-placeholder.
- E2E: order flow → prepress results surfaced (read via API, DB assert on `PrePressCheck`).

### Regression
`m7-e-traceability.spec.ts`, `cart-checkout.spec.ts` (env-only note preserved).

---

## M8-J — Product Coverage Completion & Closure

### Objective
Cover all six seeded products with real blueprints/dielines (or explicit deferral markers), then
sign off the global acceptance matrix and run the three-run regression.

### Why it exists
Audit §5 (only mailer structured), §14 (coverage) — completes the horizontal slice.

### Dependencies
All M8-A…I.

### Inputs
- `backend/prisma/seed.ts` (other product `editorDefaults`)
- Everything built in M8-A…I (generic across blueprint)

### Outputs
- Blueprints + dieline templates for `folding-carton` (prod-product-box), `shipping-box`,
  `rigid-box`, `pizza-box` (M8-required).
- Explicit `support: "deferred"` markers for products deemed unsafe in M8 (paper-bag, poly-mailer,
  label) with a one-line reason (no fake geometry — spec §14).
- Full acceptance matrix above all pass; start-to-finish order with the E2E suite run at least 3×.

### Files likely affected
`seed.ts` (+ any per-product fixes surfaced by the matrix).

### Backend impact
JSON-only (seed authoring).

### Frontend impact
Generic (no structural change if M8-A…I were blueprint-generic).

### Persistence impact
None new (existing manifest machinery).

### Sub-tasks (J1–J7)
| # | Sub-task | Content |
|---|---|---|
| J1 | folding-carton | Blueprint + dieline (flaps + glue) for `prod-product-box`; parity 2D/3D/export |
| J2 | shipping-box | Blueprint + dieline (corrugated, flute B) for `prod-shipping-box`; parity |
| J3 | rigid-box | Blueprint + dieline (lid/base two-piece blank) for `prod-rigid-box`; parity |
| J4 | pizza-box | Blueprint + dieline for `prod-pizza-box`; parity |
| J5 | deferred decisions | Author explicit `support:"deferred"` markers + one-line reasons (paper-bag, poly-mailer, label) |
| J6 | coverage matrix | Build the product×acceptance coverage matrix; verify required pass / deferred flagged |
| J7 | final regression | Full E2E suite ×3 consecutive runs; record result matrix; acceptance sign-off |

**Stop rule:** if a product needs an architectural change (not just blueprint authoring), STOP and
reclassify it as a new milestone — do not bend the M8 architecture to fit one product.

### Acceptance Criteria
1. `folding-carton`, `shipping-box`, `rigid-box`, `pizza-box` pass the M8 acceptance matrix for
   canvas sizing, zones, dieline, 3D MeshPartId/texture, export, validation.
2. Deferred products carry an explicit flag; the editor refuses to fake geometry (shows deferral
   placeholder instead of incorrect box).
3. Full E2E suite: **three consecutive runs** — each ≥ the M7 baseline where the ONLY failure is the
   documented Stripe env limitation.
4. J1–J7 each completed and evidenced in `M8_TASKS.md`; stop rule honored (any architectural product
   handled as a new milestone, not coerced into M8).

### E2E / tests
Full matrix run (all `m7-*`, `editor-flow`, `cart-checkout` with env note, `site-flows`) ×3;
product-coverage matrix spec.

### Regression
`m7-a…e` all green; traceability contract intact; Stripe limitation documented-only.

---

## Implementation Order (execution sequence)

```
M8-A → M8-B → M8-C → (M8-D ⟂ M8-E) → M8-H → M8-F → M8-G → M8-I → M8-J
```

- **M8-D and M8-E** are independent once M8-C lands and may be planned in parallel (different file
  sets).
- **M8-H** follows immediately after the resolve layer (C/D/E) so the persisted manifest is available
  to F, G, and I from the start — export and validation never precede persistence.
- `M8-F` (FE geometry UX mirror) and `M8-G` (export) both depend on H; `M8-I` (backend authoritative)
  depends on H + the proof pipeline.
- Every milestone ends with a STOP/validation checkpoint (targeted e2e + relevant M7 group) and a
  commit.

## Acceptance Gate (overall)

The M8 DoD (§22 of M8_SPEC) is satisfied only when:
- the complete suite is green 3× (J7),
- the manifest reproducibility guarantee holds for `exact` orders and `best_effort` is honest for
  migrated legacy designs (§13),
- no audit GAP is left unaddressed or undeferred,
- and all ratified architectural clarifications (AMENDMENTS 1–5) are evidenced in tests.