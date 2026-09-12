# M8 Specification — Professional Dieline & Prepress Engine

**Milestone:** M8 (design editor hardening into a production-oriented packaging system)
**Source inputs:** `M8_ARCHITECTURE_GAP_AUDIT.md` (primary), `spec.md`, `plan.md`, `tasks.md`, `spec-005-prepress.md`
**Status:** Approved for planning — no implementation yet
**Scope:** Specification only. NO source/Prisma/API/UI/test/dependency changes in this milestone-review phase.

---

## 1. Executive Summary

PackagePro's editor (M7) is a product-aware 2D/3D packaging design tool with real persistence and
traceability (`Design.id === CartItem.designId === OrderItem.designId`). It is NOT yet a production
packaging system: canvas geometry, dielines, zones, validation, export sampling, and 3D face mapping
are built on competing unit systems (px at 3/mm, px at 5/mm, viewport px at 3.779/mm, hardcoded
800×600, mm structures) and several stubbed services.

M8 introduces **one authoritative mm-space geometry model** (a Packaging Blueprint per product),
and makes every consumer (2D canvas, 3D mesh, dieline, zones, validation, export, prepress,
persistence) derive from it. The architecture:

```
                  Product Packaging Blueprint  (backend: Product.editorDefaults)
                                │
                                ▼
                 Canonical Physical Geometry (mm)   — dieline engine + units module
                                │
   ┌──────────────┬─────────────┴─────────────┬──────────────┐
   ▼              ▼                           ▼              ▼
 2D Editor     3D Model           Design Persistence     Export / Dieline
   │              │              (resolved-geometry       (consumes manifest)
   │              │              manifest — canonical,    │
   │              │              NOT export-derived)      │
   └──────────────┴──────────────┬────────────────────────┘
                                 ▼
               FE geometry mirror (UX, non-authoritative) → Backend Prepress (authoritative)
                                 │
                                 ▼
                          Production Gate  (DesignLifecycleService.canExport)
```

M8 is delivered in 10 milestones (M8-A … M8-J). The mailer box (the only product with a full
ProductStructure today) is the vertical slice validated in every milestone; M8-J completes all six
seeded products and runs the three-run regression.

---

## 2. Problem Statement

The audit (`M8_ARCHITECTURE_GAP_AUDIT.md`) identifies the following systemic defects, all of which
M8 resolves:

1. **Unit chaos (audit §6).** Four pixel/mm factors coexist: `3` (store canvas + ZoneOverlays),
   `5` (texture generator), `3.779` (legacy DesignValidator), plus a hardcoded `800×600` fabric
   canvas that ignores the store's mm-sized canvas entirely.
2. **No single geometry authority (audit §4).** Catalog `structure`, store defaults, and 3D mesh
   constants are three unrelated sources of truth.
3. **Dieline capability is non-geometric (audit §3).** `dieline-generator.ts` emits display-space
   coordinates (`scale=0.5`); `dieline-service.ts` is a stub (no-op `scaleSvgPath`, hardcoded
   templates, empty overlap check).
4. **Zone validation mixes px with mm (audit §9)** in `validatePerFace` (tolerance `<= 20` where
   one side is px and the other mm).
5. **Prepress validation is stubbed (audit §10).** `SAFE_MARGIN`/`BLEED_MARGIN` dead constants,
   geometry checks always pass; backend `bleedMarginsOk/safeZoneOk/fontsEmbedded` hardcoded `true`.
6. **3D face mapping is incomplete (audit §8).** Only `MailerBox` binds per-face textures; five
   box types ignore textures; non-box types have no `userData.faceId`; mailer flaps report `"top"`,
   and the top flap mesh is half-size while the dieline top panel is full-size.
7. **Export fabricates dimensions (audit §7).** `(resolution/72) * 800` pixel sizing, single-face
   PNG, `dot fi` mislabeled SVG/AI/EPS wrappers.
8. **No reproducibility contract (audit §11/§12).** `designData` is an unversioned blob; there is
   no persisted geometry manifest; an order cannot deterministically reproduce its geometry if the
   ProductStructure changes.

> **Correction to audit (verified during planning):** the backend soft-proof foundation is NOT greenfield.
> `backend/src/services/pre-press-checker/proof-generator.ts` (ProofGeneratorService) exists with
> watermark + legal text + approval token + DesignFile('proof') upload, and
> `validators/resolution.validator.ts` + `validators/color.validator.ts` are real. M8-I reuses these;
> it replaces their placeholder internals, never rebuilds them.

---

## 3. Current Architecture Baseline

Verified inventory relevant to M8 (full detail in audit §1–§12):

| Concern | Current state (FACT) |
|---|---|
| Geometry source | `backend/src/modules/catalog/catalog.service.ts` `getEditorConfig` → `product.editorDefaults.structure` (mm), variant dims via `toMm` (cm→mm) |
| Faces | `frontend/lib/editor/state/types.ts` — 12 FaceIds (6 outer + 6 `inside_*`) |
| Store | `frontend/lib/editor/state/store.ts` — canvas `Math.round(mm * 3)`; `setSelectedFace` recomputes per face; faces/zones from structure |
| 2D canvas | `frontend/components/editor/canvas/DesignCanvas2D.tsx` — hardcoded default props `width=800, height=600`, store canvas unused |
| Zones | `frontend/components/editor/canvas/ZoneOverlays.tsx` — `scale=3`, `bleedSize=3`, `safeZoneSize=5` |
| Dieline gen | `frontend/lib/editor/utils/dieline-generator.ts` — per-type generators, display `scale=0.5` |
| Dieline svc | `frontend/lib/editor/services/dieline-service.ts` — STUB |
| Dieline UI | `DielineCanvas.tsx`, `frontend/components/editor/panels/DielineEditor.tsx` |
| Textures | `frontend/lib/editor/services/texture-generator.ts` — `5` px/mm, per-face |
| 3D | `frontend/components/design-editor/models/BoxModels.tsx` — only MailerBox binds `textures`; flaps `userData.faceId:"top"` |
| 3D view | `frontend/components/editor/canvas/DesignCanvas3D.tsx` — `getBoxModel`, `useFaceValidity` (`inside_*`→outer) |
| Validation FE | `frontend/lib/editor/services/print-validation.ts` — stub geometry, dead constants, px/mm zone bug |
| Validation legacy | `frontend/components/design-editor/validation/DesignValidator.ts` — 3.779 px/mm, auto-fix |
| Export FE | `frontend/lib/editor/services/export.ts`, `vector-export.ts`, `frontend/components/editor/export/ExportDialog.tsx` — `(dpi/72)*800`, single-face image, PostScript-wrapped SVG AI/EPS |
| Backend prepress | `backend/src/services/pre-press-checker/prepress.service.ts` (bleed/safe/font stubs), `validators/`, `proof-generator.ts`; `backend/src/modules/prepress/{prepress.controller,routes}.ts` |
| Export worker | `backend/src/workers/export-queue/export.worker.ts` — placeholders only; `frontend/app/api/export/**` routes exist |
| Lifecycle | `backend/src/services/design-lifecycle/design-lifecycle.service.ts` — complete, role-gated; `canExport` = DRAFT|APPROVED |
| Persistence | `Design.designData Json?` (unversioned), `designConfig Json?`; M7-E traceability contract |
| Prisma | `Product.editorDefaults Json?`, `Design.designData/designConfig Json?`, `PrePressCheck` (`fixedAutomatically` unused) |
| Seed | `backend/prisma/seed.ts` — `MAILER_BOX_STRUCTURE` (only structure; mm), 6 products |

