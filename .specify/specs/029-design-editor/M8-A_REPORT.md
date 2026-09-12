# M8-A — Physical Geometry Foundation

Implementation of M8A "Physical Geometry Geometry Foundation" from `M8_PLAN.md` /
`M8_TASKS.md` (SPEC-029 design editor). Scope: canonical mm units module, canvas /
zone / store / texture conversion fixes, removal of the legacy 3.779 factor and of
all remaining 800×600 hardcodes. **No M8-B…J work was touched.**

---

## 1. Status

**COMPLETE and verified.** All acceptance criteria from the M8-A row of `M8_TASKS.md`
are met: unit tests (conversion table + `pixelsAt`) pass 6/6, the e2e tolerance check
on the F42 front face passes, M7 regression is green (25/25 in the editor stack), and a
single commit `c03bb12` contains only M8-A files.

## 2. Files changed (15)

| File | Change |
|---|---|
| `frontend/lib/editor/geometry/units.ts` | **NEW** — §6 canonical units API |
| `frontend/components/editor/canvas/DesignCanvas2D.tsx` | store-driven canvas; `800×600` props/defaults removed; `ZoneOverlays` wired to `BLEED_MM`/`SAFE_MM` |
| `frontend/components/editor/canvas/ZoneOverlays.tsx` | bleed/safe zone size via `mmToPx`; `scale` prop removed; defaults from constants |
| `frontend/lib/editor/state/store.ts` | initial canvas, `loadEditorConfig`, and `setSelectedFace` size canvases via `mmToPx(facePanel(dims, face))`; raw `* 3` literals removed |
| `frontend/lib/editor/services/texture-generator.ts` | `options.scale ?? TEXTURE_PX_PER_MM`; `editorToMm = pxToMm(1)` instead of `1/3` |
| `frontend/components/design-editor/validation/DesignValidator.ts` | **DELETED** — dead code carrying the legacy `3.779` |
| `frontend/components/design-editor/validation/ValidationPanel.tsx` | **DELETED** — dead, sole importer of `DesignValidator` |
| `frontend/components/design-editor/canvas/GridSystem.tsx` | **DELETED** — dead component, sole remaining `3.779` hit outside the fixed canvas dir |
| `frontend/components/design-editor/AdvancedDesignEditor.tsx` | **DELETED** — dead legacy editor (unreferenced) |
| `frontend/tests/units.test.ts` | **NEW** — node:test unit suite (6 cases) |
| `frontend/e2e/m8-a-physical-geometry.spec.ts` | **NEW** — F42 canvas-size e2e |
| `frontend/e2e/helpers.ts` | **NEW** — self-contained runtime dep needed to run the spec |
| `frontend/playwright.config.ts` | **NEW** — e2e runner config consumed by the spec |
| `frontend/package.json` | `test:units` script added |
| `frontend/tsconfig.json` | `allowImportingTsExtensions` added (for the `.ts` test import) |

Note: most of the four modified source files carry pre-existing M1–M7 feature work too —
the repo only had the template initial commit, so a whole-file stage was the only option.

## 3. Units foundation (`units.ts`)

Reproduces SPEC-029 §6 verbatim, import-free:

- Constants: `MM_UNIT="mm"`, `PX_PER_MM=3`, `TEXTURE_PX_PER_MM=5`, `MM_PER_CM=10`,
  `DPI_MIN=300`, `BLEED_MM=3`, `SAFE_MM=5`, `ZONE_MATCH_TOLERANCE_MM=5`.
- Functions: `mmToPx(mm)=Math.round(mm*PX_PER_MM)`; `pxToMm(px)=px/PX_PER_MM`;
  `pixelsAt(mm,dpi)=Math.round((mm*dpi)/25.4)`; `facePanel(dims,faceId)=(w,h)` with §7
  semantics (front/back/inside_front/inside_back = L×H; top/bottom/inside_top/inside_bottom = L×W;
  left/right/inside_left/inside_right = W×H).
- `DPI_MIN`, `BLEED_MM`, `SAFE_MM`, `ZONE_MATCH_TOLERANCE_MM` are defined for M8-F/M8-I;
  **no M8-F/M8-I work was performed** (out of scope).
- Per §6: no other px/mm conversion factor is permitted anywhere; the legacy 3.779 was
  deleted and its consumers redirect to the already-live `print-validation.ts`
  (`PrintValidationService`) — no new validation logic was required.

## 4. Canvas dimensions (F42 mailer, 115 × 70 × 38 mm)

`setSelectedFace` now sizes the canvas from `facePanel` × `mmToPx`; `loadEditorConfig`
and the initial core state derive from `mmToPx` too:

| Face | mm panel | logical px |
|---|---|---|
| front | 115 × 38 | **345 × 114** |
| back | 115 × 38 | 345 × 114 |
| top | 115 × 70 | 345 × 210 |
| bottom | 115 × 70 | 345 × 210 |
| left | 70 × 38 | **210 × 114** |
| right | 70 × 38 | 210 × 114 |

