# SPEC-026: Minimum Order Quantity (MOQ) Management

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Competitive Requirement  
> **Dependencies:** SPEC-001 (Pricing)

---

## 1. What

MOQ management to match Packhelp's low minimums:

**MOQ Configuration:**
- Per-product MOQ: 30 for mailer boxes, 100 for custom tape, 200 for labels
- Per-material MOQ: higher for specialty materials
- Per-customer override: enterprise customers can have lower MOQs
- Sample order MOQ: 1-5 units for testing

**Validation:**
- Real-time MOQ check during quote
- Clear error message if below MOQ
- Suggest nearest valid quantity
- Sample order flow for quantities below MOQ

**Sample Orders:**
- 1-5 units for product testing
- Higher per-unit price (no volume discount)
- No pre-press check (simplified)
- Standard shipping only

---

## 2. Why

Packhelp's 30-unit minimum is a key competitive advantage. Low MOQs attract SMBs and startups who can't afford large runs. Sample orders reduce purchase risk for new customers.

**Business Impact:**
- Attract SMBs: +40% addressable market
- Reduce purchase risk: sample orders increase conversion
- Compete with Packhelp: match their MOQ strategy
- Increase trial: samples lead to bulk orders

---

## 3. Who

| Role | Need |
|------|------|
| **Customer** | See MOQ in real-time, order samples, understand pricing |
| **Admin** | Configure MOQs per product, material, customer tier |
| **Enterprise Customer** | Negotiate lower MOQs via contract |

---

## 4. Success Criteria

### Functional
- [ ] Per-product MOQ: configurable in admin panel
- [ ] Per-material MOQ: higher for specialty materials
- [ ] Real-time validation: during quote, clear error message
- [ ] Quantity suggestion: "Minimum is 30. Try 30 for $X/unit"
- [ ] Sample orders: 1-5 units, separate flow, higher price
- [ ] Customer override: enterprise contracts can have custom MOQs
- [ ] MOQ display: visible in product catalog and quote calculator
- [ ] Bulk MOQ update: CSV import for admin

### Non-Functional
- [ ] MOQ check: <100ms (cached)
- [ ] Sample order creation: <2s

---

## 5. Out of Scope

- Dynamic MOQ based on capacity
- MOQ optimization AI
- Group buying / collective orders

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/pricing/moq.service.ts` | MOQ validation logic |
| `backend/src/modules/pricing/dto/moq-config.dto.ts` | MOQ configuration |
| `backend/src/modules/orders/sample-order.service.ts` | Sample order logic |
| `backend/prisma/schema.prisma` | ProductMOQ, SampleOrder tables |
| `frontend/components/pricing/MOQValidator.tsx` | MOQ validation UI |
| `frontend/components/pricing/SampleOrderButton.tsx` | Sample order CTA |
| `frontend/components/pricing/QuantitySuggestor.tsx` | Quantity suggestion |
