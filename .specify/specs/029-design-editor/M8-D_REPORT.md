# M8-D — Dieline UI migrated to canonical geometry

## 1. Status

**M8-D PASS.** The dieline UI (`DielineCanvas` + `DielineEditor`) is now driven by the M8-C canonical geometry engine (`buildDieline()` → `DielineGeometry` → `serializeSVG()`). The legacy `0.5` display scale and the `DielineService` template/design API are retired from the migrated UI. Non-blueprint products keep working through a frozen M7 compat delegate. All unit + e2e + build gates are green.

## 2. Scope

Migrate the editor's dieline view and the dieline editor panel onto canonical geometry.

In scope:
- `DielineCanvas` rewired to a thin store wrapper around a shared presentational renderer.
- New presentational renderer `DielineView` (maps `geometry.panels` + path arrays to DOM/SVG, exports via `serializeSVG`).
- New single resolution point `resolveDieline()` (`buildDieline` + `DielineResolutionError` wrapper) hosted in `PackhelpEditor`.
- Blueprint persistence through `initFromEditorConfig` (`product.dieline`).
- `DielineService` class + template/design asset API removed from `dieline-service.ts`; the file now exposes only `serializeSVG` + `checkOverlaps`.
- `DielineEditor` rewritten as a blueprint-driven preflight panel (canonical renderer embed, no legacy picker).
- M8-D test suite (tests A–K).
- M7 regression suite re-run (14 e2e).

Out of scope (hard boundary):
- No second geometry model in UI, ever.
- Backend/Prisma/seed/catalog untouched.
- Geometry engine (`frontend/lib/editor/geometry/dieline.ts`, `units.ts`) frozen — zero edits.
- No new dependencies.
- No M7-affecting contract changes: `window.__editorSetViewMode`, `__editorPickFace`/`__editorPickFaceAt`, catalog/dimension flow unchanged.

## 3. Files changed

| File | Change |
| --- | --- |
| `frontend/lib/editor/geometry/resolve-dieline.ts` | **NEW** — single canonical resolution helper; `DielineResolution` union (`{ok:true,geometry}` \| `{ok:false,reason:"no-blueprint"\|"error",error?}`). |
| `frontend/components/editor/canvas/DielineView.tsx` | **NEW** — pure presentational canonical renderer (no resolution/geometry math; maps panels → divs, path arrays → svg lines, `serializeSVG` export; delegates to `M7DielineFallback` when no geometry). |
| `frontend/components/editor/canvas/M7DielineFallback.tsx` | **NEW** — frozen verbatim M7 legacy renderer; sole consumer of `generateDieline`. |
| `frontend/components/editor/canvas/DielineCanvas.tsx` | **REWRITTEN** — thin wrapper subscribing canvas + `selectedFace`/`setSelectedFace`, renders `<DielineView resolution=… />`. |
| `frontend/components/design-editor/PackhelpEditor.tsx` | Single resolution point: `resolveDieline(product?.dieline, dimensions)`; `<DielineCanvas resolution={dielineResolution} />` for `viewMode==="dieline"`. |
| `frontend/components/editor/panels/DielineEditor.tsx` | **REWRITTEN** — blueprint preflight panel (own resolve memo, `checkOverlaps` badge, embedded `<DielineView>`). |
| `frontend/lib/editor/services/dieline-service.ts` | Stripped to `serializeSVG` + `checkOverlaps`; legacy class/types/API removed. |
| `frontend/lib/editor/state/types.ts` | `DesignCoreState.product` gains optional `dieline?: DielineBlueprint`. |
| `frontend/lib/editor/state/store.ts` | `EditorConfigLike.product.dieline` → canonical `DielineBlueprint`; `initFromEditorConfig` persists it into `product`. |
| `frontend/tests/m8-d-ui-migration.test.ts` | **NEW** — tests A–K (source audits + geometry/serializer assertions). |
| `frontend/lib/editor/utils/dieline-generator.ts` | UNCHANGED — kept as the frozen legacy generator behind `M7DielineFallback` (`const scale = 0.5` retained). |
| `frontend/lib/editor/geometry/dieline.ts`, `units.ts` | UNCHANGED — canonical engine (frozen). |

Deleted lines overall: ~1013 (retired duplicated geometry in UI + legacy service class); added: ~1050.

## 4. Architecture before / after

**Before (M7/M8-B):**
- `DielineCanvas` contained its own geometry model: called `generateDieline(dimensions)` on a vintage 0.5 display scale, synthesized panel rectangles, edge lists and cut/fold markers locally.
- `DielineService` was a design/template object graph (`DielineTemplate`, `DielineDesign`, `DielineElement`, `TEMPLATES`, `createDesign`, `exportAsSVG`) that shipped its own SVG writer — a second, parallel description of the sheet.
- Two sources of truth for the same sheet: the M8-C canonical engine and the M7 UI model — two independent places to diverge.

