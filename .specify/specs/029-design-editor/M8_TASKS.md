# M8 Tasks — Task List, Gap Matrix & Report Checklist

**Spec:** [M8_SPEC.md](./M8_SPEC.md) | **Plan:** [M8_PLAN.md](./M8_PLAN.md)
**Status:** Approved for planning — no implementation.
**Execution rule after approval:** implement milestone-by-milestone using the sequence in `M8_PLAN.md`;
every milestone ends with STOP/validate + commit; verify master status at start.

---

## 1. Audit-GAP → Milestone / Deferral Matrix

Source: `M8_ARCHITECTURE_GAP_AUDIT.md`. Every GAP is mapped to exactly one milestone or an explicit
deferral. A GAP may appear in the acceptance criteria of the milestone it maps to.

| # | Audit GAP (abridged) | Milestone | Action |
|---|----------------------|-----------|--------|
| G-1 | Multiple competing px/mm factors (3, 5, 3.779, none) | M8-A | Single `units.ts`; named constants |
| G-2 | 2D canvas hardcoded 800×600; ignores `store.canvas` | M8-A | Canvas sized from store (`mm×3`) |
| G-3 | ZoneOverlays `scale=3` literal | M8-A | `mmToPx`-driven rendering |
| G-4 | Legacy `DesignValidator.ts` (3.779 px/mm) still in tree | M8-A | Delete; redirect imports |
| G-5 | Dead `SAFE_MARGIN=10` / `BLEED_MARGIN=4` in FE | M8-F | Real engine; constants removed |
| G-6 | `validatePerFace` px/mm tolerance bug (`<=20`) | M8-F | `ZONE_MATCH_TOLERANCE_MM=5` in mm |
| G-7 | Stub geometry checks in `print-validation.ts` | M8-F | Real bleed/safe/overlap in mm |
| G-8 | Only mailer box has `structure`; no blueprint for others | M8-B → M8-J (J1–J5) | Blueprint+template per product; deferral allowed with reason |
| G-9 | Unexpressed `schemaVersion` / units in `editorDefaults` | M8-B | `schemaVersion:1`, `unit:"mm"` |
| G-10 | No dieline options/prepress model | M8-B | `dieline` template + `prepress` options (JSON-only) |
| G-11 | Dieline `scale 0.5` display mode | M8-C | Canonical mm engine; view transform only |
| G-12 | `dieline-service.ts` stub (`scaleSvgPath` no-op) | M8-C | Real serializer + overlap detector |
| G-13 | `Design.id===CartItem.designId===OrderItem.designId` chain used with no persistence contract | M8-H | **Preserve** chain; manifest snapshot; no Prisma change |
| G-14 | Opaque `designData` blob; no version/manifest | M8-H | `schemaVersion:2` + manifest; migration for v1 |
| G-15 | No deterministic reopen after blueprint change | M8-H | Manifest-first load; reproduction guarantee |
| G-16 | No lifecycle save gate | M8-H | `saveDesign` rejects non-DRAFT (behavior only) |
| G-17 | Export `(dpi/72)*800` sizing | M8-G | `px = round(mm×dpi/25.4)` |
| G-18 | Single-face PNG only | M8-G | Per-face print; JPG white bg |
| G-19 | AI/EPS mislabeled as print-ready | M8-G | Honest PostScript shell + SVG foundation |
| G-20 | 3D: only MailerBox binds textures; flap faceId wrong; mesh ignores textures | M8-E | MeshPartId contract (unique per mesh) via `faceRelationships`; texture keyed by FaceId; flap UV sub-region fix (AMENDMENT 1) |
| G-21 | Backend bleed/safe/font stubs (`true` hardcoded) | M8-I | Authoritative checks from persisted manifest: geometry (bleed/safe) + file quality (DPI/color/fonts/corruption/compression) (AMENDMENT 4) |
| G-22 | Soft proof & `fixedAutomatically` unused | M8-I | Reuse `ProofGeneratorService`; embed pages; populate field |
| G-23 | Backend export worker placeholders | DEFERRED | Documented in M8-G; keep worker stubs until post-M8 (no AI/EPS dependency risk) |
| G-24 | SPEC-005 deferred items (72h auto-escalation, approval UI, AI scoring, Pantone, auto color convert, 3D print sim) | DEFERRED | Tracked; one line each in final report |

