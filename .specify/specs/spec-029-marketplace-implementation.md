# SPEC-029: End-to-End Marketplace Implementation Plan

> **Project:** PackagePro  
> **Status:** In Progress — Phases 1-4 shipped; Phase 5 polish (k6 load testing, monitoring alerts) remaining  
> **Priority:** P0 — Critical Path  
> **Dependencies:** All prior SPECs (001-028)

> **Progress log (2026-10-04):**
> - Phase 1 ✅ — `frontend/lib/api/*` integration layer (client with auth/refresh/retry, products, pricing, orders, payments, shipments, vendors, approvals).
> - Phase 2 ✅ — cart/checkout with Stripe, customer orders + timeline, designs, billing, notifications, reorder (`(customer)` route group).
> - Phase 3 ✅ — vendor portal `(business)/manufacturer`: dashboard, orders, handshake accept/reject with ownership checks, production progress, **samples page + SampleUploader (real upload → QA queue)**, settings (GET/PATCH `/vendors/me`).
> - Phase 4 ✅ — admin console `app/admin`: overview KPIs, orders (search/filter), vendors (activate/deactivate), customers (LTV), finance P&L, **QA sample review queue** — all backed by the new ADMIN-gated `/api/admin/*` module.
> - Security hardening ✅ — `requireRoles/requireAdmin/requireVendorProfile` RBAC middleware wired across vendor/admin/finance/settlements/analytics/templates routes; sample upload implemented (base64 JSON → S3 or local disk + `/api/files/*` serving with traversal guard); background workers (email/settlement/reminder/marketing/export) now actually start in `src/index.ts`.
> - Verification ✅ — backend vitest 118/118 (incl. new `admin/rbac.test.ts`), frontend units 99/99, Playwright cart-checkout + phase2-approval 8/8, production builds pass, RBAC/smoke flows verified live.

---

## 1. Current State Assessment

### ✅ Already Built (Backend — ~90%)

| Layer | Modules | Status |
|-------|---------|--------|
| **Auth & Security** | JWT, RBAC, rate limiting, audit logs, email verification, password reset | Complete |
| **Pricing Engine** | Surface area calc, material cost, conversion cost, margin, shipping | Complete |
| **Orders** | Full lifecycle (create → payment → approval → PO → handshake → production → shipping → delivery → settlement → review) | Complete |
| **Payments** | Stripe intents + webhooks, PayPal, COD | Complete |
| **Vendor Router** | Scoring engine (cost 30%, location 25%, MOQ 15%, quality 15%, speed 10%, capacity 5%) | Complete |
| **Purchase Orders** | Auto-generation, PDF docs, vendor notification | Complete |
| **Handshakes** | 4hr expiry, accept/reject, fallback routing | Complete |
| **Production** | Status tracking, progress (0-100%), sample workflow | Complete |
| **Samples** | Photo upload, QA review, approve/reject/revision | Complete |
| **Pre-press** | Resolution, color mode, bleed, fonts, transparency checks | Complete |
| **Shipments** | DHL integration, label gen, tracking webhooks | Complete |
| **Settlements** | 72hr verification window, auto-pay, bank transfer | Complete |
| **Reviews** | Multi-dimension rating, photo upload, vendor scoring | Complete |
| **Marketing** | Email sequences, trigger-based campaigns | Complete |
| **Background Jobs** | Email, settlement, reminders (24h/48h/72h/7d auto-cancel), marketing, export | Complete |
| **Design Lifecycle** | Draft → Submitted → In Review → Approved → Rejected → In Production | Complete |

### ⚠️ Partially Built / Needs Work

| Layer | What Exists | Gap |
|-------|-------------|-----|
| **Backend Analytics** | `analytics.service.ts` with dashboard metrics | No real-time WebSocket push for live updates |
| **Frontend Product Page** | `/products/[id]/page.tsx` — rewritten with Packhelp-style UI | Uses hardcoded data, not connected to pricing API |
| **Frontend Cart/Checkout** | Cart provider + `cart-store.ts` Zustand | Uses local pricing, no integration with real backend pricing/shipping |
| **Frontend Editor** | 3D editor with Three.js + Fabric.js | Need to connect design save → create order flow |
| **Admin Dashboard** | Basic routes | No frontend UI for platform monitoring |