Legacy `800×600` defaults are gone from `DesignCanvas2D`; fabric init and the resize
effect both read `store.canvas`. Verified live by e2e: front → top → left face switches
resize the fabric canvas to 345×114 → 345×210 → 210×114.

## 5. Zone conversion

`ZoneOverlays` removed its `scale=3` literal: `bleedPixels = mmToPx(bleedSize)`,
`safeZonePixels = mmToPx(safeZoneSize)`, defaults `BLEED_MM=3` / `SAFE_MM=5`.
`ZoneSettings` state and `useZoneValidation(bleedSize, safeZoneSize)` use the same
constants; the `scale` parameter was deleted from the hook signature.

## 6. Texture conversion

`texture-generator.ts`:
- `const scale = options.scale ?? TEXTURE_PX_PER_MM` (replaces `options.scale || 5`).
- `const editorToMm = pxToMm(1)` (replaces the literal `1 / 3`).

Texture sampling is now canonical: 5 texture px per physical mm, and the workspace-px→mm
step flows through `pxToMm`, so the only conversion factor in the pipeline is `PX_PER_MM`.

## 7. Validator outcome — why nothing was ported

`DesignValidator.ts` was **dead code** — grep showed zero importers (only the dead
`ValidationPanel.tsx` imported it). The 3.779 factor lived there; deleting it satisfies
the §6 mandate **"the legacy 3.779 factor (DesignValidator.ts) is deleted in M8-A; its
consumer is redirected to print-validation.ts (M8-F)"** without M8-F work:
- The live validator is `components/editor/panels/ValidationPanel.tsx` (used by
  `EditorRightSidebar.tsx:695`), which already drives `PrintValidationService` from the
  store — real faces, per-face validation, `missingRequiredZones`.
- `print-validation.ts` already exports the full `ValidationRule / ValidationResult /
  ValidationReport / FaceValidationResult` surface with `SAFE_MARGIN=10`, `BLEED_MARGIN=4`.
- `GridSystem.tsx` (the last `3.779` hit) and `AdvancedDesignEditor.tsx` were likewise
  unreferenced, so the legacy editor tree is fully removed.

## 8. Verification / test counts

| Check | Result |
|---|---|
| Unit tests (`npm run test:units`) | **6 / 6 pass** — constants; mm→px conversion table incl. `Math.round` edge cases; pxToMm inverse; `pixelsAt` incl. `pixelsAt(115, 300)=1358`; 13-row `facePanel` matrix; F42 front 345×114 |
| Typecheck (`npx tsc --noEmit`) | clean, exit 0 |
| Build (`npm run build` / playwright webServer Next build) | exit 0, 127/127 static pages |
| New M8-A e2e (m8-a-physical-geometry.spec.ts) | **1 / 1 pass** |
| M7 + editor regression suite (m8-a, m7-b, m7-c, m7-d, m7-e, m7-editor-catalog, editor-flow) | **25 / 25 pass** |

## 9. Search audit

- `rg '3\.779'` across `frontend/` → **0 hits** (exit 1; G-1 closed).
- Grep over `units.ts`/`store`/`texture-generator.ts`/`DesignCanvas2D`/`ZoneOverlays` for
  `\b800\b`, `\b600\b`, raw `* 3`, `* 5`, `/ 3` → **0 hits** (G-2, G-4 closed).
- No new px/mm conversion factor exists outside `units.ts` (borderline copies per
  M8_PLAN grep rule are acceptable; bare count is 0).
- Staged-diff scan for `console.log` / `debugger` / `TODO` / debug-hack artifacts → clean.

## 10. Scope verification

- **In scope only M8-A.** No Prisma/migrations, no new dependencies, no 3D/dieline
  changes, no validation-logic changes, no blueprint/editorDefaults work, no M8-B…J.
- Dead-legacy deletions were forced by the grep rules (G-1 needs every `3.779` hit dead,
  which required removing `GridSystem.tsx`); deletions were pre-verified to have zero
  importers before removal.
- `playwright.config.ts` + `e2e/helpers.ts` were included as the minimal untracked
  runtime deps of the new spec (the whole e2e directory was created during M7 and never
  committed); everything else in the tree remains uncommitted.

## 11. Commit

- Hash: `c03bb12`
- Message: `M8-A physical geometry foundation: canonical mm units, store-driven canvas, mm-based zones/texture, kill legacy 3.779`
- Files in commit: 15 (15 staged, 15 committed), `+1098 / −1043`. **Deletions:**
  AdvancedDesignEditor.tsx, canvas/GridSystem.tsx, validation/DesignValidator.ts,
  validation/ValidationPanel.tsx. **Additions:** units.ts, tests/units.test.ts,
  e2e/m8-a-physical-geometry.spec.ts, e2e/helpers.ts, playwright.config.ts.
- No M8-B…J work after this point.