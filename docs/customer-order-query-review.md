# Customer order query contract, local candidate

Base PR68 head7394918b784ce8b54ce61605cc78ec5e020f5cd1, independent of drafts69/70/71/72. No migration, money calculation, provider, account, workflow or policy change. No frontend runtime/UI change or browser acceptance. Admin directory query defects remain separate; no reporting code overlap.

## Actual flow and defect

Customer order history and billing fetch /orders in100-row pages until pagination total is consumed. ordersApi.list also advertises an optional status parameter. Existing controller parseInt accepted partial/negative/fractional numbers, fed NaN to Prisma and gave500 on malformed values. It ignored status; rows with equal createdAt lacked an explicit tie-break. Source TS CommonJS Prisma require also fails in the isolated Vite harness, unlike native compiled runtime; changed to ordinary import for consistent loading, not claimed as a compiled-production defect.

## Bounded API behavior change

- Missing page/limit remain1/20; explicit values must be positive decimal integer strings. Limit is1..100, compatible with current history/billing callers. No silent truncation, rounding or clamping. Previously unbounded/invalid values now400 ValidationError through the real public error handler, not ORM500.
- Safe integer arithmetic and maximum2147483647 database offset checked before ORM access. Over-budget pages refuse400. This is an implementation query budget, not a business policy.
- Optional status must match current OrderStatus enum. Absent means all; empty/unknown/repeated values refuse400. Both customer-owned row query and count use the same filter. Status behavior was advertised but previously ignored; now implemented.
- Order by createdAt descending then unique id descending gives deterministic pages for tied timestamps on a static dataset. This is offset pagination, NOT snapshot/cursor consistency during concurrent inserts/status changes. Existing full-history loops may still shift during concurrent changes; not solved here.
- Service validates numeric inputs too, so direct callers cannot bypass budget/status checks. Customer ownership predicates remain in both queries. No mutation or money field projection changed.

## Local evidence

22 Fastify/auth/PostgreSQL cases pass; backend TypeScript clean. Uses the real application error handler, not a custom Zod mapper. Covers defaults, owner-only data, status row/count parity, deterministic tied timestamps, empty/boundary pages, invalid/repeated/NaN/fractional/negative/exponent/overflow inputs, direct service status and numeric validation, unauthenticated401 and before/after complete order rows unchanged. Synthetic fixture counts/amounts are not commercial metrics.

Original service/controller with only import portability corrected fails18/20 earlier cases. Removing status predicate fails2; removing id tie-break fails1; restored20 passed, then two direct/read-only assertions added for22. Full unmodified source first failed17/18 largely from harness require loading, so it is not used as query-defect proof. No broader backend/front-end/hosted claim.

Run only with PACKAGEPRO_CUSTOMER_ORDERS_ISOLATED_DB=yes, a fresh empty local database packagepro_e2e_customerorders_<alnum>, migrations and synthetic JWT_SECRET/JWT_REFRESH_SECRET/NODE_ENV=test/EMAIL_PROVIDER=test, then `npx vitest run --config vitest.customer-orders.config.ts`. Harness rejects wrong/nonlocal/nonempty user/order state and scopes cleanup to created users/customer orders after validation. Normal discovery skips without opt-in. Local candidate only, no commit/publication approval.

Production all-PO aggregation remains unresolved as documented by PR72 and OPS05; this read-query change does not alter it. Admin queries still require separate validation. No gateway, courier, payment timing or additional-order decision selected.
