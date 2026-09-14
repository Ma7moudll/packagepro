# M8 Final Acceptance Report — SPEC-029 Design Editor, Milestone M8

**Gate:** Final M8 Acceptance Gate (audit-only, evidence-first).
**HEAD audited:** `fcaf77369abee3387d7f154abb370df2dfe2ced2` — `feat(spec-029): complete M8 product coverage` (authoritative M8-J).
**Branch:** `001-design-editor` (master `3748b71`).
**Verdict:** **STATE A — PASS. No code changes required. No M8 blocker.**
**Date:** 2026-09-13.

---

## 0. Gate scope & rules observed

- **Audit-only.** No implementation. Read/inspect/search/test/verify only. A code change would be
  permitted only for a concrete, reproducible Class C blocker violating an authoritative M8
  criterion. **None was found**, so the tree is byte-identical to `fcaf773` (git status: tracked
  tree clean; only untracked scratch/report files, §7).
- **M8 is the final milestone. M8-K does not exist.** No M8-K / premature-milestone marker exists
  anywhere in the source or test tree (grep: 0 matches).
- **Naming divergence, left untouched:** commit `3ee228e` is historically titled *"implement M8-J
  certified dieline export delivery"* and committed `M8-J_REPORT.md`. The authoritative
  `M8_PLAN.md` M8-J is **Product Coverage Completion & Closure**, implemented at `fcaf773`
  (`M8-J_PRODUCT_COVERAGE_REPORT.md`). **Neither commit was renamed, amended, or rewritten.**
  Both reports coexist; the export report is byte-identical to its committed state.

### Milestone chain (each parent verified)

```
c03bb12 M8-A physical geometry foundation (kill 3.779)
56de6d4 M8-B seed blueprint + schemaVersion/unit
85705bc M8-C dieline.ts engine + dieline-service serializer
8618d24 M8-D PackhelpEditor/DielineCanvas/DielineView/M7DielineFallback migration + resolve-dieline
80bcd78 M8-E annotations (display-only)
ac6d6a3 M8-F unified frontend geometry validation in mm
c0eb1e7 M8-G canonical SVG path-body contract
2dab74f M8-H persistence manifest (schemaVersion:2) + lifecycle save gate
bee879a M8-I backend print prepress certification
3ee228e M8-J certified dieline export delivery          (companion: M8-J_REPORT.md)
fcaf773 M8-J product coverage completion & closure      (HEAD; M8-J_PRODUCT_COVERAGE_REPORT.md)  <-- audited
```

---

## 1. Acceptance matrix

