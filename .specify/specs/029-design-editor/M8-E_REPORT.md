# M8-E Report — Canonical Dieline Geometry Annotations

**Commit:** `80bcd78` — "M8-E canonical dieline geometry annotations"
**Scope:** DESIGN-EDITOR §9 / this prompt's §5 M8-E contract (fold-angle markers A, glue-tab leader lines B, corner radius/relief C). This prompt's M8-E supersedes the 3D-mapping column in `M8_PLAN.md` (that column is deferred and NOT implemented here).

---

## 1. Status

COMPLETE. A fold-angle, glue-tab-leader, and corner-relief annotation layer is
rendered over the canonical M8-C dieline, with the M8-C/D architecture intact
(single `resolveDieline` resolution point, `DielineView` pure presentation,
`serializeSVG` sole export authority, `dieline-generator.ts` frozen).

## 2. Exact scope

- **A. Fold-angle markers** — one marker per canonical `foldPaths` entry, derived
  from the canonical `adjacency` (class `"fold"`) relationships and the owning
  `FaceId` of each fold path (`dieline.ts:99` engine output). Presentation-only,
  tied to canonical path id / `FaceId` / `via` edge. No hardcoded angles.
- **B. Glue-tab leader lines** — for every canonical `gluePaths` entry, a leader
  line from the canonical path midpoint to a label placed away from the sheet
  center, showing the canonical endpoint distance in mm (e.g. `70 mm`, `38 mm`).
  The distance is the canonical geometry's own endpoint distance — never invented.
- **C. Corner radius / relief** — derived from the canonical flat outline
  corners. Current blueprints declare **no** relief parameter, so the derived
  value is `R0` (square corners) at each of the 4 sheet corners. This is a
  derived statement about canonical geometry, not a second radius model. If a
  future blueprint introduces an explicit relief parameter, the derivation can
  read it — `DielineGeometry` was left unchanged as the contract requires.

## 3. Files changed

Committed in `80bcd78`:

| File | Change |
| --- | --- |
| `frontend/lib/editor/geometry/annotations.ts` | **New.** Pure display-only derivation helpers (`deriveFoldAngleAnnotations`, `deriveGlueTabAnnotations`, `deriveCornerAnnotations`, `foldAngleDeg`, `formatMm`). No engine calls, no geometry authoring. |
| `frontend/components/editor/canvas/DielineAnnotations.tsx` | **New.** Presentational SVG overlay (screen-only). Renders folds/glue/corners with `data-annotation` + canonical-path/FaceId data attributes; no export output. |
| `frontend/components/editor/canvas/DielineView.tsx` | Attaches the overlay after the canonical line SVG (inside the transformed sheet container), adds an "Annotations" toggle (`data-annotations-toggle`, UI state only) and a `Ruler` toolbar button. |
| `frontend/tests/m8-e-annotations.test.ts` | **New.** 6 unit tests (A–F) — geometry integrity, derivation purity, fold/glue/corner correctness, static architecture. |
| `frontend/e2e/m8-e-annotations.spec.ts` | **New.** Playwright test asserting 5 fold markers / 5 glue leaders / 4 corner marks + toggle behavior in the real catalog editor. |

Unchanged (frozen): `dieline.ts`, `units.ts`, `resolve-dieline.ts`,
`dieline-service.ts`, `dieline-generator.ts`, `M7DielineFallback.tsx`,
`DielineCanvas.tsx`, backend/Prisma/seed, shared types.

## 4. Architecture before / after

Before (M8-D): `DielineView` mapped canonical path arrays to SVG lines
(cut/fold/score/glue/perf + outline); panels, `data-face-id`, legend, export. No
annotations.

After (M8-E): unchanged M8-D path, plus an optional annotation overlay. Data
flow:

```
canonical DielineGeometry ──▶ annotations.ts (pure derive) ──▶ DielineAnnotations (SVG)
        (from resolveDieline)     fold/glue/corner arrays       screen-only <g>/<line>/<text>
```

`annotations.ts` consumes only a passed-in `DielineGeometry`; it never calls
`buildDieline`/`resolveDieline`/`generateDieline` and never reads DB/catalog
APIs. `DielineView` remains the single consumer host; `DielineEditor`'s embedded
view gains the overlay automatically (it renders `DielineView`).

## 5. Annotation data flow

1. `resolveDieline` resolves blueprint+dims (unchanged, single point in
   `PackhelpEditor` and `DielineEditor`).
2. `DielineView` computes three arrays with `useMemo`:
   `deriveFoldAngleAnnotations(geometry)`, `deriveGlueTabAnnotations(geometry)`,
   `deriveCornerAnnotations(geometry)`.
3. `DielineAnnotations` renders SVG absolutely inside the transformed sheet
   container: fold = 90° arc + `90°` label bound to
   `data-fold-path-id`/`data-face-id`/`data-other-face-id`/`data-via`;
   glue = leader `<line>` + endpoint dot + mm label (`data-glue-path-id`);
   corner = corner-bracket + `R0` label (`data-corner-index`/`data-corner-at`/
   `data-face-ids`).
4. Toggle (`showAnnotations` state) shows/hides the overlay — pure UI state; no
   geometry mutation.

