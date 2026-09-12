# SPEC-003: Order Creation & Lifecycle Management

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** SPEC-001 (Pricing), SPEC-002 (Design), SPEC-004 (Payment)

---

## 1. What

End-to-end order management system:

**Order Creation:**
- Create from saved quote
- Create from design session
- Quick reorder from order history
- Bulk order upload (CSV/Excel for enterprise)

**Order Lifecycle:**
```
Draft → Submitted → Paid → Pre-Press → Approved → In Production 
→ Quality Check → Shipped → Delivered → Settled → Reviewed
```

**Status Management:**
- Automatic status transitions (payment success → Pre-Press)
- Manual admin overrides with reason
- Customer-visible vs internal statuses
- Delay alerts and auto-escalation

**Order Features:**
- Priority system: Low / Normal / High / Urgent
- Order notes: internal (admin-only) and customer-visible
- Bulk actions: update status, assign vendor, export CSV
- Auto-cancel: unpaid orders after 7 days
- Order splitting: partial shipments (Phase 1.5)

---

## 2. Why

Orders currently tracked in spreadsheets and emails. A centralized system eliminates lost orders (0% loss), provides real-time visibility to customers (reduces "where is my order?" tickets by 80%), and enables automated workflows.

**Business Impact:**
- Eliminate lost orders: 100% traceability
- Reduce WISMO tickets: -80%
- Speed up fulfillment: automated handoffs between stages
- Improve cash flow: automated payment collection and settlement

---

## 3. Who

| Role | Need |
|------|------|
| **Customer** | Create orders, pay, track status, download invoices |
| **Admin** | Manage queue, update statuses, handle exceptions, set priorities |
| **Vendor** | Receive purchase orders, update production progress |
| **Finance** | Track revenue, process settlements, generate reports |

---

## 4. Success Criteria

### Functional
- [ ] Order creation from quote, design, or history
- [ ] Full lifecycle: 11 stages with automatic and manual transitions
- [ ] Status change triggers: notifications (email + in-app), webhooks, audit log
- [ ] Auto-cancel: orders in "Submitted" for >7 days without payment
- [ ] Priority system: affects dashboard sorting, vendor alerts, SLA tracking
- [ ] Order notes: threaded conversations, @mentions, file attachments
- [ ] Bulk actions: update status, assign vendor, export CSV (up to 100 orders)
- [ ] Order timeline: visual timeline with timestamps and actor for every change
- [ ] Order splitting: allow partial shipments (ship items separately)
- [ ] Subscription orders: auto-generate recurring orders (Phase 1.5)

### Non-Functional
- [ ] Order creation API <500ms
- [ ] Status updates propagated in <1s (WebSocket/SSE)
- [ ] Audit trail: immutable, 7-year retention for financial stages
- [ ] Concurrent order updates: optimistic locking, no lost updates

---

## 5. Out of Scope

- Backorder management
- Marketplace model (multiple vendors per order item)
- Dropshipping integration
- POS integration for retail

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/orders/orders.controller.ts` | Order API endpoints |
| `backend/src/modules/orders/orders.service.ts` | Order business logic |
| `backend/src/modules/orders/dto/create-order.dto.ts` | Order creation validation |
| `backend/src/modules/orders/dto/update-status.dto.ts` | Status update validation |
| `backend/src/modules/orders/entities/order.entity.ts` | Order data model |
| `backend/src/modules/orders/entities/order-timeline.entity.ts` | Timeline/audit entries |
| `backend/prisma/schema.prisma` | Order, OrderItem, OrderTimeline, OrderNote tables |
| `frontend/app/(dashboard)/orders/page.tsx` | Orders list page |
| `frontend/app/(dashboard)/orders/[id]/page.tsx` | Order detail page |
| `frontend/components/orders/OrderTimeline.tsx` | Visual timeline component |
| `frontend/components/orders/OrderStatusBadge.tsx` | Status badge component |
| `frontend/components/orders/OrderPrioritySelector.tsx` | Priority selector |
| `frontend/components/orders/BulkActionsBar.tsx` | Bulk actions toolbar |
| `frontend/lib/orders/api.ts` | Order API client |
| `frontend/store/orders.store.ts` | Order state (Zustand) |
