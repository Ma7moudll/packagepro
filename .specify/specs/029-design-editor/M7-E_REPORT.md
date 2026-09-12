# M7-E — Final Closure Report (Regression Verification)

## Scope

M7 final closure verification only. No new product features. No M8. No Vendor/Admin portal work.

M7-E implementation is complete; its dedicated traceability tests pass 5/5 with real PostgreSQL assertions. This report records the full E2E regression evidence (three consecutive full-suite runs) required before declaring M7 closed.

## What M7-E verified (5/5, real Postgres)

- `Design.id === CartItem.designId === OrderItem.designId`
- Real `Design` persistence (sessionId-keyed cloud save → `designs` row)
- Product / variant / SKU identity on every hop
- `CartItem.designId` linkage with fresh-client-context cart restate (`GET /cart`)
- Order-first checkout persists `OrderItem.designId` and the order is `pending_review`
- Exact chain: `Day Design.id === CartItem.designId === OrderItem.designId` (same SKU)
- Final serialized design retains all three face layers semantically (Front = `ORDER FRONT`, Top = `ORDER TOP`, Back = `ORDER BACK`)
- Design survives cart clear; `Design.orderId` backfilled

## Bug fixed (kept, not reverted)

`AddToCart.tsx` — the dialog retained stale default quantity `30` (captured on mount before the async catalog config set `model.quantity = 50`). The cart therefore received 30 while the design saved 50. Fixed by re-syncing the dialog quantity to the live `model.quantity` whenever the dialog opens.

Also fixed in harness: `e2e/db.ts` (Playwright CJS loader compat + row types matching Prisma's quoted camelCase columns) — `tsc --noEmit` clean.

## Full-suite regression — three consecutive runs

Config: `frontend/playwright.config.ts` — all 8 spec files under `e2e/`, workers 1, backend + frontend rebuilt from scratch via `webServer` (reuseExistingServer: false) on every run.

Specs executed:

| Spec file | Coverage | Result |
|---|---|---|
| `m7-editor-catalog.spec.ts` | M7-A catalog-driven editor | PASS |
| `m7-b-routes.spec.ts` | M7-B canonical product + legacy SKU routes | PASS |
| `m7-c-multiface.spec.ts` | M7-C independent per-face artwork state | PASS |
| `m7-d-face-picking.spec.ts` | M7-D physical 3D face picking → face ID → 2D editor | PASS |
| `m7-e-traceability.spec.ts` | M7-E design→cart→order traceability | PASS (5/5) |
| `editor-flow.spec.ts` | Editor end-to-end (2D/3D, save, reload, reopen) | PASS |
| `cart-checkout.spec.ts` | Cart/checkout/order (Stripe test card) | 3 PASS, 1 env-blocked |
| `site-flows.spec.ts` | Homepage, auth, catalog/products, profile, responsive | PASS |

Results:

| Run | Date | Result |
|---|---|---|
| Full regression run #1 | 2026-09-12 11:42–11:47Z | **35 passed / 1 failed** |
| Full regression run #2 | 2026-09-12 11:52–11:57Z | **35 passed / 1 failed** |
| Full regression run #3 | 2026-09-12 11:57–12:03Z | **35 passed / 1 failed** |

The single failure in every run is byte-for-byte the same test and assertion:

- Test: `cart-checkout.spec.ts:108` — "Editor → Cart → Checkout → Order › complete checkout with Stripe test card"
- Assertion: `cart-checkout.spec.ts:187` — `expect(hasDesign).toBeFalsy()` ("cart should be cleared after order")
- The cart line for the test session is reported still present (quantity 30, `sessionId` matches this run's design).

## Stripe environment limitation — confirmation checklist

Required confirmations (from the M7 closure instructions):

1. **Same environment limitation** — CONFIRMED. The failure is exactly the documented Stripe assertion (cart not cleared after payment). It is deterministic and identical in all three consecutive runs; no other failure occurred.

2. **Order still created by the order-first checkout architecture** — CONFIRMED. `checkout.service.ts` creates the order (`createOrder`) before creating the PaymentIntent and clearing the cart (order-first: `checkout.service.ts:55` → order, `:78` → PaymentIntent, `:85` → cart clear). M7-E test C verified this behavior directly: a non-200 checkout response still leaves a `pending_review` order with `OrderItem.designId` persisted. Existing orders in Postgres are `pending_review` (payment never confirmed).

3. **PaymentIntent creation cannot succeed under the current Stripe configuration** — CONFIRMED, with the precise mechanism:
   - Backend `STRIPE_SECRET_KEY` is present and is a `sk_test_` key; backend `STRIPE_PUBLISHABLE_KEY` is **empty**.
   - Frontend `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is **completely unset** (absent from `frontend/.env.local`).
   - Because the publishable key is unset, `frontend/components/ecommerce/StripePayment.tsx:135-144` renders the "Stripe is not configured" alert and renders **no `PaymentElement` and no Pay/submit button**.
   - The checkout page therefore exposes no way to submit; the test's submit-button lookup finds nothing, and the frontend never calls `POST /checkout`. The backend `checkout` path (order creation + PaymentIntent + cart clear) is never invoked by the UI in this environment, so the cart is never cleared.
   - Pre-existing orders for the shared QA account (`qa-tester@packagepro.test`, used by all specs via `helpers.ts`) make `orders.data?.length > 0` unconditionally true, which enters the strict cart-cleared assertion — and that assertion cannot pass until payment can actually complete.

4. **Behavior is unchanged and unrelated to M7-E** — CONFIRMED. The failure is rooted entirely in Stripe configuration; it is identical across all three runs before and independent of the M7-E changes. The M7-A…M7-E, editor-flow, site-flows, and the other three cart-checkout tests all pass. This is documented as the expected/partial Stripe limitation in `QA_REPORT.md`.

Per the closure instructions, the existing test was NOT weakened, deleted, skipped, retried, mocked, or faked; checkout behavior was NOT modified to make it green; no fake payments or DB records were injected.

## Final table

```
M7-A   PASS
M7-B   PASS
M7-C   PASS
M7-D   PASS
M7-E   PASS (5/5)
Full regression run #1   35 passed / 1 failed (Stripe env limitation only)
Full regression run #2   35 passed / 1 failed (Stripe env limitation only)
Full regression run #3   35 passed / 1 failed (Stripe env limitation only)
Known Stripe limitation  BLOCKED — environment: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY unset in frontend/.env.local,
                         so StripePayment renders no payment form/submit button; the cart-cleared-after-payment
                         assertion is untestable until a publishable key is configured. Existing test kept intact.
                         Not a product regression; documented in QA_REPORT.md.
```

## Verdict

M7 COMPLETE — with documented environment limitation: Stripe test payment cannot complete with placeholder credentials.

No M8 or Vendor/Admin portal work was started.