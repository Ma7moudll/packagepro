# SPEC-001: Dynamic Pricing Engine

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** SPEC-015 (File Upload), SPEC-023 (i18n)

---

## 1. What

A real-time pricing system that calculates custom packaging costs based on:
- Product type (mailer box, shipping box, RSC, FOL, tube, bag, tape, food box)
- Dimensions (L × W × H) with validation against product constraints
- Material (kraft, white, black, recycled, FSC-certified options)
- Quantity with dynamic discount tiers
- Printing options (none, 1-color, 2-color, full-color CMYK)
- Finishing (gloss, matte, soft-touch, spot UV, embossing)
- Sustainability premium/discount (eco-friendly materials)
- Shipping destination (zone-based rates)

The engine must support:
- Instant quote generation (<200ms)
- Multi-currency display (USD base, real-time conversion)
- Price breakdown transparency
- Enterprise contract overrides
- MOQ validation (minimum 30 units for standard products)

---

## 2. Why

Customers need instant, accurate quotes without manual back-and-forth with sales. The current static pricing sheets cause delays and pricing inconsistencies. A dynamic engine reduces quote time from hours to seconds and increases conversion rates by 40%.

**Business Impact:**
- Reduce quote time: hours → seconds
- Increase conversion: +40% estimated
- Reduce support tickets: -60% pricing inquiries
- Enable self-service for 80% of orders

---

## 3. Who

| Role | Need |
|------|------|
| **Customer (B2B/B2C)** | Get instant quotes, compare options, save quotes |
| **Admin** | Configure base prices, materials, discount rules, MOQs |
| **Enterprise Customer** | Custom pricing tiers, volume contracts |
| **Vendor** | See cost breakdowns in purchase orders |

---

## 4. Success Criteria

### Functional
- [ ] Price calculated in <200ms for any valid product configuration
- [ ] Support 10+ product types with unique pricing rules per type
- [ ] Material pricing updated from admin panel reflects immediately (no deploy)
- [ ] Discount tiers: 100-499 (5%), 500-999 (10%), 1000-4999 (15%), 5000+ (20%)
- [ ] Price breakdown visible: material + labor + printing + finishing + shipping + margin + sustainability offset
- [ ] Multi-currency: USD (base), EUR, GBP, AED, SAR with daily rate updates
- [ ] Admin override: custom pricing per customer (enterprise contracts)
- [ ] MOQ validation: reject orders below minimum with clear message
- [ ] Save quote: customer can save quote for 30 days with unique link
- [ ] Share quote: email/clipboard share with team members

### Non-Functional
- [ ] API response time p95 <200ms
- [ ] Pricing rules cached in Redis (TTL: 1 hour)
- [ ] Audit log: every price calculation logged with inputs and output
- [ ] Idempotency: same inputs = same price (deterministic)

---

## 5. Out of Scope

- AI-powered price optimization (Phase 2)
- Real-time carrier shipping rates (FedEx, UPS APIs)
- Dynamic pricing based on demand/capacity
- Auction/bidding model
- Cryptocurrency payments

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/pricing/pricing.service.ts` | Core pricing calculation logic |
| `backend/src/modules/pricing/pricing.controller.ts` | API endpoints |
| `backend/src/modules/pricing/dto/calculate-price.dto.ts` | Input validation (Zod) |
| `backend/src/modules/pricing/entities/pricing-rule.entity.ts` | Pricing rule data model |
| `backend/prisma/schema.prisma` | Product, Material, PricingRule tables |
| `frontend/app/(shop)/quote/page.tsx` | Quote calculator page |
| `frontend/components/pricing/price-calculator.tsx` | Main calculator component |
| `frontend/components/pricing/price-breakdown.tsx` | Price breakdown display |
| `frontend/lib/pricing/api.ts` | Pricing API client |
| `frontend/store/pricing.store.ts` | Quote state management (Zustand) |
