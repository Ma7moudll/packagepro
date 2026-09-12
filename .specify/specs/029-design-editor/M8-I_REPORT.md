# M8-I Report — Backend Prepress (Authoritative) & Soft Proof

**Commit:** `feat(spec-029): implement M8-I print prepress certification`
**Scope:** DESIGN-EDITOR M8_PLAN.md milestone I — AMENDMENT 4 authority
split. The backend is the **production authority** for DPI / color mode /
corruption / compression / font embedding AND for bleed / safe / overlap
geometry, evaluated **against the persisted design manifest + editor layer
state** — never against the frontend's display. Parent commit: `2dab74f`
(M8-H).

---

## 1. Status

COMPLETE. The prepress pipeline now (A) reuses the existing file validators
(resolution, color) plus new compressed-quality and font-embedding scans and
returns deterministic, self-explaining verdicts; (B) evaluates bleed/safe/
overlap through `geometry-mirror.ts` — an exact backend copy of the M8-F
algebra — against the persisted `manifest.faces` + top-level `layers`; and
(C) records fixable sub-bleed edges in `fixedAutomatically` so the proof can
render the correction without ever mutating source files. The M8-F frontend
files were not touched. No M8-J work was performed.

## 2. Exact scope

- **Authority split (AMENDMENT 4):** M8-F (`frontend/lib/editor/services/
  print-validation.ts`) stays the lightweight UX mirror. M8-I is authoritative;
  both share the same constants and semantics via the backend-side mirror.
- **File analysis API** (`prepress.service.ts`): `assessFileQuality(buffer,
  fileName, {fileType, declaredMimeType})` runs the pipeline:
  resolution → color → corruption → compression → fonts, and maps each to a
  severity. `fileType: 'preview'` demotes errors to warnings (display copies
  never hard-fail); `print_file` is authoritative.
- **Geometry API** (`geometry-mirror.ts`), exact mirror of the FE `print-
  validation.ts` algebra:
  `PX_PER_MM=3`, `BLEED_MM=3`, `SAFE_MM=5`, `ZONE_MATCH_TOLERANCE_MM=5`,
  `STACKED_OVERLAP_MIN_COVERAGE=0.95`, `AUTOFIX_MIN_BLEED_RATIO=0.6`.
  `layerBoundsMm` mirrors `layerBoundsMm` (position+scale canvas px → mm);
  `checkElementExtendsBeyondBleed` / `checkElementWithinSafeArea` /
  `checkForOverlaps` mirror the FE names; zero-area point markers skip the
  checks; `inside_*` faces resolve through their outer sibling.
- **Persistence API:** `checkOrderDesign(orderId)` upserts `prepress_checks`
  (schema L426-444) and returns the full result object incl. booleans,
  `issues`, `fixedAutomatically`, `checkedAt`; `getPrePressResults(orderId)`
  reads it back (GitHub-query parity for idempotent re-checks).
- **Verdict / severity semantics (locked):**
  - *Resolution* — raster measured from density metadata (min 300); vector
    PDF/SVG/PostScript are **UNVERIFIABLE → warning** (never a fake PASS,
    never a hard fail); a flat sharp 72 on a PDF is treated as missing-
    density default → warning.
  - *Color* — marker-level only (root cause: sharp reports CMYK JPEGs as
    `srgb` and flattens CMYK→sRGB on `.jpeg()`+`.withMetadata()`): JPEG SOF
    component count + Adobe APP14 transform, PNG IHDR, PDF color spaces.
    CMYK/Spot/Grayscale → info (Grayscale satisfies a CMYK requirement);
    unknown → warning; RGB → **error** for `print_file`.
  - *Corruption* — PDF parses via pdf-lib; raster parses via sharp metadata;
    failure → **error**.
  - *Compression* — JPEG quant tables infer quality; `< 80` → warning
    (`MIN_PRINT_QUALITY=80`); PNG lossless → info; too-truncated → UNVERIFIABLE
    warning.
  - *Fonts* — PDF font-descriptor scan (Standard-14 exempt), SVG text-node
    rule; raster → UNVERIFIABLE warning; non-embedded → warning.
  - Aggregate booleans: `fontsEmbedded`/`compressionOk` mean "no non-info
    issue" (fonts/compression are warnings); `passed` remains "no error".
- **Proof generator** (`proof-generator.ts`, rewritten this milestone):
  `generateProof(orderId)` → `Promise<ProofResult{proofUrl, mockupUrl?,
  approvalToken}>`; builds a real per-face pdf-lib proof incl. cover page,
  per-face dieline path overlays, color/registration bars, and the recorded
  auto-fixes; uploads to `proofs/${orderId}` and registers a
  `DesignFile{fileType:'proof'}`; `approvalToken` round-trips through Redis
  (null-safe). Endpoint contract (`approval.service.ts`) unchanged.

## 3. Files changed