### ❌ Not Built (Frontend Gap)

| Feature | Why Needed |
|---------|-----------|
| **Real Product Catalog** | Browse/search products by category with live pricing from backend |
| **Customer Order Tracking** | Real-time order status with timeline, tracking events |
| **Vendor Portal UI** | Dashboard for accepting/rejecting orders, updating production, uploading samples |
| **Admin Operations UI** | Platform monitoring, vendor management, dispute resolution |
| **Multi-vendor Cart** | Aggregate items from multiple vendors with split shipping |
| **Proof Approval Flow UI** | Customer-facing proof review with 3D mockup, approve/reject |
| **End-to-End Integration Tests** | Ensure the full Sarah journey works |

---

## 2. Implementation Roadmap

### Phase 1: Connect the Frontend (Weeks 1-3)
**Goal:** Wire existing frontend pages to real backend APIs

#### Week 1: API Integration Layer
- [ ] Create `frontend/lib/api/` client with:
  - `client.ts` — Base fetch wrapper with auth token injection, error handling, retry
  - `products.ts` — Product catalog API calls
  - `orders.ts` — Order CRUD + approval calls
  - `pricing.ts` — Pricing calculation API calls
  - `payments.ts` — Payment intent creation + confirmation
  - `vendors.ts` — Vendor data calls
  - `shipments.ts` — Shipping rate + label calls

```
frontend/lib/api/
  client.ts           — Base HTTP client (fetch + auth + error)
  products.ts          — GET /api/products, GET /api/products/:id
  pricing.ts           — POST /api/pricing/calculate
  orders.ts            — CRUD /api/orders + approve flow
  payments.ts          — POST /api/payments/create-intent, confirm
  shipments.ts         — GET /api/ecommerce/shipping/rates, labels
  vendors.ts           — GET /api/vendors/dashboard, /api/vendors/orders
```

#### Week 2: Product & Pricing Pages
- [ ] Connect `app/(shop)/products/[id]/page.tsx` to real backend APIs:
  - Replace `PRODUCT` constant with `GET /api/products/:id`
  - Replace hardcoded prices with `POST /api/pricing/calculate`
  - Pass selected options (size, material, print, quantity) to pricing engine
  - Show real-time price updates as user changes options
- [ ] Connect product listing `app/(shop)/products/page.tsx` to `GET /api/products`
- [ ] Build category filter sidebar from `GET /api/products/categories`

```typescript
// Example: Real pricing integration
const { data: pricing, isLoading } = useQuery({
  queryKey: ['pricing', productId, quantity, selectedSize, materialColor],
  queryFn: () => pricingApi.calculate({
    productType: productId,
    dimensions: sizes[selectedSize].dimensions,
    quantity,
    material: materialColor,
    printMode,
    printCoverage,
    productionTime,
  }),
})
```

#### Week 3: Checkout & Payment Flow
- [ ] Connect cart to real backend:
  - Cart items → `POST /api/orders` → receive `orderId`
  - Calculate real shipping via `GET /api/ecommerce/shipping/rates`
  - `POST /api/payments/create-intent` with order total
- [ ] Build checkout page with:
  - Address form (validated via Google Maps API)
  - Payment method selection (Stripe, PayPal, COD)
  - Real-time order summary with backend pricing
  - Order confirmation page with order number

```
Flow:
Cart → POST /api/orders → orderId
     → POST /api/pricing/calculate → total
     → POST /api/payments/create-intent → clientSecret
     → Stripe Elements → confirmPayment
     → Order confirmation page
```

---

### Phase 2: Customer Experience (Weeks 4-6)
**Goal:** Complete customer-facing features — tracking, proof approval, reorder

#### Week 4: Order Tracking & Timeline
- [ ] Build `app/account/orders/[id]/page.tsx` with:
  - Real-time order status badge (11 states)
  - Timeline/stepper showing order progress
  - Tracking events from DHL API (picked up → in transit → out for delivery → delivered)
  - Estimated delivery date with countdown
  - CTA buttons based on current state (e.g., "Approve Design" when in review)