## 6. Proof — canonical geometry is the sole authority

- All coordinates in the overlay are copies of canonical path midpoints / panel
  boundary checks / `flatBounds` output from `buildDieline`; no arithmetic
  fabricates a dimension.
- Glue mm labels equal `Math.hypot(p1-p0)` over the canonical glue endpoints.
- Fold angles are 90/180 from `foldAngleDeg(a,b)` over the canonical adjacency
  pair (returns the pair that contains both fold endpoints on its panel
  boundary — anchors the marker to the actual physical fold line).
- Corner relief is `R0` *because the blueprint declares no relief* — a derived
  statement; `DielineGeometry` is untouched.
- Locked by tests: canonical path counts (cut 9 / fold 5 / glue 5), panel dims,
  `data-face-id`, `serializeSVG(geometry)` export, single `resolveDieline` call
  site, and JSON-identical geometry before/after derivation (test B).

## 7. Unit tests (`npm run test:units`)

**35 passed / 0 failed** (29 pre-existing M8-C/M8-D + 6 new M8-E). New suite
`tests/m8-e-annotations.test.ts` proves: A annotations reference canonical ids/
FaceIds and mm values; B derivation purity (no mutation; counts canonical);
C fold markers at canonical fold midpoints with canonical angles (incl.
`foldAngleDeg("front","back") === 180`); D glue leaders carry canonical distance
labels from canonical midpoints; E corner relief derived (R0, 4 corners);
F static architecture (no `buildDieline(`/`resolveDieline(`/`generateDieline(`/
`const panels =`/`const edges =`/`const faces =`/`3.779`/`pxToMm(` in the
annotation path; legacy `const scale = 0.5` still confined to
`dieline-generator.ts`; `generateDieline` still only in `M7DielineFallback`).

## 8. Typecheck & build

- `npx tsc --noEmit` — clean (0 errors).
- `npm run build` (Next.js) — succeeded.

## 9. Static architecture audit

- `rg '3\.779' frontend/` → **0 matches** (M8-D invariant preserved).
- Engine/fabricator call sites: only the pre-existing authorized ones —
  `buildDieline` (engine `dieline.ts`, `resolve-dieline.ts`), `resolveDieline`
  (`PackhelpEditor` x1, `DielineEditor` x1), `generateDieline`
  (`M7DielineFallback` + frozen `dieline-generator.ts`). None in M8-E code.
- No duplicated `const panels =` / `const edges =` / `const faces =` in the
  annotation path; `DielineGeometry` is the only panel/edge/path source.

## 10. E2E (Playwright)

`npx playwright test m7-editor-catalog editor-flow m7-d-face-picking
m7-b-routes m8-e-annotations` → **15 passed / 0 failed** (14 prior M7/M8 +
1 new M8-E). The new spec drives the real catalog editor for
`custom-mailer-box` (F42 115×70×38), asserts 5 fold markers (with
`data-other-face-id="top"`), 5 glue leaders, `70 mm`/`38 mm` labels, 4 `R0`
corner marks, and that the toggle removes/restores the overlay without errors.
Screenshot: `frontend/playwright-report/m8-e-annotations.png`.

## 11. Commit hash

`80bcd78` — "M8-E canonical dieline geometry annotations"
(HEAD of `master`; parent `8618d24` M8-D). Working tree contains only untracked
QA artifacts (`.qa-tmp/`, `*_REPORT.md`, `frontend/playwright-report/`,
`frontend/test-results/`).

## 12. Known limitations

- **Corner relief is always `R0`** for current blueprints. M8 blueprints carry
  no relief/corner-radius parameter in `DielineBlueprint`, so a non-zero radius
  cannot be annotated without extending the shared blueprint type — deliberately
  out of scope (contract: keep `DielineGeometry` unchanged; never invent a
  second radius model). If a later spec adds an explicit relief parameter, the
  derivation (`deriveCornerAnnotations`) can read it with no engine change.
- **Fold angles are 90/180.** Dieline paths are straight polylines (M8-C
  AMENDMENT 2: no curves), and product axes are orthogonal by construction, so
  only 90° (different product axes) and 180° (same axis) occur.
- **Glue leader offset is a presentation constant** (`LEADER_OFFSET_MM = 14`
  mm, display-only) placed outbound from the sheet center; it is not a physical
  dimension.
- **Annotations are screen-only.** They are not part of the exported SVG
  (`serializeSVG` remains export authority) — export output is byte-identical
  to M8-D.
- **M8-PLAN's 3D face-mapping column is NOT implemented** (superseded by this
  prompt's M8-E contract).

## Explicitly NOT performed (M8-F+ prohibited per §3)

Print/prepress (DPI/CMYK/spot/font-outline/flatten), corruption or export
certification, approval/handoff, POD, cutting/SRK queue, vendor/catalog/webhook
integration, catalog redesign, admin dashboards, offline/cache, and the 3D
folding view were all intentionally left untouched. No new npm packages;
`dieline.ts`/`units.ts`/`dieline-service.ts`/`dieline-generator.ts`/
backend/Prisma/seed frozen; no `buildDielineV2`/`DielineGeometryV2`/parallel
panel model introduced.