| File | Change |
| --- | --- |
| `backend/src/services/pre-press-checker/prepress.service.ts` | **Rewritten.** Authoritative `assessFileQuality` + `checkOrderDesign` / `getPrePressResults`, UNVERIFIABLE try/catch guards, defaults, aggregate-boolean semantics, `fixedAutomatically` persistence. |
| `backend/src/services/pre-press-checker/geometry-mirror.ts` | **New.** Exact backend mirror of the M8-F algebra (constants, bounds, bleed/safe/overlap, auto-fix plan). |
| `backend/src/services/pre-press-checker/proof-generator.ts` | **Rewritten.** Real pdf-lib soft proof with cover page, dieline overlays, color/registration bars, auto-fix rendering, upload + `DesignFile` registration. |
| `backend/src/services/pre-press-checker/validators/color.validator.ts` | **Rewritten.** Async marker-level `detectColorMode` (SOF/APP14, PNG IHDR, PDF color spaces incl. image-stream `/ColorSpace`); corrupt-but-loadable PDFs degrade to `unknown`. |
| `backend/src/services/pre-press-checker/validators/file-kind.ts` | **New.** Magic-byte detection JPEG/PNG/PDF/PostScript/SVG + declared-MIME allow-list fallback (PS magic length 10). |
| `backend/src/services/pre-press-checker/validators/quality.validator.ts` | **New.** `parseJpegTables` / `checkCompression` / `MIN_PRINT_QUALITY=80`. |
| `backend/src/services/pre-press-checker/validators/font.validator.ts` | **New.** `scanPdfFonts` / `checkFonts` (descriptor scan, Standard-14 exempt, SVG text rule). |
| `backend/src/services/pre-press-checker/prepress.unit.test.ts` | **New.** 29 unit tests (geometry parity, file-kind, quality, color marker detection, fonts, preview demotion, determinism, proof unit). |
| `backend/src/services/pre-press-checker/prepress.integration.test.ts` | **New.** 2 vitest+Prisma+local-HTTP integration tests (upsert side effects, auto-fix plan, determinism, preview demotion, corrupt-file gate failure). |
| `frontend/e2e/m8-i-prepress.spec.ts` | **New.** Serial Playwright spec (real Postgres + ephemeral asset server): HTTP check → results parity → raw-SQL `prepress_checks` read-back → gated proof `DesignFile` read-back. |
| `.specify/specs/029-design-editor/M8-I_REPORT.md` | **New** (this report). |

Unchanged (frozen / out of scope): `frontend/lib/editor/services/
print-validation.ts` and `frontend/tests/m8-f-print-validation.test.ts`
(M8-F — untouched this milestone), `frontend/lib/editor/services/dieline-
manifest.ts`, `resolution.validator.ts` (reused unchanged), the rush
`prepress.controller.ts` / `prepress.routes.ts` / `approval.service.ts`,
the Prisma schema (no migrations), and all other M8-G/H surfaces.

## 4. Architecture before / after

Before (M8-F only): all quality + geometry decisions lived client-side in the
editor's `print-validation.ts`; the persisted `designData` carried only the
manifest snapshot the editor happened to write, and the backend had no
authoritative check.

After: the backend is the authority. On-demand (or admin) `checkOrderDesign`
re-downloads the persisted `print_file`/`preview` assets, runs the full
file-quality pipeline, evaluates geometry from the persisted manifest faces +
layer state, and **upserts** a `prepress_checks` row that the proof and any
review UI can read via `getPrePressResults`. Fixable bleed shortfalls land in
`fixedAutomatically` — the proof-render step applies them without any mutation
of the source files.

## 5. Semantics

- **UNVERIFIABLE never fakes a PASS and never hard-fails:** anything we cannot
  measure (PDF/vector DPI, raster fonts, truncated-but-parseable content)
  downgrades to a warning. Unit tests assert this for corrupt/truncated rasters
  (resolution + compression → UNVERIFIABLE warnings, never a fake PASS) except
  through the explicit preview-severity path.
- **CMYK detection is marker-level only** — the root cause is Sharp: it reports
  CMYK JPEGs as `srgb` and flattens CMYK→sRGB whenever `.withMetadata()`
  follows `.jpeg()` (and resets density to 72 on the conversion path). The
  validator therefore parses JPEG SOF component count + Adobe APP14 transform
  and the test fixture injects a JFIF APP0 density segment post-encode
  (`injectJfifDensity`) because sharp drops density through that pipeline.
- **`fileType:'preview'` demotes errors to warnings** — display copies are not
  the print master; only `print_file` hard-fails.
- **Aggregates: `fontsEmbedded` / `compressionOk` = "no non-info issue"**;
  `passed` = "no error". Precision: a clean 300dpi CMYK master at q90 yields
  `passed:true` even with a fixable sub-bleed edge + safe-line warning.
- **Determinism:** identical bytes → identical verdicts; re-running
  `checkOrderDesign` for the same design produces identical `issues` +
  `fixedAutomatically` (asserted in unit + integration).

## 6. Unit tests (`npx vitest run src/services/pre-press-checker/prepress.unit.test.ts`)

