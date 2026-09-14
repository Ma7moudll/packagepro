# SPEC-029 Phase 2 — Strict Reconnaissance Report

Scope: **Reconnaissance only.** No source code, tests, dependencies, schema, config, or M8-frozen files were created, modified, or deleted. No commits were made. The only file written is this report.

Date: 2026-09-13 · Branch: `001-design-editor` · HEAD baseline: `379bcc601ed8a0942df4b619e5be62f2553e384e`

---

## §1 Status

**PHASE 2 PARTIALLY READY**

The backend preconditions for Phase 2 (Customer Experience — tracking, proof approval, reorder) are substantially complete and production-quality. The frontend has a working customer area at `app/(customer)/`, but four of the six authoritative Week 4-6 deliverables are absent or only partially present, and three broken/mock integrations are confirmed.

---

## §2 Baseline

| Item | Value |
|---|---|
| Git HEAD | `379bcc601ed8a0942df4b619e5be62f2553e384e` |
| Phase 1 commit | `379bcc6` — `feat(spec-029): Phase 1 — reconcile pricing API contract to shared types` |
| M8 closure | `fcaf773` — M8-J final acceptance |
| `git diff fcaf773..HEAD --stat` | `PHASE1_REPORT.md` (+285) · `frontend/lib/api/pricing.ts` (37±) · `frontend/tests/pricing-api-contract.test.ts` (+92) → 380 insertions / 34 deletions across **exactly 3 files** |
| M8-frozen files touched since `fcaf773` | **None** (verified: diff contains no `lib/editor/**`, `components/design-editor/**`, `services/pre-press-checker/**`, or dieline/export files) |
| Untracked working tree | Scratch/QA only: `.qa-tmp/`, `qa-tmp/smoke.mjs`, `frontend/.qa-tmp/`, `frontend/playwright-report/`, `frontend/test-results/`, `test-results/`, `QA_REPORT.md`, `M8-*_REPORT.md`, `POST_M8_NEXT_MILESTONE_RECON.md` — none are implementation artifacts |
| Gate results (Phase 1) | frontend units 84/84 · backend vitest 110/110 · tsc (frontend+backend) clean · `next build` clean · Playwright 58 pass / 1 skip (Stripe test-mode env) |

---

## §3 Authoritative Phase 2 Definition

Source: `.specify/specs/spec-029-marketplace-implementation.md` §130-186 and file map §415-432.

### Week 4 — Order Tracking & Timeline (§133-151)
1. `app/account/orders/[id]/page.tsx` with real-time order status badge (11 states)
2. Timeline / stepper showing order progress
3. Tracking events from DHL API (`picked up → in transit → out for delivery → delivered`)
4. Estimated delivery date with countdown
5. CTA buttons based on current state (e.g. "Approve Design" while in review)

### Week 5 — Proof Approval Flow (§153-177)
1. When order status = `awaiting_approval`, show proof page
2. 3D mockup render (reuse Three.js from editor)
3. PDF proof download
4. Approve / Reject buttons with legal-terms checkbox
5. `POST /api/approvals/:id/approve` → triggers vendor routing

### Week 6 — Account Dashboard & Reorder (§179-186)
1. `/account/orders` — order history with filters, pagination
2. `/account/orders/[id]` — order detail with timeline
3. `/account/designs` — saved designs library
4. `/account/billing` — invoices, payment history
5. `/account/settings` — profile, address book
6. One-click reorder — reuse previous design + options → new order

File map §415-432 additionally specifies: `lib/api/approvals.ts`, `components/orders/OrderTimeline.tsx`, `components/orders/OrderSummary.tsx`, `components/orders/TrackingMap.tsx`, and the `app/account/` directory.

---

## §4 Requirement Matrix

