# SPEC-011: Settlement & Financial Closure

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** SPEC-004 (Payments), SPEC-010 (Shipping)

---

## 1. What

Post-delivery financial workflow:

**Settlement Process:**
- 72-hour verification period after delivery
- Platform fee deduction (15%, configurable per vendor contract)
- Vendor payout via bank transfer (ACH/Wire) or Stripe Connect
- Dispute window: 7 days after delivery

**Financial Reports:**
- Revenue by period, product, customer tier
- Vendor payments: pending, processed, disputed
- Platform fees and margins
- Outstanding receivables
- Tax reports (VAT/sales tax)

**Invoicing:**
- Customer invoice: auto-generated upon payment
- Vendor payout invoice: auto-generated upon settlement
- Credit notes for refunds
- Invoice history and download

---

## 2. Why

Manual settlement takes 7-14 days and causes vendor cash flow issues. Automation reduces settlement time to 72 hours, improves vendor satisfaction, and provides transparent financial tracking.

**Business Impact:**
- Reduce settlement time: 7-14 days → 72 hours
- Improve vendor satisfaction: +40%
- Reduce accounting workload: -70%
- Eliminate payment disputes: transparent breakdown

---

## 3. Who

| Role | Need |
|------|------|
| **Finance Team** | Process settlements, generate reports, handle disputes |
| **Vendor** | View pending/settled payments, download invoices |
| **Admin** | Monitor settlement status, approve exceptions |

---

## 4. Success Criteria

### Functional
- [ ] 72h verification period after delivery before payout
- [ ] Platform fee: 15% default, configurable per vendor contract
- [ ] Payout methods: bank transfer (ACH/Wire), Stripe Connect
- [ ] Dispute window: 7 days, vendor can dispute with reason
- [ ] Financial reports: P&L, cash flow, receivables, fees by period
- [ ] Invoice generation: auto for customer and vendor
- [ ] Tax handling: calculate and report VAT/sales tax
- [ ] Settlement history: all transactions with audit trail
- [ ] Batch settlements: process multiple vendor payouts together

### Non-Functional
- [ ] Settlement calculation <1s
- [ ] Payout processing: within 24h of verification period end
- [ ] Financial data: encrypted at rest, access logged

---

## 5. Out of Scope

- Multi-currency settlements (USD base only)
- Vendor financing/advance payments
- Automated tax filing integration
- Cryptocurrency payouts

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/settlements/settlements.controller.ts` | Settlement API endpoints |
| `backend/src/modules/settlements/settlements.service.ts` | Settlement logic |
| `backend/src/modules/settlements/dto/process-settlement.dto.ts` | Settlement validation |
| `backend/src/modules/finance/finance.controller.ts` | Finance reports API |
| `backend/src/modules/finance/finance.service.ts` | Report generation |
| `backend/prisma/schema.prisma` | Settlement, VendorPayment, FinancialReport tables |
| `frontend/app/(finance)/settlements/page.tsx` | Settlement management |
| `frontend/app/(finance)/reports/page.tsx` | Financial reports |
| `frontend/components/finance/SettlementTable.tsx` | Settlement list |
| `frontend/components/finance/ReportChart.tsx` | Chart components |
| `frontend/components/finance/InvoiceViewer.tsx` | Invoice PDF viewer |
