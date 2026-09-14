# SPEC-029 Phase 2 — Customer Experience Report

**Date:** 2026-09-14
**Branch base / HEAD before commit:** `379bcc6` (`feat(spec-029): Phase 1 — reconcile pricing API contract to shared types`)
**Scope:** P1–P9 (proof approval UX, invoice PDF, billing ledger, designs library, reorder) connecting the customer portal to the real backend.

---

## Decisions (fixed contract)

- **Decision A** — Reuse the existing backend `POST /orders/:id/approve` token contract. The frontend approval page consumes the email link `/orders/:orderId/approve?token=…` and does not add a duplicate approval API.
- **Decision B** — Use the real backend `GET /orders/:id/invoice` PDF route to replace the old frontend mock. The mock route `frontend/app/api/ecommerce/invoices/[id]/download/route.ts` was deleted.
- **Decision C** — Keep the `app/(customer)/` route group for the portal pages.

## Backend

- `order.service.ts::serializeOrder()` now exposes `paymentStatus` (via `PAYMENT_STATUS_MAP`), `paymentMethod: 'stripe'`, `currency`, `shipping`, `trackingNumber`; applied to `createOrder` / `getOrder` / `getCustomerOrders` / `updateOrderStatus`.
- `invoice.service.ts` (new): generates the invoice PDF with pdfkit and throws `AuthorizationError` (403) when the caller is neither the order owner nor an admin.
- `finance.routes.ts`: `GET /orders/:id/invoice`.
- `phase2-invoice.test.ts` (new): 4 tests — owner access, admin access, foreign-customer 403, PDF `%PDF-` header.

## Frontend

- **Approval UX** (P1+P2): `lib/api/approvals.ts` + `orders/[id]/approve/page.tsx` — state machine (`idle/loading/order-error/done/ready/success/changes-sent`), proof preview + PDF proof link, legal checkbox gate, approve + request-changes actions, `mapApprovalError`.
- **Invoice** (P8): `lib/api/finance.ts` rewritten (raw `fetch` + Bearer token + `saveInvoice` blob download).
- **Portal pages** (P4–P7): `orders/[id]/page.tsx`, `orders/page.tsx`, `designs/page.tsx`, `designs/[id]/page.tsx`, `billing/page.tsx`; `order-timeline.tsx` gained `ready_for_routing`/`completed`; sidebar added a Billing entry.
- **Reorder + projections** (P9): `lib/api/reorder.ts::buildReorderLines(order)` and `lib/orders/projections.ts` (`currencyOf/money/orderTotal/subtotalOf/taxOf/shippingOf/isPaid/trackingNumber/estimatedDelivery/daysUntilEta/isPayingStatus/isFailedStatus/billingStats`). `billingStats` excludes cancelled orders and counts only captured payments.

## Testing

| Gate | Result |
| --- | --- |
| Frontend unit tests (`npm run test:units`) | **99 passed** |
| Backend vitest (`npx vitest run`) | **114 passed** (13 files) |
| Frontend production build (`npm run build`) | **passed** |
| Full Playwright E2E (`npx playwright test`) | **64 passed, 1 skipped** (includes 6 new Phase 2 tests) |
| Phase 2 E2E spec (`phase2-approval.spec.ts`) | **6/6 passed** |
| M8 freeze (prepress checker / proof-generator / m8 tests diff) | **empty** |

New E2E coverage: unauthenticated redirect from approval links, `pending_review` pre-approval guard, full token approval flow (checkbox gate), DB transition to `ready_for_routing`, invoice PDF streaming (`application/pdf` + `%PDF-`), delivered-order tracking/reorder/invoice UI, and the billing ledger paid-vs-cancelled projection.

_E2E fixtures are seeded via SQL seams in `frontend/e2e/db.ts` (orders, items, design files, payments, shipments) and the approval token is written to Redis exactly as `proof-generator.ts` does, so the email-link path is exercised end-to-end._

## Notes / stabilization

- `backend/vitest.config.ts` sets `testTimeout: 30000`. The auth suite uses `BCRYPT_COST=12` (specified backend requirement) plus real SMTP attempts; individual hashes/login tests regularly exceed vitest's 5s default on slower machines, causing flaky timeouts unrelated to Phase 2.
- Several new E2E assertions were made case-insensitive (`getByText` regex matching is case-sensitive by default), a duplicate-text match was disambiguated, and a `page.evaluate` now passes `BACKEND` explicitly (browser contexts cannot close over module-scoped imports).
- Generated test artifacts (`playwright-report/`, `test-results/`, `.qa-tmp/`) are now gitignored.

## Commit

Single commit on `379bcc6`:

```
feat(spec-029): Phase 2 — customer experience
```