**No GAP is silently dropped**: any GAP not addressed in an implementation run must be an explicit
deferral with a one-line reason in the final report.

**Ratified clarifications (AMENDMENTS 1–5) applied across spec/plan/tasks:**

| Clarification | Documented contract |
|---|---|
| AMENDMENT 1 — FaceId vs MeshPartId | `FaceId` = editor/print identity (canonical 12-set, not expanded); `MeshPartId` = mesh topology (`top_panel`/`top_flap_a`); `FaceId → 0..N MeshPartId → mesh → texture`; texture keyed by FaceId; flap UV sub-region; **no invented FaceIds**. Affects M8-C (faceRelationships), M8-E (§7/§10). |
| AMENDMENT 2 — DielineGeometry paths | First-class physical mm paths (`cutPaths`/`foldPaths`/`scorePaths`/`gluePaths`/`perfPaths` + `outline`) plus semantic `panels` + `faceRelationships`; curves future-capable; non-rectangular path fixture test required. Affects M8-C, M8-G (SVG/PDF from paths). |
| AMENDMENT 3 — Legacy migration honesty | M8-native: `manifestSource:"blueprint"`, `reproducibility:"exact"`. M7-migrated: `manifestSource:"migrated"`, `reproducibility:"best_effort"` — reconstructed from current blueprint, never claimed historically exact. Affects M8-H (§13). |
| AMENDMENT 4 — FE vs BE validation authority | M8-F = geometry UX mirror (bleed/safe/overlap/zone/face-bounds only; **no FE test certifies CMYK/fonts/corruption/DPI**); M8-I = authoritative (DPI/color/fonts/corruption/compression + geometry vs manifest). Shared constants + contract. Affects M8-F, M8-I (§4/§11). |
| AMENDMENT 5 — Manifest independent of export | Manifest snapshots resolved geometry from C→D/E; export consumes it; `H` precedes `F`/`G`; no export→manifest dependency. Execution order `A→B→C→(D⟂E)→H→F→G→I→J`. Affects M8-H (§19). |

---

## 2. Milestone Task Breakdown

### M8-A — Physical Geometry Foundation
- [ ] Create `frontend/lib/editor/geometry/units.ts` with `PX_PER_MM`, `TEXTURE_PX_PER_MM`,
  `MM_PER_CM`, `DPI_MIN`, `BLEED_MM`, `SAFE_MM`, `ZONE_MATCH_TOLERANCE_MM`, `mmToPx`, `pxToMm`,
  `pixelsAt`, `facePanel`.
- [ ] `DesignCanvas2D.tsx`: size fabric canvas from `store.canvas.width/height`; remove 800×600.
- [ ] `ZoneOverlays.tsx`: replace `scale` literal with `mmToPx`.
- [ ] `store.ts` / `texture-generator.ts`: literals → named constants (no behavior change).
- [ ] Delete `DesignValidator.ts`; redirect all imports to `print-validation.ts`.
- [ ] Unit tests (conversion table + `pixelsAt`); e2e tolerance check on F42 front face.
- [ ] RUN: unit + `m7-a…e` + `editor-flow`. Commit.

### M8-B — Packaging Blueprint & Dieline Template
- [ ] Add `MAILER_DIELINE_TEMPLATE` (mm panels, `LineClass` per edge, glue flaps, fold adjacency) in seed.
- [ ] `editorDefaults`: `schemaVersion:1`, `unit:"mm"`, `dieline`, `prepress` for mailer.
- [ ] `catalog.service.ts` `getEditorConfig`: passthrough (additive) of the new fields.
- [ ] `store.ts` `EditorConfigLike`: additive optional fields + graceful fallback when `dieline` absent.
- [ ] Integration test (Supertest) on editor-config fields; unit typeguard test.
- [ ] RUN: integration + `m7-b-routes` + `m7-editor-catalog`. Commit.

