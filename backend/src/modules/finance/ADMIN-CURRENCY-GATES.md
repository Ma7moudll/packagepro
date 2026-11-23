# Admin currency gate and reporting limits

This patch corrects monetary presentation, not accounting policy or whole-admin readiness.

## Reporting contract

- Overview and customer values mean non-cancelled order value, not cash collected. Known currencies are separate. Null historical order currency is counted, never converted, assigned EGP, or added into an unknown subtotal. Unknown totals are unavailable.
- Overview and live admin analytics use database currency groups and count-only unknown queries. They do not retrieve or render every historical unknown order.
- Customer search/pagination still selects a page of customers and their order history. The existing customer-history query is not redesigned into a ledger. Page KPI combines only that displayed page's known-currency values and unknown counts.
- Finance includes completed orders whose completedAt falls inside the requested range. Recorded settlement amounts retain the existing all-status behavior, including pending/failed records. A currency's costs and margin are unavailable if any included order lacks settlements or has a settlement in another currency. No FX, convertedAmount fallback, payment-recognition rule or accounting net-profit/tax claim is introduced.
- Legacy scalar totals remain for compatibility and still mix currencies: public stats transactionVolume, overview totalRevenue/revenueToday, customer lifetimeValue, finance scalar revenue/costs/profit/taxes, analytics scalar revenue, order financial summary arithmetic and vendor payment summary arithmetic. The touched admin displays do not use these scalars as money. Untouched consumers remain outside this patch.
- First-PO-only operational workflow and financial-summary authorization are separate fixes. Full Arabic localization remains incomplete.

## Reproducible checks

Backend default `npm test -- --run` discovers both test files. The real PostgreSQL HTTP suite is SKIPPED unless `PACKAGEPRO_ADMIN_CURRENCY_ISOLATED_DB=yes` is explicitly set. Missing, malformed or nonlocal DATABASE_URL does not throw during ordinary discovery. This manual gate is not enabled by hosted CI; the existing hosted backend uses a shared local `packagepro_test` database and parallel default tests, so it must not run the isolated aggregate assertions there.

For the real HTTP gate, create and migrate a new dedicated local database named `packagepro_e2e_admin_currency_<unique-alphanumeric-suffix>`, set DATABASE_URL to that database and set the opt-in above. Run only `npx vitest run --config vitest.admin-currency-http.config.ts`. This config selects only the HTTP gate and omits the global Redis setup. The database must contain no orders or customers at startup; the test refuses otherwise, without broad cleanup. Never use this database URL for another process concurrently. Prefer a new unique name per invocation, then drop that dedicated database after testing. The gate creates tagged synthetic fixtures and deletes only their exact IDs. Default/shared-DB/parallel execution does not opt in.

`npx vitest run --config vitest.admin-currency.config.ts` runs seven mocked service/controller and pure grouping tests without PostgreSQL/Redis.

Frontend `npx playwright test --config playwright.admin-currency.config.ts` checks rendered EN/AR landing, orders, customers and finance using synthetic API fixtures, including finance at 390px. `ADMIN_DASHBOARD_ONLY=1` selects the nested dashboard/finance tab. These frontend checks are manual-local, not included in the existing hosted compatibility config. The isolated dashboard-language runs avoid an observed dev-server reload/pointer-interception flake; no forced clicks hide that behavior.

Owner-run results: seven unit contracts and four real PostgreSQL HTTP contracts pass; frontend 361 unit tests pass; backend/frontend typechecks pass. EN/AR output inspected. Removing the unavailable-cost renderer makes its warning assertion fail. Independent auditor also found reconciliation-check removal fails two unit tests. These are bounded checks, not a build, hosted CI, real business-data or launch acceptance claim.