29/29 pass. Coverage: geometry parity (bleed/safe/overlap, zero-area skips,
`inside_*` resolution, unknown faceId), file-kind detection, quality mapping
(JPEG table inference incl. `IJG_LUMINANCE_TABLE`), CMYK-vs-RGB marker
detection, PDF embed RGB image + corrupt-PDF robustness, font embedding
(embedded pass / non-embedded warning / raster UNVERIFIABLE), preview
severity demotion, fixed-verdict aggregates, determinism (identical bytes →
identical verdicts), and corrupt/truncated raster → UNVERIFIABLE-warning.

**Defects found & fixed while writing this suite:**
1. `PDFStream` in this pdf-lib does not extend `PDFDict` — image XObject dict
   entries (incl. `/ColorSpace`) live on `obj.dict`; read through it.
2. Truncated PDFs can `load()` yet fail `getPages()` (missing `/Root`) — the
   color scan is wrapped so a scan failure degrades to `unknown`, never a 500.
3. **`resolution.severity` was `'error'` even when the check PASSED** (it was
   keyed only on `fileType`, not `res.valid`) — surfaced first by the
   integration suite; now `info` on a valid pass.

## 7. Backend integration tests (`npx vitest run src/services/pre-press-checker/prepress.integration.test.ts`)

2/2 pass (real Postgres + local HTTP asset server for axios; user/customer/
order/design/design-file seeded and cleaned). Case A/B/C: clean CMYK master +
preview RGB → `resolutionOk/colorModeOk/bleedMarginsOk/compressionOk/ passed`
all true, `safeZoneOk` false (full-bleed safe-line), `fixedAutomatically[0]`
= `extend_to_bleed` for the sub-bleed right edge, no error-severity issues,
raw-SQL `prepress_checks` read-back, and an idempotent second run with
identical `issues`+`fixedAutomatically`. Case A (corrupt): a truncated PNG
print master records a `corruption` error, `passed:false`, and UNVERIFIABLE
warnings for resolution/color/compression — never a fake PASS.

## 8. E2E (Playwright, real Postgres) — `e2e/m8-i-prepress.spec.ts`

1/1 run (proof test D is `test.skip`'d locally because object storage
`S3_ENDPOINT` is not configured — no MinIO/R2 exists in this env or CI; it
executes wherever R2/MinIO is present). Full suite batch re-run: **m7-e (5) +
m8-h (4) + m8-i (1) = 10/10 passed** in one serial run.

- **A/B/C** drive the real `POST /api/orders/:id/prepress-check` from the
  browser, assert the JSON contract (CMYK 300dpi master passes resolution +
  color; sub-bleed right edge recorded in `fixedAutomatically`; `safeZoneOk`
  false; `passed` true; preview RGB demoted), assert `GET
  /api/orders/:id/prepress-results` returns identical `issues` and
  `fixedAutomatically`, then raw-SQL read `prepress_checks[designId]` for the
  persisted booleans + `extend_to_bleed` fix detail ("right edge extended to
  3mm bleed") + `checkedBy='system'`.
- **D** (gated): `POST /api/orders/:id/request-approval` → seed `design_files`
  row of `fileType='proof'` whose URL contains `/proofs/`.

## 9. Typecheck & build

- `frontend npx tsc --noEmit` → clean.
- `backend npx tsc --noEmit` (in `npm run build`) → clean; `npm run build`
  succeeds.
- Backend full `vitest run` → **10 files, 98/98 passing**.

## 10. Design-governance compliance

- **No second geometry engine:** geometry is evaluated solely by
  `geometry-mirror.ts` (mirror of M8-F); grep audit confirms no other
  geometry evaluator in the prepress path.
- **Manifest-not-geometry:** `checkOrderDesign` reads faces/`prepress` from the
  persisted `designData.manifest` and layers from the persisted top-level
  `layers` — the FE display is never consulted.
- **M8-F untouched:** `git diff` for `frontend/lib/editor/services/
  print-validation.ts` and `frontend/tests/m8-f-print-validation.test.ts` is
  empty.
- **Contracts green:** `prepress.controller.ts`, `prepress.routes.ts`,
  `approval.service.ts` compile and their existing tests still pass within the
  98-test backend suite.
- **No DB migrations:** only new code over the existing `prepress_checks`/
  `design_files` schema.
- **No M8-J:** not started.

## 11. Commit hash

See `git log` — single commit `feat(spec-029): implement M8-I print prepress
certification` on top of `2dab74f`.

## 12. Known limitations

- Color-space detection is marker-level by design; an exotic ICC profile
  without the standard markers is reported `unknown` (warning), not guessed.
- PDF vector/DPI and raster fonts are **UNVERIFIABLE** by nature — warnings,
  never claims.
- JPEG quality inference is table-based; very small/noisy fixtures occasionally
  land near the 80-line (behavior is deterministic and unit-pinned).
- Proof `DesignFile` persistence requires object storage; the e2e proof step is
  gated on `S3_ENDPOINT`.

## Explicitly NOT performed (M8-I boundary)

- M8-J (production / sample pipeline) — not started.
- Any change to M8-F frontend validation files.
- DB migrations or schema changes; new routes/controllers (existing prepress
  + approval surfaces reused).
- Geometry re-implementation: only the single mirror, and only on persisted
  manifest data.