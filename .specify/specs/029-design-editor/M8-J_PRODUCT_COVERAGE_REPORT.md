# M8-J Report — Product Coverage Completion & Closure

**Commit:** `feat(spec-029): complete M8 product coverage`
**Scope:** DESIGN-EDITOR M8_PLAN.md milestone J, spec §14 — making product
coverage **repository-authoritative and machine-asserted** end-to-end. Five
M8-required box products carry canonical blueprints; three deferrable products
(paper-bag, poly-mailer, label) are explicitly `support: "deferred"` and never
ship with a net; the coverage matrix is asserted in backend integration tests +
FE unit tests + Playwright e2e. Parent commit: `3ee228e` (M8-J certified export
delivery — this report is the companion *product-coverage* M8-J, the committed
`M8-J_REPORT.md` export/delivery report is untouched).

---

## 1. Status

COMPLETE. Every M8-required box product (`mailer-box`, `folding-carton`,
`shipping-box`, `rigid-box`, `pizza-box`) returns a canonical blueprint
(`schemaVersion: 1`, `unit: 'mm'`, full 12-FaceId panel set sized by the strict
M8-C `facePanel` mapping, prepress baseline) through the existing
`CatalogService.getEditorConfig` route. Every deferrable product
(`paper-bag`, `poly-mailer`, `label`) carries `support: "deferred"` with an
explicit `supportReason` and **zero blueprint fields** — the service *override*
below guarantees no fake geometry can ever be shipped for them, even if the
seed editorDefaults regresses.

## 2. Deferral rule (locked in code + tests)

- **Supported** (`support: "supported"`) ⇒ blueprint present, dieline renders.
- **Deferred** (`support: "deferred"`) ⇒ `schemaVersion`, `unit`, `dieline`,
  `prepress`, and `supportReason` are explicitly `undefined` by a guard in
  `catalog.service.ts` BEFORE the response is built — regardless of what the
  seeded `editorDefaults` blob contains.
- Frontend mirrors it: the store copies `support`/`supportReason` onto
  `state.product`, and `DielineCanvas` renders `DeferredDielinePlaceholder`
  (deferral badge + reason, EN/AR) instead of the canonical `DielineView` *or*
  the frozen M7 generic fallback when `product.support === "deferred"`.

## 3. Files changed

| File | Change |
| --- | --- |
| `backend/prisma/seed.ts` | Five canonical box products: `FOLDING_CARTON`/`SHIPPING_BOX`/`RIGID_BOX`/`PIZZA_BOX` structures + `*_TEMPLATE` blueprints, `support: "supported"` on mailer/carton/shipping/rigid/pizza. Three deferral rows (`custom-paper-bag`, `custom-poly-mailer`, `custom-label`) with `support: "deferred"` + reason. **Also fixes a pre-existing quirk**: `OPTION_PRINT_COLORS` was filtered to drop `value:'none'` for `custom-product-box`, whose default variant uses `printMode:'none'` — the filter is removed so the product-box editor opens. |
| `backend/src/modules/catalog/catalog.service.ts` | `support` passthrough + **deferral override**: when `editorDefaults.support === 'deferred'`, `schemaVersion`/`unit`/`dieline`/`prepress` are forced `undefined`. |
| `backend/src/modules/catalog/catalog.product-coverage.integration.test.ts` | **New.** Read-only matrix test (§4). |
| `backend/src/modules/catalog/catalog.editor-config.integration.test.ts` | Adds the no-blueprint deferred target `custom-paper-bag`. |
| `shared/types/index.ts` | `EditorConfig.product.support` / `supportReason` (documented `"supported" | "deferred"`, absent on pre-M8-J blobs). |
| `frontend/lib/editor/state/{store.ts,types.ts}` | State plumbing for `support`/`supportReason`. |
| `frontend/components/editor/canvas/DielineCanvas.tsx` | Deferral branch → placeholder (never the generic net). |
| `frontend/components/editor/canvas/DeferredDielinePlaceholder.tsx` | **New.** Blue "not yet available" badge + reason, EN/AR. |
| `frontend/tests/product-coverage.test.ts` | **New.** FE mirror suite (§5). |
| `frontend/e2e/m8j-e2e.spec.ts` | **New.** 8 product-coverage e2e tests (§6). |
| `.specify/specs/029-design-editor/M8-J_PRODUCT_COVERAGE_REPORT.md` | **New** (this report — does not touch the committed export `M8-J_REPORT.md`). |

