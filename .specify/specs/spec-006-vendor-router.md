# SPEC-006: Smart Vendor Router

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** SPEC-003 (Orders), SPEC-007 (PO Generation)

---

## 1. What

Intelligent vendor matching system:

**Scoring Criteria:**
- Capability match: can vendor produce this product type, material, dimensions?
- Current capacity: available production slots
- Price competitiveness: historical pricing vs current quote
- Quality score: weighted average of last 50 reviews (minimum 3.0/5.0)
- Geographic proximity: shipping cost and time to destination
- Lead time: historical on-time delivery percentage
- Sustainability: FSC certification, carbon footprint (optional weight)

**Handshake System:**
- Top 3 vendors ranked and presented to admin
- Admin can override or auto-assign
- Vendor receives offer with 4-hour response window
- Vendor accepts, declines, or counter-offers
- Auto-escalate to next vendor if no response

**Fallback:**
- If all 3 decline, alert admin + notify customer
- Admin can manually assign or expand vendor pool

---

## 2. Why

Manual vendor assignment takes 1-2 days and often results in suboptimal matches. Automation reduces assignment time to <5 minutes and improves on-time delivery by 25%.

**Business Impact:**
- Reduce assignment time: 1-2 days → <5 minutes
- Improve on-time delivery: +25%
- Reduce costs: competitive pricing from vendor pool
- Scale operations: handle 10x order volume without adding staff

---

## 3. Who

| Role | Need |
|------|------|
| **Admin** | Configure vendor profiles, scoring weights, fallback rules |
| **Vendor** | Receive offers, see score breakdown, accept/decline |
| **Customer** | Benefit from faster turnaround and competitive pricing |

---

## 4. Success Criteria

### Functional
- [ ] Scoring algorithm considers: capability, capacity, price, quality, location, lead time
- [ ] Configurable weights per criterion (admin-adjustable, sum to 100%)
- [ ] Top 3 vendors ranked with score breakdown
- [ ] Admin override: manual assignment with reason
- [ ] Handshake: 4-hour response window with email + in-app notification
- [ ] Vendor actions: accept, decline (with reason), counter-offer (price/lead time)
- [ ] Auto-escalation: next vendor after 4h, admin alert after 24h
- [ ] Vendor suspension: auto-suspend if quality score <3.0 for 3 consecutive months
- [ ] Routing history: all assignments stored with scores and reasons

### Non-Functional
- [ ] Vendor ranking calculation <1s for pool of 100 vendors
- [ ] Offer delivery <30s (email + in-app)
- [ ] Handshake state machine: no lost offers or race conditions

---

## 5. Out of Scope

- AI demand forecasting for capacity planning
- Vendor auction/bidding system
- Real-time vendor GPS tracking
- Vendor performance prediction

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/vendors/vendors.controller.ts` | Vendor API endpoints |
| `backend/src/modules/vendors/vendors.service.ts` | Vendor profile management |
| `backend/src/modules/routing/routing.controller.ts` | Routing API endpoints |
| `backend/src/modules/routing/routing.service.ts` | Scoring and matching logic |
| `backend/src/modules/routing/dto/route-order.dto.ts` | Routing request validation |
| `backend/src/modules/routing/scoring/capability.scorer.ts` | Capability scoring |
| `backend/src/modules/routing/scoring/quality.scorer.ts` | Quality score calculation |
| `backend/src/workers/handshake.worker.ts` | Handshake timeout monitoring |
| `backend/prisma/schema.prisma` | Vendor, VendorCapability, VendorScore, RoutingLog tables |
| `frontend/app/(dashboard)/routing/page.tsx` | Routing dashboard |
| `frontend/components/routing/VendorRanking.tsx` | Ranked vendor list |
| `frontend/components/routing/HandshakePanel.tsx` | Handshake status panel |
| `frontend/components/routing/ScoringWeights.tsx` | Weight configuration UI |
