# M8-C Report — Canonical Dieline Geometry Engine & Serializer

## 1. Status

**PASS** — M8-C implemented, verified, and committed in a dedicated commit (`85705bc`). The canonical mm geometry engine, SVG serializer, and real overlap detector are shipped with full unit coverage and an M7 e2e regression pass. M8-D (UI migration) and onward are **not** implemented — hard stop after M8-C.

## 2. Scope

M8-C turns the M8-B packaging blueprint into resolved, millimeters-only `DielineGeometry`:

- `buildDieline(blueprint, dims)` — canonical geometry engine (`frontend/lib/editor/geometry/dieline.ts`), per M8_SPEC §7 (AMENDMENT 1 + 2) and §17.
- `serializeSVG(geometry)` — deterministic mm SVG, `<g data-face-id>` per canonical face, per-`LineClass` styles, `data-role="outline"` group.
- `checkOverlaps(geometry)` — real panel-AABB overlap detection over physical panels (returns `DielineOverlap[]`).

Additive type-only additions in `shared/types` (`DielinePoint`/`DielinePath`/`DielineAdjacencyEntry`/`DielineFaceRelationship`/`DielineGeometry`/`DielineOverlap`). The legacy `DielineService` template/design API is preserved byte-for-byte (consumed by `DielineEditor.tsx`; UI retirement belongs to M8-D).

Authority: M8_SPEC §7 (AMENDMENT 1 FaceId↔MeshPartId, AMENDMENT 2 no curves in M8), §17 test strategy; M8_PLAN "M8-C" (input/output files); M8_TASKS G-11/G-12 table rows.

## 3. Files Changed

Committed in `85705bc` (M8-C commit) only:

| File | Change |
|---|---|
| `shared/types/index.ts` | M8-C geometry types: `DielinePoint`, `DielinePath`, `DielineAdjacencyEntry`, `DielineFaceRelationship`, `DielineGeometry`, `DielineOverlap` (+63 insertions) |
| `frontend/lib/editor/geometry/dieline.ts` | NEW — `buildDieline`, `flatBounds`/`boundsOfPanels`, `aabbOverlap`, `physicalFaceIds`, `DielineResolutionError` (272 lines) |
| `frontend/lib/editor/services/dieline-service.ts` | head comment + `serializeSVG` + `checkOverlaps` added above the untouched legacy `DielineService` class (+118/−2) |
| `frontend/tests/dieline-geometry.test.ts` | NEW — 9 node:test units (A–H + AMENDMENT 2 fixture) |

## 4. Geometry Contract

`DielineGeometry` output (all mm, no px factor anywhere):

```
DielineGeometry = {
  schemaVersion, boxType,
  dims: { length, width, height, unit: 'mm' },
  panels: Record<FaceId, DielinePanel>,   // semantic face extents (spanning box)
  cutPaths | foldPaths | scorePaths | gluePaths | perfPaths: DielinePath[],
  outline: DielinePath[],                  // single closed path
  adjacency: DielineAdjacencyEntry[],      // a<b, deduplicated
  faceRelationships: DielineFaceRelationship[], // AMENDMENT 1: faceId → MeshPartIds[]
}
DielinePath = { id: 'outline' | `${faceId}-${edgeName}`, faceId?, class, points: DielinePoint[], closed? }
DielineAdjacencyEntry = { a: FaceId, b: FaceId, via: EdgeName, class: LineClass }
```

## 5. Engine Algorithm (`buildDieline`)

1. **Panels** — resolved from blueprint positions/rotation/edges, sized exclusively by `facePanel(dims, faceId)` (the SPEC §7 mapping; nothing hardcoded — verified for all 12 F42 faces).
2. **Paths** — each declared edge becomes an mm polyline, deduplicated by physical line (sorted endpoint key) so shared edges emit once regardless of which face declares them (`front.right ↔ right.left`, `front.top ↔ top.bottom`, …).
3. **Adjacency** — every edge whose `to` is a FaceId yields a deduplicated `a<b` pair carrying `via` (declaring edge) + `class`; `glue_flap`/`none` excluded.
4. **faceRelationships** — every blueprint FaceId → `[`${faceId}_panel`]`; ordered as `faceOrder` then remaining keys (deterministic).
5. **Outline** — single closed `cut` path from the resolved panels' bounding box (never copied/hardcoded).
6. **Guardrail** — malformed blueprints (non-finite/non-positive dims, empty/missing panels, bad outline) raise `DielineResolutionError` deterministically.

Determinism of the full output object is asserted by test (B).

## 6. AMENDMENT 1 — FaceId ↔ MeshPartId

