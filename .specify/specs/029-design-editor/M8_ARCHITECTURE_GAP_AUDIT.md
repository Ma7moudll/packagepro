# M8 Architecture Gap Audit — Professional Dieline & Prepress Engine

**Milestone:** M8 (Professional Dieline & Prepress Engine)
**Audit type:** Read-only architecture audit. No source/Prisma/API/UI/test/dependency changes were made.
**Date:** 2026-09-12
**Status:** Complete

Every claim is classified as **FACT** (verified in code), **INFERENCE** (derived from code), **GAP** (missing/broken), or **RECOMMENDATION**. All paths are exact.

---

## 1. M7 Baseline

**FACT — M7 is COMPLETE and CLOSED.** Evidence: `.specify/specs/029-design-editor/M7-E_REPORT.md`. Three consecutive full-suite regression runs each produced **35 passed / 1 failed**; the single failure is byte-for-byte identical across all three runs and is an environment limitation, not a defect:

- `frontend/e2e/cart-checkout.spec.ts:187` — `expect(hasDesign).toBeFalsy()` ("cart should be cleared after order"). The cart line for the test session is still present after Stripe webhook checkout because the dev Stripe key is a placeholder; `createPaymentIntent` rejects *after* the order row is created (order-first), so the Stripe-triggered cart clear never runs.
- The same environment block is acknowledged in the M7-C/D/E specs' harness and is the documented reason cart removal is asserted manually in `m7-e-traceability.spec.ts:212-222`.

**FACT — M7-D (physical 3D face picking → face ID → 2D editor) and M7-E (Design → Cart → Order traceability) are FIXED milestones and must NOT be revisited by M8.** `m7-d-face-picking.spec.ts` and `m7-e-traceability.spec.ts` (5/5, real Postgres) pass.

**FACT — M7 shipped four interlocking stacks that M8 must treat as baseline, not plan input:**
- Fabric.js 2D canvas (`frontend/components/editor/canvas/DesignCanvas2D.tsx`)
- Three.js 3D preview (`frontend/components/editor/canvas/DesignCanvas3D.tsx`, `frontend/components/design-editor/models/BoxModels.tsx`)
- Zustand design store with 50-step undo/redo and per-face layers (`frontend/lib/editor/state/store.ts`, `frontend/lib/editor/state/types.ts`)
- Real Postgres persistence with product/variant/SKU identity on every hop (`Design.id === CartItem.designId === OrderItem.designId`)

**FACT — M7 feature docs live in `.specify/specs/029-design-editor/`** (`spec.md`, `plan.md`, `tasks.md`, M7-D/M7-E reports). The M8 spec is not yet present in that directory; this audit is the first M8 artifact.

---

## 2. ProductStructure

**FACT — ProductStructure is NOT a standalone file or table.** It is nested as a `structure` key inside `editorDefaults` on the `Product` model:

- Prisma: `Product.editorDefaults Json?` (`backend/prisma/schema.prisma`)
- Backend source of truth: `backend/src/modules/catalog/catalog.service.ts` (M7 comment references structure at `catalog.service.ts:233`; `MAILER_BOX_STRUCTURE` and its `zones` are defined here and seeded).

**FACT — the frontend mirrors it via `EditorConfigLike`** in `frontend/lib/editor/state/store.ts`:

```ts
product.structure.faces: Record<string, { width?; height?; depth?; label }>
product.structure.zones: Record<string, Array<{ label; required; position: [number, number, number]; rotation? }>>
```

**FACT — FaceId space** (`frontend/lib/editor/state/types.ts`): 12 face IDs — 6 outer `front/back/left/right/top/bottom` + 6 `inside_front/inside_back/inside_left/inside_right/inside_top/inside_bottom`. `FaceZone = { label, required, position, rotation? }`.

**GAP — only ONE product seeds a `structure`.** `backend/prisma/seed.ts` seeds `structure` only for `prod-mailer-box`. The other five products (`folding-carton`, `shipping-box`, `paper-bag`, `poly-mailer`, `label`) have **no `structure`** in their `editorDefaults`. The frontend falls back to 12 default faces (`store.ts`), so non-mailer products currently get generic box geometry regardless of true shape.

**GAP — face units are not declared in the structure.** Seed structure faces carry mm values (e.g., mailer `front` = `{ width: 200, height: 100, depth: 150 }` in mm) while the product `sizes` in the same seed row are in cm (11.5cm etc.). The conversion (`toMm`, cm→mm ×10) is applied only at the API boundary, so any consumer reading `product.sizes` directly (e.g., packaging/quote UI) sees cm, and any consumer reading `structure` directly sees mm.

