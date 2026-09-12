# SPEC-012: Customer Review & Rating System

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Important  
> **Dependencies:** SPEC-011 (Settlement)

---

## 1. What

Multi-criteria review system:

**Rating Criteria (1-5 stars each):**
- Product Quality: material, print, structural integrity
- On-Time Delivery: met promised date?
- Communication: responsiveness, clarity, professionalism
- Value for Money: quality vs price

**Review Features:**
- Written review: 20-1000 characters
- Photo upload: up to 5 photos of received product
- Vendor response: one public reply per review
- Review moderation: admin approval before display

**Impact:**
- Vendor score: weighted average of last 50 reviews
- Routing impact: score <3.0 for 3 months = auto-suspend
- Public vendor profile: aggregated scores and recent reviews

---

## 2. Why

Reviews build trust for new customers and incentivize vendors to maintain quality. Currently, quality feedback is informal and not actionable. A structured system improves vendor quality by 25%.

**Business Impact:**
- Improve vendor quality: +25%
- Build customer trust: +30% conversion for reviewed vendors
- Reduce quality disputes: -40%
- Vendor motivation: competitive scoring

---

## 3. Who

| Role | Need |
|------|------|
| **Customer** | Submit review after delivery, edit within 30 days |
| **Vendor** | View reviews, respond publicly, see aggregated scores |
| **Admin** | Moderate reviews, handle disputes, remove fake reviews |

---

## 4. Success Criteria

### Functional
- [ ] Review eligibility: 24h after delivery, window closes after 30 days
- [ ] 4 rating criteria: Quality, Delivery, Communication, Value
- [ ] Written review: min 20 chars, max 1000
- [ ] Photo upload: up to 5 photos
- [ ] Vendor response: one reply per review, visible publicly
- [ ] Moderation: admin approval required; auto-approve if no flags
- [ ] Vendor score: weighted average of last 50 reviews, updates daily
- [ ] Auto-suspend: score <3.0 for 3 consecutive months
- [ ] Review helpfulness: customers can mark reviews as helpful
- [ ] Flag system: customers can flag inappropriate reviews

### Non-Functional
- [ ] Review submission <2s
- [ ] Score recalculation <1s (background job)
- [ ] Review display: paginated, 10 per page

---

## 5. Out of Scope

- AI sentiment analysis of review text
- Review incentives (discounts for reviews)
- Video reviews
- Review syndication to external platforms (Google, Trustpilot)

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/reviews/reviews.controller.ts` | Review API endpoints |
| `backend/src/modules/reviews/reviews.service.ts` | Review logic |
| `backend/src/modules/reviews/dto/create-review.dto.ts` | Review validation |
| `backend/src/modules/reviews/scoring.service.ts` | Vendor score calculation |
| `backend/prisma/schema.prisma` | Review, VendorScore, ReviewPhoto tables |
| `frontend/app/(shop)/reviews/page.tsx` | Review submission page |
| `frontend/app/(shop)/vendors/[id]/reviews/page.tsx` | Vendor reviews |
| `frontend/components/reviews/ReviewForm.tsx` | Review form |
| `frontend/components/reviews/ReviewCard.tsx` | Review display card |
| `frontend/components/reviews/VendorScore.tsx` | Score display |
| `frontend/components/reviews/ReviewModeration.tsx` | Admin moderation panel |