### M8-C — Canonical Dieline Geometry Engine
- [ ] `geometry/dieline.ts`: `buildDieline(blueprint, dims)` → mm `DielineGeometry` with semantic
  `panels` + physical `cutPaths`/`foldPaths`/`scorePaths`/`gluePaths`/`perfPaths` + `outline` +
  `faceRelationships` (AMENDMENT 1+2; curves future-capable).
- [ ] `dieline-service.ts`: replace stub with `serializeSVG` (faceId groups, mm, **paths**) and real `checkOverlaps`.
- [ ] `dieline-generator.ts`: retire display-scale 0.5; re-export via engine or delete.
- [ ] `DielineCanvas`/`DielineEditor`: render mm geometry; view transform only.
- [ ] Unit tests (engine matrices, serializer, overlap detector, **non-rectangular path fixture**,
  FaceId↔MeshPartId relationship no-invented-FaceId); e2e flap count.
- [ ] RUN: unit + `editor-flow` + `m7-d`. Commit.

### M8-D — 2D Editor Integration
- [ ] `DesignCanvas2D.tsx`: face-switch resizing from `store.canvas` verified (F42 front 345×114).
- [ ] Dieline overlay drawn on work canvas from `buildDieline`.
- [ ] `ZoneOverlays.tsx`: `store.zones` at mm→px + bleed/safe measure from constants.
- [ ] `addLayer` centering at mm center.
- [ ] E2E canvas-dims/zone-px assertions; M7-C/M7-D re-run.
- [ ] RUN: e2e + `editor-flow`. Commit.

### M8-E — 3D Deterministic Mapping & Texture Parity
- [ ] `BoxModels.tsx`: `MeshPartId` contract on all six box types — unique per mesh, resolved from
  `faceRelationships`; texture lookup stays keyed by `FaceId` (AMENDMENT 1).
- [ ] All types consume `textures` prop (per-face materials).
- [ ] Mailer flap fix: distinct flap `MeshPartId` + owner `FaceId`; flap UV is a sub-region of the
  owner-face artwork == dieline flap panel area.
- [ ] Texture generator uses `TEXTURE_PX_PER_MM` (`pixelsAt`).
- [ ] Unit (FaceId↔MeshPartId matrix, flap UV) + e2e scene-graph (unique MeshPartIds) + M7-D re-run
  + texture screenshots.
- [ ] RUN: full 3D group + `m7-d` + `editor-flow`. Commit.

### M8-F — Unified Frontend Geometry Validation (UX mirror)
- [ ] `validatePerFace` mm-correct (`ZONE_MATCH_TOLERANCE_MM`, six faces, inside fallback).
- [ ] Real `checkElementExtendsBeyondBleed`/`checkElementWithinSafeArea`/`checkForOverlaps` in mm.
- [ ] Scope guard (AMENDMENT 4): FE checks bleed/safe/overlap/zone/face-bounds geometry ONLY — no
  DPI/CMYK/font/corruption assertions in the FE suite (those live in M8-I backend tests).
- [ ] `ValidationPanel` consumes the single engine; remove dead constants; delete `DesignValidator` imports.
- [ ] Unit rule-matrix tests (both sides of each boundary); e2e fail→issues / pass→export.
- [ ] RUN: `rg "SAFE_MARGIN|BLEED_MARGIN|3.779" frontend/` empty + e2e + `m7-c`. Commit.

### M8-G — Export & Soft-proof Foundation (Frontend)
- [ ] `exportPDF`: per-face pages `pixelsAt`, bleed expansion, crop marks, dieline overlay **from
  paths**, inside pages when `printSides=2`.
- [ ] `exportImage` (PNG/JPG): all faces; JPG white bg.
- [ ] `exportSVG`: structured `data-face-id` groups, mm bounds, **`<path>` bodies emitted from
  `DielineGeometry` paths** — panel-rect fallback = test failure (AMENDMENT 2).