**RECOMMENDATION — M8:** add a `unit` field (or a documented invariant `structure.faces.* ⊆ mm` + `product.sizes.* = cm`) to `EditorConfigLike` and enforce the invariant in one shared helper. Extend `structure` to the other five products (or systematically drop the mailer-only structure and derive all faces from a canonical machine-readable dieline — see §4).

---

## 3. Dieline Capability

**FACT — a parametric dieline generator EXISTS.** `frontend/lib/editor/utils/dieline-generator.ts` has per-type generators: `mailer_box`, `shipping_box`, `rigid_box`, `folding_carton`, `pizza_box`, `pillow_box`. It is rendered/interacted with by:
- `frontend/components/editor/canvas/DielineCanvas.tsx` (zoom/pan/select-face, cutLines/foldLines render)
- `frontend/components/editor/panels/DielineEditor.tsx` (panel UI)

**FACT — the DielineCanvas coordinates are NOT millimeters.** `generateDieline` applies `scale = 0.5` to every face dimension and computes panel positions in that scaled display space. The generator is a *visualization*, not a production dieline.

**GAP — `frontend/lib/editor/services/dieline-service.ts` is a STUB:**
- `scaleSvgPath()` is a no-op — returns the input string unchanged (verified).
- 5 hardcoded SVG templates (front/back/left/right/top), no flaps, no fold lines.
- `checkElementOverlaps()` always returns `[]`.

`DielineEditor.tsx` consumes this service, so the panel shows static templates with zero production value.

**GAP — no dieline export.** Nothing serializes a parametric dieline to PDF/SVG/AI/EPS with flaps, fold lines, and cut/fold/glue-flap line classification. `ExportDialog.tsx` offers `includeDieLines` (see §7) but that draws a rectangle per face, not a true dieline.

**GAP — dieline generator returns `{ panels, cutLines, foldLines }`, but the geometry is computed per product in display space with no mapping back to mm and no glue-flap/fold-crease distinction beyond cut/fold arrays.**

**RECOMMENDATION — M8:** make `dieline-generator.ts` the geometry engine and make it emit **mm-space** geometry (drop or parameterize the 0.5 hard scale). Rebuild `dieline-service.ts` as a thin adapter (SVG/AI serialization) on top of the generator, and remove the hardcoded templates.

---

## 4. Geometry Source of Truth

**FACT — the catalog service is the current geometry source of truth.** `backend/src/modules/catalog/catalog.service.ts` `getEditorConfig`:
1. Queries product + default variant.
2. Builds `EditorConfig` containing `structure` (product-derived), variant dimensions (converted via `toMm`), material, pricing.
3. Served at `GET /catalog/:slug/editor-config` (`backend/src/modules/catalog/catalog.routes.ts`).

**FACT — the M7-D face-picking milestone established the rule that face IDs are selectable in 3D and open the matching 2D face** (`m7-d-face-picking.spec.ts`). That implies a *single canonical face ID system* — which today exists only in the mailer structure + `store.ts` defaults.

**GAP — there are THREE competing geometry views with no enforced authority:**
1. `Product.editorDefaults.structure.faces` (mm) — catalog-derived, mailer-only.
2. Frontend `store.ts` `initFromEditorConfig` — mm faces + canvas = `mm × 3` px; falls back to 12 defaults when no structure.
3. Frontend 3D `BoxModels.tsx` geometry constants — hardcoded box proportions per type (see §8), unrelated to both 1 and 2.

**GAP — the 3D model does NOT read the structure.** `BoxModels.tsx` derives its mesh from `model.dimensions` and per-type constants, not from `product.structure.faces`. A product whose structure defines a face that the mesh doesn't model (e.g., inside faces) silently drops it in 3D.

**RECOMMENDATION — M8:** demote the catalog `structure` to a *packaging blueprint* and promote the **canonical parametric dieline definition** (per product type) as the single source of truth: structure faces → dieline → face UV mapping → 3D mesh, all keyed on the same FaceId set. `catalog.service.ts` already owns the entry point; keep it as the orchestrator that returns the blueprint + variant + material, but derive faces from the dieline.

---

## 5. Face Dimensions

