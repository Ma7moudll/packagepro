# SPEC-007: Purchase Order (PO) Generation

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** SPEC-006 (Vendor Router)

---

## 1. What

Automatic PDF purchase order generation:

**PO Content:**
- PO number: PO-YYYY-NNNN (sequential per year)
- Order details: product type, quantity, dimensions, material
- Design files: secure download links (expiring after 30 days)
- Pricing breakdown: material, labor, printing, shipping, margin
- Delivery requirements: address, required date, shipping method
- Terms & conditions: payment terms, quality standards, penalties
- Special instructions: custom requirements, packaging specs

**Delivery:**
- Email to vendor with PDF attachment
- In-app notification with download link
- Vendor portal access

**Status Tracking:**
- Sent → Confirmed → In Production → Completed
- Vendor confirms via email link or portal
- Admin can regenerate with updated info

---

## 2. Why

Manual PO creation takes 30+ minutes per order and is error-prone. Automation ensures consistency, reduces errors by 90%, and provides vendors with all needed information upfront.

**Business Impact:**
- Reduce PO creation time: 30 min → <1s
- Reduce errors: -90%
- Improve vendor satisfaction: complete info upfront
- Faster production start: no back-and-forth for missing details

---

## 3. Who

| Role | Need |
|------|------|
| **Vendor** | Receive complete PO with all specs and files |
| **Admin** | Review PO before sending (optional), track PO status |
| **Finance** | Match POs to invoices for reconciliation |

---

## 4. Success Criteria

### Functional
- [ ] PDF PO auto-generated upon vendor acceptance
- [ ] PO includes: order ID, specs, design files, pricing, delivery, terms
- [ ] Design files: secure download links (30-day expiry, access logging)
- [ ] PO number format: PO-YYYY-NNNN
- [ ] Vendor confirmation: email link or portal button
- [ ] PO status tracking: Sent → Confirmed → In Production → Completed
- [ ] Admin can regenerate PO with updated info
- [ ] PO history: all versions stored with changes highlighted
- [ ] Bilingual POs: Arabic and English versions

### Non-Functional
- [ ] PDF generation <3s
- [ ] PO file size <5MB (optimized images)
- [ ] Download links: CDN-backed, <1s load time

---

## 5. Out of Scope

- Digital signature on POs (Phase 2)
- Multi-currency POs (USD base only)
- PO amendment workflow after confirmation
- EDI integration for large vendors

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/purchase-orders/po.controller.ts` | PO API endpoints |
| `backend/src/modules/purchase-orders/po.service.ts` | PO generation logic |
| `backend/src/modules/purchase-orders/po-generator.service.ts` | PDF generation (Puppeteer/PDFKit) |
| `backend/src/modules/purchase-orders/dto/create-po.dto.ts` | PO creation validation |
| `backend/src/modules/purchase-orders/templates/po-template.hbs` | Handlebars PO template |
| `backend/prisma/schema.prisma` | PurchaseOrder, POVersion tables |
| `frontend/app/(dashboard)/purchase-orders/page.tsx` | PO list page |
| `frontend/app/(dashboard)/purchase-orders/[id]/page.tsx` | PO detail page |
| `frontend/components/po/POViewer.tsx` | PDF viewer component |
| `frontend/components/po/POStatusTracker.tsx` | Status tracking UI |