- [ ] AI/EPS: PostScript shell embedding SVG; honest labeling in `ExportDialog`; `canExport` gate.
- [ ] Unit pixel/PDF/SVG-path checks; e2e download + page-size probe; `cart-checkout` untouched.
- [ ] Manifest-independence check: save without export persists full manifest (AMENDMENT 5).
- [ ] RUN: unit + e2e export group + `editor-flow`. Commit.

### M8-H — Persistence & Reproducibility
- [ ] `designData.schemaVersion:2` + full resolved-geometry manifest (incl. dieline paths +
  faceRelationships) on save (`design.service.ts`, `store.ts` serialization) — written from the
  resolve layer, independent of export (AMENDMENT 5).
- [ ] Provenance fields (AMENDMENT 3): M8-native saves → `manifestSource:"blueprint"`,
  `reproducibility:"exact"`; legacy v1 migration → `manifestSource:"migrated"`,
  `reproducibility:"best_effort"` (preserves artwork/layers/text; reconstructs from current blueprint;
  never claims historical exactness).
- [ ] Manifest-first load + deterministic reopen (blueprint) / faithful preserved reopen (migrated).
- [ ] `saveDesign` non-DRAFT rejection (behavior only; no route change).
- [ ] Integration (Supertest) save-gate; E2E+DB: save→reopen→manifest equality; blueprint-edit
  reproducibility; migration provenance flags; save-without-export manifest present.
- [ ] RUN: `m7-e` 5/5 + `editor-flow` + E2E. Commit.

### M8-I — Backend Prepress (Authoritative) & Soft Proof
- [ ] `prepress.service.ts`: compute bleed/safe from the **persisted manifest** geometry; compute
  authoritative file checks — DPI/color/fonts/corruption/compression (reusing existing validators +
  `checkPrintRequirements`); populate `fixedAutomatically`.
- [ ] `proof-generator.ts` (REUSE): embed real per-face print pages + dieline paths + bars.
- [ ] Wire authoritative results into `checkOrderDesign`/`getPrePressResults` (endpoints unchanged).
- [ ] Unit check-result matrix (incl. @72 DPI fail, RGB reject, non-embedded font, corrupt file); the
  ONLY place such file-quality assertions live (AMENDMENT 4 — backend authority).
- [ ] Integration (`checkOrderDesign`, `generateProof`); E2E order-flow read-back; manifest-vs-live
  reproducibility (prepress unchanged after ProductStructure edit).
- [ ] RUN: backend unit + integration + `m7-e` + `cart-checkout` (env note). Commit.

### M8-J — Product Coverage & Closure (J1–J7)
- [ ] **J1** folding-carton: blueprint + dieline (flaps + glue); parity 2D/3D/export.
- [ ] **J2** shipping-box: blueprint + dieline (corrugated, flute B); parity.
- [ ] **J3** rigid-box: blueprint + dieline (lid/base two-piece blank); parity.
- [ ] **J4** pizza-box: blueprint + dieline; parity.
- [ ] **J5** deferred decisions: `support:"deferred"` markers + reasons for paper-bag, poly-mailer,
  label (no fake geometry).
- [ ] **J6** coverage matrix: product×acceptance matrix verified — required pass / deferred flagged.
- [ ] **J7** final regression: full E2E suite **3× consecutively**; record results; acceptance sign-off.
- [ ] Stop rule honored: any architectural-change product → new milestone, not coerced into M8.
- [ ] Final report write-up; commit; verify `git status` clean; spec/plan/tasks consistency check.

---

## 3. Product Coverage Matrix