Unchanged / frozen: `frontend/lib/editor/geometry/{dieline.ts,units.ts,
resolve-dieline.ts}`, `frontend/lib/editor/services/dieline-service.ts`
(`serializeSVG` — sole SVG authority), `DielineView.tsx`, the scribble-dieline
M7 fallback, the M8-G/H/I surface, `certified-export.ts`, the Prisma schema (no
migrations).

## 4. Backend integration tests (`npx vitest run`)

Full backend suite: **12 files, 110/110 passing** (the pre-existing failing
catalog tests are green again — SEE §7 defect 3 of the export report: no
ownership/TZ involvement here). The coverage matrix file itself:

- **Supported ×5** (`getEditorConfig(slug, 100)`): slug/boxType match,
  `support:'supported'`, `schemaVersion:1`, `unit:'mm'`, blueprint present,
  all 12 FaceIds present with sizes from the strict `facePanel` mapping
  (front/back = L×H, top/bottom = L×W, left/right = W×H, `inside_*` = outer
  sibling), outline encloses every panel's far corner, every edge is on the
  `LineClass` whitelist with valid adjacency targets, prepress baseline intact.
- **Deferred ×3**: `support:'deferred'`, truthy `supportReason`, and
  `schemaVersion`/`unit`/`dieline`/`prepress` all `undefined`.
- **Matrix consistency across EVERY seeded product**: every product carries an
  explicit verdict; supported ⇒ blueprint present; deferred ⇒ no blueprint +
  reason. No product is left in an ambiguous no-blueprint/no-deferral state.

## 5. FE unit tests (`npm run test:units`)

**81/81 passing**, including the new `product-coverage.test.ts` (mirrors the
seed with 4 blueprint fixtures: folding-carton 150×100×50, shipping-box
400×300×250, rigid-box 250×180×60, pizza-box 330×330×45):

- resolution through `resolveDieline` succeeds; all 12 canonical FaceIds sized
  exactly by `facePanel(dims, faceId)`; dims mm, deep-equal to fixture.
- path-body contract: per-class path counts, single `closed:true` cut outline
  (not per-segment closing), cut/fold/glue adjacency pairs ordered `a < b`,
  `checkOverlaps(geometry)` empty (physical panels only — `inside_*` excluded,
  touching panels ≠ overlap).
- `serializeSVG` emits `data-face-id` for every FaceId, `flatBounds` sits
  inside the blueprint outline; coverage-matrix machine check (5 supported / 3
  deferred disjoint, no ambiguous state).

## 6. E2E (Playwright, real app build) — `e2e/m8j-e2e.spec.ts`

**8/8 passing.** Supported ×5 (`/editor?product=<slug>&qty=30`): `state.product`
matches id/slug with `support:'supported'`; config quantity applied; canonical
view — `div[data-face-id]` count = 12 panels, 6 outer faces visible, toolbar
sheet label matches the geometry-computed `(${W} x ${H} mm)`, no deferral badge,
no critical errors, screenshot. Deferred ×3 (bag 50, mailer 50, label 25):
`support:'deferred'` + reason, `dieline` undefined, deferral badge visible,
zero `[data-face-id]`, no crash.

**Full Playwright suite: 58 passed, three consecutive runs** (~7.2–7.7 min
each) — the M8-J J7 regression gate is satisfied with zero flakes.