**FACT — face dimensions flow mm end-to-end:**
- `backend/prisma/seed.ts` `MAILER_BOX_STRUCTURE` faces are in mm (front `200 × 100`, etc.), four default sizes.
- `catalog.service.ts` `toMm` converts `product.sizes` cm → mm (×10) at the API boundary.
- Frontend `EditorConfigLike.structure.faces` (cm→mm already converted) → `store.ts` stores them as mm.
- `texture-generator.ts` `getFaceDimensions(face)` returns mm per face.

**FACT — the mm chain is internally consistent** for the mailer: seed size 11.5cm → 115mm variant dims → 345px canvas width (115 × 3).

**GAP — coverage.** Only the mailer product has a full 12-face structure. `paper-bag`, `poly-mailer`, and `label` are single/two-panel shapes; `folding-carton` and `shipping-box` are multi-panel — none have structures, so their face dimensions default to the generic 6-face box. Face dimensions are therefore correct *only* for mailer.

**GAP — ProductStructure face keys use `depth` for the third axis (`{ width, height, depth }`) while the rest of the system uses `length/width/height`.** `BoxModels.tsx`, `store.ts` model state, and the quote/package engine all speak `dimensions.length|width|height`. The structure's `depth` must be mapped to `width` somewhere — there is no single remap helper, so the mapping is ad hoc and not type-checked.

**RECOMMENDATION — M8:** define `FaceDimensions = { length, width, height }` as the single canonical type; make `structure.faces` reference mm `length/width/height` (drop `depth`), and derive every face panel's mm size from a face→axes mapping table (`front ⇒ length×height`, `top ⇒ length×width`, …) that also feeds the dieline.

---

## 6. mm → px Conversion

**FACT — four different scale factors exist in the codebase:**

| Scope | Factor | Source | Use |
|---|---|---|---|
| Store canvas size | `× 3` px/mm | `store.ts` `initFromEditorConfig` | `canvas.width = length*3`, `canvas.height = height*3` |
| Zone overlays | `scale = 3` (px/mm) | `frontend/components/editor/canvas/ZoneOverlays.tsx` | bleed 3mm, safe 5mm rendered via `scale` |
| 3D textures | `5` px/mm | `frontend/lib/editor/services/texture-generator.ts` | per-face texture rendering, `getFaceDimensions` mm → px |
| Legacy validator | `3.779` px/mm | `frontend/components/design-editor/validation/DesignValidator.ts` | viewport-based checks, 8.5×11" fallback |

**GAP — design canvas renders at mm × 3 but the fabric.js canvas is hard-coded 800 × 600 in `DesignCanvas2D.tsx`.** `DesignCanvas2D` accepts default props `width = 800`, `height = 600` and the fabric `Canvas` constructor is invoked with those; `store.canvas.width/height` (the mm×3 values) are *subscribed but never applied*. The bare `<canvas>` element has no `width/height` attributes, so fabric initializes to the passed props (800×600) regardless of product. Consequences (all verified in the call site):
- A 115mm-wide face → 345px logical artwork is composited onto an 800×600 canvas → artwork-to-mm fidelity is wrong.
- `ZoneOverlays` receives `canvasWidth={width}` = 800, `canvasHeight={height}` = 600, `scale=3` → implies ~266.7 × 200mm face, not the product's actual dims → **bleed/safe zones are drawn at the wrong scale**.
- Layer centering in `__editorAddText` uses the 800/600 defaults (`DesignCanvas2D.tsx`, global helper wiring), so layers are centered on 800×600, not the configured face.
- M7-E's saved positions (x 57.5, y 15–35) only look right because the test asserts *semantic* content, not pixel geometry.

**GAP — the legacy validator's 3.779 px/mm (96/25.4) is a *screen-DPI* factor, not the editor's canvas factor; a design that passes legacy validation has not been measured in the same units as the store or the zones.**

**RECOMMENDATION — M8 (critical):** introduce ONE named constant `PX_PER_MM` (recommend 3, matching store+ZoneOverlays, bumping texture-generator from 5→3 or making texture resolution independently defined as `dpi * mm / 25.4`), size the fabric canvas from `store.canvas.width/height` in `DesignCanvas2D.tsx` (remove the 800×600 hardcode), and draw ZoneOverlays from the same constant. Delete or retire the legacy 3.779 viewport validator as a duplicate path.

---

## 7. 2D Geometry

**FACT — the 2D editor is fabric.js-based and face-aware:**
- `DesignCanvas2D.tsx`: canvas from store (unused, see §6), SmartGuides, ZoneOverlays integration, `object:modified` face-boundary clamping, `dblclick` group-enter.
- Face switching via `store.setSelectedFace`; content is per-face keyed on `faceId` (M7-C verified).

