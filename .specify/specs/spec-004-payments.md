# SPEC-004: Stripe Payment Integration

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** SPEC-003 (Orders)

---

## 1. What

Secure payment processing via Stripe:

**Payment Methods:**
- Credit/Debit cards (Visa, Mastercard, Amex, Discover)
- Apple Pay
- Google Pay
- Buy-now-pay-later (Klarna, Affirm — Phase 1.5)

**Features:**
- Payment intent creation at checkout
- 3D Secure authentication for high-risk transactions
- Multi-step checkout (shipping → payment → review)
- Automatic invoice generation
- Refund processing (full and partial)
- Payment retry logic for failed transactions
- Webhook handling for async events

**Security:**
- PCI DSS compliance via Stripe Elements (no card data stored locally)
- Idempotency keys for all payment operations
- Fraud detection via Stripe Radar

---

## 2. Why

Manual payment reconciliation is error-prone and slow. Automated Stripe integration ensures instant payment confirmation, reduces fraud risk by 90%, and provides customers with professional invoices.

**Business Impact:**
- Reduce payment failures: -70% with retry logic
- Reduce fraud: -90% with Stripe Radar
- Speed up cash flow: instant confirmation vs 1-2 days manual
- Reduce accounting workload: automated invoice generation

---

## 3. Who

| Role | Need |
|------|------|
| **Customer** | Pay securely, receive invoice, request refund, view payment history |
| **Admin** | View payment status, process refunds, reconcile transactions |
| **Finance** | Export transaction reports, track revenue, handle chargebacks |

---

## 4. Success Criteria

### Functional
- [ ] Payment intent created with line items breakdown
- [ ] Support cards, Apple Pay, Google Pay
- [ ] 3D Secure triggered for transactions >$500 or flagged by Radar
- [ ] Stripe webhooks handled: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `invoice.payment_succeeded`
- [ ] Idempotency: same webhook event processed only once (check `stripe_event_id`)
- [ ] Refund rules: full refund within 24h; partial refund based on production stage after 24h
- [ ] Invoice auto-generated and emailed upon payment success
- [ ] Payment retry: 3 attempts with exponential backoff (1h, 4h, 24h)
- [ ] Failed payment notifications: email to customer with retry link
- [ ] Payment history: customer can view all transactions, download receipts

### Non-Functional
- [ ] Checkout completion rate >85%
- [ ] Payment processing <3s
- [ ] Webhook handling <200ms (acknowledge immediately, process async)
- [ ] PCI compliance: SAQ A (Stripe Elements)

---

## 5. Out of Scope

- Cryptocurrency payments
- Bank transfer / wire (ACH only for vendor payouts)
- Cash on delivery
- Multi-party split payments (marketplace model — Phase 2)

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/payments/payments.controller.ts` | Payment API endpoints |
| `backend/src/modules/payments/payments.service.ts` | Payment business logic |
| `backend/src/modules/payments/stripe.service.ts` | Stripe SDK wrapper |
| `backend/src/modules/payments/dto/create-payment-intent.dto.ts` | Payment intent validation |
| `backend/src/modules/payments/dto/refund.dto.ts` | Refund validation |
| `backend/src/modules/webhooks/webhooks.controller.ts` | Stripe webhook handler |
| `backend/prisma/schema.prisma` | Payment, Invoice, Refund tables |
| `frontend/app/(shop)/checkout/page.tsx` | Checkout page |
| `frontend/components/checkout/PaymentForm.tsx` | Stripe Elements wrapper |
| `frontend/components/checkout/CheckoutSummary.tsx` | Order summary |
| `frontend/components/checkout/PaymentMethods.tsx` | Payment method selector |
| `frontend/lib/payments/stripe-client.ts` | Stripe.js client setup |
| `frontend/lib/payments/api.ts` | Payment API client |
