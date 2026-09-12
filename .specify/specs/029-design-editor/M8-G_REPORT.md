# M8-G Report — Canonical SVG Path-Body Contract & Manifest Independence

**Commit:** `(pending)` — "M8-G canonical SVG path-body contract"
**Scope:** M8_PLAN_M8-G / M8_SPEC §12 (SVG path contract, AMENDMENT 2 + 5) / this
prompt's M8-G contract: the exported SVG must derive directly from canonical
`DielineGeometry` via `serializeSVG(geometry)` (sole export authority), with
canonical FaceId groups, preserved path ids/classes/points, serializer purity,
annotations screen-only, and proof that the SVG is independent of
editor-state/manifest. Parent commit: `ac6d6a3` (M8-F).

---

## 1. Status

COMPLETE. `serializeSVG(geometry)` is verified as the sole export authority and
a pure `DielineGeometry → SVG string` transformation. Every canonical category
(`cutPaths`/`foldPaths`/`scorePaths`/`gluePaths`/`perfPaths` + outline) emits
real `<path>` bodies from canonical points, carrying their canonical `id`
(`data-path-id`), class and 3dp mm `d` attrs. Exported groups are exactly the
canonical F42 FaceId set. The serializer never rebuilds panels, never calls
`buildDieline`/`generateDieline`/`resolveDieline`, never reads the editor store,
and does not mutate its input. Manifest-independence is proven: an unrelated,
mutated editor-session object cannot change the serialization.

## 2. Exact scope

- **Canonical SVG authority** (`dieline-service.ts`): `serializeSVG(geometry)`
  is the only exporter of dieline geometry in the production surface
  (`DielineView.tsx` export handler). The M8-G edit was a **single, contract-
  required line-pair**: per-class `<path>` bodies and outline `<path>`s now emit
  `data-path-id="${path.id}"`. Outline paths were already classed
  `dieline-outline`; no other serializer change.
- **Path-body contract** (M8_SPEC §12): every serialized category contains
  actual SVG geometry reconstructed from canonical `DielinePath.points`
  (M/L path data, `Z` only when `path.closed`); no placeholders, no synthetic
  rects, no `fabric.toSVG()`.
- **FaceId contract**: exported `<g data-face-id>` groups are exactly the F42
  12-face set (F42 AMENDMENT 1 — incl. `inside_*`), traced to
  `DielineGeometry.panels` via `Object.keys(geometry.panels)`; no invented,
  renamed or numeric ids, no `flap` ghost ids.
- **Manifest independence** (§8 / AMENDMENT 5): build geometry → serialize →
  create an unrelated/mutated manifest-like editor-state object → serialize
  the same geometry again → identical SVG. Direction proven:
  `DielineGeometry → SVG`, never `Manifest → geometry → SVG`.
- **Export/annotation boundary** (§10): M8-E annotations (fold-angle arcs,
  glue-tab leaders, corner R0 labels, ruler UI, toggle state) are screen-only
  and absent from the exported file, verified by unit static audit + a real
  downloaded-file e2e assertion.
- **Tests**: `frontend/tests/m8-g-svg-contract.test.ts` (11 tests A–K) and
  `frontend/e2e/m8-g-svg-contract.spec.ts` (download the real exported SVG and
  assert the contract against the file bytes).

## 3. Files changed

| File | Change |
| --- | --- |
| `frontend/lib/editor/services/dieline-service.ts` | `${path.id}` added to per-class `<path>` and outline `<path>` bodies as `data-path-id`. |
| `frontend/tests/m8-g-svg-contract.test.ts` | **New.** 11 unit tests (A–K) — document purity, F42 dims + distinct faces, exact FaceId set, path-id preservation, `d`-body round-trip, class styles/counts, annotation isolation, serializer purity, manifest independence, mm-outline + no legacy/px/fabric, static architecture audit. |
| `frontend/e2e/m8-g-svg-contract.spec.ts` | **New.** E2E: enter dieline view (annotations ON), click "Export SVG", capture the download, assert 12 FaceId groups, outline role, `data-path-id`, class bodies, and zero annotation markup in the file bytes. |