```typescript
const STATUS_STEPS = [
  { key: 'pending_review', label: 'Pending Review' },
  { key: 'awaiting_approval', label: 'Awaiting Approval' },
  { key: 'vendor_confirmed', label: 'Vendor Confirmed' },
  { key: 'in_production', label: 'In Production' },
  { key: 'quality_check', label: 'Quality Check' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
]
```

#### Week 5: Proof Approval Flow
- [ ] Build proof approval UI:
  - When order status = `awaiting_approval`, show proof page
  - 3D mockup render (reuse Three.js from editor)
  - PDF proof download
  - Approve/Reject buttons with legal terms checkbox
  - `POST /api/approvals/:id/approve` → triggers vendor routing

```
┌─────────────────────────────────────┐
│  Your Design Proof (Order #ORD...) │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      3D Mockup Render       │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Download PDF Proof]               │
│                                     │
│  ☐ I approve this design for        │
│    production (no refunds after)     │
│                                     │
│  [✓ Approve]  [Request Changes]     │
└─────────────────────────────────────┘
```

#### Week 6: Account Dashboard & Reorder
- [ ] Build `app/account/` pages:
  - `/account/orders` — Order history with filters, pagination
  - `/account/orders/[id]` — Order detail with timeline
  - `/account/designs` — Saved designs library
  - `/account/billing` — Invoices, payment history
  - `/account/settings` — Profile, address book
- [ ] One-click reorder: reuse previous design + options → new order

---

### Phase 3: Vendor Portal (Weeks 7-8)
**Goal:** Full vendor self-service dashboard

#### Week 7: Vendor Dashboard
- [ ] Build `app/vendor/` pages:
  - `/vendor/login` — Vendor-specific auth
  - `/vendor/dashboard` — Stats (pending orders, revenue, rating)
  - `/vendor/orders` — Incoming orders list with filters
  - `/vendor/orders/[id]` — Order detail with production management

```typescript
// Vendor order card example
const VendorOrderCard = ({ order }) => (
  <div className="border rounded-lg p-4">
    <div className="flex justify-between">
      <div>
        <h3>{order.poNumber}</h3>
        <p>{order.productType} x {order.quantity}</p>
        <p>${order.vendorCost} — Due {order.requestedDeliveryDate}</p>
      </div>
      <HandshakeTimer expiresAt={order.handshakeExpiresAt} />
    </div>
    <HandshakeActions 
      onAccept={() => acceptHandshake(order.id)}
      onReject={() => rejectHandshake(order.id)}
    />
  </div>
)
```

#### Week 8: Production & Sample Management
- [ ] Production management UI:
  - Progress slider (0-100%)
  - Status update buttons (Start Production → Complete → Mark Ready to Ship)
  - Sample photo upload with drag-and-drop
  - Sample review status (Pending → Approved/Rejected/Revision)
- [ ] Vendor settings:
  - Company profile, bank account, tax info
  - Product capabilities, MOQ, lead times
  - Availability calendar

```
Vendor Flow:
Accept Handshake → Confirm PO → Start Production
  → Upload Sample Photos → Wait for QA Approval
  → Full Production → Quality Check → Mark Ready to Ship
  → Print Shipping Label → Await Pickup → Done
```

---

### Phase 4: Admin & Operations (Weeks 9-10)
**Goal:** Platform management console

#### Week 9: Admin Dashboard
- [ ] Build `app/admin/` pages:
  - `/admin` — Live KPIs (orders today, revenue, active vendors, etc.)
  - `/admin/orders` — All orders with global search
  - `/admin/vendors` — Vendor management (approve, rate, monitor)
  - `/admin/customers` — Customer list with LTV metrics
  - `/admin/analytics` — Charts (revenue trends, popular products, vendor performance)

#### Week 10: Finance & Operations
- [ ] Finance dashboard:
  - Revenue report (daily/weekly/monthly)
  - Pending settlements
  - Platform profit calculation
  - P&L export
- [ ] Dispute resolution:
  - Dispute list with status
  - Refund processing UI
  - Mediation notes
- [ ] Vendor onboarding:
  - Application review queue
  - Contract generation
  - Quality audit checklist

---

### Phase 5: Polish & Scale (Weeks 11-12)
**Goal:** Production readiness