| # | Criterion (source) | Method | Result | Evidence |
|---|---|---|---|---|
| **A** | Single px/mm model; named constants only; no `3.779` (M8-A, G-1) | static grep over source | **PASS** | `3.779` in code **0 matches** (only `pdfjs-dist` node_modules artifact + `m8-g-svg-contract.test.ts` forbidden-token assertion + report prose). |
| **B** | Seed blueprint per product; `schemaVersion:1`, `unit:"mm"` (M8-B, G-8/G-9/G-10) | file read + integration | **PASS** | `seed.ts` ships `MAILER/FOLDING_CARTON/SHIPPING_BOX/RIGID_BOX/PIZZA_BOX` structures + `*_TEMPLATE` blueprints, `support:"supported"`. |
| **C** | Canonical mm dieline engine + real serializer/overlap (M8-C, G-11/G-12) | file read + tests | **PASS** | `frontend/lib/editor/geometry/dieline.ts`; `dieline-service.ts` `serializeSVG` is the sole SVG authority. |
| **D** | UI consumes resolved geometry; no second model; M7 fallback preserved (M8-D) | file read | **PASS** | `resolve-dieline.ts:26` single resolution point; `DielineCanvas.tsx` thin wrapper, no `buildDieline`/`generateDieline`; `DielineView` delegates to frozen `M7DielineFallback`. |
| **E** | Annotations display-only, never part of exported SVG/geometry (M8-E, G-20) | static grep | **PASS** | `annotations.ts` (`deriveFoldAngleAnnotations`/`deriveGlueTabAnnotations`/`deriveCornerAnnotations`) referenced by **no** serializer/export/context file. |
| **F** | Single FE mm validator; real bleed/safe/overlap (M8-F, G-5/G-6/G-7) | static grep + tests | **PASS** | `print-validation.ts` is the **only** file defining `checkForOverlaps`/`checkElementExtendsBeyondBleed`; `ZONE_MATCH_TOLERANCE_MM=5`; `BLEED_MARGIN`/`SAFE_MARGIN` in code **0 matches**. |
| **G** | `px = round(mm×dpi/25.4)`; per-face print; honest AI/EPS (M8-G, G-17/G-18/G-19) | static + tests + e2e | **PASS** | `m8-g-svg-contract.test.ts` + `m8-g-svg-contract.spec.ts` green; single `serializeSVG`; no bypass in `certified-export.ts`. |
| **H** | `schemaVersion:2` manifest, reproduce patched-but-unexported, save gate non-DRAFT (M8-H, G-13…G-16) | file read + tests | **PASS** | `dieline-manifest.ts` (`serializeDesignData`/`deserializeDesignData`/`normalizeFromManifest`); `design.service.ts:186` rejects non-DRAFT; `m8-h-persistence.test.ts` + `design.save-gate.integration.test.ts` green. |
| **I** | Backend authoritative prepress; FE never certifies CMYK/fonts/corruption/DPI (M8-I, §11) | file read + tests | **PASS** | `prepress.service.ts` (bleed/safe/fonts/DPI/quality/color validators + `geometry-mirror.ts`); `prepress.unit.test.ts` + `prepress.integration.test.ts` + `dieline-delivery.unit.test.ts` green. |
| **J — J1** | `folding-carton` blueprint+dieline, parity 2D/3D/export | integration + unit + e2e | **PASS** | `catalog.product-coverage.integration.test.ts` supported×5; `product-coverage.test.ts`; `m8j-e2e.spec.ts`. |
| **J — J2** | `shipping-box` blueprint+dieline (corrugate, flute B) | same | **PASS** | as J1. |
| **J — J3** | `rigid-box` lid/base two-piece blank | same | **PASS** | as J1. |
| **J — J4** | `pizza-box` cruciform blank | same | **PASS** | as J1. |
| **J — J5** | explicit `support:"deferred"` + reason for paper-bag / poly-mailer / label | integration + e2e | **PASS** | `seed.ts` deferral rows with reasons; service override forces `schemaVersion/unit/dieline/prepress` `undefined`; `catalog.service.ts:244`; `DeferredDielinePlaceholder.tsx`; `m8j-e2e.spec.ts` deferred×3. |
| **J — J6** | coverage matrix; required pass / deferred flagged / no ambiguity | integration test | **PASS** | `catalog.product-coverage.integration.test.ts` (3/3 green): every seeded product has explicit verdict; supported⇒blueprint, deferred⇒no blueprint+reason. |
| **J — J7** | full E2E ×3 consecutive; ≥ M7 baseline; only Stripe env limitation | Playwright ×3 | **PASS** | **58 passed ×3** (6.0 / 6.5 / 8.1 min), 1 skipped (S3-gated proof upload, §5). |
| **§22.1** | every GAP → milestone or deferral | GAP→commit map | **PASS** | G-1…G-20 all mapped (A–I + J1–J5); no unaddressed/undeferred GAP. |
| **§22.6** | FaceId + MeshPartId contract | file read + tests | **PASS** | `faceRelationships` on blueprint; `userData.meshPartId`; `m8-a-physical-geometry.spec.ts`. |
| **§22.7** | prepress authority unambiguous | F vs I split | **PASS** | FE = geometry UX mirror only; backend owns CMYK/fonts/DPI/corruption. |
| **§22.10** | Prisma impact: read-only JSON, no migration | git audit | **PASS** | `fcaf773` touches no schema/migration; coverage tests read-only. |
| **§22.11** | M7 regression ×3, only Stripe limitation | Playwright ×3 | **PASS** | all `m7-*` green in the 58; Stripe auth error is the documented env-only limitation. |
| **§22.13 / AMEND 3** | legacy migration honestly `best_effort`, never "historically exact" | file read | **PASS** | manifest provenance marks migrated M7 designs `best_effort`. |
| **AMEND 1–5** | all ratified clarifications evidenced in tests | tests | **PASS** | AMEND 1 (`m8-a`/`m8-e`/`m8-d`), 2 (`dieline-geometry`/`m8-d`), 3 (`m8-h`), 4 (`prepress.*`/`m8-f`), 5 (`m8-h`). |

**All rows PASS. No FAIL, no BLOCKED, no NOT-APPLICABLE-with-risk.**

---

## 2. Regression evidence

| Suite | Command | Result |
|---|---|---|
| Backend | `npx vitest run` | **12 files, 110/110 passing** (runs 2–4 consecutive green) |
| Backend targeted | `vitest run catalog.product-coverage.integration.test.ts` | **3/3 passing** |
| Frontend units | `npm run test:units` | **81/81 passing** |
| Backend types | `npx tsc --noEmit` | **clean** |
| Frontend types | `npx tsc --noEmit` | **clean** |
| E2E run 1 | `npx playwright test` | **58 passed, 1 skipped** (6.0 m) |
| E2E run 2 | `npx playwright test` | **58 passed, 1 skipped** (6.5 m) |
| E2E run 3 | `npx playwright test` | **58 passed, 1 skipped** (8.1 m) |

### Transient backend-auth observation (Class B — baseline, NOT an M8 defect)

The **first** backend run of this gate showed 5 failures confined to `src/modules/auth/`
(`auth.service.test.ts:74` duplicate-registration; `auth.login.test.ts` rate-limit/backoff/CAPTCHA).
Diagnosis:

