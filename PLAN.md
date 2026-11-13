# PackagePro — Plan v2 (end-buyer marketplace launch)

> Supersedes the "Next-increment plan" in PLAN.md (Step 2/4/5). Rule unchanged:
> **plan first, code after** — review, correct in plain words, then one piece at a time
> (implement → check → test → repeat).
>
> **Baseline to protect:** backend `npx vitest run` ≥ **139/139**, frontend
> `npm run test:units` ≥ **107/107**, Playwright cart-checkout + approval suites green.
>
> **Caveat:** this plan was written from PLAN.md and a public look at Packhelp's
> homepage and API page — not from the code. Before each piece, the agent must read
> `schema.prisma` and the relevant services for exact fields. Items marked
> **(assumption)** need your confirmation.

---

## 1. Decisions locked

| # | Decision | Source |
|---|---|---|
| D1 | **Launch target = marketplace for end buyers** (small brands, online shops), not a tool for factories receiving orders | you, this chat |
| D2 | **Mixed-vendor cart stays at launch** (items from several factories in one cart, per-group POs, split shipping, one payment) | SPEC-029 decision 2026-11-06 + confirmed again |
| D3 | Multi-party split payments stay Phase-2 (spec-004 §85) | existing |
| D4 | Deploy target = Vercel + Railway | existing |

Consequence of D1: **trust, speed, and easy local payment** outrank B2B features
(net terms, public API, wallet, team accounts, full RFQ).

---

## 2. Multi-vendor cart — launch design (D2)

Already shipped: 4a (`Order.purchaseOrders[]`), 4b (per-productType routing, N POs,
pre-flight routing), 4c (`shippingByGroup`, checkout split rows).

### 2.1 Buyer-facing principle **(assumption — confirm)**
The buyer sees **one order, one payment, one order number**. Vendor split is shown as
"shipments" inside that order, never as separate orders to manage.

- Order status shown to buyer = derived from its POs (rule below), not per-vendor jargon.
- Each group appears as a **shipment card**: items, vendor-agnostic label ("Boxes", "Bags"),
  its own status, its own tracking number, its own ETA.

### 2.2 Derived order status (pure function, unit-tested)
Order status = the **least advanced** non-cancelled PO state; "Partially shipped" /
"Partially delivered" when POs differ in shipping/delivery stage. Cancelled groups
are excluded from the min and listed separately.

### 2.3 Failure policy (must be decided + tested)
| Case | Behavior |
|---|---|
| Vendor rejects / handshake expires (4h) | Router picks next vendor for **that group only** (exists) |
| No vendor available for a group after payment | Cancel **that group**, **partial refund** of its subtotal + its shipping, notify buyer, other groups proceed |
| Buyer requests changes on proof | Per group, not whole order |
| Sample/QA rejected for one group | That group's PO state changes; buyer sees "revision requested" on that shipment only |
| Pre-payment unroutable group | Already blocked (pre-flight abort, no partial state) — surface a clear cart message |

### 2.4 Remaining pieces
- **4d** order-detail per-shipment timeline (frontend + `serializeOrder` per-PO events).
- **4e** derived status function + shipment cards on order detail and order list.
- **4f** partial refund path: `POST /api/orders/:id/groups/:poId/cancel` (ADMIN/system) →
  provider partial refund → audit log → email. Idempotent.
- **4g** multiple tracking numbers: one `shipments` row per PO; tracking webhooks update
  the matching PO only.

**Tests:** derived-status unit tests (all state combos) · integration: two-vendor order,
one group cancelled → partial refund + order continues · webhook updates only its PO.

---

## 3. Launch blockers (Egypt)

### 3.1 Payments
Stripe may not support onboarding an Egyptian merchant. **Verify first** (account
eligibility), before building more around it.

Add a **payment-provider abstraction** (`PaymentProvider` interface) so Stripe, PayPal,
COD and local providers share one flow:

```
createPayment(order, method) → { providerRef, redirectUrl | clientSecret }
handleWebhook(provider, rawBody, signature) → normalized PaymentEvent
refund(paymentId, amount, reason) → RefundResult
```

Target local methods (pick provider after eligibility/fee check): cards + mobile wallets
+ Fawry-style cash voucher + InstaPay-style bank transfer + COD.

New/changed:
- `POST /api/payments/:provider/webhook` — signature verify, **idempotent by providerRef + event id**.
- `payments.provider`, `payments.method`, `payments.providerRef`, `payment_events` (raw
  event log for reconciliation) **(schema names to verify)**.
- COD rules: deposit or confirm-by-phone before PO release **(decision needed)** so
  vendors aren't started on unpaid orders.
- Settlements keep the 72h window; settlement math must handle partial refunds.

**Tests:** webhook replay → no double credit · bad signature → 401 · refund partial →
settlement reduced · each provider mocked at the interface.

### 3.2 Shipping
- Add a **carrier abstraction** like payments; DHL becomes one adapter, add one local
  carrier adapter (Bosta/Aramex-class, choose after rates + API check).
- `GET /api/shipping/rates?cartId=…` (already planned in SPEC) returns rates **per
  shipment group**; checkout shows them before payment.