Unchanged (frozen): `dieline.ts`, `units.ts`, `resolve-dieline.ts`,
`dieline-generator.ts`, `dieline-annotations.ts`, `backend/`/Prisma/seed,
shared types. `ExportDialog.tsx` untouched (it is the PDF/Image/AI-EPS dialog;
it does not touch `serializeSVG`). `M7DielineFallback.tsx` untouched (frozen M7
legacy delegate for the blueprint-absent path).

## 4. Architecture before / after

Before (M8-F): `serializeSVG` emitted per-class `<path>` bodies and outline
paths with class + style but **no path identity**; the exported file could not
be traced back to a canonical `DielinePath` by `id`, so an SVG consumer could
not verify provenance beyond geometry shape.

After (M8-G): every exported body round-trips to its canonical path.

```
DielineGeometry (resolveDieline, M8-C) ──▶ serializeSVG(geometry)   [pure, sole authority]
   panels ──▶ <g data-face-id="{FaceId}"> (exact F42 set, via Object.keys(panels))
   cutPaths…perfPaths ──▶ <g data-dieline-class="{cls}"> <path data-path-id="{id}" d="M…"/>
   outline ──▶ <g data-role="outline"> <path data-path-id="{id}" d="M…"/>
   dims/panels bbox ──▶ width/height/viewBox (mm, 3dp)
EDITOR STATE / manifest ─╳──▶ (never consulted)
```

`serializeSVG` consumes `geometry` only — the editor store, session object,
manifest-like state and annotation toggle are outside the function's universe.

## 5. SVG path-body contract (M8_SPEC §12)

- **Real geometry**: serializing the F42 fixture yields exactly
  `20` `<path>` bodies (cut=9, fold=5, glue=5, score=0, perf=0, outline=1).
  Parsing each `d` attr reconstructs the canonical `DielinePoint[]` polyline
  (M/L commands, 3dp `fmt` tolerance) and the exact `closed` flag of the
  canonical path. This is a geometry → SVG → geometry round-trip
  (test E), closing the AMENDMENT-2 loop.
- **Identity**: each body carries `data-path-id` equal to its canonical
  `DielinePath.id`; the exported id set equals the canonical path-id set
  (test D).
- **Classes**: bodies carry `class="dieline-{cls}"` plus the canonical
  `CLASS_STYLE` (`cut` solid black 0.5, `fold` dashed black 6/2, `glue` teal
  `#0f766e` 6-2, `score` 0.4 dotted, `perf` dashed 1-1, `outline` solid 0.3);
  styles are distinguishable and `score`/`perf` are correctly absent from the
  F42 fixture (test F).
- **No synthetic geometry**: no panel-rectangle `<rect>` export, no
  `fabric.toSVG()`, no `getElementById` canvas dump; javadoc-tested by the
  serialized file shape itself (tests A/J/E).

## 6. FaceId contract (F42)

- Exported groups are exactly the canonical 12-face set:
  `front, back, left, right, top, bottom, inside_front, inside_back,
  inside_left, inside_right, inside_top, inside_bottom`.
- No invented/renamed/numeric ids; `flap` ghost ids never surface. `inside_*`
  groups exist (per the F42 panel map) and carry no geometry (empty groups),
  matching DielineView's on-canvas contract (test C).
- Groups trace back to `DielineGeometry.panels`: the serializer enumerates
  `Object.keys(geometry.panels)` (audited in test K); it hardcodes no dims
  (`370/178/115/70/38`) and builds no face list.

## 7. Serializer purity (tests H, A)

- `serializeSVG(geometry)` is a pure structural transformation: deep-equals on
  the input geometry before/after (test H) — no in-place mutation of paths or
  panels.