Regression baseline (M7, closed): **35 passed / 1 failed** across three consecutive runs, the single
failure being the documented Stripe-placeholder cart-clear assertion at `cart-checkout.spec.ts:187`.

---

## 4. Target Architecture

**Single physical authority:** the Product Packaging Blueprint (per product), which yields one
Canonical Physical Geometry in mm. All of 2D, 3D, dieline, export, and prepress are derived.

Responsibility boundaries (who owns what):

| Layer | Owner | Role |
|---|---|---|
| Product blueprint | `catalog.service.ts` (`editorDefaults`) | authoritative per-product face/zones/dieline template, mm |
| Canonical geometry | `frontend/lib/editor/geometry/*` | derives mm geometry from blueprint; units module |
| 2D editor | `Store` + `DesignCanvas2D` | interaction + state; px display derived from mm via `PX_PER_MM` |
| 3D model | `BoxModels.tsx` | derived visualization from blueprint dims + faceId contract |
| Export | `export.ts` + geometry engine | derived production artifact; `px = mm × dpi / 25.4`; consumes manifest/geometry (§19) |
| Frontend geometry validation (M8-F) | `print-validation.ts` | **UX mirror, NOT authoritative** — fast editor feedback: bleed/safe geometry, layer overlap, zone placement, face bounds, dieline/face consistency, geometry integrity (mm); intentionally lighter |
| Backend production prepress (M8-I) | backend `prepress.service.ts` | **authoritative** — resolution/DPI, color mode, fonts embedded/outlined, file corruption, compression/quality, geometry checks vs persisted manifest, production proof, final production gate |
| Design persistence | `design.service.ts` + store snapshot | immutable, reproducible snapshot (schemaVersion + manifest) of **canonical resolved geometry** — independent of export (§13, §19) |

Rule: the frontend validator is a UX mirror; the backend prepress service is the production authority.
They are NOT two independent implementations of the same business rules — both consume the **same
physical constants** (`BLEED_MM=3`, `SAFE_MM=5`, `DPI_MIN=300`, `MM_PER_CM=10`, `PX_PER_MM=3`) and the
**same semantic geometry contract** (`DielineGeometry` + manifest). The frontend performs intentionally
lighter mirror checks for live feedback and as an export-gating hint; the backend performs authoritative
production validation. No frontend check certifies CMYK/font-embedding/file-corruption/DPI; no backend
check relies solely on frontend validation. (AMENDMENT 4)

---

## 5. Architectural Decisions

### AD-1 — MM is the canonical physical unit
- All physical geometry is millimeters: dimensions, face geometry, zones, bleed, safe area, cut/fold/
  crease/glue lines, glue flaps, dieline coordinates.
- Pixel conversions are allowed ONLY in two named rules:
  - **Workspace (logical px):** `px = round(mm × PX_PER_MM)`, `PX_PER_MM = 3`.
  - **Print sampling (device px):** `px = round(mm × dpi / 25.4)`.
- Screen zoom/pan is a view transform, never a physical unit.
- `cm` exists only on `product.sizes` seed config; `toMm` (`cm × 10`) is the single cm→mm converter in
  `catalog.service.ts`.

### AD-2 — One geometry authority: blueprint → dieline → consumers
- Authoritative: `editorDefaults` blueprint (**faces** in mm, **zones** in mm, **dieline** template).
- Derived: 2D canvas size, zone overlays, 3D mesh, texture UV, export pages, prepress geometry.
- No consumer may derive faces from constants; `BoxModels.tsx` geometry reads the blueprint (fallback:
  store `model.dimensions`), never standalone constants.

### AD-3 — Blueprint lives inside `editorDefaults` (hybrid ProductStructure + Dieline); NO new Prisma model
- The audit (§12) and decision requirement #3 favor the minimum architecture. `Product.editorDefaults`
  already carries `structure`; M8-B grafts `schemaVersion`, `unit`, and `dieline` onto the same JSON.
  This provides versioning + reproducibility + product specificity without schema migration.
- Persistence of a *snapshot* manifest goes into `Design.designData` (existing Json column), not a new
  relation.

### AD-4 — `PX_PER_MM = 3` is the single workspace factor
- Store already computes `Math.round(mm × 3)`; ZoneOverlays already uses `scale=3`. Naming the constant
  (vs literals) and fixing the 800×600 canvas is minimal-change.
- `TEXTURE_PX_PER_MM = 5` is an independent rendering resolution for 3D textures — named separately,
  NOT a geometry factor.

### AD-5 — Backend prepress is the authority; frontend mirrors for UX (explicit boundary)
- SPEC-005 production-file rules (resolution/DPI, color mode, fonts, corruption, compression) are
  **backend-only**, centralized in the prepress engine, invoked via `prepress.controller.ts`.
- Frontend `print-validation.ts` mirrors **geometry** rules only (bleed/safe/overlap/zone/face-bounds/
  dieline consistency), used for live editor feedback and as an export-gating **hint**, never as
  production certification.