| # | Requirement | Location (repo) | Status | Evidence |
|---|---|---|---|---|
| W4.1 | Order detail page + status badge | `frontend/app/(customer)/orders/[id]/page.tsx` | ✅ **PRESENT (partial)** | Page exists; renders `order.status.replace(/_/g," ")` in a plain `Badge` (L77-79). **11-state color map is absent** — only the dashboard carries `STATUS_BADGE` (8 states, missing `quality_check`, `ready_to_ship`, `ready_for_routing`) in `frontend/app/(customer)/dashboard/page.tsx:15-24` |
| W4.2 | Timeline / stepper (11 states) | `frontend/components/orders/order-timeline.tsx` | ✅ **PARTIAL** | Component exists with `STATUS_ORDER` map covering all 11 states (incl. `ready_for_routing`, `ready_to_ship`, `completed`, `cancelled`), but only **8 steps are rendered** (`STEPS` array lacks `ready_for_routing`, `completed`); wired via `<OrderTimeline status={order.status}/>` at `orders/[id]/page.tsx:91` |
| W4.3 | DHL tracking events | `frontend/app/(customer)/orders/[id]/page.tsx` | ❌ **ABSENT** | Only static `order.trackingNumber` string shown (L132-137). `frontend/lib/api/shipments.ts` (`getTracking`, `getByOrder`, `create`) has **zero consumers** in the FE |
| W4.4 | Estimated delivery date + countdown | `frontend/app/(customer)/orders/[id]/page.tsx` | ❌ **ABSENT** | No ETA UI. Backend data exists (`prisma.shipment.estimatedDeliveryDate` at `backend/prisma/schema.prisma:549`; shared `Shipment.estimatedDelivery` at `shared/types/index.ts:237`); backend `getOrder` includes `shipment: true` (`backend/src/modules/orders/order.service.ts:233`) — but shared `Order` type (index.ts:31-51) does **not** expose `shipment`/`estimatedDelivery`, so the FE cannot render it typed |
| W4.5 | State-based CTA buttons | `frontend/app/(customer)/orders/[id]/page.tsx:190-217` | ❌ **ABSENT** | Only `Download Invoice` + `Back to Orders`. No "Approve Design" CTA when `awaiting_approval` |
| W5.1 | Proof page gated on `awaiting_approval` | — | ❌ **ABSENT** | No proof page exists in the FE. **The approval email's action URL is broken**: `backend/src/modules/orders/approval.service.ts:47` links to `${FRONTEND_URL}/orders/${orderId}/approve?token=...` but no `app/*/orders/[id]/approve` route exists (verified via `find frontend/app -name page.tsx` under approve paths — none) |
| W5.2 | 3D mockup render (reuse Three.js) | — | ❌ **ABSENT** | `frontend/components/editor/preview/MockupGallery.tsx` exists in the editor but is not exercised by any order/proof flow |
| W5.3 | PDF proof download | `frontend/app/api/packagepro/designs/[id]/proof/route.ts` (parallel stack) | **INSUFFICIENT EVIDENCE / DRIFT** | Backend proof generator is complete and M8-frozen safe (`backend/src/services/pre-press-checker/proof-generator.ts` — M8-I "Soft proof generator (Reuse)"), but the FE has no consumer for proof download. The only proof-ish route lives under the non-authoritative `app/api/packagepro/*` stack |
| W5.4 | Approve / Reject + legal-terms checkbox | `frontend/components/projects/ApprovalWorkflow.tsx` | ⚠️ **PRESENT BUT DEAD** | Component exists but has **zero imports**; it targets the stale `lib/api-client.ts` lifecycle model (`DRAFT/SUBMITTED/IN_REVIEW/APPROVED/REJECTED/IN_PRODUCTION`), not the order-status model; no legal-terms checkbox; no Reject route in backend |
| W5.5 | `POST /api/approvals/:id/approve` → vendor routing | `backend/src/modules/orders/order.routes.ts:22-31` | ⚠️ **CONTRACT DRIFT** | Backend implements `POST /orders/:id/request-approval` + `POST /orders/:id/approve` (token-based body, not path `/approvals/:id/approve`). `approval.service.ts:81-93` sets status `ready_for_routing` on approve (does not itself dispatch vendor routing; handshake is a separate module). FE wrapper exists at `frontend/lib/api/orders.ts` (`approve(id, token)`) |
| W6.1 | Order history: filters + pagination | `frontend/app/(customer)/orders/page.tsx` | ❌ **PARTIAL** | List page exists and works, but calls `ordersApi.list({ limit: 50 })` with **no filters and no pagination UI** (L32). Backend `getOrders` supports pagination and returns `{ success, data, pagination }` (`backend/src/modules/orders/order.controller.ts:78-103`) — the FE `ordersApi.list` types only `Order[]` (`frontend/lib/api/orders.ts:12-15`) and drops the `pagination` envelope |
| W6.2 | Order detail with timeline | `frontend/app/(customer)/orders/[id]/page.tsx` | ✅ **PRESENT** | Covered as W4.1/W4.2 |
| W6.3 | `/account/designs` saved-designs library | `frontend/app/(customer)/designs/` | ❌ **ABSENT** | `designs/` contains only `[id]/expert-check/`, `[id]/error.tsx`, `[id]/loading.tsx` — **no `page.tsx`** (verified by `find ... -name "page.tsx"`). Sidebar links `/designs` (`frontend/components/customer/sidebar.tsx:25`) → 404. Backend `GET /designs` exists (`backend/src/modules/designs/design.routes.ts:5`) and `designsApi.list` exists (`frontend/lib/api/designs.ts:5`) — data ready, no page |
| W6.4 | `/account/billing` — invoices, payment history | — | ❌ **ABSENT** | No billing page in FE. `frontend/lib/api/finance.ts` exists; backend `finance` module + `financeRoutes` registered (`backend/src/index.ts:252`). No customer-facing invoices/payment-history UI |
| W6.5 | `/account/settings` — profile, address book | `frontend/app/(customer)/profile/page.tsx` | ✅ **PARTIAL** | Profile page exists (tabs: profile/password/addresses/notifications — verified imports at L10-13); no dedicated `/settings` alias and no distinct address-book management page separate from profile |
| W6.6 | One-click reorder | — | ❌ **ABSENT** | No reorder button, no reorder API, no reuse-design→cart path anywhere in FE or BE (`grep -rin "reorder"` matched only editor layer-ordering and a cart JSON-comment) |