| Product (seed id) | Blueprint | Dieline template | M8 requirement | Milestone |
|-------------------|-----------|------------------|----------------|-----------|
| prod-mailer-box (mailer-box) | ✅ exists (structure) + upgraded template | ✅ M8-B | Full vertical slice — acceptance target every milestone | M8-A…J |
| prod-product-box (folding-carton) | to add | to add | REQUIRED (M8-J) | M8-J |
| prod-shipping-box (shipping-box) | to add | to add | REQUIRED (M8-J) | M8-J |
| prod-rigid-box | to add | to add | REQUIRED (M8-J) | M8-J |
| prod-pizza-box | to add | to add | REQUIRED (M8-J) | M8-J |
| prod-paper-bag | — | — | Deferrable | M8-J defer |
| prod-poly-mailer | — | — | Deferrable (no fake geometry — different physical structure — spec §14) | M8-J defer |
| prod-label | — | — | Deferrable | M8-J defer |

Deferral rule: generic box geometry is **never** applied to physically different structures; deferred
products render a `support:"deferred"` placeholder, not an incorrect box.

---

## 4. SPEC-005 Prepress Triage (mapped to milestones)

| SPEC-005 requirement | M8 disposition | Milestone |
|----------------------|----------------|-----------|
| ≥300 DPI                          | required (pixels + backend validator reuse) | M8-G, M8-I |
| RGB rejected / CMYK required      | required (backend `color.validator.ts` reuse) | M8-I |
| ≥3mm bleed (geometry)             | required | M8-C/F/I |
| ≥5mm safe (geometry)              | required | M8-C/F/I |
| Overlap detection                 | required | M8-C/F/I |
| Fonts embedded/outlined           | required (backend fonts check real) | M8-I |
| Corruption check                  | required (existing validator reuse) | M8-I |
| Compression ≥80%                  | required (existing pipeline) | M8-I |
| `PrePressCheck.fixedAutomatically` populated | required | M8-I |
| Soft proof w/ real pages, crop/trim, dieline overlay, color/registration bars | foundation — reuse `ProofGeneratorService.generateProof` | M8-I |
| 72h auto-escalation reminder      | deferred | post-M8 |
| Approval workflow UI              | deferred | post-M8 |
| AI scoring                        | deferred | post-M8 |
| Pantone verification              | deferred | post-M8 |
| Auto color conversion             | deferred | post-M8 |
| 3D print simulation               | deferred | post-M8 |

---

## 5. Export Format Triage

| Format | Status | Milestone | Notes |
|--------|--------|-----------|-------|
| PDF    | production | M8-G | per-face pages, crop marks, dieline, bleed |
| PNG    | production | M8-G | all faces |
| JPG    | production | M8-G | all faces, white bg |
| SVG    | production | M8-G | structured vector, mm, `<path>` bodies from `DielineGeometry` paths (AMENDMENT 2) |
| AI/EPS | foundation | M8-G | honest PostScript shell around SVG; never claimed print-CMYK |
| Backend rasterization (`export.worker.ts`) | deferred | post-M8 | placeholders documented in G-23 |

---

## 6. Final Report Checklist (write into `M8-E_REPORT.md` successor at M8-J)

- [ ] M8-A…J each: acceptance criteria result vs. spec §(milestone) — pass/fail table.
- [ ] Audit GAP matrix: every GAP row resolved or explicitly deferred with reason.
- [ ] Ratified architectural clarifications (AMENDMENTS 1–5) evidenced: FaceId/MeshPartId tests,
  DielineGeometry paths, provenance/best_effort, FE/BE authority boundary, manifest independence.
- [ ] 3× consecutive full-suite runs recorded (dates, branch, env).
- [ ] Stripe limitation confirm: `frontend/e2e/cart-checkout.spec.ts:187` is the **only** allowed
      failure in each run, explicitly documented as environment-limited (not an M8 defect).
- [ ] Design chain invariant note: `Design.id === CartItem.designId === OrderItem.designId` preserved
      (no Prisma change introduced), with manifest snapshot guarantee for reproducibility.
- [ ] SPEC-005 triage table reflected (required vs deferred).
- [ ] Deferred-work backlog: G-23, G-24 items, export worker, prepress deferred set.
- [ ] Verification: `git status` clean at closure; spec/plan/tasks remain consistent.

**STOP after producing the three planning documents.** No implementation in this session.