### Defects found & fixed while writing the suites

1. **Seed print-mode lockout (pre-existing):** `custom-product-box` filtered
   `OPTION_PRINT_COLORS` to drop `value:'none'` while its default variant uses
   `printMode:'none'` — the editor config failed to resolve and the product-box
   editor could not open. Removed the filter; print options now include `none`.
2. **Quantity below deferred MOQs:** coverage test used `qty` 30 but
   bags/mailers MOQ 50, labels MOQ 25 — raised to `qty 100` (above every MOQ)
   for the supported×5 and deferred×3 calls.
3. **Sheet label is runtime geometry, not the authored outline:** blueprint
   panel positions are FIXED at the template's reference size but the engine
   re-sizes every panel via `facePanel(runtimeDims)`; DielineView's label =
   `flatBounds(runtime geometry)` rounded. E2E derives its expected label the
   same way (`expectedSheet(blueprint, state.model?.dimensions)`) instead of
   hardcoding.
4. **Selector over-match:** annotation glyphs also emit `data-face-id`, so face
   assertions are scoped to `div[data-face-id]` (12 canvas panels).
5. **Product id:** the label deferral product's id is `prod-sticker-label`
   (seed), not `prod-label-sticker`.

## 7. Static audits & typecheck

- Rejected-second-engine tokens across the added/edited files and repo
  (`3.779`, `SAFE_MARGIN`, `BLEED_MARGIN`, `DielineService`, `DielineTemplate`,
  `DielineDesign`, `exportAsSVG`) → **0 matches**; `generateDieline` exists only
  in the frozen legacy `frontend/lib/editor/utils/dieline-generator.ts`; exactly
  one serializer (`serializeSVG`) owns SVG output and `certified-export.ts` /
  backend `dieline-delivery.ts` delegate to it — no bypass.
- `backend npx tsc --noEmit` → clean; backend `vitest run` → **12 files,
  110 passing**.
- `frontend npx tsc --noEmit` → clean; `npm run test:units` → **81 passing**.
- `e2e/m8j-e2e.spec.ts` → **8/8 passing**; full Playwright suite → **58 passed ×3**.
- No `M8-K` / premature-milestone markers anywhere.

## 8. Design-governance compliance

- **No fake geometry:** deferred products return `dieline === undefined` at the
  service boundary and render the placeholder in the canvas — never the generic
  M7 net.
- **No second engine / serializer / manifest-as-renderer / prepress:** all
  canonical geometry flows through the unchanged `resolveDieline`/`buildDieline`
  /`serializeSVG` pipeline.
- **No schema change, no migration, no new DB write** (coverage tests are
  read-only).
- **Frozen surfaces untouched:** `dieline.ts`, `units.ts`, `resolve-dieline.ts`,
  `dieline-service.ts`, `DielineView.tsx`, certified-export + M8-G/H/I surfaces
  and the committed export `M8-J_REPORT.md` are byte-identical.

## 9. Known limitations / boundary of this M8-J slice

- The deferral is a **catalogue + canvas** guarantee — bags/labels/pouches have
  no exportable net, and their detail pages rely on the placeholder (no
  wireframe/preview lines authored).
- Blueprint panel positions remain authored at template reference size at
  **static coordinates**; the canonical look is produced by runtime re-sizing.
- Non-rectangular paths (bag gusset base, label die-cut profile) are deferred
  post-M8 by design (spec §14) — flagging them `deferred` rather than shipping
  a wrong net is the intended behaviour.

## Explicitly NOT performed (M8-J product-coverage boundary)

- Any second geometry engine, serializer, validator, manifest-renderer, or
  prepress path; any `3.779`-style fabricated constants.
- Fake nets for paper-bag / poly-mailer / label; M8-K; blueprint position
  re-authoring.
- Schema migrations / new tables / writes during coverage checks.
- Any modification to the committed M8-J export/delivery report or its files.