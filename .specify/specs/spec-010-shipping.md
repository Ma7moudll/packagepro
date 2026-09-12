# SPEC-010: DHL Express Shipping Integration

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** SPEC-008 (Production)

---

## 1. What

Automated shipping via DHL Express API:

**Shipment Creation:**
- Auto-populate from order details (weight, dimensions, destination)
- Generate shipping label (PDF with barcode)
- Schedule pickup or drop-off
- Customs documentation for international orders

**Tracking:**
- Real-time tracking via DHL API (polled every 2 hours)
- Webhook handling for status updates
- Status mapping to order lifecycle stages

**Notifications:**
- Customer: email at each status change
- Admin: exception alerts (failed delivery, customs hold)
- Vendor: label ready for printing

**Returns:**
- Return label generation
- Return tracking
- Refund processing upon return receipt

---

## 2. Why

Manual shipping processes cause delays, incorrect addresses, and lost packages. Integration ensures accurate labels, real-time tracking, and automatic status updates, reducing shipping errors by 85%.

**Business Impact:**
- Reduce shipping errors: -85%
- Improve delivery transparency: real-time tracking
- Reduce support tickets: -50% shipping inquiries
- Faster fulfillment: automated vs manual label creation

---

## 3. Who

| Role | Need |
|------|------|
| **Admin** | Create shipments, print labels, handle exceptions |
| **Customer** | Receive tracking number, track package, delivery notifications |
| **Vendor** | Print shipping labels, schedule DHL pickup |

---

## 4. Success Criteria

### Functional
- [ ] Shipment creation from order details (auto-populated)
- [ ] Shipping label: PDF with barcode, ready to print (4×6 inch)
- [ ] Real-time tracking: fetch status every 2h, display in order timeline
- [ ] Webhook handling: picked up, in transit, out for delivery, delivered, exception
- [ ] Customs docs: commercial invoice and packing list for international
- [ ] Shipping cost: calculated via DHL rate API, added to order total
- [ ] Delivery notifications: email to customer at each change
- [ ] Failed delivery: auto-schedule re-delivery or hold at facility
- [ ] Return labels: generate on request, track return shipment
- [ ] Multi-piece shipments: support for large orders (multiple boxes)

### Non-Functional
- [ ] Label generation <3s
- [ ] Tracking API call <2s
- [ ] Webhook processing <200ms
- [ ] Rate limit handling: DHL API limits respected with backoff

---

## 5. Out of Scope

- Multi-carrier support (FedEx, UPS, Aramex — Phase 2)
- Same-day/local delivery
- Freight/LTL shipping for bulk orders
- Temperature-controlled shipping
- White-glove delivery service

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/shipping/shipping.controller.ts` | Shipping API endpoints |
| `backend/src/modules/shipping/shipping.service.ts` | Shipping logic |
| `backend/src/modules/shipping/dhl.service.ts` | DHL API integration |
| `backend/src/modules/shipping/dto/create-shipment.dto.ts` | Shipment creation validation |
| `backend/src/modules/webhooks/dhl-webhook.controller.ts` | DHL webhook handler |
| `backend/prisma/schema.prisma` | Shipment, TrackingEvent, ShippingLabel tables |
| `frontend/app/(dashboard)/shipping/page.tsx` | Shipping management page |
| `frontend/components/shipping/ShipmentCreator.tsx` | Shipment creation form |
| `frontend/components/shipping/LabelPrinter.tsx` | Label print component |
| `frontend/components/shipping/TrackingTimeline.tsx` | Tracking display |
| `frontend/components/shipping/CustomsDocs.tsx` | Customs documentation viewer |