**File-map delta (§415-432):** `lib/api/approvals.ts` **missing** · `components/orders/OrderSummary.tsx` **missing** · `components/orders/TrackingMap.tsx` **missing** · `OrderTimeline.tsx` present as lowercase `order-timeline.tsx` · `app/account/**` implemented as route group `app/(customer)/**` (URLs `/orders…` instead of `/account/orders…`).

---

## §5 Existing Implementation Inventory

### Backend (authoritative Fastify API — complete for Phase 2 preconditions)
- **Orders**: `backend/src/modules/orders/order.routes.ts` — `GET /orders` (paginated), `GET /orders/:id` (includes `shipment`), `POST /orders`, `PATCH /orders/:id/status`. Controller auth-gates via `authenticate`; `getOrders` resolves customer via `prisma.customer.findUnique` (`order.controller.ts:78-103`).
- **Approval**: `backend/src/modules/orders/approval.controller.ts` + `approval.service.ts` — proof generation (`proofGeneratorService.generateProof`), approval email with signed token URL, order status → `awaiting_approval`, approve → `ready_for_routing` with IP/UA audit in `metadata`, 24/48/72h reminders + 7-day auto-cancel via BullMQ (`scheduleReminders`), notifications table row.
- **Shipments / DHL**: `backend/src/integrations/dhl/dhl.service.ts` (real `api.dhl.com`, token auth, shipment create + track) + `webhooks.ts`; `backend/src/modules/shipments/shipment.routes.ts` — `POST /shipments/create/:id`, `GET /shipments/:id/tracking`, `GET /orders/:orderId/shipment`, `POST /webhooks/dhl`. Prisma `Shipment` model has `trackingEvents Json`, `estimatedDeliveryDate`, `status` enum incl. all 4 DHL states (`schema.prisma:540-562`).
- **Designs**: `backend/src/modules/designs/design.routes.ts` — list/session/save/`/designs/:id`/files/submit/recall/export + full review sub-API (approve/reject/request-changes).
- **Checkout**: `backend/src/modules/checkout/checkout.service.ts` — order-first flow, creates real `pending_review` order.
- **Finance**: `backend/src/modules/finance/*` registered as `financeRoutes` (`index.ts:252`).