- Shared physical constants + shared semantic geometry contract; the FE is intentionally lighter. No FE
  test certifies CMYK/font-embedding/corruption/DPI; no backend test depends on FE validation.

### AD-6 — Export math is physical
- Every export samples `px = round(mm × dpi / 25.4)` per face. The `(dpi/72)*800` pattern is banned.
- AI/EPS: foundation = structured SVG serialization from the geometry engine + Figma-style layer groups;
  claims of "production CMYK AI/EPS" are NOT made (see §12 & §21).

### AD-7 — Design data is versioned, reproducible, and provenance-aware
- `designData.schemaVersion` (start at `2`). M8-native designs embed the resolved-geometry manifest
  (blueprint + variant dims + faces + zones + path dieline + bleed/safe config) with
  `manifestSource: "blueprint"` and `reproducibility: "exact"`.
- Legacy M7 blobs migrate with `manifestSource: "migrated"` and `reproducibility: "best_effort"` —
  artwork/layers/product/variant preserved; geometry reconstructed from the **current** blueprint and
  **explicitly NOT claimed as historically exact** (AMENDMENT 3). Migration never rewrites the M7 data
  model and never breaks M7 reopen.
- The manifest is a snapshot of **canonical resolved geometry** (blueprint → dieline → resolved
  faces/zones), independent of export: an exported file is never required to produce or reproduce it
  (AMENDMENT 5).

---

## 6. Canonical Units

Defined in a new shared module `frontend/lib/editor/geometry/units.ts` (M8-A):

```ts
export const MM_UNIT = "mm"
export const PX_PER_MM = 3                 // workspace factor (AD-4)
export const TEXTURE_PX_PER_MM = 5         // 3D texture sampling resolution (AD-4)
export const MM_PER_CM = 10
export const DPI_MIN = 300                 // SPEC-005 ≥300
export const BLEED_MM = 3                  // SPEC-005 ≥3mm
export const SAFE_MM = 5                   // SPEC-005 ≥5mm
export const ZONE_MATCH_TOLERANCE_MM = 5   // required-zone anchor tolerance

export const mmToPx = (mm: number) => Math.round(mm * PX_PER_MM)
export const pxToMm = (px: number) => px / PX_PER_MM
export const pixelsAt = (mm: number, dpi: number) => Math.round((mm * dpi) / 25.4)
export const facePanel = (dims, faceId) => ({ w, h }) // mm panel extent, see §7
```

No other px/mm conversion factor is permitted. The legacy 3.779 factor (`DesignValidator.ts`) is
deleted in M8-A; its consumer is redirected to `print-validation.ts` (M8-F).

---

## 7. Canonical Geometry Model

**Face identity.** The 12-FaceId set in `frontend/lib/editor/state/types.ts` is canonical:
`front/back/left/right/top/bottom`, `inside_front/inside_back/inside_left/inside_right/inside_top/
inside_bottom`. `inside_*` maps to its outer sibling for 3D validity and for texture fallback.

**FaceId vs MeshPartId (ratified — AMENDMENT 1).** Two distinct, non-interchangeable identity spaces:

- **FaceId** — the editor/print identity space. Represents an editable/printable physical packaging
  face (`front`, `back`, `left`, `right`, `top`, `bottom`, `inside_top`, …). The canonical 12-FaceId
  union is the editor/print identity and is **NOT** expanded to represent arbitrary 3D mesh pieces.
- **MeshPartId** — the 3D rendering topology. Represents a rendered mesh component (`top_panel`,
  `top_flap_a`, `top_flap_b`, `left_panel`, `base`, `lid`, …).

Relationship (documented, strictly directional):

```
FaceId ──maps to──▶ 0..N MeshPartId ──▶ 3D mesh geometry ──▶ texture/material resolution
```

Rules:
- A MeshPartId MAY reference a FaceId; it MUST NOT automatically become a new FaceId.
- **Texture/material resolution is keyed by FaceId.** All mesh parts sharing a FaceId sample the same
  FaceId artwork through UV regions (sub-rectangles of the face texture).
- **Mesh geometry is keyed by MeshPartId.** Flap/slot/glue geometry lives in mesh topology, never in
  the FaceId set.
- A flap covering only part of a panel area maps UV to the corresponding **sub-region** of the FaceId
  artwork — it must NOT consume a full-panel texture, and it must NOT invent a new editable FaceId.
- Only FaceIds are validation/print identities; MeshPartIds are rendering labels and never appear as
  printable faces in the manifest.

Example (mailer, only when the blueprint physically declares flaps):

```
FaceId = top  ──▶  MeshPartId = top_panel    (full UV)
              ──▶  MeshPartId = top_flap_a   (partial UV region)
              ──▶  MeshPartId = top_flap_b   (partial UV region)
```

**Face ↔ product-axis mapping (mm), the ONLY mapping used to size faces:**

| FaceIds | panel w | panel h | normal (depth) |
|---|---|---|---|
| `front, back, inside_front, inside_back` | `length` | `height` | `width` |
| `left, right, inside_left, inside_right` | `width` | `height` | `length` |
| `top, bottom, inside_top, inside_bottom` | `length` | `width` | `height` |

This replaces the ambiguous `{width,height,depth}` seed naming with a deterministic function
(`facePanel(dims, faceId)`). The seed already complies (front: w=115=length, h=38=height).

**DielineGeometry — canonical model (mm) — AMENDMENT 2.** Two layers produced by the geometry engine
(M8-C):

- **Semantic panels** describe physical faces (rectangular extent metadata).
- **Physical paths** describe the ACTUAL dieline geometry (production cut, fold, score, glue,
  perforation) in mm.

The rectangle boundary of a panel is a semantic extent, **NOT** the only representation of the
production cut line. `buildDieline()` must emit panels AND paths. Paths support at least line segments
and polylines; the model does not preclude future bezier curves / arcs, but curves are not implemented
in M8 unless a current product requires them (the mailer slice is rectangular — no fabricated curves).

