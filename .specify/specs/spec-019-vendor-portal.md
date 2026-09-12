# SPEC-019: Vendor Portal

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Important  
> **Dependencies:** SPEC-006 (Vendor Router), SPEC-008 (Production)

---

## 1. What

Dedicated portal for production partners:

**Order Inbox:**
- All assigned orders with status, priority, deadline
- Filter: pending, in production, completed, delayed
- Sort: deadline, priority, value

**Production Management:**
- Update stage with timestamp
- Upload production photos (up to 10 per stage)
- Report delays with reason and new ETA
- View production calendar

**Sample Management:**
- Upload sample photos/videos
- Add notes and specifications
- Track sample review status

**PO Management:**
- View PO details
- Confirm or decline with reason
- Download PO PDF
- View PO history

**Payments:**
- View pending and settled payments
- Download payout invoices
- View payment history and breakdown

**Profile:**
- Update capabilities: products, materials, max dimensions
- Update capacity: units per day, shifts
- Upload certifications: FSC, ISO, etc.
- Manage team members

**Performance:**
- On-time delivery percentage
- Quality score trend
- Revenue generated
- Review highlights

---

## 2. Why

Vendors need a centralized interface to manage their relationship with PackagePro. A portal reduces email back-and-forth by 70% and ensures all information is in one place.

**Business Impact:**
- Reduce email volume: -70%
- Faster PO confirmation: <1h vs 1-2 days
- Improve vendor satisfaction: +50%
- Better data accuracy: self-managed profiles

---

## 3. Who

| Role | Features |
|------|----------|
| **Vendor Admin** | All features: orders, production, payments, profile |
| **Vendor Member** | Update production, upload photos (limited) |
| **Vendor Finance** | View payments, download invoices |

---

## 4. Success Criteria

### Functional
- [ ] Order inbox: assigned orders with filters and sorting
- [ ] Production update: stage, timestamp, photos, notes
- [ ] Sample upload: photos, videos, notes
- [ ] PO confirmation: view, confirm, decline, download
- [ ] Payment history: pending, settled, invoices
- [ ] Profile: capabilities, capacity, certifications, team
- [ ] Performance dashboard: on-time %, quality score, revenue
- [ ] Calendar view: deadlines, pickups, maintenance
- [ ] Notifications: order offers, reminders, delay alerts
- [ ] Mobile-friendly: responsive design for factory floor use

### Non-Functional
- [ ] Portal load <2s
- [ ] Photo upload <5s (optimized)
- [ ] Works on tablets and mobile browsers

---

## 5. Out of Scope

- Vendor bidding on orders (auction model)
- Vendor-to-vendor messaging
- Vendor inventory management
- Vendor equipment IoT integration

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/vendors/vendors.controller.ts` | Vendor API |
| `backend/src/modules/vendors/vendors.service.ts` | Vendor logic |
| `backend/prisma/schema.prisma` | Vendor, VendorProfile, VendorTeam tables |
| `frontend/app/(vendor)/dashboard/page.tsx` | Vendor dashboard |
| `frontend/app/(vendor)/orders/page.tsx` | Order inbox |
| `frontend/app/(vendor)/production/page.tsx` | Production page |
| `frontend/app/(vendor)/payments/page.tsx` | Payments page |
| `frontend/app/(vendor)/profile/page.tsx` | Profile page |
| `frontend/components/vendor/OrderInboxTable.tsx` | Order list |
| `frontend/components/vendor/ProductionUpdater.tsx` | Stage update form |
| `frontend/components/vendor/PerformanceChart.tsx` | Performance charts |
| `frontend/components/vendor/VendorCalendar.tsx` | Calendar view |