**GAP — export geometry is fabricated, not measured.**
- `frontend/lib/editor/services/export.ts` `exportPDF`: texture images are generated at `(resolution/72) * 800 × (resolution/72) * 600` px — an **arbitrary A4-ish canvas, not the face's mm size at the requested DPI**. Face size in the PDF is computed as `faceWidth/faceHeight` chosen by `face.id` (front/back ⇒ length else width; height always `model.dimensions.height`) with `bleed*2` added — but the actual texture canvas was generated at 800×600×dpi scale, so mm placement and image sampling disagree with the face dimensions.
- `exportImage` (PNG/JPG) exports only `model.faces[0]` — **only the first face is ever exported, regardless of selected face**; also rasterizes at 800×600 basis.
- Dead options: `svg`/`ai`/`eps` in `ExportDialog` bypass `exportDesign` (which only implements pdf/png/jpg and returns `null` for the rest) — SVG/AI/EPS instead grab `window.__fabricCanvas.toSVG()` of the *entire 800×600 canvas* (i.e., the current face only, at default resolution, no bleed). EPS/AI output is a PostScript wrapper around fabric's SVG with hex-encoded data (`vector-export.ts` `generateEPS`) — **not CMYK, no bleed, no dieline, single face**.

**GAP — cut/fold overlays on the 2D canvas are not wired to the dieline:** the 2D canvas has no dieline overlay layer; `DielineCanvas` is a separate surface. `print-validation` stubs are independent of both (see §9).

**RECOMMENDATION — M8:** compute each exported face's pixel canvas as `mm_size_at_dpi` (`round(mm × dpi / 25.4)`), size the fabric canvas accordingly, and let the parametric dieline (flaps + fold lines) be the overlay that export composites crop marks against.

---

## 8. 3D Face → Mesh Mapping

**FACT — only MailerBox binds per-face textures.** `frontend/components/design-editor/models/BoxModels.tsx`:
- `MailerBox`: per-face textured materials for outer faces `front/back/left/right/top/bottom` (`userData.faceId` set). **Flaps report `faceId: "top"`**, not `inside_top`.
- `ShippingBox`, `RigidBox`, `FoldingCarton`, `PizzaBox`, `GiftBox`: **ignore the `textures` prop entirely** — printed art never appears.
- `PaperCup`, `CarrierBag`, `StandUpPouch`, `Tube`, `Envelope`: no `userData.faceId` at all → **face-picking (M7-D) is broken for every non-box**.

**FACT — `DesignCanvas3D.tsx` is the only consumer** — `getBoxModel(...)` is selected by product type; `useFaceValidity` maps `inside_*` to their outer sibling (so inside faces show validity via the outer face).

**GAP — 2D↔3D face geometry mismatch (mailer, the one working case):**
- 3D top flap is `l × wall × w/2` (half-width flap) labelled `faceId: "top"`.
- Dieline top panel is `l × w` (full-size) mapped to `inside_top`.
- Major + minor flaps all report `faceId: "top"` in 3D; the 2D structure has distinct `top`/`inside_top`.
- Texture `getFaceDimensions("top")` returns `length × width` (full face) while the 3D flap mesh is half-size → **the texture samples a full face onto a half-size flap** (visual HW mismatch, verified by code).

**GAP — the 5:3 texture/mm factor in `texture-generator.ts` + the hardcoded mesh proportions mean 3D accuracy is only visually approximate for boxes and nonexistent for non-box types.**

**RECOMMENDATION — M8:** single-source the mesh from the parametric dieline: each dieline panel (with its fold-sibling relationship) becomes a 3D bone; `userData.faceId` must equal the structure FaceId (including `inside_*`); all box types consume textures (at least as diffuse maps projecting the corresponding dieline panel). This is the same authority rule as §4 — implement once in the dieline and derive both 2D and 3D from it.

---

## 9. Zones

**FACT — `ZoneOverlays.tsx`: `scale = 3` px/mm, `bleedSize = 3` mm, `safeZoneSize = 5` mm — 3mm bleed / 5mm safe are the only real zone constants, and they match SPEC-005 (≥3mm bleed, ≥5mm safe).**

**FACT — zone data lives in the structure:** `product.structure.zones: Record<string, Array<{ label, required, position: [number, number, number], rotation? }>>` (store `EditorConfigLike`). The mailer seed defines `zones` per face.

