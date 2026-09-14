# M8-B Report — Packaging Blueprint & Dieline Template Contract

## 1. Status

**PASS** — M8-B implemented, verified, and committed with an audit-clean two-commit boundary.

## 2. Scope

M8-B ships the **canonical packaging blueprint** as a JSON-only, additive contract for products exported through `GET /catalog/:slug/editor-config`. A concrete F42 mailer-blueprint is seeded for `prod-mailer-box`. No geometry engine, no new Prisma columns, no migrations, no new dependencies, no endpoint redesigns. The M7 product-structure path is preserved byte-for-byte for all other products.

Authority: M8_SPEC §7 (dieline shape, face↔axis mapping, AMENDMENT 2 boundary), §8 (additive blueprint JSON), M8_PLAN "blueprint" acceptance + "JSON-only boundary".

## 3. Files Changed

Committed in `56de6d4` (M8-B commit) only:

| File | Change |
|---|---|
| `shared/types/index.ts` | `LineClass`, `EdgeName`, `DielineEdge`, `DielinePanel`, `DielineBlueprint`, `PrepressConfig`; `EditorConfig.product` gains `schemaVersion?`, `unit?`, `dieline?`, `prepress?` (44 insertions) |
| `backend/prisma/seed.ts` | `MAILER_DIELINE_TEMPLATE` (F42) + `prod-mailer-box.editorDefaults` gains `prepress`, `schemaVersion: 1`, `unit: 'mm'`, `dieline` (119+ / 1−) |
| `backend/src/modules/catalog/catalog.service.ts` | additive passthrough of `schemaVersion`/`unit`/`dieline`/`prepress` in `getEditorConfig` (7 insertions) |
| `frontend/lib/editor/state/store.ts` | `EditorConfigLike.product` gains optional `schemaVersion?`, `unit?`, `dieline?`, `prepress?` (16 insertions) |
| `backend/src/modules/catalog/catalog.blueprint.test.ts` | NEW — 9 unit tests (valid mailer accepted; non-object / bad `LineClass` / bad `to` target / missing face / face-order key mismatch / bad outline / bad faceOrder rejections) |
| `backend/src/modules/catalog/catalog.editor-config.integration.test.ts` | NEW — 2 tests: mailer full-vertical (12-face panels, F42 dims, outline `{370,178}`, LineClass/target whitelist, fold adjacency, prepress) + backwards compat via `custom-shipping-box`; seed guard |
| `frontend/tests/blueprint.test.ts` | NEW — 3 node:test units: blueprint contract shape, all 12 faces match `facePanel(MAILER_DIMS, faceId)`, EditorConfig with/without blueprint typechecks |

## 4. Blueprint Contract

`DielineBlueprint` lives at the **top level of `Product.editorDefaults`** (with `prepress`; `schemaVersion: 1`; `unit: 'mm'`):

```
{ schemaVersion, boxType, faceOrder: FaceId[], panels: Record<FaceId, DielinePanel>, outline: {w,h} }
DielinePanel = { faceId, x, y, w, h, rotation: 0|90|180|270, edges: Partial<Record<EdgeName, DielineEdge>> }
EdgeName = 'top' | 'right' | 'bottom' | 'left'
LineClass = 'cut' | 'fold' | 'score' | 'glue' | 'perf'
DielineEdge = { class: LineClass, to?: FaceId | 'glue_flap' | 'none' }
PrepressConfig = { caliperMm, fluteType, glueFlapToleranceMm }
```

## 5. F42 Verification

Mailer template blueprints 12 physical faces (`left/front/right/back/top/bottom` + mirrors `inside_*`) on a `370×178` mm sheet. Every panel's mm dimensions are asserted against the M8_SPEC §7 face↔axis mapping via the frontend test (`facePanel(MAILER_DIMS, faceId)`): front `115×38`, top `115×70`, left `70×38`; fold adjacency front↔top/bottom, glue flaps on short-side panels, `back.right→left` glue are all asserted. Prepress: `{caliperMm: 0.5, fluteType: 'E', glueFlapToleranceMm: 1.5}`.