#### Week 11: Integration Testing
- [ ] Full Sarah Journey E2E test:
  1. Browse products → Select options → Get pricing
  2. Add to cart → Checkout → Pay
  3. Design upload → Pre-press check
  4. Approve proof → Vendor routing
  5. Vendor handshake → Accept
  6. Production → Sample upload → QA approve
  7. Full production → Mark ready to ship
  8. Shipment → Tracking → Delivery
  9. Delivery confirmation → Settlement
  10. Review → Marketing sequence triggers
- [ ] Load testing with k6 (simulate 100 concurrent orders)
- [ ] Error handling edge cases:
  - Vendor rejects handshake → fallback routing
  - Customer doesn't approve → auto-reminders → 7d auto-cancel
  - Payment fails → retry logic → order hold
  - DHL API down → queue retry → manual fallback

#### Week 12: Performance & SEO
- [ ] Next.js App Router optimization:
  - Server components where possible
  - Streaming for data-heavy pages
  - ISR for product pages
- [ ] SEO:
  - Dynamic metadata per product
  - Structured data (Product, Organization, Review schemas)
  - Sitemap generation
  - Arabic URL slugs
- [ ] Monitoring:
  - Sentry error tracking
  - Web Vitals measurement
  - Uptime monitoring
  - Alerting (PagerDuty/email)

---

## 3. Key Integration Points

### 3.1 Frontend ↔ Backend API Contract

```typescript
// Product detail page → Pricing Engine
interface PricingRequest {
  productType: string
  dimensions: { length: number; width: number; height: number }
  quantity: number
  material: string
  printMode: string
  printCoverage: string
  productionTime: string
  location?: string
}

interface PricingResponse {
  unitPrice: number
  totalPrice: number
  breakdown: {
    material: number
    printing: number
    finishing: number
    shipping: number
    tax: number
    margin: number
  }
  estimatedDelivery: string
  eligibleVolumeDiscounts: { quantity: number; discount: number }[]
}

// Order creation → Backend
interface CreateOrderRequest {
  items: OrderItem[]
  shippingAddress: ShippingAddress
  designId?: string
  paymentMethod: 'stripe' | 'paypal' | 'cod'
  notes?: string
}

interface CreateOrderResponse {
  orderId: string
  orderNumber: string
  total: number
  paymentIntentSecret?: string  // Stripe
  paypalOrderId?: string        // PayPal
  status: OrderStatus
  estimatedDelivery: string
}
```

### 3.2 WebSocket/SSE for Real-Time Updates

```typescript
// Event types the frontend should subscribe to:
type OrderEvent =
  | { type: 'status_changed'; orderId: string; from: OrderStatus; to: OrderStatus }
  | { type: 'production_progress'; orderId: string; progress: number }
  | { type: 'sample_uploaded'; orderId: string; photoUrls: string[] }
  | { type: 'shipment_tracking'; orderId: string; event: TrackingEvent }
  | { type: 'handshake_expiring'; orderId: string; minutesLeft: number }
```

---

## 4. Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Backend API contract mismatch | Medium | High | TypeScript shared types in `shared/` directory; E2E contract tests |
| Stripe webhook delivery failure | Low | High | Idempotency keys, webhook retry, manual reconciliation dashboard |
| Vendor no-shows/handshake expiry | Medium | Medium | Fallback routing already implemented; extend to 3-deep fallback chain |
| DHL API downtime | Low | Medium | Queue shipments for retry; manual label generation fallback |
| Arabic/RTL layout issues | Medium | Medium | Comprehensive RTL testing per page; automated visual regression |
| Order state machine edge cases | Medium | High | Property-based testing for state transitions; prevent invalid transitions |

---

## 5. Success Criteria

### Must-Have (MVP Launch)
- [ ] **Customer** can browse products, configure options, see live pricing, pay, and receive order confirmation
- [ ] **Design** is auto-checked via pre-press, proof is generated and customer approves
- [ ] **Vendor** receives handshake request, accepts, starts production, updates progress
- [ ] **QA** reviews sample photos, approves production
- [ ] **DHL** picks up, tracks, delivers
- [ ] **Customer** sees real-time order status with tracking
- [ ] **Vendor** gets paid automatically after 72h verification
- [ ] **Admin** sees all orders, vendors, and revenue in dashboard