**After (M8-D):**
- `PackhelpEditor` is the **single resolution point**. `EditorConfig → product.dieline (DielineBlueprint) → resolveDieline(blueprint, dims) → DielineGeometry`, computed once via `useMemo`, passed down as props.
- `DielineCanvas` = store wiring only. `DielineView` = pure mapping of canonical `geometry.panels`/`geometry.cutPaths`/`geometry.foldPaths` (and the outline polyline) to visuals. `serializeSVG(geometry)` is the only sheet export.
- No second geometry model anywhere in the UI. Selection state is `FaceId`. Children are stateless toward geometry: they consume the resolved result.

## 5. Canonical geometry flow

```
EditorConfig
  └─ product.dieline : DielineBlueprint        (M8-B contract; persisted by initFromEditorConfig)
        ↓
PackhelpEditor.useMemo → resolveDieline(blueprint, dimensions)
        ↓
DielineResolution  { ok:true, geometry } | { ok:false, reason }
        ↓
DielineView  ── panels  → face divs        (data-face-id on every panel)
             ├─ cutPaths → <polyline class="cut">
             ├─ foldPaths → <line class="fold">      (non-flap, non-carton-height)
             ├─ path arrays → colorized svg lines (fold/score/glue/perf)
             ├─ geometry.outline → sheet <polyline>
             └─ serializeSVG(geometry)  → "dieline-<boxType>.svg" download
        ↓
M7DielineFallback  (only when resolution absent / non-blueprint product — frozen M7 delegate)
```

- `DielineView` (contextual): 12-face `FACE_LABEL` map; flap = `faceId.startsWith("inside_")` (non-selectable, `#e2e8f0`); panel dimension labels when `w>40 && h>40`; line specs — cut `#1e293b`/1/solid, fold `#94a3b8`/1/`4 2`, score `#b0bec5`/0.5/`2 2`, glue `#0a7a7a`/1/`6 2`, perf `#990099`/1/`1 2`; legend Cut/Fold/Score/Glue/Perf/Flap; sheet bounds via `flatBounds(geometry)`; centering `useEffect`, zoom clamp 0.25–2; box `#d2b48c` backdrop.
- `DielineEditor`: single `resolveDieline` memo; face/cut/fold/glue counts; `checkOverlaps` → overlap `Badge` or "no overlaps"; AR/EN empty states for no-blueprint/error.

## 6. Legacy dependency removal

- `DielineService`, `DielineTemplate`, `DielineDesign`, `DielineElement`, `TEMPLATES`, `getTemplates`, `createDesign`, `exportAsSVG` — **removed**. `dieline-service.ts` now exports only `serializeSVG` + `checkOverlaps`.
- Zero `DielineService` references remain in `frontend/components`, `frontend/lib`, `frontend/app` (src audit, test C).
- The legacy generator `dieline-generator.ts` survives **only** as the frozen delegate behind `M7DielineFallback` — it is not importable by any canonical/blueprint path (test B: neither `DielineCanvas` nor `DielineView` mention `dieline-generator`/`generateDieline(`; only `M7DielineFallback` does).

## 7. `0.5` scale retirement

- The vintage display scale (`const scale = 0.5`, `flapHeight = Math.min(sw * 0.7, 40 * scale)`, `glueTab = 15 * scale`) is confined to the frozen legacy generator (test H).
- None of the migrated UI files (`DielineCanvas`, `DielineView`, `DielineEditor`) contain `const scale = 0.5`, `Math.min(sw * 0.7`, or `glueTab = 15 * scale`. Requests are resolved against canonical mm units; rendering is 1px = 1mm with per-view zoom.

## 8. Tests

`npm run test:units` → **29 pass / 0 fail** (18 pre-existing + 11 new M8-D tests A–K):