**GAP — zone check units bug (`frontend/lib/editor/services/print-validation.ts` `validatePerFace`):** it compares `layer.position` (px, at 3px/mm in the canvas) against `zone.position` (mm, from the structure) with tolerance `Math.abs(px - zx) <= 20`. This mixes px and mm: 20px ≈ 6.67mm. A layer pixel-aligned to the canvas center is ≫20 away from a mm-zone coordinate → **zones effectively never pass/fail consistently; results are arbitrary relative to product size.**

**GAP — legacy validator (`DesignValidator.ts`) renders its own zone math in viewport px (3.779 px/mm) with auto-fix clamping — a second, inconsistent zone implementation.**

**RECOMMENDATION — M8:** zones are the *contract* between editor and prepress. Normalize zone validation to mm-space (`layer.position_mm = layer.px / PX_PER_MM`), keep the 3/5 constants as the single canon, delete the legacy validator path, and emit `SafeZoneResult` per face with math traceable to `validatePerFace` + SPEC-005 wording.

---

## 10. Prepress Validation

**FACT — two validator stacks:**
1. **Modern** `frontend/lib/editor/services/print-validation.ts` — rule-based (DPI/color/text/file); `validateLayout` (whole face) + `validatePerFace` (zone-aware, buggy per §9).
2. **Legacy** `frontend/components/design-editor/validation/DesignValidator.ts` — viewport-based fabric checks, 3.779 px/mm, 8.5×11" fallback, auto-fix for safe-zone clamping, "print score".

**GAP — the modern validator has DEAD constants and STUB geometry checks:**
- `SAFE_MARGIN = 10` and `BLEED_MARGIN = 4` are declared and **never referenced** (grep-verified).
- `checkElementExtendsBeyondBleed`, `checkElementWithinSafeArea`, `checkForOverlaps` **always return pass / empty arrays** (stubs).
- Real validation uses hardcoded `10`/`4` inline.

**GAP — backend prepress is mostly stubbed.**
- `backend/src/services/pre-press-checker/prepress.service.ts`: checks resolution/color from uploaded files only; `bleedMarginsOk`, `safeZoneOk`, `fontsEmbedded` are **hardcoded `true`**. `fixedAutomatically` column exists on `PrePressCheck` but nothing writes it.
- `backend/src/modules/prepress/` mounts `checkOrderDesign(orderId)` + `getPrePressResults` — thin wrappers over the stub.

**FACT — SPEC-005 (`.specify/specs/spec-005-prepress.md`) defines the required checks:** resolution ≥300 DPI, RGB rejected / CMYK required, bleed ≥3mm, safe ≥5mm, fonts embedded/outlined, corruption, compression ≥80%; soft proof PDF with watermarks, color/registration bars, trim marks, dieline overlay; 72h auto-escalation.

**GAP — M7 frontend validation is DPI/color-only and never validates geometry**: bleed/safe/font/overlap claims are enforced nowhere real. The backend has zero real checks for these. Soft proof generation and approval workflow (SPEC-005) do not exist.

**RECOMMENDATION — M8:** implement the modern validator's stubbed geometry checks (reusing §9 zone math), remove dead constants, wire `validatePerFace` output into the export dialog, implement `bleedMarginsOk/safeZoneOk/fontsEmbedded` in `prepress.service.ts`, capture `fixedAutomatically` (used by M7 `design.status` auto-fix), and generate the soft proof from the §7 export + §3 dieline.

---

## 11. Persistence

**FACT — design persistence is real and traceable (M7-E):**
- `backend/src/modules/designs/design.service.ts`: `createSession` (Prisma upsert + Redis), `saveDesign` with `productId/variantId/sku/designConfig`, `enqueueExport`.
- `Design` row: `designData Json?` (full editor state blob, M7-E asserts layered semantic content), `designConfig Json?`, `productId`, `variantId`, `sku`, `sessionId`, `lifecycleStatus`, `orderId` (backfilled post-checkout).
- Redis holds session state / autosave buffer; BullMQ export queue.
- `frontend/lib/editor/services/storage.ts` (225 lines): local + cloud autosave with debounce/backoff.

**FACT — lifecycle state machine is complete and role-gated:** `backend/src/services/design-lifecycle/design-lifecycle.service.ts` `ALLOWED_TRANSITIONS` (DRAFT→SUBMITTED→IN_REVIEW→APPROVED/REJECTED→IN_PRODUCTION), `canExport` = DRAFT or APPROVED, `isEditableState` = DRAFT only. `DesignLifecycleService` is pure (static methods).