- The failures are **order/state-coupled to shared Redis rate-limit counters** across the parallel
  vitest workers — the exact tests that consume attempt counters.
- **The entire `frontend/…/auth` module is untouched by every M8 commit**: `git diff
  56de6d4^..HEAD --name-only -- backend/src/modules/auth` is **empty**.
- It **does not reproduce**: subsequent runs 2, 3, 4 → **110/110 each**, and the coverage/auth-catalog
  surfaces are green in every run.

Classification: **Class B (pre-existing test-infra environment coupling), documented, no code
change.** It is not a violation of any M8 criterion. (Recorded for the maintainers; a future
isolated-Redis-per-worker change is out of M8 scope.)

---

## 3. Architecture-integrity audit (§20)

| Invariant | Probe | Result |
|---|---|---|
| No second geometry engine | `DielineGeometryV2` / `buildDielineV2` / `resolveDielineV2` / `class DielineService|Template|Design` | **0 matches** |
| Single SVG serializer | `export function serializeSVG` | **1** (`dieline-service.ts:52`); callers = `certified-export.ts` (delegate), `DielineView.tsx`, tests — no bypass |
| Frozen legacy generator | `generateDieline` | only `utils/dieline-generator.ts:25`; sole caller `M7DielineFallback.tsx` (frozen M7 compat) |
| No legacy `exportAsSVG` leakage | `exportAsSVG` | only `lib/printing/{fold,die}-*.ts`, template-initial `3748b71`; **not imported** by editor/export; `git log c03bb12..HEAD -- lib/printing` empty |
| No fabricated constants | `3.779` / `BLEED_MARGIN` / `SAFE_MARGIN` in code | **0 matches** |
| Annotations not exported | annotations referenced by serializer/export/context | **0 matches** (display-only) |
| Single FE validator | files defining `checkForOverlaps` etc. | **1** (`print-validation.ts`) |
| No M8-K / premature markers | `M8-K` / `premature` | **0 matches** |

---

## 4. Scope / git audit

- `git show --name-status fcaf773`: 12 files, all `.ts`/`.tsx`/`.md` — **no binaries, no generated
  artifacts, no schema/migrations**.
- `fcaf773` change-set exactly: `seed.ts`, `catalog.service.ts`, catalog editor-config test, +new
  product-coverage integration test, +`DeferredDielinePlaceholder.tsx`, `DielineCanvas.tsx`, +`m8j-e2e.spec.ts`,
  `store.ts`, `types.ts`, +`product-coverage.test.ts`, `shared/types/index.ts`, +coverage report.
- Secret scan over the diff (password/secret/token/api-key/private) → **0 hardcoded secrets**;
  everything flows through `process.env`.
- `git status`: **tracked tree clean**; HEAD == `fcaf773`.

---

## 5. Documented limitations (honest boundaries, not blockers)

1. **S3-gated skip:** `m8-i-prepress.spec.ts:223` proof-upload test skips when `S3_ENDPOINT` is
   unset — a deliberate environment gate, not a regression. Counted as the `1 skipped` in every run.
2. **Stripe env limitation:** backend logs `StripeAuthenticationError: Invalid API Key provided:
   sk_test_…` for checkout against placeholder test keys. This is the M7-documented environment-only
   limitation; no product assertion depends on a live Stripe charge.
3. **Deferred products** (paper-bag/poly-mailer/label) intentionally render no net (placeholder);
   non-rectangular path authoring is post-M8 by spec §14.
4. **Blueprint panel positions** remain authored at template reference size; the canonical look is
   produced by runtime re-sizing (documented in `M8-J_PRODUCT_COVERAGE_REPORT.md §9`).

---

## 6. Untracked scratch state (Class A — report only, no action)

`git status --short` shows untracked, non-source scratch from earlier work: `.qa-tmp/`,
`frontend/.qa-tmp/`, `frontend/playwright-report/`, `frontend/test-results/`, `QA_REPORT.md`, and
four stray untracked milestone drafts (`M8-B_REPORT.md` … `M8-E_REPORT.md`). These are not part of
the authoritative chain and were **left untouched**. They do not affect acceptance; cleanup is an
optional maintainer action.

---

## 7. Gate verdict

> **STATE A — PASS.**
>
> All M8 acceptance criteria (milestones B–I, sub-tasks J1–J7, the §22 Definition of Done, and
> AMENDMENTS 1–5) are **verified with objective, reproducible evidence**. The full regression is green
> three consecutive times (58 E2E ×3, backend 110/110, frontend 81/81, both typechecks clean). The
> architecture-integrity invariants hold (single engine, single serializer, single FE validator,
> no fabricated constants, no second source of truth). No Class C blocker exists.
>
> **No code was changed and no corrective commit is required.** The audited HEAD remains
> `fcaf773`. **M8 is complete and closed.** M8-K does not exist.