```ts
type LineClass = "cut" | "fold" | "score" | "glue" | "perf"
type EdgeName  = "top" | "right" | "bottom" | "left"

type DielinePoint = { x: number; y: number }                 // mm
interface DielinePath {
  id: string
  faceId?: FaceId                            // owning face, when the path bounds/scores that face
  class: LineClass
  points: DielinePoint[]                     // polyline (open or closed) in mm
  closed?: boolean
  curve?: { type: "bezier" | "arc"; ... }    // future-capable; unused in M8
}

interface DielinePanel {                     // semantic metadata: rectangular extent of a face
  faceId: FaceId
  x: number; y: number                       // mm, origin = flat-layout top-left
  w: number; h: number                       // mm panel extent (facePanel result)
  rotation: 0 | 90 | 180 | 270
  edges: Partial<Record<EdgeName, { class: LineClass; to?: FaceId | "glue_flap" | "none" }>>
}

interface DielineGeometry {                  // M8-C output of buildDieline(blueprint, dims)
  schemaVersion: number
  boxType: string                            // canonical ProductType (underscored)
  dims: { length: number; width: number; height: number; unit: "mm" }
  panels: Record<FaceId, DielinePanel>       // semantic faces (mm extent)
  cutPaths: DielinePath[]                    // production cut lines (polylines, mm)
  foldPaths: DielinePath[]
  scorePaths: DielinePath[]
  gluePaths: DielinePath[]
  perfPaths: DielinePath[]                   // perforations (future-facing; may be empty in M8)
  outline: DielinePath[]                     // outer flat boundary (closed)
  adjacency: Array<{ a: FaceId; b: FaceId; via: EdgeName; class: LineClass }>
  faceRelationships: Array<{ faceId: FaceId; meshPartIds: string[] }>   // AMENDMENT 1 mapping
}

interface DielineBlueprint {                 // per-product template, stored in editorDefaults (M8-B)
  schemaVersion: number
  boxType: string                            // canonical ProductType (underscored)
  faceOrder: FaceId[]                        // left→right panel order of the blank
  panels: Record<FaceId, DielinePanel>
  outline: { w: number; h: number }          // mm bounding box of the flat
}
```

`DielineBlueprint` remains the panel-based template; the engine derives path geometry from it.
`serializeSVG()` derives SVG `<path>` / `<g data-face-id>` output from **DielineGeometry paths and
panels**, not from rectangles alone. `DielineCanvas`/`DielineEditor` render the canonical geometry; the
0.5 `generateDieline` display scale is removed (M8-C).

An explicit unit test proves a **non-rectangular / angled path** can exist in `DielineGeometry` without
requiring a new FaceId (AMENDMENT 2 acceptance, §16). For the mailer vertical slice, rectangular
geometry remains acceptable because that is the actual physical geometry.

**Zones.** `EditorConfigLike.structure.zones` (`position: [number, number, number]`, mm) remain
authoritative, inherited verbatim into the manifest.

---

## 8. Product / Dieline Model

**Blueprint shape** (per product, stored in `Product.editorDefaults`):

```jsonc
{
  "schemaVersion": 1,
  "unit": "mm",
  "boxType": "mailer-box",
  "structure": { "faces": {...mm...}, "zones": {...mm...}, "rules": {...} }, // existing
  "dieline": { "faceOrder": [...], "panels": {...}, "outline": {...} },       // NEW (M8-B)
  "prepress": { "caliperMm": 0.5, "fluteType": "E", "glueFlapToleranceMm": 1.5 },
  "...existing keys": "unchanged"
}
```

Backend impact: **JSON-only** — `seed.ts` authoring + `catalog.service.ts` passes the blueprint
through unchanged (it already returns `editorDefaults.structure`). `getEditorConfig` may additionally
return `dieline` + `schemaVersion`; the API response shape gains fields, none removed.

Frontend `EditorConfigLike` (`store.ts`) extends additively:
`dieline?: DielineBlueprint`, `schemaVersion?: number`, `unit?: "mm"`.

Mailer (F42 115×70×38mm) invariant: front panel `115×38`, top panel `115×70`, left `70×38`.

**Path-capable templates (AMENDMENT 2).** Blueprints may declare template edge/feature records (tabs,
notches, angled cuts) that `buildDieline()` materializes as `DielinePaths`. Template panels remain the
rectangular semantic extent; the engine owns path output. The M8 mailer template is fully rectangular;
non-rectangular path authoring for products that need it lands in M8-J/post-M8 as physically required
(§14). The engine's path model is not limited to rectangles.

---

## 9. 2D Requirements

For every supported product (M8-D), given the blueprint:

- The fabric canvas is sized from the selected face's mm panel via `PX_PER_MM` — **not** 800×600.
  `DesignCanvas2D.tsx` consumes `store.canvas.width/height` (already correct in the store; the canvas
  component must stop overriding it).
- Dieline overlay: the canonical dieline **paths** (cut=red-ish, fold/score=dashed, glue=marked) from
  `DielineGeometry` are drawn on the 2D canvas, honoring `scale` as a pure view transform. The overlay
  derives from paths, not from panel rectangles.
- ZoneOverlays size from the same mm→px rule; 3mm bleed and 5mm safe are real millimeters.
- Layer positions remain store-relative px but are interpreted as `px = mm × PX_PER_MM`; hot-path
  `mmToPx/pxToMm` helpers centralize conversions. `addLayer` centering uses the store canvas midpoint.
- Face switching (`setSelectedFace`) already emits the per-face canvas — the canvas component must
  honor it.

Acceptance (F42 mailer): front-face canvas = `345 × 114` logical px exactly (`115×3`, `38×3`);
a 3mm bleed overlay spans exactly 9px on screen.

---

## 10. 3D Requirements

For every supported product (M8-E):

- **Deterministic FaceId mapping** — `Dieline FaceId → 2D FaceId → 3D mesh `userData.faceId` → texture`.
  The same FaceId set is used in all four layers (editor/print identity); `inside_*` maps to its outer
  sibling only as a *fallback* texture (via the existing `resolveFaceMaterial` pattern), never as the
  primary binding.
- **MeshPartId topology (AMENDMENT 1).** Every rendered mesh carries a unique `userData.meshPartId`
  (`top_panel`, `top_flap_a`, `top_flap_b`, `left_panel`, …). `userData.faceId` on any mesh references
  its editable FaceId. Invariants: no two distinct mesh parts share one MeshPartId; no mesh part
  invents a FaceId when it is only a physical sub-piece; every printable/editable face has a valid
  FaceId; texture resolution is keyed by FaceId; mesh geometry is keyed by MeshPartId.
- **All product types bind textures**, not just MailerBox. ShippingBox/RigidBox/FoldingCarton/PizzaBox
  consume the `textures` prop and assign per-face materials keyed by `userData.faceId`.
