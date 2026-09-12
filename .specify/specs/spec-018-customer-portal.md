# SPEC-018: Customer Portal (Self-Service)

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Important  
> **Dependencies:** SPEC-003 (Orders), SPEC-002 (Design)

---

## 1. What

Dedicated self-service portal for B2B customers:

**Order Management:**
- Order history: all orders with filters (status, date, product)
- Reorder: one-click reorder from history
- Bulk order: CSV/Excel upload for enterprise
- Saved quotes: save, share, convert to order

**Design Library:**
- Saved designs: all designs with versions
- Edit or reorder existing designs
- Brand kit: save colors, fonts, logos as templates
- Template library: 20+ starters per product

**Billing:**
- Invoices: view, download PDF, filter by date/status
- Payment history: all transactions, download receipts
- Credit notes: view refund documents
- Spending reports: monthly/quarterly summaries

**Company Profile:**
- Update billing info, shipping addresses, tax ID
- Multiple shipping addresses
- Team management (enterprise): invite, roles, spending limits

**Support:**
- Create support tickets
- Track ticket status
- View knowledge base

---

## 2. Why

B2B customers need self-service to reduce support load and improve retention. A portal provides convenience, builds long-term relationships, and enables enterprise features.

**Business Impact:**
- Reduce support tickets: -50%
- Improve retention: +30% for portal users
- Increase reorder rate: +40% with one-click reorder
- Enable enterprise sales: team management, spending controls

---

## 3. Who

| Role | Features |
|------|----------|
| **B2B Customer** | Orders, designs, billing, profile |
| **Enterprise Admin** | Team management, spending limits, approvals |
| **Enterprise Member** | Create orders (within limits), view team orders |
| **Customer Support** | View customer activity for faster resolution |

---

## 4. Success Criteria

### Functional
- [ ] Order history: all orders, filters, one-click reorder
- [ ] Saved designs: library with versions, edit, reorder
- [ ] Brand kit: save colors, fonts, logos (enterprise)
- [ ] Invoices: view, download, filter, payment history
- [ ] Company profile: billing, shipping addresses, tax ID
- [ ] Team management: invite, assign roles (viewer, buyer, admin), spending limits
- [ ] Saved quotes: 30-day retention, share link, convert to order
- [ ] Support tickets: create, track, view history
- [ ] Spending reports: monthly summary, by product, by team member
- [ ] Approval workflow: orders over limit require admin approval (enterprise)

### Non-Functional
- [ ] Portal load <2s
- [ ] Order history: paginated, 20 per page, <500ms query
- [ ] Design thumbnails: <1s load

---

## 5. Out of Scope

- Custom pricing tiers per customer (Phase 1.5)
- API access for customer integrations
- White-label portal customization
- Customer-specific landing pages

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/customers/customers.controller.ts` | Customer API |
| `backend/src/modules/customers/customers.service.ts` | Customer logic |
| `backend/src/modules/teams/teams.controller.ts` | Team management API |
| `backend/src/modules/teams/teams.service.ts` | Team logic |
| `backend/prisma/schema.prisma` | CustomerProfile, Team, TeamMember tables |
| `frontend/app/(portal)/dashboard/page.tsx` | Portal dashboard |
| `frontend/app/(portal)/orders/page.tsx` | Order history |
| `frontend/app/(portal)/designs/page.tsx` | Design library |
| `frontend/app/(portal)/billing/page.tsx` | Billing page |
| `frontend/app/(portal)/team/page.tsx` | Team management |
| `frontend/components/portal/OrderHistoryTable.tsx` | Order table |
| `frontend/components/portal/DesignLibraryGrid.tsx` | Design grid |
| `frontend/components/portal/BrandKitManager.tsx` | Brand kit UI |
| `frontend/components/portal/TeamMemberList.tsx` | Team list |
| `frontend/components/portal/SpendingChart.tsx` | Spending visualization |
