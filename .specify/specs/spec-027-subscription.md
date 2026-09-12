# SPEC-027: Subscription & Recurring Orders

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P2 — Growth  
> **Dependencies:** SPEC-003 (Orders), SPEC-004 (Payments)

---

## 1. What

Subscription ordering for regular packaging needs:

**Subscription Management:**
- Customer sets: product, quantity, frequency (weekly/monthly/quarterly)
- Auto-generate orders on schedule
- Manage/modify/cancel subscriptions
- Pause/resume subscriptions

**Pricing:**
- 10% discount for subscription vs one-time
- Price lock guarantee for 12 months
- Volume tier benefits apply

**Notifications:**
- Upcoming delivery reminder (3 days before)
- Payment method expiry warning
- Subscription renewal confirmation
- Low inventory alert (if customer reports stock levels)

**Admin:**
- View all active subscriptions
- Subscription revenue forecasting
- Churn analysis

---

## 2. Why

Recurring revenue is 3-5x more valuable than one-time sales. Subscriptions improve cash flow predictability, increase customer LTV by 40%, and reduce acquisition costs.

**Business Impact:**
- Increase LTV: +40%
- Improve cash flow: predictable monthly revenue
- Reduce churn: subscription customers stay 2x longer
- Reduce acquisition cost: no need to re-acquire for each order

---

## 3. Who

| Role | Need |
|------|------|
| **Customer** | Set up, manage, modify, cancel subscriptions |
| **Admin** | View subscriptions, forecast revenue, manage churn |
| **Finance** | Predictable revenue, subscription reporting |

---

## 4. Success Criteria

### Functional
- [ ] Subscription creation: product, quantity, frequency, start date
- [ ] Auto-order generation: on schedule, with confirmation email
- [ ] Management: modify quantity, change frequency, pause, resume, cancel
- [ ] Discount: 10% off subscription orders
- [ ] Price lock: guaranteed for 12 months
- [ ] Reminders: upcoming delivery, payment expiry, renewal
- [ ] Payment: stored card, auto-charge on order generation
- [ ] Admin dashboard: active subs, revenue forecast, churn rate
- [ ] Customer portal: subscription management page

### Non-Functional
- [ ] Order generation: <1s, background job
- [ ] Payment processing: <3s
- [ ] Notification delivery: <1m

---

## 5. Out of Scope

- Subscription marketplace (multiple vendors per subscription)
- Dynamic pricing based on market rates
- Subscription gifting
- API for external subscription management

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/subscriptions/subscriptions.controller.ts` | Subscription API |
| `backend/src/modules/subscriptions/subscriptions.service.ts` | Subscription logic |
| `backend/src/modules/subscriptions/dto/create-subscription.dto.ts` | Creation validation |
| `backend/src/workers/subscription.worker.ts` | Background order generation |
| `backend/prisma/schema.prisma` | Subscription, SubscriptionOrder tables |
| `frontend/app/(portal)/subscriptions/page.tsx` | Subscription management |
| `frontend/components/subscriptions/SubscriptionCreator.tsx` | Creation form |
| `frontend/components/subscriptions/SubscriptionCard.tsx` | Subscription display |
| `frontend/components/subscriptions/SubscriptionCalendar.tsx` | Delivery calendar |