- **Mailer flap defect resolved.** The two top-flap meshes are distinct MeshPartIds (`top_flap_a` /
  `top_flap_b`) and MUST NOT both report the same MeshPartId or the same FaceId-as-identity; they MAY
  both reference FaceId `top` for texture. Flap UV maps to the **sub-region** of the `top` FaceId
  artwork that the flap physically covers — a flap never samples a full `length×width` texture onto a
  half panel, and never introduces a new FaceId.
- Mesh dimensions derive from blueprint dims (fallback to store `model.dimensions`).
- Internal flaps/interiors that exist in the dieline render with `inside_*` ids when the structure
  declares them.
- `TEXTURE_PX_PER_MM = 5` is a named constant; no new scale literals.

Acceptance (AMENDMENT 1): for MailerBox, scene-graph shows each MeshPartId unique; every printable
face has a valid FaceId; picking each of front/back/left/right/top/bottom (+ inside faces where
declared) in 3D opens exactly that 2D face (M7-D pattern) with the same art; flaps reference FaceId
`top` for texture via a UV sub-region and never carry a full-panel texture incorrectly; zero accidental
duplicate FaceId assignment where a mesh part is expected to be distinct.

---

## 11. Prepress Requirements (split required vs deferred)

Sources: `spec-005-prepress.md`, audit §10.

**Responsibility boundary (AMENDMENT 4):**
- **M8-F — Frontend geometry validation** (UX mirror, NOT authoritative): bleed geometry, safe-area
  geometry, layer overlap, zone placement, face bounds, dieline/face geometry consistency, geometry
  integrity. Input: canonical geometry + editor layer state. Units: mm. Purpose: live editor feedback +
  export-gating hint.
- **M8-I — Backend production prepress** (authoritative): resolution/DPI, color mode, fonts
  embedded/outlined, file corruption, compression/quality, **plus** geometry validation against the
  persisted manifest (bleed, safe area, overlap), production proof generation, final production gate.
  Input: persisted design manifest + production files.
- Both consume the same physical constants and the same semantic geometry contract; the FE is
  intentionally lighter. **No M8-F test certifies CMYK/font-embedding/corruption/DPI. No M8-I test
  relies solely on frontend validation.** The backend is the final authority.

### M8 REQUIRED (implemented + tested)
| Check | Rule | Owner | Acceptance |
|---|---|---|---|
| Resolution | ≥300 DPI | backend (`resolution.validator.ts` EXISTS, reused) | file @300 ok / @72 fail |
| Color mode | RGB rejected / CMYK required (uploaded files) | backend (`color.validator.ts` EXISTS, reused) | CMYK pass, RGB warn/fail per SPEC-005 |
| Bleed (geometry) | ≥3mm around every printed face | backend `prepress.service.ts` (new real impl) + FE mirror | manifest edge distance ≥ 3mm → pass |
| Safe area (geometry) | content ≥5mm from trim where zones require | backend + FE mirror | outside-safe → fail |
| Overlap (geometry) | no layer overlap beyond tolerance | backend + FE mirror | two stacked full-bleed layers → fail |
| Fonts embedded/outlined | designData fonts declared; embedded/outlined on the exported proof | backend (PDF scan) | outlined/embedded → pass, else warning |
| Corruption | uploaded file parses | backend (`file-processor` exists) | corrupt → fail |
| Compression | quality ≥80% (raster) | backend (sharp `checkPrintRequirements`) | degraded file → warning |
| Persistence | `PrePressCheck.fixedAutomatically` populated | backend | set true when auto-fix applied |

### M8 FOUNDATION (mechanism, not full productization)
- Soft proof PDF: `ProofGeneratorService.generateProof` **embeds the real per-face print pages**,
  crop/trim marks, dieline overlay, color/registration bars (SPEC-005 soft-proof). The current
  "Print file will be embedded here" placeholder is replaced (M8-I).
- 72h auto-escalation reminder queue: **deferred** (needs reminder-queue work; SPEC-005).

### DEFERRED (explicitly NOT in M8)
- 3D print simulation, Pantone verification, AI design-quality scoring, automatic color conversion
  (SPEC-005 "out of scope" list already excludes these; re-affirmed).
- Approval workflow UI/auto-escalation beyond the existing proof token mechanism.
- Real-time re-check on every keystroke (M8 frontend mirror is synchronous, cheap, no queue).

---

## 12. Export Requirements

Dimensional math is fixed: every exported face is rasterized at `px = round(mm × dpi / 25.4)`.
The `(dpi/72)*800` pattern is removed.

| Format | M8 status | Behavior (M8) |
|---|---|---|
| PDF | **M8 production requirement** | Per-face pages (all printed faces incl. inside when `printSides=2`), each page sized to face mm at chosen dpi with bleed + crop marks + dieline overlay; A4 multi-page layout; metadata. |
| PNG | **M8 production requirement** | Per-face raster at `mm × dpi/25.4`; exports ALL faces (composite or selectable); drops the first-face-only behavior. |
| JPG | M8 production requirement | Same as PNG with JPEG encoding (white background composite). |
| SVG | **M8 production requirement** | Structured vector: each face a `<g>` group, canonical FaceId as group id; path bodies from `DielineGeometry` (`cutPaths`/`foldPaths`/`scorePaths`/`gluePaths`), NOT raw `fabric.toSVG()` of an 800×600 canvas. |
| AI | **M8 foundation (honest labeling)** | PostScript shell around real mm-space SVG serialization from geometry engine. NOT claimed CMYK/print-ready (the current `vector-export.ts` wrapper is post-processed, not rewritten). |
| EPS | **M8 foundation** | Same honest labeling; wrapper → vector serialization with faceId groups. |

Dieline overlays in PDF/PNG and the SVG path bodies derive from `DielineGeometry` **paths**, not panel
rectangles (AMENDMENT 2).

`ExportDialog` gating: disabled unless `validatePerFace` (or pending) passes in `DRAFT`/`APPROVED`;
`DesignLifecycleService.canExport` is the server gate.

Backend export worker (`export.worker.ts`) remains placeholder through M8 — real server-side
rasterization of the same manifest is a post-M8 production-hardening item (§21).

---

## 13. Persistence & Versioning

