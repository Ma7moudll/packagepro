# SPEC-016: Admin Dashboard & Analytics

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Important  
> **Dependencies:** SPEC-003 (Orders), SPEC-011 (Settlement)

---

## 1. What

Comprehensive admin dashboard with real-time analytics:

**Dashboard Widgets:**
- Order overview: total, by status, by period, by product type
- Revenue analytics: total, by period, by product, by customer tier
- Vendor performance: on-time delivery %, quality score, revenue
- Customer insights: new vs returning, AOV, LTV, churn rate
- Production status: active orders, delayed, completion rate
- Financial summary: P&L, cash flow, outstanding receivables

**Reports:**
- Pre-built: Daily, Weekly, Monthly, Quarterly, Annual
- Custom date ranges
- Export: PDF, CSV, Excel
- Scheduled: auto-email reports to stakeholders

**Real-Time:**
- Dashboard refreshes every 5 minutes
- Live order feed (recent orders, status changes)
- Alert notifications (urgent orders, delays, exceptions)

---

## 2. Why

Admins currently rely on multiple spreadsheets and manual reports. A unified dashboard provides actionable insights, identifies bottlenecks, and supports data-driven decisions.

**Business Impact:**
- Reduce reporting time: hours → minutes
- Faster decision making: real-time data
- Identify bottlenecks: proactive intervention
- Improve forecasting: historical trend analysis

---

## 3. Who

| Role | Access |
|------|--------|
| **Super Admin** | All widgets, system health, user management |
| **Admin** | Order, vendor, customer, production dashboards |
| **Finance** | Revenue, settlement, tax reports |
| **Operations** | Production, shipping, delay alerts |

---

## 4. Success Criteria

### Functional
- [ ] Order overview: counts, values, by status, by period, by product
- [ ] Revenue analytics: trend graphs, by product, by customer tier
- [ ] Vendor performance: on-time %, quality score, revenue generated
- [ ] Customer insights: new vs returning, AOV, LTV, churn
- [ ] Production status: active, delayed, completion rate, bottleneck ID
- [ ] Financial reports: P&L, cash flow, receivables, platform fees
- [ ] Real-time updates: 5-minute refresh, live order feed
- [ ] Export: PDF, CSV, Excel for all reports
- [ ] Date filtering: custom ranges, presets (today, week, month, quarter, year)
- [ ] Scheduled reports: auto-email daily/weekly/monthly
- [ ] Drill-down: click any metric to see detailed list

### Non-Functional
- [ ] Dashboard load <2s
- [ ] Report generation <5s for 1-year data
- [ ] Export: <10s for 10k rows
- [ ] Data accuracy: 100% match with database

---

## 5. Out of Scope

- Predictive analytics / AI forecasting (Phase 2)
- Custom report builder (drag-and-drop)
- BI tool integration (Tableau, PowerBI)
- Mobile app for dashboard

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/analytics/analytics.controller.ts` | Analytics API |
| `backend/src/modules/analytics/analytics.service.ts` | Report generation |
| `backend/src/modules/analytics/dto/report-query.dto.ts` | Report query validation |
| `backend/src/modules/analytics/reports/order-report.service.ts` | Order reports |
| `backend/src/modules/analytics/reports/revenue-report.service.ts` | Revenue reports |
| `backend/src/modules/analytics/reports/vendor-report.service.ts` | Vendor reports |
| `backend/prisma/schema.prisma` | Analytics views, ReportSchedule tables |
| `frontend/app/(admin)/dashboard/page.tsx` | Main dashboard |
| `frontend/app/(admin)/analytics/page.tsx` | Analytics hub |
| `frontend/components/dashboard/OrderOverviewWidget.tsx` | Order widget |
| `frontend/components/dashboard/RevenueChart.tsx` | Revenue chart |
| `frontend/components/dashboard/VendorPerformanceTable.tsx` | Vendor table |
| `frontend/components/dashboard/ReportExporter.tsx` | Export component |
| `frontend/components/dashboard/DateRangePicker.tsx` | Date filter |