### Frontend (authoritative customer area)
- **Working**: `app/(customer)/dashboard`, `orders`, `orders/[id]`, `profile`, `reviews`, `projects`, `notifications`; `lib/api/orders|designs|shipments|finance|checkout|cart`. Sidebar customer nav (`components/customer/sidebar.tsx`).
- **Order detail** (`orders/[id]/page.tsx`): status badge, timeline stepper, shipping address, payment info, tracking number (static), items+totals, invoice download button + Back link.
- **Order list** (`orders/page.tsx`): card list with status/payment badges, View link, invoice button.

### Parallel / non-authoritative stacks (identified, not treated as Phase-2 surface)
- `frontend/app/api/ecommerce/*` — Next-route **mocks** with empty in-memory stores (`orders: any[] = []` at `orders/[id]/route.ts:6`; `const invoices: any[] = []` at `invoices/[id]/download/route.ts:6`). **The order detail/list "Download Invoice" buttons call `/api/ecommerce/invoices/[id]/download` → always 404** (empty array).
- `frontend/app/api/packagepro/*` + `frontend/lib/packagepro/**` (19 files) — parallel mock stack (`order-service.ts` documents "frontend should use backend API instead of using Prisma directly" with mock prisma). Proof route lives here.
- `frontend/lib/api-client.ts` — stale duplicate client (used only by the dead `ApprovalWorkflow.tsx`).

---

## §6 Contract Drift (FE ↔ BE ↔ Roadmap)

1. **Approval route shape**: roadmap `POST /api/approvals/:id/approve` → BE actually `POST /orders/:id/approve` (JSON body `{token, ipAddress, userAgent}`). FE agrees with BE (`ordersApi.approve(id, token)`). Roadmap must be realigned to implementation; the **functional gap** is the missing FE token-acceptance page.
2. **Broken approval email link (HIGH, confirmed)**: `approval.service.ts:47` builds `${FRONTEND_URL}/orders/${orderId}/approve?token=…` — no such route exists → customer click = 404.
3. **`Order` type omits shipment projection**: BE `getOrder` includes `shipment` (tracking number, DHL events, `estimatedDelivery`) but shared `Order` (index.ts:31-51) has no `shipment` field → ETA/tracking cannot be rendered by the typed FE client without a type extension. `Order` already `@shared/types`-imported by the page.
4. **Pagination envelope dropped**: BE returns `{success, data, pagination}` on `GET /orders`; FE `ordersApi.list` types `ApiResponse<Order[]>` and the list UI requests `limit:50` with no pages.
5. **Invoice download → mock 404**: UI fetches `/api/ecommerce/invoices/[id]/download` (empty-array mock) instead of the finance backend.
6. **Route-group naming**: roadmap `app/account/**` ↔ repo `app/(customer)/**`. Customer-visible URLs are `/orders`, `/orders/[id]`, `/designs` (404), `/profile`, `/reviews`, `/dashboard` — i.e. `/account/…` paths do not exist. Existing pages are correctly placed under route group `(customer)`; roadmap file map is stale nomenclature.

---

## §7 Test Coverage

| Target | Coverage | Evidence |
|---|---|---|
| Order create (E2E) | ✅ | `frontend/e2e/cart-checkout.spec.ts` — catalog→pricing→cart→checkout→order creation; asserts order ID + cart cleared |
| Order detail / timeline / tracking / statuses | ❌ | No spec references `orders/[id]`, `OrderTimeline`, tracking, or DHL states |
| Approval / proof flow | ❌ | No test covers `awaiting_approval`, approve endpoint, or proof PDF |
| Admin / vendor | ❌ | Out of Phase-2 scope — none |
| Backend orders/approvals/shipments | ❌ | 12 backend vitest files (`backend/src/**/*.test.ts`) cover designs/catalog/auth/pricing/notifications/prepress — **none touch order.approval.shipment controllers** |
| M8 regression | ✅ | m7-*/m8-* specs green (Phase-1 baseline); M8 surface untouched by Phase-1 diff |

