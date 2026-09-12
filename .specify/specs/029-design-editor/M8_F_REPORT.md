# M8-F Report — Unified Frontend Geometry Validation

**Commit:** `(pending)` — "M8-F unified frontend geometry validation"
**Scope:** DESIGN-EDITOR §9 / this prompt's §5 M8-F contract (all 5 `getValidationRules`
rules become real; rule UIDs, error/warning/info severity split, mm-correct math, legacy
dup validator deleted, dead constants removed). Parent commit: `80bcd78` (M8-E).

---

## 1. Status

COMPLETE. Every previously-stubbed geometry check in
`frontend/lib/editor/services/print-validation.ts` is now a real, mm-based,
geometry-only engine shared by all four service methods. The M8-C/D/E
architecture is intact: canonical `DielineGeometry` (`resolveDieline`) is the sole
face/panel authority, `units.ts` remains the frozen source of `BLEED_MM`/`SAFE_MM`/
`ZONE_MATCH_TOLERANCE_MM`/`pxToMm`/`facePanel`, and the engine performs **no**
DPI/CMYK/font/file-size assertions (M8-I is the sole print-quality authority).

## 2. Exact scope

- **Rule contract (all 5 rules implemented, category `"layout"`):**
  | UID | Severity | Implementation |
  | --- | --- | --- |
  | `bleed-area` | error | `checkElementExtendsBeyondBleed` — 2.5 mm inside the trim fails; 3.5 mm over the bleed passes; deep-interior elements pass (interior edges are unrestricted by design). |
  | `safe-area` | warning | `checkElementWithinSafeArea` — bounds strictly within the safe line (`SAFE_MM` inset of trim). An edge exactly on the safe line **fails** (not `>=`). |
  | `overlapping-elements` | info | `checkForOverlaps` — strict bounding-box intersection between layer bounds; merely-touching edges pass. |
  | `required-zones` | error | `validatePerFace` — zone anchors require a layer positioned within `ZONE_MATCH_TOLERANCE_MM` (mm-domain tolerance, not px). |
  | `face-bounds` | error | layer bounds are resolved against the **canonical** panel size of their owning face via `facePanel(dims, face.id)` (outer-sibling fallback for `inside_*` faces, identical to the DielineView contract). |
- **`getRule` / `getValidationRules`** return the 5 canonical rules with their
  approved UID strings and labels ("Bleed Area", "Safe Area",
  "Overlapping Elements", "Required Zones", "Face Bounds").
- **Dead code felled:** `SAFE_MARGIN`/`BLEED_MARGIN` constants removed (replaced
  by the canonical `BLEED_MM`/`SAFE_MM`); DPI / color-mode / text-size /
  file-size stub rules removed from code, tests, and UI.
- **Legacy duplicate validator deleted**: `lib/editor/services/validation.ts` and
  `components/editor/validation/ValidationPanel.tsx` (+ directory) are removed;
  the dangling `./validation` import in `ai-compliance-checker.ts` was dropped.
- **Panel wiring**: `components/editor/panels/ValidationPanel.tsx` calls the
  unified engine (`quickValidate(layers, model, canvas)`).

## 3. Files changed

| File | Change |
| --- | --- |
| `frontend/lib/editor/services/print-validation.ts` | **Rewritten** as the unified geometry-only engine (see §5). |
| `frontend/components/editor/panels/ValidationPanel.tsx` | Now invokes `PrintValidationService.quickValidate(layers, model, canvas)`. |
| `frontend/lib/editor/services/ai-compliance-checker.ts` | Removed dangling `import { validateDesign, ValidationIssue } from "./validation"`. |
| `frontend/lib/editor/services/validation.ts` | **Deleted** (legacy duplicate validator). |
| `frontend/components/editor/validation/ValidationPanel.tsx` → `validation/` | **Deleted** (legacy duplicate panel directory). |
| `frontend/tests/m8-f-print-validation.test.ts` | **New.** 6 unit tests (A–F) — rule matrix on both faces of every boundary + static architecture audit. |

Unchanged (frozen): `dieline.ts`, `units.ts`, `resolve-dieline.ts`,
`dieline-service.ts`, `dieline-generator.ts`, `dieline-annotations`, backend/
Prisma/seed, shared types.