- Deterministic: same geometry ⇒ byte-identical SVG (M8-C determinism test +
  M8-G A), so reruns/regenerations are reproducible at the string level.

## 8. Manifest-independence guarantee (AMENDMENT 5)

- Test I builds the F42 geometry, serializes `svg1`, then constructs a
  **plausible in-flight editor designData manifest** — `designId`, `sessionId`,
  `boxType`, material, dimensions, 2-layer array (front, top) with `faceId`/
  position/scale, empty zones, `printSides` — and mutates it aggressively
  (dims, zones, layer count, sessionId). Re-serialization of the same geometry
  is byte-identical to `svg1`.
- Direction check: a manifest-independent second geometry whose canonical
  fold path is perturbed by 1 mm **does** change the SVG — proving the output
  keys on canonical `DielineGeometry` content, not on ambient state.
- No real persisted manifest was introduced (deliberately: M8-H is out of
  scope), so this is a true pure-function proof of the export direction.

## 9. Export/annotation boundary (§10)

- Annotations derive and render only in `DielineAnnotations.tsx` /
  `DielineView`, keyed off the same canonical geometry. They never serialize.
- Test G static-audits the actual `handleExport` handler body (extracted by
  regex, not a brittle whole-file slice): it contains `if (!geometry) return`,
  `serializeSVG(geometry)`, Blob/`image/svg+xml`, object-URL + `a.download`,
  **and nothing else** — no `annotations`, no `showAnnotations`.
- E2E proves it end-to-end: with annotations visible on canvas, the downloaded
  file contains zero `data-annotation` markup.

## 10. F42 fixture verification

Fixture = seed `MAILER_DIELINE_TEMPLATE` exactly (115×70×38 mm, sheet
370×178).

| Property | Expected | Verified |
| --- | --- | --- |
| cut / fold / glue / score / perf / outline | 9 / 5 / 5 / 0 / 0 / 1 | tests D, F |
| front = back | 115 × 38 | tests A–B |
| top = bottom | 115 × 70 | tests A–B |
| left = right | 70 × 38 | tests A–B |
| top / bottom / front visibly distinct groups | y-band + distinct displayed coords | test B |
| viewBox / width / height | mm, 370×178 bounds | tests A, J |
| outline body exactly 370×178 (not legacy 0.5-compressed) | exact | test J |

## 11. Static architecture audit

- `serializeSVG` contains no `buildDieline(`/`generateDieline(`/`DielineService`/
  `const panels =`/`const edges =`; its only face enumeration is
  `Object.keys(geometry.panels)`; hardcodes no F42 dims (test K).
- DielineView contains no `buildDieline(`/`generateDieline(`/`resolveDieline(`/
  edge/line-key/bounds helpers/`const faces =` — it is a presentation +
  export consumer only; exactly one `serializeSVG(geometry)` executable call.
- `ExportDialog.tsx` is not a dieline exporter: no `serializeSVG(`, no
  `DielineGeometry`, no `data-face-id` (it owns PDF/PNG/AI/EPS, whose
  DPI/CMYK/Page-prep are M8-I territory, not M8-G).
- Global grep of the canonical export path shows no `fabric`/`3.779`/px
  residue (test J).

## 12. Unit tests (`npm run test:units`)

**52 passed / 0 failed** (41 pre-existing M7/M8 + 11 new M8-G A–K). New suite
proves: A well-formed mm SVG document (xmlns, dims, viewBox, zero px); B F42
dims + mutually-distinguishable top/bottom/front; C exact 12-face group set,
no invented/numeric/flap ids, `inside_*` empty groups; D exported id set ==
canonical path id set; E `d`-body round-trip to canonical points + closed flag;
F class styles + per-class counts, no phantom score/perf; G annotation
isolation (handler body annotation-free, toggle not referenced); H purity
(deep-equal before/after); I manifest independence + direction; J mm outline
exactly 370×178, no px/fabric/3.779/generateDieline; K static architecture
audit.

