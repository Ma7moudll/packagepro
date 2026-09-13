# M8-J Report — Certified Dieline Export / Delivery Layer

**Commit:** `feat(spec-029): implement M8-J export delivery contract`
**Scope:** DESIGN-EDITOR M8_PLAN.md milestone J — the certified dieline export
/ delivery layer on top of the canonical M8-C geometry pipeline
(`resolveDieline` → `buildDieline` → `serializeSVG`) and the M8-I prepress
certification result. Parent commit: `bee879a` (M8-I).

---

## 1. Status

COMPLETE. There is exactly **one geometry pipeline** (frontend canonical
`serializeSVG`) and exactly **one certification gate** (the persisted M8-I
`prepress_checks` row, read back by the existing `getPrePressResults`). The
delivery layer is a thin, deterministic, auditable contract over both — it
(re)uses the existing `POST /designs/:id/export` route, adds no second engine,
no DB writes, and no schema. The backend produces a **corroborating
lifecycle-anchored receipt** (`certifiedDielineReceipt`); the frontend is the
**byte authority** that actually assembles and downloads the artifact through
`serializeSVG`.

## 2. Authority split (locked in code comments)

- **Frontend = byte authority.** `assembleDielineDelivery` in
  `frontend/lib/editor/services/certified-export.ts` only delivers when
  `assessCertification` returns `CERTIFIED` *and* the live editor artifact —
  re-derived through the canonical `resolveDieline`/`serializeSVG` path — is
  **byte-identical** to the certified snapshot (`artifactsMatch` exact
  equality). The live-vs-snapshot byte-identity check is the client gate.
- **Backend = corroborating receipt only.** `certifiedDielineReceipt` is
  pure (no DB / no network), maps the *persisted* M8-I result to an explicit
  receipt, and is **lifecycle-anchored** (design `updatedAt` vs check
  `checkedAt`). Its `status`/`certificationStatus` are advisory; the client
  is authoritative — on disagreement the client wins.
- The receipt **never contains geometry**: assertable at runtime — a delivered
  receipt serializes to JSON with no `<svg`, no `data-face-id`, no `<path` —
  and pinned by unit + e2e.

## 3. Delivery gate paths

Deterministic mapping from persisted state to receipt outcome (unit-tested,
and mirrored 1:1 by the FE `assessCertification`):

| State | Receipt `status` | `certificationStatus` |
| --- | --- | --- |
| No linked order on the design | `unavailable` | `NOT_CERTIFIED` |
| No `prepress_checks` row (results endpoint agrees: 404) | `blocked_certification` | `NOT_CERTIFIED` |
| Stale — `design.updatedAt > checkedAt` | `blocked_certification` | `NOT_CERTIFIED` |
| Persisted `passed === false` | `blocked_certification` | `FAILED` |
| Persisted verdict contains UNVERIFIABLE issues | `blocked_certification` | `UNVERIFIABLE` |
| Current + passing + verifiable | `delivered` | `CERTIFIED` |

Wording discipline: a blocked receipt reads "blocked_certification" and its
reason names the fail point; nothing is ever marked ready/certified/approved
unless the gate actually passed.

## 4. Determinism & naming

`dielineDeliveryFileName(boxType)` → `dieline-<slug>.svg`. The slug is the
canonical `manifest.product.boxType` (fallback top-level `product.boxType`),
slug-mangled `[a-z0-9-]`, defaulting to `dieline`. **No timestamps, no
UUIDs** — the same design yields the same filename forever, so a certified
artifact can be re-delivered identically on any later day (`dieline-mailer-box.svg`,
`dieline-pizza-box.svg`, …).

## 5. Files changed

