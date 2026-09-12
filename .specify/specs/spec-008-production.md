# SPEC-008: Production Management & Progress Tracking

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** SPEC-007 (PO Generation)

---

## 1. What

Production dashboard and progress tracking:

**Production Stages:**
```
Material Prep → Printing → Cutting → Folding/Gluing 
→ Quality Check → Packing → Ready for Shipment
```

**Vendor Features:**
- Update stage with timestamp
- Upload production photos (up to 10 per stage)
- Report delays with reason and new ETA
- View production calendar

**Customer Features:**
- Visual timeline with current stage
- % completion calculation
- Estimated completion date
- Production photos (if vendor shares)

**Admin Features:**
- All active production overview
- Delay alerts (>20% over expected duration)
- Filter by vendor, priority, delay status
- Intervene and reassign if needed

---

## 2. Why

Customers currently receive vague "in production" updates. Real-time tracking reduces support tickets by 60% and improves customer confidence and satisfaction.

**Business Impact:**
- Reduce WISMO tickets: -60%
- Improve customer satisfaction: +30 NPS
- Faster issue detection: delays caught early
- Better vendor accountability: transparent progress

---

## 3. Who

| Role | Need |
|------|------|
| **Vendor** | Update progress, upload photos, report delays |
| **Admin** | Monitor all production, identify delays, intervene |
| **Customer** | Track progress with visual timeline and ETA |

---

## 4. Success Criteria

### Functional
- [ ] 7 production stages with clear definitions
- [ ] Vendor updates: stage, timestamp, optional photo, notes
- [ ] Estimated completion: recalculated based on current stage + historical averages
- [ ] Delay alerts: >20% over expected duration triggers alert
- [ ] Production photos: up to 10 per stage, vendor controls visibility
- [ ] Customer view: visual timeline, current stage, % complete, ETA
- [ ] Admin dashboard: all active production, filters, delay highlights
- [ ] Production calendar: vendor view of upcoming deadlines
- [ ] Stage definitions configurable per product type

### Non-Functional
- [ ] Progress update <2s
- [ ] Photo upload <5s (optimized to <2MB)
- [ ] Timeline updates real-time (WebSocket/SSE)

---

## 5. Out of Scope

- IoT sensor integration for automated tracking
- Predictive maintenance for vendor equipment
- Real-time video streaming from production floor
- AI quality inspection during production

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/production/production.controller.ts` | Production API endpoints |
| `backend/src/modules/production/production.service.ts` | Production logic |
| `backend/src/modules/production/dto/update-progress.dto.ts` | Progress update validation |
| `backend/prisma/schema.prisma` | Production, ProductionStage, ProductionPhoto tables |
| `frontend/app/(vendor)/production/page.tsx` | Vendor production page |
| `frontend/app/(dashboard)/production/page.tsx` | Admin production dashboard |
| `frontend/components/production/ProductionTimeline.tsx` | Visual timeline |
| `frontend/components/production/StageUpdater.tsx` | Stage update form |
| `frontend/components/production/ProductionCalendar.tsx` | Calendar view |
| `frontend/components/production/DelayAlert.tsx` | Delay notification |
