# SPEC-025: Sustainability & Carbon Footprint Tracking

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Competitive Differentiator  
> **Dependencies:** SPEC-001 (Pricing), SPEC-002 (Design)

---

## 1. What

Sustainability features to match Packhelp's eco-friendly positioning:

**Product-Level:**
- FSC-certified material flag per product
- Recycled content percentage display
- Carbon footprint calculation per product configuration
- "Green score" badge for sustainable choices
- Eco-friendly filter in product catalog

**Order-Level:**
- Carbon footprint estimate: material sourcing + production + shipping
- Compare eco vs standard options side-by-side
- Carbon offset purchase option at checkout
- Sustainability certificate generation (PDF)

**Company-Level:**
- Monthly carbon report for customers
- Tree planting integration (partner with reforestation org)
- Sustainability dashboard: total carbon saved, trees planted, recycled materials used
- ESG reporting for enterprise customers

**Vendor Requirements:**
- FSC certification tracking
- Carbon footprint data collection
- Sustainability score in vendor ranking

---

## 2. Why

Packhelp's sustainability story is a key selling point (FSC certified, 50k+ customers). 73% of B2B buyers consider sustainability in purchasing decisions. This feature differentiates PackagePro and attracts eco-conscious customers.

**Business Impact:**
- Differentiate from competitors: sustainability as USP
- Attract eco-conscious customers: +25% addressable market
- Increase order value: customers pay 10-15% premium for eco options
- Improve brand reputation: ESG compliance

---

## 3. Who

| Role | Need |
|------|------|
| **Customer** | See carbon footprint, choose eco options, buy offsets, download certificates |
| **Admin** | Configure sustainability rules, view impact dashboard |
| **Vendor** | Upload certifications, report sustainability metrics |
| **Enterprise Customer** | ESG reports, sustainability KPIs |

---

## 4. Success Criteria

### Functional
- [ ] FSC flag: per material, visible in catalog and design editor
- [ ] Recycled content: percentage displayed per product
- [ ] Carbon calculator: per order (material + production + shipping)
- [ ] Eco comparison: side-by-side standard vs eco option
- [ ] Carbon offset: purchase at checkout, integrate with reforestation partner
- [ ] Green score: 0-100 rating per product configuration
- [ ] Sustainability certificate: PDF with order carbon data
- [ ] Monthly report: customer carbon footprint summary
- [ ] Tree planting: 1 tree per $100 spent on eco options
- [ ] Vendor sustainability score: factor in routing algorithm

### Non-Functional
- [ ] Carbon calculation: <500ms
- [ ] Certificate generation: <3s
- [ ] Data accuracy: ±10% of actual carbon footprint

---

## 5. Out of Scope

- Life cycle assessment (LCA) certification
- Blockchain-based carbon credit tracking
- Real-time supply chain carbon monitoring
- Carbon-neutral company certification (Phase 2)

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/sustainability/sustainability.controller.ts` | Sustainability API |
| `backend/src/modules/sustainability/sustainability.service.ts` | Carbon calculation |
| `backend/src/modules/sustainability/carbon-calculator.service.ts` | Carbon math |
| `backend/src/modules/sustainability/dto/carbon-report.dto.ts` | Report validation |
| `backend/prisma/schema.prisma` | SustainabilityData, CarbonOffset, TreePlanting tables |
| `frontend/app/(shop)/sustainability/page.tsx` | Sustainability info page |
| `frontend/components/sustainability/CarbonCalculator.tsx` | Carbon display |
| `frontend/components/sustainability/EcoComparison.tsx` | Side-by-side comparison |
| `frontend/components/sustainability/GreenScoreBadge.tsx` | Score badge |
| `frontend/components/sustainability/SustainabilityCertificate.tsx` | Certificate viewer |
| `frontend/components/sustainability/TreeCounter.tsx` | Trees planted counter |