## 4. Architecture before / after

Before (M8-D/E): `print-validation.ts` exported stub rules pinned to
`SAFE_MARGIN`/`BLEED_MARGIN` and file-quality rules (image DPI, color mode,
text size, file size) whose backing gates never existed; a **second** legacy
validator (`services/validation.ts` + `components/editor/validation/`) proposed
its own rules / `VALIDATION_ISSUE_POOL`, and the panel imported both paths.

After (M8-F): one engine, four semantic methods, one panel consumer.

```
store layer state (position/scale) ─┐
canonical DielineGeometry (dims/faces) ─┴─▶ print-validation.ts (pure mm math, geometry-only)
    validateLayout · validatePerFace · validatePrintReady · quickValidate
                                             │
                                ValidationPanel (panels/ValidationPanel.tsx) — live consumer
```

The engine takes layer state (`LayerGeometryInput[]`) + canonical model/face
info; it never calls `buildDieline`/`resolveDieline`/`generateDieline` itself,
and never reads DB/catalog APIs.

## 5. Engine data flow

1. `layerBoundsMm(layer)` → mm bounds from the layer's position and scale.
   Per **AMENDMENT-4 layer-state reality**, the editor layer store holds only
   `x/y` position + `scale.x/scale.y`; an unstored width/height resolves to a
   point at the layer position (`width ?? 0`).
2. `facePanel(dims, faceId)` (frozen `units.ts`) supplies the canonical panel
   size for any face — including `inside_*` faces via its outer-sibling lookup,
   which is exactly how the DielineView attaches `data-face-id`.
3. Boundary predicates evaluate in the **mm domain**:
   - Bleed: element extends at least `BLEED_MM` past every trim edge that the
     element crosses; interior edges (fully inside the trim) are not checked.
   - Safe: every part of the element (0-sized layers treated as a point) is
     strictly inside the `SAFE_MM` inset of the trim.
   - Overlap: pairwise strict bbox intersection; equal/touching edges are not an
     overlap.
   - Zones: an anchor `position [x, y, z]` (z = face side) is satisfied when a
     layer sits within `ZONE_MATCH_TOLERANCE_MM` of `(x, y)` on that face
     (mm-domain tolerance, `Math.abs(pxToMm(px) - zx) <= ZT`).
4. Rule emission: exactly one `PrintValidationRule` per UID, category
   `"layout"` (+ `"zones"` for `required-zones`), severity error/warning/info
   per §2, preview texts scoped to trimmed count, 10-result cap in
   `quickValidate`.

## 6. Proof — canonical geometry is the sole authority

- The only dimensions/facing in the engine come from frozen
  `units.ts` (`BLEED_MM`, `SAFE_MM`, `ZONE_MATCH_TOLERANCE_MM`, `FACE_DEFS`,
  `facePanel`) and the passed-in model's canonical `DielineGeometry`.
- No safe-margin/bleed-margin literals exist anywhere (test F + independent
  grep). No `3.779` constant. No second DPI/color-mode/text/file model.
- `buildDieline`/`resolveDieline`/`generateDieline` are **not** called from the
  validation path; the engine is a pure consumer of canonical geometry.
- Locked by tests: all 12 canonical faces validated in `validatePerFace`
  (incl. `inside_front` via outer-sibling fallback), zone anchors honored
  within mm tolerance, and `printReady === false` when a `bleed-area` error is
  present.

## 7. Unit tests (`npm run test:units`)

**41 passed / 0 failed** (35 pre-existing M7/M8 + 6 new M8-F). New suite
`tests/m8-f-print-validation.test.ts` proves: A bleed (2.5 mm inside fails /
3.5 mm beyond passes / deep-interior passes); B safe (edge-on line fails /
5.5 mm inset passes / centered passes); C overlap (intersecting true /
separated false / touching false); D zone tolerance (7 mm layer satisfies a
10 mm required anchor within the 5 mm tolerance); E all 12 faces validated,
`inside_front` outer-sibling, `printReady=False` on bleed error; F static
architecture (5 rule UIDs exactly `["bleed-area","face-bounds","overlapping-elements","required-zones","safe-area"]`, category `"layout"`, no
`SAFE_MARGIN`/`BLEED_MARGIN`/`3.779`/`image-dpi`/`image-color-mode`/`text-size`/
`file-size`/`MIN_DPI` in the service or test, deleted legacy paths throw on read,
panel calls `quickValidate(layers, model, canvas)`).