## 6. Editor Config

`getEditorConfig` returns `schemaVersion`, `unit`, `dieline`, `prepress` under `product` additively. The M7 fallback `editorDefaults?.structure ?? editorDefaults` is untouched — non-blueprint products (e.g. `custom-shipping-box`) keep their existing element-level shape.

## 7. Backward Compatibility

Verified by the integration test against `custom-shipping-box` (whose `editorDefaults` has no `structure`, no `dieline`): response `product.structure` stays truthy (whole blob), and `dieline`/`prepress` are `undefined`. Absent fields are never synthesized. Store `initFromEditorConfig` required no change.

## 8. Test Counts

| Suite | Result |
|---|---|
| Backend `src/modules/catalog/` | 2 files / **11 passed** |
| Backend full `vitest run` | 7 files / **65 passed** |
| Frontend `npm run test:units` | 9 passed (3 blueprint + 6 units) |
| `tsc --noEmit` (backend + frontend) | clean |
| `npm run build` (backend + frontend) | clean (run earlier in slice) |

## 9. M7 Regression

`npx playwright test e2e/m7-b-routes.spec.ts e2e/m7-editor-catalog.spec.ts --reporter=list` → **7 passed** (1.6m). Backend routes + catalog-driven editor (ProductStructure, multi-face, prepress) remain green; session reopen restores structure + layers.

## 10. Scope Audit

- **No M8-C+ implementation**: `git grep -iE "buildDieline|DielineGeometry|cutPaths|foldPaths|scorePaths|gluePaths|SVG dieline|schemaVersion: 2|meshPart"` matches only pre-existing planning docs under `.specify/specs/029-design-editor/` (M8_PLAN/SPEC/TASKS), never `src/`/`frontend/` code. No `DielineGeometry`, no path generation, no overlap engine, no 3D/UV/MeshPartId, no SVG/export pipeline, no prepress validation, no design-manifest persistence. M8-C and onward are **not** implemented.
- **No Prisma changes / migrations** in the M8-B commit (verfied via `git show --name-only`).
- **No dependency changes / no unrelated cleanup** in commit `56de6d4`.
- **M8-A** (`c03bb12`) untouched; its `units.ts` is unchanged and serves as `facePanel` source for the frontend blueprint test.
- `frontend/lib/editor/utils/dieline-generator.ts` (M7 legacy baseline) not modified.
- Test artifacts (`QA_REPORT.md`, `.qa-tmp/`, `frontend/.qa-tmp/`, `frontend/playwright-report/`, `frontend/test-results/`) left untracked on disk — never staged or deleted.

## 11. Commits

| Commit | Hash | Contents |
|---|---|---|
| Baseline (discovered uncommitted SPEC-029 work, preserved) | `ea89acb` | 391 files, +43997 / −12144; all pre-existing backend/frontend baseline EXCLUDING M8-B hunks, M8-B tests, and QA artifacts |
| **M8-B** | `56de6d4` | exactly the 7 files above, +556 / −1; no M8-B code in `ea89acb`, no baseline code in `56de6d4` |

Commit messages: `SPEC-029 baseline work-in-progress` / `M8-B packaging blueprint and dieline template contract`.

**Isolation proof**: the baseline commit's blobs for `seed.ts`, `catalog.service.ts`, `shared/types/index.ts` contain zero `M8-B`/`MAILER_DIELINE`/passthrough markers; `store.ts` in `ea89acb` is bit-identical (`f00867c…`) to its M8-A state. The M8-B delta was reversed out of the index via `git update-index --cacheinfo` blob surgery (worktree untouched throughout), and the 3 M8-B test files were withheld from the baseline index.

**Boundary**: M8-B is complete and STOPPED here. Next slice (M8-C — `buildDieline(blueprint, dims)` → `DielineGeometry` with cut/fold/score/glue/perf mm paths) requires explicit authorization.