- Tracking webhook per carrier → normalized `ShipmentEvent`.
- COD cash collection reconciliation if carrier collects cash **(assumption)**.

### 3.3 Localization
- Arabic + **RTL** across shop, editor chrome, checkout, emails; EGP as primary currency.
- Number/date formatting, Arabic email templates, Arabic PDF POs (font embedding).
- **Tests:** RTL snapshot of cart/checkout; email render in ar.

### 3.4 Compliance
- **Egyptian e-invoice (ETA) requirement:** confirm what applies to a marketplace vs.
  vendors (who is the invoicing party). Needs an accountant/legal check — **do not
  guess**; plan an `invoices` module stub with provider-agnostic export.

---

## 4. Trust & conversion features (end-buyer)

| Feature | Scope | Notes |
|---|---|---|
| **Sample packs (buyer-ordered)** | New catalog type + order flow; small fee, credited against next real order | Distinct from existing vendor→QA samples. `POST /api/samples/orders`, `GET /api/samples` |
| **MOQ + quantity tiers on product page** | Show MOQ and price-per-unit tiers clearly | Data already in pricing engine/vendor MOQ logic; surface it |
| **Proof approval (verify existing)** | Page exists at `orders/[id]/approve`; add dated expectations ("production starts after approval; est. ship date") | Click-test per Step 5 №4; per-group in multi-vendor |
| **Promo codes** | `promo_codes` table, `POST /api/cart/promo`, rules: %/fixed, min spend, first order, expiry, single-use | Applied in pricing engine, shown in cart summary |
| **"Custom size/quantity?" RFQ-lite** | Button on product page → `POST /api/rfq` (contact, product, size, qty, notes, optional file) → admin inbox + email | Lite only; full quote→order conversion later |
| **Honest data** | Remove or label seed stats on landing/FAQ | Existing "known offenders" |
| **Post-order clarity** | Success page lists exactly what happens next with dates, per shipment | |

---

## 5. Existing queue items kept

- **Deployment**: complete first-run setup in `deploy.yml` (Railway project, secrets
  `RAILWAY_TOKEN` / `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`, var
  `NEXT_PUBLIC_API_URL`, point payment + carrier webhooks at the Railway domain).
  Use the **local providers' webhook URLs**, not only Stripe/DHL.
- **E2E "Sarah journey"** extended: browse → design → mixed-vendor cart → local payment
  → proof approval per group → split shipping → partial refund case → review.
- **Phase 5 polish**: k6 load script (order lifecycle incl. multi-vendor) + monitoring alerts.
- **Admin analytics SSE**: shipped; add payment-method and per-group cancellation KPIs later.

---

## 6. Deferred (explicitly not at launch)

Public API + API keys + webhooks for third parties · net payment terms/invoicing ·
wallet/cashback · team/company accounts · full RFQ→quote→order conversion ·
call-off (scheduled deliveries) · multi-party split payments (D3) · product CO₂/FSC
data per product (nice to have, revisit with vendor data).

---

## 7. Piece queue v2 (one at a time)

| # | Piece | Acceptance |
|---|---|---|
| 1 | **Stripe eligibility check + payment-provider abstraction** (refactor, no new provider yet) | existing payment tests green through the interface |
| 2 | **First local payment provider + webhook + refund** | idempotency + signature + partial-refund tests |
| 3 | **COD policy + rules** (deposit/confirmation before PO release) | integration test: unpaid COD doesn't release PO |
| 4 | **4d + 4e**: per-shipment timeline + derived order status | derived-status unit tests; Playwright view |
| 5 | **4f + 4g**: group cancel/partial refund + multi-tracking | integration tests (see §2.4) |
| 6 | **Carrier abstraction + local carrier adapter + rates endpoint** | rates per group; tracking webhook per PO |
| 7 | **Arabic/RTL + EGP pass** (shop → checkout → emails → PO PDF) | RTL snapshots, ar email render |
| 8 | **Buyer sample packs** | order flow + credit-on-next-order test |
| 9 | **MOQ/tier display + promo codes** | pricing tests with promo; UI shows tiers |
| 10 | **RFQ-lite** | submit → admin inbox → email |
| 11 | **Deployment first run + smoke (`/api/health`) + webhook URLs** | green deploy to staging |
| 12 | **Extended E2E journey + k6 + alerts** | report committed to docs |
| 13 | **E-invoice (ETA) assessment** | written decision doc, not code |

After each piece: read the diff, run its test, confirm baselines (backend ≥139,
frontend ≥107), then start the next.

---

## 8. Review questions (answer in plain words before coding)

1. Which local payment provider(s) first — and does your Stripe/PayPal account actually
   work from Egypt today?
2. COD at launch? If yes: deposit, phone confirmation, or both?
3. Is "one order, shipment cards" (§2.1) the UX you want for mixed-vendor carts?
4. Partial refund when a group can't be fulfilled — refund to original method, or store
   credit? (Provider support may decide.)
5. Which carrier first, and does it collect COD cash?
6. Sample packs: fixed price per pack, or per sample? Credited fully against next order?
7. Who is the invoicing party for ETA — platform or each vendor?