### Nice-to-Have (Post-MVP)
- [ ] Marketing automation sequences trigger based on order events
- [ ] Vendor performance scorecards auto-generated quarterly
- [ ] Customer LTV predictions with upselling recommendations
- [ ] Multi-language support for vendor portal (Arabic/English)
- [ ] Mobile-responsive vendor dashboard
- [ ] Automated dispute resolution

---

## 6. File Map — New & Modified Files

### New Files (Frontend)

```
frontend/
  lib/api/
    client.ts                    — HTTP client with auth, retry, error handling
    products.ts                  — Product catalog API
    pricing.ts                   — Pricing engine API
    orders.ts                    — Order lifecycle API
    payments.ts                  — Payment intent API
    shipments.ts                 — Shipping API
    vendors.ts                   — Vendor API
    approvals.ts                 — Proof approval API
  app/account/
    layout.tsx                   — Account dashboard layout
    page.tsx                     — Account overview
    orders/page.tsx              — Order history list
    orders/[id]/page.tsx         — Order detail + timeline
    designs/page.tsx             — Saved designs
    billing/page.tsx             — Invoices & payment history
    settings/page.tsx            — Profile settings
  app/vendor/
    layout.tsx                   — Vendor portal layout
    login/page.tsx               — Vendor login
    dashboard/page.tsx           — Vendor KPIs
    orders/page.tsx              — Incoming orders
    orders/[id]/page.tsx         — Order detail + production
    samples/page.tsx             — Sample management
    settings/page.tsx            — Vendor profile
  app/admin/
    layout.tsx                   — Admin layout
    page.tsx                     — Live KPIs dashboard
    orders/page.tsx              — All orders management
    vendors/page.tsx             — Vendor management
    customers/page.tsx           — Customer list
    analytics/page.tsx           — Charts & reports
    finance/page.tsx             — P&L, settlements
    disputes/page.tsx            — Dispute resolution
  components/
    orders/
      OrderTimeline.tsx          — Status stepper component
      OrderSummary.tsx           — Order details card
      TrackingMap.tsx            — Shipment tracking view
    vendor/
      HandshakeActions.tsx       — Accept/Reject with timer
      ProductionProgress.tsx     — Progress slider + status
      SampleUploader.tsx         — Photo upload with preview
    admin/
      KPICard.tsx                — Metric card component
      DataTable.tsx              — Sortable/filterable table
      RevenueChart.tsx           — Chart wrapper (Recharts)
    checkout/
      AddressForm.tsx            — Shipping address with validation
      PaymentSelector.tsx        — Stripe/PayPal/COD selector
      OrderReview.tsx            — Final order summary
```

### Modified Files (Frontend)

```
frontend/
  app/(shop)/products/[id]/page.tsx    — Wire to real API + pricing
  app/(shop)/products/page.tsx         — Wire to real catalog API
  app/(shop)/cart/page.tsx             — Wire to real pricing + shipping
  app/(shop)/checkout/page.tsx         — Real payment flow
  lib/ecommerce/cart-store.ts          — Add vendor tracking per item
  lib/ecommerce/types.ts               — Update with backend contract types
  components/layout/navbar.tsx         — Add cart count from real API
  providers/auth-provider.tsx          — Add VENDOR role support
```

---

## 7. Estimated Effort

| Phase | Weeks | Frontend (days) | Backend (days) | Total (days) |
|-------|-------|----------------|----------------|--------------|
| 1 — API Integration | 3 | 12 | 3 | 15 |
| 2 — Customer Experience | 3 | 15 | 5 | 20 |
| 3 — Vendor Portal | 2 | 12 | 3 | 15 |
| 4 — Admin & Operations | 2 | 10 | 5 | 15 |
| 5 — Polish & Scale | 2 | 8 | 8 | 16 |
| **Total** | **12** | **57** | **24** | **81** |

**Team:** 2 frontend + 1 backend + 1 QA = 12 weeks

---

## 8. Quick Wins (Week 1-2)

These can be done immediately while planning the full implementation:

1. **`frontend/lib/api/client.ts`** — Build the base API client (auth, retry, error handling)
2. **`frontend/lib/api/pricing.ts`** + connect to product page — Get live pricing working
3. **Merge `frontend/lib/ecommerce/types.ts`** with `shared/types/index.ts` — Single source of truth

These 3 items unblock the entire frontend ↔ backend integration and provide immediate value.