**GAP — `Design.designData` is an opaque JSON blob with no schema/version field.** There is no `schemaVersion` in the blob, so M8 changing the layer/face model has no migration story — old sessions deserialize into guesses.

**GAP — design lifetime is not tied to lifecycle enforcement in the store.** Store autosaves in any state; only the UI disables editing when not DRAFT (M7 US1). Nothing backend-side rejects `saveDesign` for a non-DRAFT session.

**RECOMMENDATION — M8:** add `schemaVersion` to `designData` (start at 2), persist the resolved dieline/face-manifest (mm geometry) alongside the art layers so export/prepress are deterministic from the DB alone, and reject `saveDesign` server-side unless `lifecycleStatus === DRAFT` (or force version bump).

---

## 12. Prisma / Dieline Options

**FACT — relevant Prisma surface (`backend/prisma/schema.prisma`):**
- `Product.editorDefaults Json?` — hosts `structure`.
- `Design.designData Json?`, `designConfig Json?` — design blob + identity.
- `DesignComment` — review comments (M7 US4).
- `BrandKit` / `BrandKitTemplate` — P3 (M7 US5).
- `PrePressCheck.fixedAutomatically Boolean @default(false)` — exists, unused.
- M7 lifecycle: `Design.lifecycleStatus`.

**GAP — there is no persistence for a dieline manifest.** No table/column stores the parametric dieline (panels in mm, fold/glue relationships, line classes cut/fold/score). The generator is pure frontend code; the backend cannot reproduce a dieline, proof, or prepress geometry for an order without re-rendering customer state.

**GAP — no per-product dieline options model:** crease/glue-flap tolerances, material caliper, cut tolerance, V-board vs E-flute defaults, 3-pc vs one-piece — none exist in `Product` beyond the generic `editorDefaults`.

**RECOMMENDATION — M8:** add (a) a `DielineTemplate` mechanism in `editorDefaults` (per product: panel graph + fold adjacency) or a dedicated column; (b) `schemaVersion` on `Design`; (c) an options block (`caliperMm`, `fluteType`, `glueFlapToleranceMm`, `cutType`) on the product defaults that the prepress service reads. Keep it additive and JSON-based to respect the "no new boilerplate" constraint.

---

## 13. REUSE (build on, don't duplicate)

1. **`catalog.service.ts` `getEditorConfig`** — the existing orchestrator that resolves product → variant → structure. Enrich instead of replacing.
2. **`dieline-generator.ts`** — the only real parametric dieline code. Refactor scale → mm; extend to 7 types + optional inside faces. **Core M8 asset.**
3. **FaceId space (12 faces, incl. `inside_*`)** — already in `types.ts`; keep as the canonical enumeration for both 2D and 3D.
4. **`store.ts` mm canvas sizing + per-face layer model** — the correct unit logic already *exists* in the store; M8 fixes the canvas/overlay *consumers* (§6/§7).
5. **`ZoneOverlays.tsx` 3mm/5mm constants + `scale=3`** — the right numbers; M8 standardizes them into one shared constant module and fixes validation to use them.
6. **`export.ts` PDF layout (per-face page, crop marks, ded `addDieLines`)** — the page/bleed/crop scaffold is usable once pixel sampling is mm-correct (§7).
7. **`design.service.ts` createSession/saveDesign/enqueueExport + `DesignLifecycleService.canExport`** — reuse as the authoritative gate for export/prepress jobs.
8. **BullMQ + Redis + workers** — reuse the existing queue infra for async prepress/soft-proof jobs (SPEC-005 "<5s check" out-of-line).
9. **`prepress.controller.ts` route shape** — keep `checkOrderDesign`/`getPrePressResults`; substitute a real checker inside.
10. **`texture-generator.ts`** — per-face data-URL textures are reusable for export sampling once its 5px/mm is brought in line (§6).
11. **M7 e2e harness (`e2e/db.ts`, helpers)** — plug M8 assertions into the same Postgres-backed harness pattern.

---

## 14. DO NOT REBUILD (exists and is correct — extend, don't create)