| File | Change |
| --- | --- |
| `backend/src/modules/designs/dieline-delivery.ts` | **New.** Pure receipt module: `dielineDeliveryFileName`, `hasUnverifiableVerdict`, `certifiedDielineReceipt`; no DB import, no geometry. |
| `backend/src/modules/designs/dieline-delivery.unit.test.ts` | **New.** 8 unit tests (A–H) covering the full gate table above + filename determinism + no-geometry receipt. |
| `backend/src/modules/designs/design.service.ts` | `exportDesign` gains the sync `svg` branch (M8-J comment): boxType from canonical `manifest.product.boxType`, prepress from `getPrePressResults(design.orderId)`, returns `certifiedDielineReceipt(...)`. Imports `certifiedDielineReceipt`. |
| `backend/src/modules/designs/design.controller.ts` | `exportDesignSchema.format` includes `'svg'` (schema-level — still `200` JSON, not async job); `options.dieline?: boolean`. |
| `frontend/lib/editor/services/certified-export.ts` | **New.** FE pure contract: `CertificationStatus`, `assessCertification`, `dielineExportFileName`, `canonicalSvg` (delegates to `serializeSVG` — sole serialization), `artifactsMatch`, `canonicalPersistedGeometry`, `canonicalLiveGeometry`, `assembleDielineDelivery`. |
| `frontend/tests/m8-j-certified-export.test.ts` | **New.** 12 FE unit tests (A–L), incl. the F42 mailer-box blueprint fixture resolving through `resolveDieline` and byte-identity delivery/no-delivery branches. |
| `frontend/lib/api/designs.ts` | Adds `exportCertifiedDieline(id)` (`POST /designs/:id/export` `{format:'svg', options:{dieline:true}}`) and `getPrePressResults(orderId)`. |
| `frontend/components/editor/export/certified-export-context.tsx` | **New.** Provider: `refresh()` = session → `deserializeDesignData` → persisted manifest dieline side + live side → byte-identity `coversArtifact` → prepress fetch → assess → deliver; corroborating server receipt fetch; `downloadCertified()` Blob download; `useCertifiedExport()` hook. |
| `frontend/components/editor/export/ExportDialog.tsx` | Wrapped in provider; `ExportDialogInner` re-checks on open; certified dieline section (BadgeCheck header, re-check button, delivered → download with deterministic fileName, else amber "Not certified" + gate reason, EN/AR). The M8-G static-audit file `frontend/components/design-editor/export/ExportDialog.tsx` is untouched. |
| `frontend/e2e/m8-j-certified-export.spec.ts` | **New.** Serial Playwright spec, real Postgres, 6 tests (A–F) — see §8. |
| `.specify/specs/029-design-editor/M8-J_REPORT.md` | **New** (this report). |

Unchanged / frozen: `frontend/lib/editor/geometry/{dieline.ts,units.ts,
resolve-dieline.ts}`, `frontend/lib/editor/services/dieline-service.ts`
(`serializeSVG` — sole SVG authority), `shared/types/index.ts`, `storage.ts`,
M8-G/M8-H/M8-I surfaces, the Prisma schema (no migrations).

## 6. Backend unit tests (`npx vitest run src/modules/designs/dieline-delivery.unit.test.ts`)

8/8 pass, pure / DB-free. Covers: no-order → `unavailable`/`NOT_CERTIFIED`;
no-prepress → blocked/`NOT_CERTIFIED`; stale → blocked/`NOT_CERTIFIED`
(instant-level, same-timestamp tolerated); `passed:false` → blocked/`FAILED`;
UNVERIFIABLE → blocked/`UNVERIFIABLE`; current+passed → `delivered`/`CERTIFIED`;
deterministic `dieline-<slug>.svg` naming (slug mangling, `dieline` default,
no timestamps); and a receipt whose JSON contains no `<svg|data-face-id|<path`.

## 7. FE unit tests (`npm run test:units` — `node --test --experimental-strip-types`)

12/12 pass (full suite 72 total). Covers: certification status resolution
(no-result / stale / not-covers / FAILED / UNVERIFIABLE / CERTIFIED),
`artifactsMatch` exact byte equality, live-vs-snapshot identity through the
canonical pipeline, `assembleDielineDelivery` delivering only when CERTIFIED
(blocked keeps a deterministic fileName with no `svg` payload; unavailable when
CERTIFIED but no geometry; error paths return blocked-not-throw), and the
deterministic FE filename.

**Defects found & fixed while writing the suites:**
1. **Ownership identity in e2e:** `exportDesign`’s `isDesignOwner` asserts
   `design.order.customerId === token.userId`, i.e. `orders.customerId` must
   equal `users.id`. E2E fixtures now create the QA customer row with
   `customers.id == users.id` so ownership resolves.
2. **Timestamp wall-clock (environment):** `designs.updatedAt` /
   `prepress_checks.checkedAt` are `timestamp without time zone`; Prisma writes
   UTC wall-clock but raw-SQL `now()` writes the **cluster TimeZone wall time**
   (here Africa/Cairo, +3 h), which read back as a +3 h shift and made every
   design *stale*. E2E fixtures write design timestamps as UTC-wall
   (`now() AT TIME ZONE 'UTC'`) so the comparison is instant-correct in any
   TZ. App-written timestamps (Prisma) are unaffected.