**schemaVersion.** `Design.designData.schemaVersion` (`number`, starts at `2`; `1`/absent = legacy M7
blob).

**Provenance & reproducibility (AMENDMENT 3):**

| design origin | `manifestSource` | `reproducibility` | semantics |
|---|---|---|---|
| M8-native (created/saved under M8) | `"blueprint"` | `"exact"` | persisted resolved manifest is authoritative; geometry reproduced exactly after future ProductStructure edits |
| Legacy M7 (no historical geometry manifest) | `"migrated"` | `"best_effort"` | migration preserves artwork/layers/text/transforms/product+variant identity; reconstructs manifest from the **current** blueprint; a reconstructed representation, **not** proof of historical physical geometry |

A migrated M7 design MAY use the current blueprint to build its migration manifest, but the system MUST
NOT claim historical exactness for it. Migration does not rewrite the M7 data model and does not break
M7 reopen/traceability.

**Geometry manifest** persisted inside `designData` (M8-H):

```jsonc
{
  "schemaVersion": 2,
  "manifestSource": "blueprint" | "migrated",
  "reproducibility": "exact" | "best_effort",
  "product": { "id": "prod-mailer-box", "slug": "custom-mailer-box", "boxType": "mailer_box" },
  "variant": { "id": "...", "sku": "...", "dimensions": { "length": 115, "width": 70, "height": 38, "unit": "mm" } },
  "faces": { "front": { "w": 115, "h": 38 }, "...": "..." },          // resolved canonical faces (M8-C/D/E)
  "zones": { "front": [ ...mm positions... ] },
  "prepress": { "bleedMm": 3, "safeMm": 5, "dpiMin": 300, "caliperMm": 0.5 },
  "dieline": { ...resolved DielineGeometry snapshot (panels + paths, mm)... }
}
```

**Manifest is independent of export (AMENDMENT 5):** the manifest is a snapshot of canonical resolved
geometry (blueprint → dieline → resolved faces/zones), NOT a snapshot of an exported file. Export
consumes the manifest/geometry; the manifest does NOT depend on export succeeding or existing. Saving is
permitted on DRAFT designs even when export is unavailable.

**Deterministic reopen:** for `manifestSource: "blueprint"`, the store re-inits from the manifest (not
the live blueprint) — reopening reproduces the exact geometry even if ProductStructure changed today.
For `manifestSource: "migrated"`, reopen preserves the migrated artwork and reconstructed geometry,
flagged `best_effort`.

**Lifecycle gate:** `saveDesign` rejects non-DRAFT sessions server-side (message surfaces as a toast on
the client). This is behavior-only; no route change.

> **Guarantee (acceptance — AMENDMENT 3/5):** If `ProductStructure` changes tomorrow, an M8-native
> order (`reproducibility: "exact"`) created before the change still reproduces the exact geometry
> (faces, zones, paths/dieline, bleed/safe) used at creation, because the snapshot manifest is
> authoritative. A legacy M7 order is preserved artifact-for-artifact but its geometry is explicitly
> `best_effort` — the engine never reports historical exactness for it.

---

## 14. Product Coverage

| Product (seed id / boxType) | Current geometry | Required M8 | Notes |
|---|---|---|---|
| `prod-mailer-box` / `mailer-box` | Full structure+faces+zones (mm) | Vertical slice — blueprint + dieline + all derived layers | Primary acceptance target every milestone |
| `prod-product-box` / `folding-carton` | No structure; generic FoldingCarton 3D | Blueprint + dieline + 2D/3D/export parity (M8-J) | weighing machine box; flaps + glue |
| `prod-shipping-box` / `shipping-box` | No structure; ShippingBox 3D no textures | Blueprint + parity (M8-J) | corrugated, flute B |
| `prod-rigid-box` (if present) / `rigid-box` | No structure; RigidBox 3D no textures | Blueprint + parity (M8-J) | lid/base; treat as two-piece blank |
| `prod-pizza-box` (dieline generator exists) | No structure; PizzaBox 3D no textures | Blueprint + parity (M8-J) | single-piece flap blank |
| `prod-paper-bag` / `paper-bag` | No structure; CarrierBag 3D no faceId | Blueprint + parity or **explicit deferral** | bag = 2+2 side panels + gusset; if authoring unsafe in M8, defer to post-M8 with clear flag |
| `prod-poly-mailer` / `poly-mailer` | No structure | Blueprint + parity or **explicit deferral** | single-face + back panel |
| `prod-label` / `label` | No structure; flat dieCut | Blueprint + parity or **explicit deferral** | 1-panel; zones on single face |

**Rule:** generic box geometry is never used for a product whose physical structure differs (bag,
poly-mailer, label). If a product's blueprint cannot be authored safely in M8, it is **explicitly
deferred** in M8-J with a `support: "deferred"` marker — never shipped with fake geometry. At minimum,
the mailer, folding carton, and shipping box are M8-required.

---

## 15. Milestone Definitions

| ID | Name | Capability established |
|---|---|---|
| M8-A | Physical Geometry Foundation | Units module, single PX_PER_MM, canvas sizing fix, zone coordinate normalization, legacy validator removal |
| M8-B | Packaging Blueprint & Dieline Template | `editorDefaults` blueprint (schemaVersion/unit/dieline/prepress), backend pass-through, store additive types, mailer dieline template |
| M8-C | Canonical Dieline Geometry Engine | mm-space semantic panels + physical cut/fold/score/glue/perf **paths** from blueprint; retire die-line stub; DielineCanvas/Editor render it; structured SVG from paths |
| M8-D | 2D Editor Integration | mm-sized canvas, dieline overlay, true-mm zones, consistent layer math |
| M8-E | 3D Deterministic Mapping & Texture Parity | all types bind textures; deterministic FaceId (editor identity) + unique MeshPartId (mesh topology); mailer flap UV sub-region fix; blueprint-driven meshes |
| M8-F | Unified Frontend Geometry Validation (UX mirror) | real bleed/safe/overlap geometry rules only; no CMYK/font/DPI authority; single engine; dead constants removed; legacy validator deleted |
| M8-G | Export & Soft-proof Foundation (FE) | mm→DPI sampling, per-face PDF/PNG/JPG, structured SVG (from paths), honest AI/EPS foundation |
| M8-H | Persistence & Reproducibility | schemaVersion + resolved-geometry manifest (provenance exact/best_effort), manifest independent of export, deterministic reopen, lifecycle save gate, DB roundtrip assertions |
| M8-I | Backend Prepress (Authoritative) & Soft Proof | authoritative production prepress (DPI/color/fonts/corruption/compression + geometry vs manifest), fixedAutomatically, proof embeds print pages, controller wired |
| M8-J | Product Coverage Completion & Closure | remaining product blueprints/dielines, coverage matrix, three-run regression, acceptance sign-off |