No Phase-2-specific acceptance tests exist. Any Phase-2 implementation must add them (E2E for tracking/proof + unit for approval route shape).

---

## §8 Dependencies and Blockers

| Dependency | State | Impact |
|---|---|---|
| DHL API env | Present in `backend/.env` (`DHL_API_KEY/SECRET/ACCOUNT_NUMBER/BASE_URL`) | No blocker for implementation; real DHL env needed for live E2E of tracking |
| Stripe test mode | Pre-existing E2E skip (checkout spec) | Known; unrelated to Phase 2 validation except order-creation steps |
| Redis (BullMQ queues) | Gracefully skipped in `approval.service` when absent | Reminders/auto-cancel degrade silently — acceptable for dev |
| PostgreSQL | Required; used by all backend modules | Run via local Postgres 5432 |
| Next.js + Fastify dual boot (Playwright) | Backend :3000 + frontend :3001 | Required for E2E verification |

**Human decisions required before implementation:**
- A. Route-shape: implement FE token accept page matching BE `POST /orders/:id/approve` (recommended) vs refactor BE to `/api/approvals/:id/approve` (roadmap text) — the two cannot both be authoritative.
- B. Invoice download: wire mock `/api/ecommerce/invoices/*` to finance backend vs keep mock (the mock is confirmed broken).
- C. Route-group naming: keep `app/(customer)/**` (recommended — pages already live there) vs create `app/account/**` aliases.

---

## §9 M8 Non-Regression / Freeze Result

**PASS.** `git diff fcaf773..379bcc6 --stat` = exactly 3 files (PHASE1_REPORT.md, `frontend/lib/api/pricing.ts`, `frontend/tests/pricing-api-contract.test.ts`). No `lib/editor/**`, `components/design-editor/**`, dieline, export, or prepress source was modified in Phase 1. The M8-frozen design-editor surface remains byte-identical to the M8-J closure. Phase-2 work must preserve this: any change to a frozen file = **M8 SCOPE VIOLATION**.

---

## §10 Exact Phase 2 Implementation Boundary

### MUST (concrete, repository-verifiable gaps vs authoritative requirements)
1. **Broken approval link fix (W5.1, §4)**: add customer-facing token-acceptance route consumed by BE email URL (`/orders/[id]/approve`) + evidence that the email link resolves (E2E).
2. **Order detail enrichment (W4.3/W4.4/W4.5)**: ship DHL tracking events, ETA countdown, and state-based CTAs onto `orders/[id]`; extend shared `Order` with the shipment projection (`estimatedDelivery`, `trackingNumber`, `trackingEvents`/events) using existing BE `shipment` include.
3. **`/designs` saved-design library (W6.3)**: build `app/(customer)/designs/page.tsx` (+ `[id]/page.tsx`) wired to existing `GET /designs` + `designsApi`.
4. **`/billing` invoices & payment history (W6.4)**: build customer billing page wired to finance backend; resolve the mock invoice download (decision B → MUST replace mock with finance-backed route).
5. **Order-history filters + pagination (W6.1)**: surface BE `pagination` envelope + status filters in `orders` page.
6. **One-click reorder (W6.6)**: reuse saved design+options → new cart order (needs BE endpoint or reuse of existing cart/create-order APIs — confirm which).
7. **Proof page (W5.2/W5.4/W5.3)**: `awaiting_approval`-gated proof UI with 3D mockup reuse, PDF download from backend `proof-generator`, Approve/Reject + legal-terms checkbox, wired to `POST /orders/:id/approve`.
8. **Tests** for every item above (E2E + unit), matching §7 gaps.