## 8. Typecheck & build

- `npx tsc --noEmit` — clean (0 errors).
- `npm run build` (Next.js, includes type-checking) — succeeded.

## 9. Static architecture audit

- `rg -n "SAFE_MARGIN|BLEED_MARGIN|3\.779" frontend/` → **0 matches** (exit 1).
- Engine/fabricator call sites: only the pre-existing authorized ones —
  `buildDieline` (engine `dieline.ts`, `resolve-dieline.ts`), `resolveDieline`
  (`PackhelpEditor` x1, `DielineEditor` x1), `generateDieline`
  (`M7DielineFallback` + frozen `dieline-generator.ts`). None in M8-F code.
- Exactly **one** active validator panel (`frontend/components/editor/panels/
  ValidationPanel.tsx`, consumed by `layout/EditorRightSidebar.tsx`); the legacy
  duplicate (`components/editor/validation/`, `services/validation.ts`) is gone.
- No new npm packages.

## 10. E2E (Playwright)

`npx playwright test` (full suite, 38 tests) → **37 passed / 1 failed**.

- The single failure is the **documented environment limitation** at
  `cart-checkout.spec.ts:187` ("complete checkout with Stripe test card" —
  Stripe placeholder, cart-clear assertion; see M8_SPEC §18). It is pre-existing
  and not an M8 regression.
- No M8-F-related regressions: `editor-flow` (validation panel renders + runs
  against the real catalog editor), `m7-c-multiface`, `m8-a-physical-geometry`,
  `m8-e-annotations` all pass.
- Playwright browser cache was absent (headless-shell v1243); restored with
  `npx playwright install chromium-headless-shell`.
- Behavior coverage note: the plan's "failing design shows validation issues"
  e2e maps onto the existing editor-flow validation-panel regression (green)
  plus the unit rule matrix; the "passing design exports" half belongs to M8-G's
  export dialog and is NOT performed here.

## 11. Commit hash

`(pending)` — single focused commit on parent `80bcd78`. Working tree contains
only untracked QA artifacts (`.qa-tmp/`, `*_REPORT.md`, `QA_REPORT.md`,
`frontend/playwright-report/`, `frontend/test-results/`) plus the staged M8-F
files.

## 12. Known limitations

- **Face-size resolution is scale-only for unstored sizes.** The editor store
  holds position + scale only (AMENDMENT 4), so `layerBoundsMm` treats a missing
  width/height as a point at the layer position. Layers whose explicit size the
  store does not persist are validated as points; an M8-H-style manifest
  (rendered geometry export) is the intended fix and is **NOT implemented** —
  the engine is written to consume it without restructuring once it lands.
- **Zone matching is 2D (x/y) per face.** The anchor `z` (face side) selects the
  face; depth position of the layer on a face is not adjudicated — consistent
  with the editor's front-face rendering model.
- **`validateLayout`'s `_canvas`/`_model` parameters are unused by design**
  (geometry-only engine); they remain in the signature for caller stability.
- **Preview rules return capped results** (`MAX_RESULTS = 10`) to bound panel
  payload; `printReady` aggregation still considers every violation.
- **FE validation is UX, not certification.** The engine is a geometry
  mirror; DPI / color-mode / font-outline / file-size certification remains
  exclusively M8-I (not implemented), per AMENDMENT 4. The FE never certifies
  print-readiness for ecommerce fulfillment.

## Explicitly NOT performed (M8-F+ prohibited per §3)

Corruption/export certification, approval/handoff/production gate wiring, print
quality services (DPI/CMYK/spots/fonts), vendor/catalog/webhook integration,
catalog redesign, admin dashboards, offline/cache, 3D folding, and the M8-H
rendered-geometry manifest were all intentionally left untouched. No new npm
packages; `dieline.ts`/`units.ts`/`dieline-service.ts`/`dieline-generator.ts`/
backend/Prisma/seed frozen; no `buildDielineV2`/parallel panel model introduced;
no FE print-quality certification added.