---

## 16. Acceptance Criteria

Global M8 acceptance matrix (expands audit §Acceptance Model):

| Area | Requirement | Verification |
|---|---|---|
| Units | All physical geometry in mm; only `PX_PER_MM` and `dpi/25.4` convert to px | Unit + integration |
| Authoritative geometry | Exactly one blueprint source; 2D/3D/dieline/export/prepress derive from it | Unit + E2E |
| Canvas sizing | F42 mailer front face → `345 × 114` logical px; no 800×600 anywhere | E2E screenshot assert |
| Zones | 3mm bleed = 9px at `PX_PER_MM=3`; safe zone metric in mm | Unit + E2E |
| Dieline | Structured mm-space paths (cut/fold/score/glue/perf) + semantic panels + faceRelationships; F42 top panel `115×70` mm | Unit + E2E dieline view |
| 3D mapping | `Dieline FaceId → 2D FaceId → mesh userData.MeshPartId → texture`; MeshPartIds unique across meshes; flap UV sub-region of FaceId artwork | E2E (M7-D pattern) |
| Flaps | No two distinct meshes share a fake `"top"` + wrong texture; flap `MeshPartId` distinct from face `MeshPartId` | E2E visual + code assert |
| Validation (FE) | Bleed/safe/overlap geometry check in frontend mirrors backend values; no FE certifies CMYK/fonts/corruption/DPI | Unit + E2E |
| Validation (BE) | Authoritative: resolution/DPI, color mode, fonts, corruption, compression + geometry vs manifest; fixedAutomatically populated | Unit + integration |
| Export | `px = round(mm × dpi/25.4)`; all faces present; SVG paths from DielineGeometry; crop marks + dieline | Unit + E2E (file open) |
| Versioning | `schemaVersion ≥ 2`; manifest present on reopen; legacy M7 = `manifestSource:"migrated"`, `reproducibility:"best_effort"` | DB assertion |
| Reproducibility | M8-native (`exact`): order reproduces pre-change geometry after ProductStructure edit; M7-migrated (`best_effort`): geometry reconstructed, NOT historical | DB + E2E |
| Manifest independence | Manifest snapshots resolved geometry; export consumes manifest; manifest does NOT depend on export | Unit |
| Product coverage | mailer/folding-carton/shipping-box pass; others flagged explicitly | E2E matrix |
| Gate | Export/prepress blocked unless `canExport` (DRAFT/APPROVED) | Integration |
| Regression | M7-A…M7-E green; `Design.id === CartItem.designId === OrderItem.designId` intact | Full suite ×3 |

Per-milestone acceptance criteria are enumerated in `M8_PLAN.md` in the measurable form
("Given … the canonical geometry reports … exactly … mm / `px = mm×PX_PER_MM` …").

---

## 17. Test Strategy

- **Unit (Vitest):** `units.ts` conversions; `facePanel` mapping matrix; dieline generator (semantic
  panels, physical paths incl. a **non-rectangular** path test, line classes/adjacency, mm) — paths are
  first-class, not panel rects; validator rules (bleed/safe/overlap) with the geometry helpers;
  `FaceId ↔ MeshPartId` relationship matrix (1→0..N, no invented FaceIds).
- **Unit (backend):** prepress `PrePressCheckResult` matrix; proof generator placeholders removed;
  manifest roundtrip preserves `manifestSource`/`reproducibility`; export-consumes-manifest direction
  asserted (no manifest dependency on export).
- **Integration (Supertest):** `POST /catalog/:slug/editor-config` returns blueprint fields;
  `POST /designs/:id/export` respects `canExport`; `checkOrderDesign` returns non-stub geometry results;
  save on non-DRAFT rejected (lifecycle gate).
- **E2E (Playwright, real Postgres via `e2e/db.ts`):**
  - Canvas size assertion for F42 (`window.__fabricCanvas` width/height).
  - Dieline overlay visible in dieline mode; flap ids distinct (code-asserted on 3D scene graph).
  - M7-D face picking across all six faces + one inside face (mailer).
  - Export: generated PDF/PNG pass a deterministic size check (rounded pixel dims) and the SVG carries
    `DielineGeometry` path bodies per face group.
  - Persistence: save with art → reopen → identical manifest; ProductStructure edit → old design
    unchanged (DB assertions); **no M8-F test certifies CMYK/fonts/corruption/DPI** — those live in
    M8-I backend tests only.
- **Visual/geometry assertions:** screenshots asserted against computed mm→px bounds (not free-form).

---

## 18. Regression Strategy

- **Per milestone (M8-A … M8-I):** run targeted specs for the milestone + the full M7 group
  (`m7-a…e`, `editor-flow`) — must stay green.
- **At M8-J:** run the complete E2E suite at least **three consecutive times**; record result matrix
  in `M8_TASKS.md`/final report.
- **Baseline to preserve:** 35 passed / 1 environment-limited failure. The
  `cart-checkout.spec.ts:187` Stripe-placeholder cart-clear failure is an environment limitation and
  **is not an M8 regression**; it remains documented as-is.
- The traceability contract `Design.id === CartItem.designId === OrderItem.designId` (same SKU) must
  not be touched by any M8 change.

---

## 19. Dependency Graph