## 13. Typecheck & build

- `npx tsc --noEmit` — clean (0 errors).
- `npm run build` (Next.js, includes type-checking) — succeeded.
- One test-file typing fix during verification (widened the manifest literal to
  `Record<string, any>`; test comments cleaned); no production typing change.

## 14. E2E (Playwright)

- New `e2e/m8-g-svg-contract.spec.ts` — **1 passed**: dieline view, annotations
  confirmed visible, "Export SVG" clicked, the real downloaded file asserted for
  12 FaceId groups, `data-role="outline"`, per-class bodies, `data-path-id` ≥ 10,
  and zero annotation markup.
- Full regression `npx playwright test` — **38 passed / 1 failed**. The single
  failure is the **documented environment limitation** at
  `cart-checkout.spec.ts:187` (Stripe placeholder, cart-clear assertion; see
  M8_SPEC §18) — pre-existing, unchanged from the 37/1 M8-F baseline (38 = 37 +
  the new M8-G spec). No M8-G regressions: `editor-flow`, `m7-c-multiface`,
  `m8-a-physical-geometry`, `m8-e-annotations` all green.

## 15. Commit hash

`(pending)` — single focused commit on parent `ac6d6a3` with a one-line commit
subject. Staged set is exactly: `frontend/lib/editor/services/dieline-service.ts`,
`frontend/tests/m8-g-svg-contract.test.ts`, `frontend/e2e/m8-g-svg-contract.spec.ts`,
and this report. QA artifacts (`.qa-tmp/`, `QA_REPORT.md`,
`frontend/playwright-report/`, `frontend/test-results/`, `_REPORT.md` files of
other milestones) are left untracked.

## 16. Known limitations (documented, not deferred bugs)

- **`dims` is documentary, not authoritative for export bounds.** The
  serializer sizes the document from the panels' bounding box (`x0/y0/x1/y1`),
  so a mutated `geometry.dims` does not move the output — intended, deterministic,
  and asserted in test I. Width/height *labels* derive from the same canonical
  bounds; there is no second dimension model.
- **Static assertions are source-scan based.** Tests G/K introspect file text;
  they were tuned to reject brittle whole-file slices (e.g. matching the
  handler's actual body) and over-broad bans (the serializer legitimately reads
  `Object.keys(geometry.panels)` — that is derivation from canonical geometry,
  not fabrication, and is the audited form of "no faces built").
- **No persisted manifest.** M8-G proves export-state independence in pure
  function form; the persisted snapshot that M8-H adds will be consumed by the
  same serializer unchanged (AMENDMENT 5: export consumes the manifest, never
  vice-versa).
- **M8-G is export *foundation*, not print prep.** DPI/pixel math, per-face
  PDF pages, crop marks, CMYK/ICC/spot/embedded fonts, AI/EPS rasterizer
  certification and corruption checks belong to M8-I; the ExportDialog and
  `export.ts`/`vector-export.ts` AI/EPS shells remain untouched.

## Explicitly NOT performed (M8-G scope boundary)

No `DielineGeometryV2`, no `buildDielineV2`, no parallel geometry engines, no
new geometry factories, no new px/mm constants, no manifest
implementation/persistence/schema/DB columns/Prisma migrations/snapshots
(M8-H), no DPI/CMYK/ICC/spot/fonts/flattening/PDF/open-in-rasterizer prepress
work (M8-I), no `editorDefaults` work (M8-J), no backend/Prisma/seed changes,
no deletion or weakening of any M8-C/D/E test, and no design-session path
touched (M8_TASKS "7376516 heap-dump" note honored). `dieline.ts`, `units.ts`,
`resolve-dieline.ts`, `dieline-generator.ts`, `dieline-annotations.ts`, the
export dialog pipeline, and `MAILER_DIELINE_TEMPLATE`/`editorDefaults` in
`backend/prisma/seed.ts` are read-only proof references only.