- **A** `resolveDieline` → canonical geometry object.
- **B** migrated UI imports no `dieline-generator` / `generateDieline(`; `M7DielineFallback` keeps the delegate.
- **C** service file + `DielineEditor` + `DielineView` contain no retired API strings; `DielineService` count = 0.
- **D** `DielineView` has no fabricators (`buildDieline(`/`resolveDieline(`/`generateDieline(`/`edgePoints(`/`lineKey(`/`const panels =`/`aabbOverlap(`/`boundsOfPanels(`) yet references `geometry.panels`, `cutPaths`, `foldPaths`, `data-face-id={`, `serializeSVG(geometry)`.
- **E** panel sizes == `facePanel(MAILER_DIMS, faceId)` for all 12 faces.
- **F** counts vs canonical seed fixture: cut 9, fold 5, glue 5, score/perf 0, outline 1; path id/points/class checks.
- **G** serializer emits `data-face-id` for all 12 FaceIds, no non-canonical faces.
- **H** no `const scale = 0.5`/`Math.min(sw * 0.7`/`glueTab = 15 * scale` in `DielineCanvas`/`DielineView`/`DielineEditor`; legacy generator keeps `const scale = 0.5`.
- **I** F42 regression: flatBounds 370×178; 12 panels; front 115×38, top 115×70, left 70×38; no overlaps; `serializeSVG` widths/heights cm/exact, no `px`/`3px`.
- **J** absent blueprint → `{ok:false, reason:"no-blueprint"}`; broken outline → `{ok:false, reason:"error"}`.
- **K** exactly one `resolveDieline(` in `PackhelpEditor` + `<DielineCanvas resolution={dielineResolution}`; `DielineCanvas`/`DielineView` contain no `resolveDieline(`/`buildDieline(`.

Static/strict gates: `npx tsc --noEmit` **clean** (frontend); `npm run build` **clean** (frontend + backend).

## 9. M7 regression

Playwright (`editor-flow`, `m7-d-face-picking`, `m7-b-routes`, `m7-editor-catalog`) → **14 passed** (matches M8-B/M8-C baseline). The blueprint product flow (`prod-mailer-box`, 115×70×38 kraft) still boots to the editor, restores from sessionId, and enters `viewMode === "dieline"` with `assertNoCriticalErrors` (no pageerror/console-error). The `setViewMode("dieline")` path now resolves the canonical blueprint — the screenshot/`data-face-id` behavior binds to `DielineView`; non-blueprint products render the frozen M7 delegate.

## 10. Static architecture audit

- `dieline-generator` resolves **only** to `M7DielineFallback.tsx` (the frozen delegate) and the legacy generator file itself.
- `DielineService` in src: **zero**.
- `const scale = 0.5` / `Math.min(sw * 0.7` / `glueTab = 15 * scale`: **only** `lib/editor/utils/dieline-generator.ts`.
- `buildDieline(`: engine + tests only — no UI fabrication outside `resolveDieline`.
- `resolveDieline(`: exactly one call site in `PackhelpEditor` (+ standalone use in `DielineEditor` preflight panel via its own memo, which is allowed). No calls in `DielineCanvas`/`DielineView`.
- `data-face-id` exists only in `DielineView` panel divs + `serializeSVG` (m7-based locators bind to it).

## 11. Scope audit

- Backend: **not modified** (build clean, `git status` shows no backend files).
- Prisma schema/migrations/seed/catalog: **not modified**.
- `shared/types/index.ts` (M8-C types): **not modified**.
- `frontend/lib/editor/geometry/dieline.ts` + `units.ts`: **not modified**.
- `frontend/lib/editor/utils/dieline-generator.ts`: **not modified** (kept for M7 fallback only).
- No new dependencies (`npm i` not run).
- QA artifacts (`.qa-tmp/`, `QA_REPORT.md`, `frontend/playwright-report/`, `frontend/test-results/`, plus untracked M8-B/M8-C reports) left uncommitted.

## 12. Commit hash

`8618d24` — `M8-D migrate dieline UI to canonical geometry` (10 files, +1050/−1013). Parent `85705bc` (M8-C) intact; no closed commits rewritten.

## 13. Known limitations

- `M7DielineFallback` remains in the bundle for non-blueprint products. It is a frozen copy of the old M7 canvas (its own generated model, 0.5 scale). Once the catalog carries blueprints for every box type, the fallback and `dieline-generator.ts` can be deleted wholesale; until then they are deliberately unreachable from any blueprint path.
- `DielineView` renders canonical SVG lines but does not yet expose angle/leader annotations or per-panel "distances" overlays onto the sheet — those are M8-E territory, not M8-D.
- The preflight panel (`DielineEditor`) is read-only vs. geometry (displays resolved result). None of the M7 template-edit affordances were carried over — by design.

## 14. Explicit M8-E+ boundary

Work stops here. M8-D implemented the UI migration to canonical geometry and **nothing beyond it**. Specifically **not** implemented:

- M8-E geometry annotations (corner radii relief, glue-tab leader lines with distance labels, angular fold markers), bevel/panelless box types, multi-material sheets.
- M8-F+ product lifecycle features (approval, print-on-demand handoff, cutting queue), CMS/printworkflow flows, offline editor, AI auto-adhesion of custom box designs onto the formula engine.
- Any change to the customer-facing product catalog surface or the vendor/admin dashboards of SPEC-029.

M8-D complete. Canonical geometry is now the sole geometry authority for the migrated UI. M8-E+ were not implemented. Stopped at the M8-D boundary.