3. **BoxType path:** the canonical envelope carries the box at
   `manifest.product.boxType`; the export branch now reads that before the
   top-level fallback, so `dieline-mailer-box.svg` (not `dieline-dieline.svg`).

## 8. E2E (Playwright, real Postgres) — `e2e/m8-j-certified-export.spec.ts`

**6/6 pass, serial.** backend served at `localhost:3000/api`, real Postgres
via `e2e/db.ts`, QA login via `loginViaApi`.

- **A** — live prepress check (ephemeral jpeg asset server, `injectJfifDensity`
  300 DPI CMYK master) → `passed:true`; `export` → `200` `delivered` /
  `CERTIFIED` / `dieline-mailer-box.svg`; receipt JSON contains no
  `<svg|data-face-id|<path`.
- **B** — gate is live *and* reversible: `UPDATE designs SET updatedAt = +1h`
  → `blocked_certification`/`NOT_CERTIFIED` (stale, reason on record); then
  `checkedAt = +2h` → `delivered`/`CERTIFIED` again — re-certification, no
  fabrication.
- **C** — persisted `passed:false` row → `blocked_certification`/`FAILED`.
- **D** — passed row carrying an `unverifiable` warning → `blocked_certification`
  /`UNVERIFIABLE` (M8-I demotion respected — never marketed as a pass).
- **E** — no check on record → `blocked_certification`/`NOT_CERTIFIED`, and
  `GET /orders/:id/prepress-results` agrees (404).
- **F** — exports are **read-only corroboration**: `prepress_checks` count is
  unchanged across a stale→fresh cycle + repeat exports, and `designs` never
  grows a `dielineReceipt` column (assertion-only, no schema).

## 9. Static audits & typecheck

- `rg` for rejected second-engine tokens across every new M8-J file
  (`buildDielineV2`, `DielineGeometryV2`, `generateExportGeometry`,
  `exportGeometryModel`, `3.779`) → **0 matches**.
- `backend npx tsc --noEmit` → clean; backend `vitest run` → **11 files,
  106/106 passing**.
- `frontend npx tsc --noEmit` → clean; `npm run test:units` → **72 passing**.
- `e2e/m8-j-certified-export.spec.ts` → **6/6 passing** in one serial run.

## 10. Design-governance compliance

- **No second geometry engine:** delivery touches geometry only by delegating
  to the canonical `resolveDieline`/`serializeSVG`; the backend receipt builds
  no geometry.
- **`serializeSVG` sole SVG authority:** `canonicalSvg` calls it directly;
  no other serializer exists in the M8-J path.
- **M8-I result authoritative:** every gate decision derives from the
  persisted `prepress_checks` row read through `getPrePressResults`.
- **Determinism:** one design ⇒ one filename forever; identical persisted
  state ⇒ identical receipt.
- **No DB writes, no schema change, no new route:** the existing
  `POST /designs/:id/export` route and `prepress_checks` table are reused.
- **Frozen surfaces untouched:** M8-C/E/F/G/H/I files, `shared/types`,
  `storage.ts`, and the M8-G-audited `design-editor/export/ExportDialog.tsx`
  are byte-identical (git diff clean).

## 11. Known limitations / boundary of M8-J

- The receipt covers **of-lifecycle certification** only — it does not assert
  byte authenticity of a *downloaded* file (that is the client’s exact-string
  comparison job) and it does not build a server-side SVG.
- In environments whose Postgres cluster TimeZone differs from UTC, raw-SQL
  writes into the tz-less audit columns are shifted relative to Prisma writes
  (see §7 defect 2) — delivery logic is timezone-agnostic because all
  comparisons stay within one producer.
- Stalemate precedence is fixed: stale beats `FAILED`/`UNVERIFIABLE` in both
  FE and backend for a deterministic single vector per state.

## Explicitly NOT performed (M8-J boundary)

- Any new geometry engine, serializer, or manifest-as-renderer path.
- Extending the M8-G-audited `design-editor/export/ExportDialog.tsx`.
- Schema migrations; new tables/columns; writes during export.
- Server-side SVG production or byte-authenticity claims in the receipt.