1. **Design lifecycle state machine** (`design-lifecycle.service.ts`) — complete, role-gated, tested. Do not re-derive.
2. **Per-face layer model + Zustand store** (`store.ts`) — do not rewrite; only fix canvas sizing consumers.
3. **Design→Cart→Order identity traceability** (`design.service.ts` + M7-E) — do not touch the identity chain; it is the M7 contract.
4. **Fabric.js 2D canvas + SmartGuides** (`DesignCanvas2D.tsx`) — keep; fix sizing/zones (§6) and overlay the dieline instead of a parallel canvas.
5. **Three.js scene/OrbitControls/face-pick** (`DesignCanvas3D.tsx`, M7-D) — keep the picking mechanism; fix `userData.faceId`/texture-binding per type (§8).
6. **`generateAI`/`generateEPS` PostScript wrappers** (`vector-export.ts`) — keep the wrapper concept; the *input* (fabric `toSVG` of an entire 800×600 canvas) is what's wrong, not the PostScript.
7. **Backend `sizes` cm + `toMm` chain** — keep; document and single-source it (§2/§5).
8. **The 3/5 zone constants** — keep the values; fix where they're applied.
9. **M7 e2e specs** — they are the regression net; do not weaken the 5/5 M7-E chain.
10. **`prepress.controller.ts` route surface** — keep the API contract; replace the stub implementation behind it.

---

## 15. RISKS / BLOCKERS

1. **[CRITICAL] Unit mismatch in DesignCanvas2D (hardcoded 800×600 vs store mm×3).** Everything downstream (zones, export, user-placed position) is measured in px that don't correspond to mm. Until §6 lands, M8's "professional geometry" claims are unfalsifiable in 2D.
2. **[CRITICAL] px/mm zone check (`validatePerFace` tolerance 20px ≈ 6.67mm).** Silent, systematic error — zones "work" only by luck of canvas size.
3. **[HIGH] Only mailer has a structure.** Non-mailer products get generic 6-face box bodies in 2D and NULL geometry in 3D face-picking (M7-D broken for non-boxes). Any M8 "professional dieline" for non-mailer types needs their structures authored or derived.
4. **[HIGH] Two validator stacks (modern vs legacy 3.779 px/mm).** Divergent constants → conflicting pass/fail between surfaces; users can be told "fail" in one view and "pass" in another.
5. **[HIGH] DielineService stub + non-mm generator.** Any M8 feature that leans on `dieline-service.ts` will produce garbage silently.
6. **[HIGH] 3D ignores textures for 5 of 10 model types + flap faceId "top" mismatch.** Both a visual-fidelity defect and a face-picking defect (M7-D regression risk if models are touched carelessly).
7. **[MEDIUM] PDF/PNG export fabricates pixel size (`(dpi/72)*800`) instead of `mm × dpi/25.4`.** Print providers will reject; soft-proof (SPEC-005) depends on this being right.
8. **[MEDIUM] No schemaVersion on designData.** M8 changes to layer shape have no migration path; old saved sessions may corrupt the editor.
9. **[MEDIUM] Stripe placeholder in CI** (M7 known limitation). It blocks full checkout-clear verification; M8 prepress/export e2e must not depend on a live Stripe key.
10. **[LOW] Dead constants + hardcoded inline values** (`SAFE_MARGIN`/`BLEED_MARGIN` unused, `10`/`4` inline). Maintenance hazard — single-source these.
11. **[LOW] `depth` vs `length/width` naming** — silent semantic drift across structure ↔ store ↔ 3D. Type-level hazard.

---

## 16. M8 Dependency Graph

```
catalog.service.ts getEditorConfig ──► product blueprint (structure/faces/sizes)
      │                                          │  mm
      ▼                                          ▼
  PX_PER_MM constant ◄──── store.canvas (mm×3)  ProductStructure.faces (canonical, all products)
      │                                                   │
      ├─► DesignCanvas2D sizing + ZoneOverlays ◄─────────┘ zone defs
      │        │
      │        ▼
      │  validatePerFace (mm-space) ──► print-validation (real bleed/safe/overlap)
      │
      ├─► dieline-generator (mm) ──► rotated/outside faces + glue flaps + inside faces
      │        │
      │        ├─► DielineCanvas / DielineEditor (replace die-line-service stub template)
      │        │
      │        ├─► BoxModels (mesh from dieline panels; userData.faceId incl. inside_*;
      │        │        textures for ALL types)                  └─► 2D die-line overlay
      │        │
      │        └─► texture-generator (5→PX_PER_MM) ──► export / soft-proof sampling
      │
      └─► export.ts → mm_at_dpi sampling → PDF/AI/EPS pages + crop marks + die-lines
                    │
                    ▼
          prepress.service.ts (real bleed/safe/font checks; fixedAutomatically)
                    │
                    └─► DesignLifecycleService.canExport gate ◄── design.service.ts (schemaVersion)
                                    │
                                    └─► BullMQ export/soft-proof queue (existing infra)
```