- FaceIds are the canonical 12-face set only (`left/front/right/back/top/bottom` + `inside_*`). The engine never invents a FaceId — geometry keys, path owners, and relationship maps are all drawn from `blueprint.faceOrder` + `blueprint.panels`.
- `faceRelationships[].meshPartIds` holds 0..N `_panel` ids (the mesh part bound for M8-E/G/H); `inside_*` faces carry **no** geometry (reverse-side mirror of their outer sibling's material).
- Test (E) asserts: exactly 12 relationship entries, `meshPartIds === ['<faceId>_panel']`, and no path ever owns an `inside_*` face.

## 7. AMENDMENT 2 — Curves, Paths as First-Class Data

Paths are open/closed mm polylines — **not** derived rectangles. Curve instructions are a documented future extension only; the `DielinePath` shape stays backward-compatible. A non-rectangular polyline fixture (5-point open + closable) is serialized correctly (`M … L … L … L …` with `Z` only when `closed`).

## 8. Serializer (`serializeSVG`)

- Coordinates are millimeters (3-decimal deterministic rounding); `width`/`height`/`viewBox` are mm values — no px factor.
- One `<g data-face-id="…">` per canonical face, in blueprint `faceOrder` order; paths inside are ordered cut → fold → score → glue → perf.
- Distinct per-class styling (`dieline-cut/fold/score/glue/perf`) plus a `data-role="outline"` group with `dieline-outline`.
- Deterministic: two calls produce byte-identical output (test G).

## 9. Overlap Detection (`checkOverlaps`)

- Real AABB comparison in canonical mm space over **physical** (non-`inside_*`) panels only.
- Touching panels (shared band edges, e.g. `front`/`top` at y=70) are **not** overlaps.
- F42 mailer → `[]`; a planted `left.x=60` overlap → `[{a:'left', b:'front'}]` (test H).

## 10. F42 Verification (115×70×38 mm)

| Assertion | Value | Test |
|---|---|---|
| Spanning / sheet bounds | `{x0:0, y0:0, x1:370, y1:178}` | F |
| Cut paths | 9 | C |
| Fold paths (shared edges deduped) | 5 | C |
| Glue paths (seam lines on declared glue edges) | 5 | C |
| Score / perf | 0 | C |
| Adjacency pairs | 6 (`back-left`, `back-right`, `bottom-front`, `front-left`, `front-right`, `front-top`), glue `back-left` via `right` | D |
| `front`/`top`/`left` panel dims | 115×38 / 115×70 / 70×38 | A |
| outline | single closed path, 4 points, `id:'outline'` | F |
| SVG head | `viewBox="0 0 370 178"`, 12 `data-face-id` groups | G |

## 11. Non-Rectangular Path Fixture (AMENDMENT 2)

`tests/dieline-geometry.test.ts` serializes an injected 4-point cut polyline (`{100,100} {100,110} {106,114} {110,100}`): asserts all `L` segments render and `Z` appears only for the `closed:true` copy. Proves the serializer consumes first-class polylines, not rect approximations.

## 12. Test Counts

| Suite | Result |
|---|---|
| Frontend `npm run test:units` | 18 passed (9 M8-C + 3 blueprint + 6 units) |
| `tsc --noEmit` (frontend) | clean |
| `npm run build` (frontend) | clean |
| `npm run build` (backend) | clean |

## 13. M7 Regression (Playwright)

`npx playwright test editor-flow m7-d-face-picking m7-b-routes m7-editor-catalog` → **14 passed** (2.9m). Full vertical (place in editor → cart → order) and route/catalog specs remain green with the engine + serializer in the tree; the legacy M7 dieline UI is untouched.

## 14. Scope Audit

- **No M8-D+ implementation**: `serializeSVG`/`checkOverlaps` are consumed by **no** component/app file (verified via ripgrep). `DielineCanvas.tsx` still imports the M7 `dieline-generator` (unchanged since `3748b71`); `DielineEditor.tsx` still consumes the legacy `DielineService` class. UI migration is deliberately deferred to M8-D.
- **No curves** (score/perf empty for mailer), **no schemaVersion 2**, no 3D/mesh/UV/manifest generation, no design-manifest persistence, no prepress/bleed validation (M8-F concerns left out), no new endpoints, no backend code changes.
- **`shared/types`** touched only additively; no `EditorConfig` change (M8-C output is consumed by future M8 slices, not by the live editor flow).
- **No Prisma changes / migrations / dependency changes** in `85705bc` (verified via `git show --name-only`).
- Neither the M8-B commit (`56de6d4`) nor the M8-A commit (`c03bb12`) was rewritten.

## 15. Unrelated / QA Artifacts

QA artifacts remain untracked on disk and are never staged or deleted: `QA_REPORT.md`, `.qa-tmp/`, `frontend/.qa-tmp/`, `frontend/playwright-report/`, `frontend/test-results/`, `.specify/specs/029-design-editor/M8-B_REPORT.md`. The M8-C commit contains exactly the 4 files listed in §3 (+627/−2).

## 16. Build & Typecheck

| Check | Result |
|---|---|
| Frontend `tsc --noEmit` | clean |
| Frontend `npm run build` | clean |
| Backend `npm run build` (tsc) | clean |

## 17. Known Limitations (documented, not deferred bugs)

- Glue **flaps** are seam lines (mm paths on the blueprint-declared glue edge); flap *polygons* have negotiated extents and are M8-E work.
- `checkOverlaps` is panel-AABB (spanning-box) based — sufficient for the F42 sheet; curve/protrusion-aware overlap is future work.
- The engine trusts the blueprint as validated at seed/API (M8-B validation); it does not re-validate LineClass/targets.
- SVG serialization is deterministic geometry export — not a production die-line (no bleed/safe/DPI/font validation, M8-F).

## 18. Commits (M8 chain intact)

| Commit | Hash | Contents |
|---|---|---|
| Initial (template) | `3748b71` | — |
| **M8-A** | `c03bb12` | canonical mm units, store-driven canvas, mm zones/texture |
| Baseline WIP | `ea89acb` | SPEC-029 baseline (preserved, containing no M8-B hunks) |
| **M8-B** | `56de6d4` | blueprint/dieline-template contract |
| **M8-C** | `85705bc` | geometry engine + serializer + overlap + tests |

Worktree after commit: clean except untracked QA artifacts.

## 19. Boundary

M8-C is complete and **STOPPED here**. M8-D (migrating `DielineCanvas`/`DielineEditor` onto the canonical geometry + serializer, retiring the `0.5` display scale and the legacy template UI) requires explicit authorization. M8-E+ (flap polygons, 3D/mesh/UV, manifest persistence, prepress validation, export, new blueprints) are out of scope.