```
A: M8-A Foundation            (units, PX_PER_MM=3, canvas sizing, mm zones)
   │  every other milestone consumes units.ts + canvas sizing
   ▼
B: M8-B Blueprint & Dieline Template  (schemaVersion/unit/dieline/prepress blueprint)
   │  geometry engine + 2D + 3D + export all read the blueprint
   ▼
C: M8-C Canonical Dieline Geometry Engine (semantic panels + physical cut/fold/score/glue/perf paths)
   ├─────────────────────────────┐
   ▼                             ▼
D: M8-D 2D Mapping        E: M8-E 3D Deterministic Mapping
   (D ⟂ E independent, both consume C)
   │
   ▼
H: M8-H Persistence & Reproducibility
   │  manifest snapshots RESOLVED geometry from C/D/E (provenance exact|best_effort)
   │  manifest is independent of export (does NOT depend on F/G)
   │
   ▼
F: M8-F Frontend Geometry Validation (UX mirror: bleed/safe/overlap/zone/face-bounds only)
   │
   ▼
G: M8-G Export & Soft-proof FE (mm→dpi math, per-face files, converts manifest + paths)
   │
   ▼
I: M8-I Backend Prepress (AUTHORITATIVE: DPI/color/fonts/corruption/compression + geometry vs manifest)
   │  consumes persisted manifest (H), NOT live state; H→I edge (manifest input to prepress)
   ▼
J: M8-J Product Coverage & Closure (remaining blueprints + full regression)
```

Domain rationale (AMENDMENT 4 + 5 — the architecture depends on RESOLVED GEOMETRY, not files):

- **A→B**: blueprint adds units+versioning; A defines the constants B records in `prepress`.
- **B→C**: geometry engine only has meaning against a blueprint's panel graph.
- **C→D/E**: both 2D overlay and 3D mesh are derived languages of the canonical geometry.
- **C→H**: the manifest is a snapshot of canonical resolved geometry produced by C→D/E — it is
  written directly from the engine, NOT from an export file.
- **H→F**: FE validation reads the persisted manifest + editor layer state; backend is still the
  authority.
- **F→G**: export is gated on validation (don't export failing designs).
- **H→I**: backend prepress consumes the persisted manifest (order-scoped, reproducible), plus a
  proof input from G where needed — the H→I edge means prepress depends on the manifest, not on G.
- **G/I→J**: coverage completes the products the hardened pipeline can now support safely.

Execution order: `A → B → C → (D ⟂ E) → H → F → G → I → J` — H is built immediately after the
resolve layer so the manifest is available to F, G, and I from the start.

No dependency flows export→manifest; saving/republishing never requires an export artifact.

---

## 20. Risks

| Risk | Mitigation |
|---|---|
| Canvas resizing breaks existing saved positions (px semantics shift) | All M8-D changes go through `mmToPx/pxToMm`; M7 e2e semantic asserts (+ position asserts in new specs) |
| Non-box products can't be safely blueprinted (bags/labels) | Explicit deferral rule (§14); never fake geometry |
| Mailer flap geometry change regresses M7-D face picking | M8-E re-runs `m7-d-face-picking.spec.ts` + new inside-face cases before the milestone completes |
| Backend prepress on order files differs from editor designData | Prepress engine takes the **persisted manifest** as primary input (H→I); file-based checks remain additive |
| Frontend validation over-claims authority (CMYK/fonts/DPI) | Explicit M8-F scope boundary (§4/§11): FE is a geometry UX mirror; production authority is M8-I only |
| Customer-facing SVG becomes a `fabric.toSVG()` re-export (rect-only, no geometry) | M8-G SVG contracts require `DielineGeometry` path bodies + canonical FaceId group ids; panel-rect fallback is a test failure |
| Legacy M7 migration reports historical exactness it cannot prove | `manifestSource:"migrated"` + `reproducibility:"best_effort"` enforced by the migration path; docs/tests forbid claiming historical geometry |
| Reopening legacy assets diverges from stored manifest semantics | Deterministic reopen keyed off manifest, not live blueprint; legacy reopen preserves migrated artifact + best_effort flag |
| Stripe placeholder env failure | Preserved as environment-only; never asserted as M8 pass/fail |
| `saveDesign` gate breaks auto-save flows | Gate only reject non-DRAFT; store keeps DRAFT autosave path untouched |
| Export worker remains placeholder | Explicitly scoped as deferred (§21); frontend export is the M8 path |

---

## 21. Deferred Scope

Explicitly NOT in M8 (preserved boundaries from audit §18 + SPEC-005):
- Mobile/tablet editor; Vendor/Admin portal completion; brand-kit & template-marketplace expansion.
- 4K 3D rendering/export (3D export still deferred per `spec.md`).
- Replacing Fabric.js / Three.js / rewriting the Zustand store.
- Rewriting M7 traceability or touching `Design.id === CartItem.designId === OrderItem.designId`.
- Backend `export.worker.ts` real rasterization & real S3 export URL — deferred to post-M8
  production hardening (its current placeholder is documented, not hidden).
- Production "print-ready CMYK AI" — M8 AI/EPS is a vector foundation, honestly labeled (§12).
- SPEC-005 auto-escalation (72h) reminder scheduling and full approval workflow UI.
- Pantone verification, AI scoring, automatic color conversion, 3D print simulation.

---

## 22. Definition of Done

M8 is complete only when:

1. Every audit GAP maps to a milestone (A–I) or an explicit deferral (§21). — *Gap matrix in `M8_TASKS.md`.*
2. Every milestone dependency verified against §19 and the implementation order
   `A → B → C → (D ⟂ E) → H → F → G → I → J` in `M8_PLAN.md`.
3. Every milestone has objective acceptance criteria (§16 + per-milestone in `M8_PLAN.md`), each with a
   verification method (§17).
4. Physical units are unambiguous (§6) — mm canonical, named conversion helpers only.
5. Geometry source of truth is unambiguous (§7/§8) — blueprint → resolved geometry (manifest)
   → consumers.
6. 2D/3D/export relationships unambiguous (FaceId + MeshPartId contract §10, export math §12).
7. Prepress authority unambiguous (§11) — backend authoritative (M8-I), FE geometry UX mirror (M8-F);
   **no FE test certifies CMYK/fonts/corruption/DPI**.
8. Persistence/versioning strategy unambiguous (§13) — schemaVersion + provenance-exact manifest +
   lifecycle gate; **manifest independent of export**.
9. Product coverage explicit (§14) — required vs deferred flag on every product.
10. Prisma impact is explicit: **none beyond reading existing JSON columns** (decision AD-3).
11. M7 regression contract preserved — full suite ×3 green in M8-J with only the documented Stripe
    environment limitation remaining.
12. Legacy migration honestly scoped (AMENDMENT 3): migrated M7 designs are reproduced
    `best_effort`, never claimed historically exact.
13. Scope boundaries respected — no implementation from M8 until the plan is approved; no M7 edits.
    All plan approvals are specification-only.