**Ordering:**
1. `PX_PER_MM` + canvas sizing + zone overlay fix (§6) — unblocks everything measured.
2. Canonical mm dieline generator (§§3–5) — single source for 2D overlay, 3D mesh, export.
3. 3D texture/faceId parity (§8) — re-run M7-D.
4. Real `print-validation` + `prepress.service.ts` checks + `fixedAutomatically` (§§9–10), gated by `canExport`.
5. Export geometry at mm×DPI + dieline overlay (§7).
6. Persistence: `schemaVersion`, dieline manifest, product dieline options (§§11–12).
7. Non-mailer structures/first-class coverage (§§2/5) — parallelizable and large; biggest remaining scope item.

---

## 17. Recommended Architecture (target for M8)

**One canonical packaging blueprint, three derived languages (2D canvas, 3D mesh, print/export), one prepress gate.**

1. **Blueprint (source of truth):** `Product.editorDefaults.structure` upgraded to every product — `faces: Record<FaceId, mm dims>`, `zones` (mm), optional `dieline: { panels, foldAdjacency, glueFlaps, lineClassByEdge }`. Served by `getEditorConfig`. `sizes` remain cm; `toMm` is the only converter.
2. **PX_PER_MM** shared constant (3). Store canvas, ZoneOverlays, texture sampling, and export sampling all derive from it.
3. **Geometry engine:** `dieline-generator.ts` rewritten to emit **mm-space faces + fold graph**; `dieline-service.ts` becomes the SVG/AI serializer (drop templates). 2D dieline overlay + 3D mesh both consume this.
4. **3D:** all model types bind per-face textures keyed on the canonical FaceId; `inside_*` and flaps use their true FaceIds; mesh dims come from the blueprint, not hardcoded proportions.
5. **Validation:** one `print-validation` (mm-space, real geometry checks, single set of bleed/safe constants) consumed by the editor UI and prepress; legacy `DesignValidator` deleted. `prepress.service.ts` implements SPEC-005 arithmetic (DPI/color/bleed/safe/font/corruption) and writes `fixedAutomatically`.
6. **Export:** `export.ts` samples each face at `mm × dpi/25.4`, writes per-face pages with crop marks + die-lines (from the blueprint), and only then wraps AI/EPS. `canExport` (DRAFT/APPROVED) is the only gate.
7. **Persistence:** `designData` gains `schemaVersion`; resolved dieline manifest saved with the art so backend prepress/proof runs pure from the DB; product-level dieline options (caliper, flute, tolerances) added to `editorDefaults`.
8. **Async:** prepress + soft-proof on the existing BullMQ/Redis workers; `PrePressCheck.fixedAutomatically` populated.

All M7 e2e specs (esp. M7-D face-picking, M7-E traceability) are the regression net and must stay green.

---

## 18. Scope Boundary (what M8 is / is not)

**M8 IS:**
- Professional dieline & prepress engine: mm-accurate 2D geometry, production-grade dieline (panels + flaps + fold/glue lines) in the editor and in export, true bleed/safe/overlap/font validation (frontend + backend), soft-proof output (PDF with bars/trim/dieline), and correct mm×DPI export sampling for PDF/PNG/AI/EPS.
- Unit fidelity fixes (§6/§7/§9) and 3D texture/faceId correctness (§8) — because they are prerequisites for the above.
- Authoring structures/zones for the five non-mailer products, or formally deriving every product's faces from the dieline.
- Schema/persistence additions: `schemaVersion`, dieline manifest, prepress option flags; populating `fixedAutomatically`.
- Prepress checks for SVG/PDF/PDF-fonts/raster per SPEC-005, wired to lifecycle.

**M8 is NOT:**
- A rewrite of the store, fabric canvas, or Three.js scene infrastructure.
- A new lifecycle machine — `DesignLifecycleService` already enforces DRAFT/APPROVED gates.
- Any change to the Design→Cart→Order identity chain (M7-E contract).
- Mobile/tablet editing (still out of scope per `spec.md` assumptions).
- Brand kits, templates library expansion, or the admin/vendor portals (separate SPEC-029 tracks).
- 3D render *export* (deferred per `spec.md`); M8 only needs 3D face-pick correctness, not 4K renders.
- Backend re-implementation of the parametric dieline generator: it is frontend geometry; the backend consumes the saved manifest. (If a server-side proof is required, serialize the blueprint — do not port the generator.)