### MUST NOT
- Modify **any** M8-frozen file (`lib/editor/**`, `components/design-editor/**`, dieline/export/prepress sources). Reuse (e.g. `MockupGallery`, backend `proof-generator`, `OrderTimeline`) is allowed; editing frozen exports is not.
- Build M8-K/M9 scope; build vendor portal (`app/vendor/**`, Phase 3) or admin operations UI (Phase 3) inside Phase 2.
- Delete or repurpose the parallel stacks (`app/api/packagepro/**`, `lib/packagepro/**`, `lib/api-client.ts`) unless a decision is recorded — they are out of Phase-2 scope.
- Introduce new dependencies without a build-green check (frontend + backend `tsc`, `next build`, vitest, Playwright).

### DEFERRED (documented, not Phase-2 work)
- Roadmap file-map realignments that are purely naming (`app/account/**` → `app/(customer)/**`; 11-state color map centralization into a shared badge component). Optional polish, not an authoritative gap.
- Cleanup of parallel mock stacks / stale `ApprovalWorkflow.tsx` / `lib/api-client.ts` (housekeeping; out of Phase-2 boundary).

### RECON ONLY (this report)
- No code/test/config/schema commits. Verified clean before this file: `git status --short` = scratch + this report only.

---

## §11 Recommended Implementation Order

1. **Decision A/B/C record** (blocked items above) — small, unblocks everything.
2. **Approval token page** (MUST #1) — smallest surface, kills a live 404; add `lib/api/approvals.ts`.
3. **Shared `Order.shipment` projection** (MUST #2) — unblocks tracking/ETA UI.
4. **Order detail enrichment** (MUST #2) — DHL events + ETA countdown + state CTAs.
5. **Proof page** (MUST #6) — 3D mockup reuse, PDF download, approve/reject + legal checkbox.
6. **Order-history filters + pagination** (MUST #5).
7. **Designs library** (MUST #3) + **billing** (MUST #4, incl. invoice fix).
8. **One-click reorder** (MUST #6).
9. **Tests** per §7; final gate run (units + vitest + tsc×2 + build + Playwright).

---

## §12 Acceptance Gates (for the Phase-2 work package)

G1: `git diff fcaf773..HEAD` contains **only** Phase-2-documented files; M8-frozen byte-diff = empty (freeze check script).
G2: frontend unit tests green (existing 84 + new), backend vitest green (110 + new), `tsc --noEmit` ×2 clean, `next build` clean, Playwright green (58 baseline + new specs; Stripe-skip preserved as documented skip).
G3: Approval flow E2E: create order → back-end `request-approval` → email URL `/orders/[id]/approve?token=` resolves in FE → approve → status `ready_for_routing` confirmed via API.
G4: Tracking E2E (or unit, if DHL not reachable): shipment created (via DHL-mock in tests), DHL 4-state events render on order detail, ETA countdown renders from `shipment.estimatedDelivery`.
G5: Designs library + billing render real BE data (no mock-404 invoices).
G6: One-click reorder reproduces prior design/options into a new order and lands in cart/checkout.
G7: `git status --short` at completion shows expected Phase-2 files only; commit follows standard repo convention; Phase-2 report added to `.specify/specs/spec-029-marketplace-implementation/`.

---

## §13 Final Recon Decision

**READY FOR PHASE 2 IMPLEMENTATION**

Phase 2 is authoritatively defined and materially unimplemented on the frontend even though its backend preconditions are complete. Concrete, repository-verifiable gaps exist against every authoritative Week-4/5/6 deliverable (missing `/designs` page, missing billing page, missing proof page, broken approval-link target, mock-404 invoices, dropped pagination, no state CTAs, no DHL tracking UI, no reorder). These are requirement gaps, not preferences or suspicions — so real Phase-2 implementation work exists.

Before implementation begins, record human decisions A/B/C (§8). During implementation, honor §10 MUST/MUST NOT boundary and §12 gates. No Phase-2 implementation, commit, or M8-touching change was made by this reconnaissance; HEAD remains `379bcc601ed8a0942df4b619e5be62f2553e384e`.