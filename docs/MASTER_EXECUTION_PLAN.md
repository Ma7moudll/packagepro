# PackagePro — Master Execution Plan
**Version:** 0.1 — Repository Audit Based  
**Repository:** `Ma7moudll/packagepro`  
**Audited branch:** `main`  
**Audited commit:** `7e4334028529f3b537746b52d2d1b73b61b423a2`  
**Strategy:** End-buyer packaging marketplace in Egypt  
**Execution rule:** Plan first, code after. One independently verifiable piece at a time.

---

# 1. Product Objective

PackagePro is a two-sided custom-packaging marketplace connecting buyers with packaging factories.

The launch experience must support:

- Public customer registration.
- Public product catalog and product configuration.
- Custom design creation and saving.
- Server-authoritative pricing.
- Mixed-vendor shopping cart.
- One buyer order with multiple factory purchase orders.
- Payment confirmation.
- Proof approval.
- Factory production and QA.
- Multiple shipments and tracking numbers.
- Refunds and vendor settlements.
- Customer and factory communication.

The platform must be commercially operable, not merely technically functional.

## Launch policy

1. Customer registration is public.
2. Vendor registration may be public, but vendors remain pending until platform verification.
3. Only verified vendors and operationally validated products can receive paid orders.
4. The first release uses a controlled real-order pilot with cooperating factories.
5. General checkout is enabled progressively after successful pilot validation.

Do not confuse public registration with unrestricted order acceptance.

# 2. Repository Audit Snapshot

The audit was performed against the main branch at the commit listed above.

The repository contains:
- Fastify + Prisma + PostgreSQL backend.
- Next.js 15 + React 19 frontend.
- Shared TypeScript contracts.
- Design editor and canonical dieline/prepress modules.
- Customer, manufacturer, and admin interfaces.
- Backend integration and unit tests.
- Frontend unit tests and Playwright E2E tests.
- CI, Docker, and deployment workflows.
- A legacy `frontend/app/api/packagepro` API layer alongside the Fastify backend.

Important current findings:

| Area | Observed condition |
|---|---|
| Design editor | Mature implementation; M8 must remain protected |
| Catalog and pricing | Implemented, but money calculation requires correction |
| Authentication | Critical public-role and legacy-auth risks |
| Orders | Core functionality exists; lifecycle rules are insufficient |
| Multi-vendor | PO grouping exists; fulfilment and settlement are incomplete |
| Payments | Stripe-specific implementation; no complete local payment flow |
| Shipping | DHL-specific and order-level implementation |
| Settlements | Simulation exists; actual payout is not integrated |
| Frontend | Multiple legacy and newer API paths coexist |
| CI | Current workflow can report success despite test failures |
| Deployment | Pipeline exists but is not operationally verified |

## Current CI evidence

Latest observed run:
- Backend: 126/139 tests passed; 7 failed. Missing database seed data caused failed suites/tests. The workflow swallowed the failure.
- Frontend: expected `npm test`, but no such script exists. The actual `test:units` script was not run.
- Frontend build: failed because `DATABASE_URL` was required during page-data collection.
- Docker frontend build: failed to resolve `@shared/types`.
- Security scan: SARIF upload failed due insufficient GitHub permissions.
- Dependency audit: reported 60 backend vulnerabilities and 59 frontend vulnerabilities, including critical and high severity findings.
- Deployment: Railway deployment failed because `RAILWAY_TOKEN` was missing or invalid.

References:
- CI: https://github.com/Ma7moudll/packagepro/actions/runs/43530126136
- Deployment: https://github.com/Ma7moudll/packagepro/actions/runs/43530126122

These results override any assumption that the latest main branch is currently CI-green.

# 3. Critical Findings — Stop-Ship

These issues must be resolved before accepting public paid orders.

## SEC-01 — Public administrator registration

Files:
- `backend/src/modules/auth/auth.controller.ts`
- `backend/src/modules/auth/auth.service.ts`

The public registration schema accepts `CUSTOMER`, `VENDOR`, and `ADMIN`, and the service creates the user using the supplied role.

Required:
- Public registration must never create ADMIN users.
- Public customer registration creates CUSTOMER only.
- Vendor applications must remain pending until approved by an administrator.
- Administrator creation must use a secure bootstrap/invitation process.
- Add integration tests proving public requests cannot create ADMIN users.

Priority: P0.

## SEC-02 — Email verification enforcement

File:
- `backend/src/modules/auth/auth.service.ts`

Login currently generates tokens after password verification without enforcing `emailVerified`.

Required:
- Prevent unverified accounts from obtaining normal authenticated sessions.
- Define resend-verification and expired-token behavior.
- Add tests for verified and unverified accounts.

Priority: P0.

## SEC-03 — Legacy mock authentication and webhook routes

Files:
- `frontend/lib/packagepro/middleware/auth.ts`
- `frontend/app/api/packagepro/**`

The legacy middleware generates mock users and does not actually verify supplied Bearer tokens.

The legacy Stripe webhook also contains a placeholder signature-verification implementation.

Required:
- Inventory every legacy API route and determine whether it is used.
- Disable or remove mock-authenticated production routes.
- Migrate required functionality to the Fastify API or secure Next.js proxy routes.
- No production webhook may trust unverified event JSON.
- Keep one authoritative payment webhook implementation.
- Add tests proving unauthenticated and invalid-token requests cannot access protected functionality.

Do not blindly delete legacy routes until frontend dependencies have been identified.

Priority: P0.

## SEC-04 — Authorization and ownership enforcement

Review and fix:
- `backend/src/modules/orders/order.routes.ts`
- `backend/src/modules/orders/order.service.ts`
- `backend/src/modules/orders/approval.controller.ts`
- `backend/src/modules/orders/approval.service.ts`
- `backend/src/modules/prepress/prepress.controller.ts`
- `backend/src/modules/shipments/shipment.controller.ts`
- `backend/src/modules/shipments/shipment.service.ts`

Specific issues:
- Approval request endpoint lacks an appropriate authenticated role gate.
- Prepress endpoints authenticate users but do not consistently verify order ownership.
- Shipment creation and tracking endpoints need ownership and role enforcement.
- Order status updates allow a user with order access to submit arbitrary enum states.

Required:
- Define role-specific permissions.
- Define order ownership checks.
- Define vendor ownership checks for individual POs.
- Restrict administrative actions.
- Restrict approval requests to authorized operations.
- Define allowed order-state transitions.
- Add negative authorization tests for every sensitive operation.

Priority: P0.

# 4. Phase 0 — Establish a Truthful Engineering Baseline

No feature development before this phase is complete.

## P0.1 — Repair CI test execution

File:
- `.github/workflows/ci.yml`

Required:
- Remove `|| echo` fallbacks from tests, builds, lint, and dependency audits.
- Run Prisma migrations.
- Run deterministic seed setup required by integration tests.
- Run `npm test` in backend without suppressing errors.
- Run `npm run test:units` in frontend.
- Add a separate Playwright E2E job with its required services and secrets.
- Make linting non-interactive.
- Preserve and publish test reports.

Acceptance:
- Backend test job fails when any test fails.
- Frontend unit test job actually runs the declared test suite.
- E2E job has an explicit pass/fail result.
- No test step can silently succeed after a failed command.

## P0.2 — Repair Docker builds

Files:
- `frontend/Dockerfile`
- `backend/Dockerfile`
- `frontend/tsconfig.json`

Required:
- Make `shared/` available inside the frontend Docker build.
- Preserve the `@shared/*` import contract.
- Verify standalone output includes all required shared files.
- Fix build-time environment dependencies.
- A frontend build must not require production database credentials merely to collect static page data.
- Keep secrets out of Docker build arguments and public environment variables.

Acceptance:
- Both Docker images build from a clean checkout.
- Container startup succeeds.
- Health checks respond correctly.

## P0.3 — Repair deployment workflow

File:
- `.github/workflows/deploy.yml`

Required:
- Configure Railway and Vercel credentials.
- Configure database, Redis, and runtime environment variables.
- Include `shared/**` in relevant deployment path filters.
- Correct the health-check URL: the current backend exposes `/health`, not `/api/health`.
- Run migrations in a controlled deployment stage.
- Verify production and staging webhook destinations.

Acceptance:
- Staging deployment succeeds.
- Backend health check passes.
- Frontend reaches the backend.
- Deployment logs and smoke-test results are available.

## P0.4 — Dependency security

Required:
- Produce separate backend and frontend audit reports.
- Review critical and high severity vulnerabilities.
- Upgrade in small compatible batches.
- Avoid blind `npm audit fix --force`.
- Review major upgrades separately, especially Fastify, Prisma, Zod, Stripe, and React ecosystem packages.
- Add required GitHub security-event permissions.
- Pin or review third-party GitHub Actions versions.

Acceptance:
- No unresolved critical vulnerability in production dependencies without a documented and approved mitigation.
- Security scan results are visible in GitHub.
- All dependency changes pass build and regression tests.

# 5. Phase 1 — Financial Correctness and Checkout

This phase must precede real paid orders.

## FIN-01 — Correct order totals

File:
- `backend/src/modules/orders/order.service.ts`

Current calculation includes line tax in `totalPrice`, aggregates that value into `subtotal`, then adds tax again to the order total.

Required financial contract:

`subtotal = sum(line subtotal before tax)`

`tax = sum(line tax)`

`shipping = sum(shipping per shipment group)`

`total = subtotal + tax + shipping - discounts`

Additional requirements:
- Use consistent decimal arithmetic and explicit rounding.
- Define whether `OrderItem.totalPrice` is tax-exclusive or tax-inclusive.
- Make invoice calculations use the same contract.
- Add unit tests for single-line and multi-line orders.
- Add tests for tax, discounts, and shipping aggregation.

Acceptance:
- The displayed cart, stored order, invoice, payment amount, and admin report all agree exactly.

## FIN-02 — Currency and Egyptian market configuration

Relevant files:
- `backend/src/modules/cart/cart.service.ts`
- `backend/src/modules/checkout/checkout.service.ts`
- `backend/prisma/seed.ts`
- `frontend/app/(shop)/products/[id]/page.tsx`
- `frontend/lib/orders/projections.ts`

Current implementation defaults to USD in multiple places and uses USD-oriented pricing assumptions.

Required:
- Decide EGP as the launch buyer currency.
- Define currency ownership at product, cart, order, payment, and settlement levels.
- Ensure prices are stored and displayed consistently.
- Remove hardcoded dollar symbols from buyer-facing UI.
- Define tax treatment with an accountant.
- Do not invent an exchange rate or silently fall back to one.

Acceptance:
- EGP is displayed consistently from product configuration through invoice.
- All financial calculations are deterministic.
- Mixed currencies are rejected unless an explicit conversion contract exists.

## FIN-03 — Repair Stripe PaymentElement initialization

Files:
- `frontend/components/ecommerce/StripePayment.tsx`
- `frontend/app/(shop)/checkout/page.tsx`
- `backend/src/modules/checkout/checkout.service.ts`

The current Elements provider is mounted without a client secret or an explicit Payment Element mode configuration, while the client secret is only created after the payment form is submitted.

Required:
- Redesign the initialization sequence.
- Create or retrieve the payment intent before mounting the PaymentElement.
- Use the backend-calculated amount only.
- Do not trust client-submitted amounts.
- Add explicit loading, retry, failure, and abandoned-payment states.

Acceptance:
- PaymentElement mounts with valid configuration.
- Successful payment is confirmed by the webhook.
- Failed payment does not falsely mark the order as paid.

## FIN-04 — Do not clear cart before payment succeeds

File:
- `backend/src/modules/checkout/checkout.service.ts`

Current checkout clears the server cart immediately after creating the PaymentIntent.

Required:
- Keep cart contents recoverable until payment success is confirmed.
- Introduce idempotent checkout behavior.
- Prevent duplicate orders from repeated checkout submissions.
- Define abandoned and expired payment behavior.
- Clear the cart only after a verified successful payment.

Acceptance:
- Failed or abandoned payment leaves the buyer able to retry.
- Repeated requests cannot create duplicate paid orders.

## FIN-05 — Payment provider architecture

Files:
- `backend/src/integrations/stripe/stripe.service.ts`
- `backend/src/modules/payments/payment.controller.ts`
- `backend/src/modules/payments/payment.routes.ts`
- `backend/prisma/schema.prisma`

Required:
- Introduce a provider-neutral PaymentProvider contract.
- Separate payment creation, verification, webhook normalization, and refunds.
- Persist provider, method, provider reference, and normalized payment events.
- Verify webhook signatures.
- Enforce webhook idempotency.
- Restrict payment confirmation to verified provider events.
- Enforce payment ownership on authenticated endpoints.
- Support partial refund accounting without falsely marking an order fully refunded.

Local provider selection must be based on Egyptian merchant eligibility, fees, settlement arrangements, and supported payment methods.

InstaPay/Vodafone Cash personal transfers may only be considered as a tightly controlled pilot workaround, not as the permanent platform payment architecture. If used temporarily:
- Require manual reconciliation against the actual account transaction.
- Record the verifier, amount, time, and reference.
- Never treat a screenshot alone as proof of payment.
- Do not release a factory PO before verified payment or an explicitly approved COD policy.

Acceptance:
- Payment replay does not create duplicate credit.
- Invalid signatures are rejected.
- Partial refunds update the financial ledger correctly.
- No unpaid order can enter production.

# 6. Phase 2 — Multi-vendor Order and Production Integrity

This is the most important domain-model phase.

## OPS-01 — Preserve design-to-order traceability for multiple designs

Files:
- `backend/prisma/schema.prisma`
- `backend/src/modules/orders/order.service.ts`
- `backend/src/modules/purchase-orders/po.service.ts`

Current order structure contains a singular `Order.design` relation, while OrderItem has individual design references. PO generation reads files from the singular order design and shares those files across purchase orders.

This is unsafe for a cart containing multiple independent designs.

Required:
- Treat OrderItem as the authoritative source of the design used by that line.
- Create an explicit PO-to-order-item association.
- Generate production files for the exact items assigned to each PO.
- Preserve immutable production snapshots.
- Do not let later edits to a saved design modify already approved order artwork.

Acceptance:
- A mixed cart with multiple designs produces correct, separate production files.
- Every PO contains only the files and specifications for its assigned items.
- Historical orders remain reproducible after design edits.

## OPS-02 — Make PO creation idempotent and safe

File:
- `backend/src/modules/purchase-orders/po.service.ts`

Current creation leaves the order in `ready_for_routing`, which is also the condition permitting another PO creation.

Required:
- Prevent duplicate PO creation.
- Define a unique grouping key for each order group.
- Use database transactions for internal writes.
- Use an outbox or retry-safe orchestration for email and file-upload side effects.
- Define recoverable failure states.
- Ensure repeated requests return existing PO results instead of creating duplicates.

Acceptance:
- Repeated create-PO requests never duplicate POs or handshakes.
- Failure during PDF upload or email does not leave an unmanageable partial workflow.

## OPS-03 — Vendor routing must use real vendor data

File:
- `backend/src/services/vendor-router/router.service.ts`

Current routing:
- Does not actually filter by material capability.
- Uses quality rating as a simplified cost score.
- Treats active vendors as always available for capacity.
- Does not have a trustworthy vendor cost model.

Required:
- Define vendor product capabilities.
- Define supported materials and processes.
- Define real MOQ compatibility.
- Define capacity and lead-time availability.
- Use real quotes or vendor cost records.
- Preserve a transparent routing explanation.
- Keep routing configurable rather than hardcoding arbitrary weights.

The current 60% vendorCost rule must not be treated as a real payout or factory cost.

Acceptance:
- A vendor cannot receive a product it cannot manufacture.
- Routing scores use actual available data.
- PO costs reflect approved vendor prices or quotes.

## OPS-04 — Handshake expiry and rejection recovery

File:
- `backend/src/modules/handshakes/handshake.service.ts`

Current code creates four-hour handshakes and can accept or reject them, but does not implement the complete reject/expiry re-routing policy.

Required:
- Add expiry processing.
- Add safe retry/rerouting for the affected group only.
- Prevent multiple active handshakes for the same PO.
- Preserve rejection reasons and event history.
- Notify the buyer and vendor of relevant state changes.

Acceptance:
- Rejected or expired handshakes trigger a deterministic next action.
- Other groups in a mixed order remain unaffected.

## OPS-05 — Derive order status from individual POs

Files:
- `backend/src/modules/orders/order.service.ts`
- `backend/src/modules/handshakes/handshake.service.ts`
- `backend/src/modules/production/production.service.ts`
- `backend/src/modules/production/qa.service.ts`

Current services update the parent Order status directly when an individual PO changes.

Required:
- Define one pure order-status projection based on all relevant POs.
- Define partial-production, partial-shipment, partial-delivery, and partial-cancellation behavior.
- Prevent one PO from marking the whole order ready to ship while other POs are incomplete.
- Persist PO-level events and expose a customer-safe order timeline.

Acceptance:
- All combinations of PO states have deterministic expected order status.
- Parent order status cannot regress or advance incorrectly because one PO changed.

# 7. Phase 3 — Shipping, Refunds, and Settlements

## OPS-06 — Move shipping to shipment-group scope

Files:
- `backend/prisma/schema.prisma`
- `backend/src/modules/shipments/shipment.service.ts`
- `backend/src/integrations/dhl/webhooks.ts`

Current Shipment has a unique orderId and the service creates one shipment for the whole order. Weight and dimensions are placeholders.

Required:
- Make shipments belong to individual POs or shipment groups.
- Support multiple tracking numbers per buyer order.
- Calculate shipment weight and dimensions from actual production items.
- Introduce a carrier abstraction.
- Keep DHL as an adapter if commercially appropriate.
- Add a local Egyptian carrier adapter after checking rates and API availability.
- Support manual tracking as an operational fallback.
- Normalize and authenticate carrier webhooks.
- Make tracking-event processing idempotent.

Acceptance:
- A two-factory order can have two independent shipments.
- Each webhook updates only its matching shipment.
- Customer sees the complete shipment list under one order.

## OPS-07 — Per-PO settlement and refund ledger

Files:
- `backend/prisma/schema.prisma`
- `backend/src/modules/settlements/settlement.service.ts`
- `backend/src/workers/settlement-queue/settlement.worker.ts`

Current Settlement is unique per Order and the settlement service selects the first PO/vendor. Processing currently simulates payment completion.

Required:
- Make settlement vendor/PO-specific.
- Support partial refunds and their effect on settlement balances.
- Replace simulated money movement with an explicit manual or provider-backed payout state.
- Never mark a settlement paid just because a timer completed.
- Store payout reference, verifier, and actual transfer confirmation.
- Remove arbitrary exchange-rate fallback.
- Generate real, reproducible settlement receipts.

Acceptance:
- Each factory receives a correct independent settlement record.
- No payout is marked completed without an actual confirmed transfer.
- Refunds reconcile against order and PO balances.

# 8. Phase 4 — Frontend Buyer and Factory Experience

## UI-01 — Buyer checkout and order experience

Files:
- `frontend/app/(shop)/checkout/page.tsx`
- `frontend/app/(customer)/orders/[id]/page.tsx`
- `frontend/components/orders/order-timeline.tsx`

Required:
- Complete Arabic and RTL support.
- EGP formatting.
- Payment state and failure recovery.
- Shipment cards for each PO.
- Per-shipment timeline, ETA, and tracking.
- Partial cancellation/refund visibility.
- Clear next-step messaging after order placement.

Acceptance:
- One mixed-vendor order is understandable without exposing confusing internal vendor workflow terminology.

## UI-02 — Manufacturer portal must operate on POs, not just Orders

Files:
- `frontend/app/(business)/manufacturer/orders/[id]/page.tsx`
- `frontend/app/(business)/manufacturer/orders/page.tsx`
- `frontend/lib/api/vendors.ts`

Current manufacturer detail lookup selects the first PO matching an orderId.

Required:
- Make PO the factory-facing work unit.
- Support multiple POs belonging to the same buyer order.
- Show assigned line items and correct production files.
- Support handshake, production progress, sample upload, QA, and shipping handoff per PO.
- Verify all client role names against the backend role contract.

Acceptance:
- A factory sees every PO assigned to it and cannot access another factory's PO.

## UI-03 — Remove or replace legacy mock functionality

Required:
- Inventory all 30 routes under `frontend/app/api/packagepro/`.
- Identify the active consumers.
- Replace mock services with Fastify API calls.
- Remove fake supplier workflows and placeholder financial records.
- Keep one canonical API contract.
- Do not leave public mock webhooks or mock authentication in production.

Acceptance:
- No buyer/factory financial or order action depends on mock data.
- No sensitive API route trusts a mock user.

# 9. Phase 5 — Real Factory Pilot

This phase validates commercial operations.

Start with one factory and one product type. Then test a mixed-vendor order.

Pilot checklist:

1. Verify factory identity and contact.
2. Record product capabilities and material/process limitations.
3. Agree MOQ, actual price, lead time, and revision policy.
4. Create a buyer design.
5. Save the design and run backend prepress.
6. Send exact production files to the factory.
7. Obtain confirmation that the factory can open and interpret the files.
8. Approve the proof.
9. Produce the sample or first run.
10. Complete dimensional, material, print, and finish QA.
11. Package and hand over to carrier.
12. Record tracking and delivery confirmation.
13. Reconcile payment, refund if necessary, and factory settlement.
14. Record customer feedback and factory feedback.

Acceptance:
- At least one real order completes from buyer checkout to delivery.
- Production files match the approved design.
- The buyer receives the correct product.
- All payment and factory balances reconcile.
- Support can handle a cancellation, rejection, or delivery problem.

Only then expand the pilot to multiple factories and more product categories.

# 10. Phase 6 — Legal, Finance, and General Availability

Before opening unrestricted checkout:

- Obtain accountant/legal advice on Egyptian invoicing and ETA requirements.
- Determine who issues the invoice: platform or factory.
- Define marketplace terms and vendor agreements.
- Define customer refund and cancellation policy.
- Define factory payment and settlement policy.
- Define privacy, retention, and support procedures.
- Configure production backups and test restoration.
- Configure monitoring, error tracking, and alerts.
- Confirm carrier and payment contracts.
- Run production smoke tests.
- Conduct security and authorization regression tests.

Do not claim ETA compliance until it has been verified by a qualified professional.

# 11. Execution Order

Do not execute every phase in parallel.

Recommended order:

| Order | Task | Priority |
|---|---|---|
| 1 | SEC-01 public ADMIN registration vulnerability | P0 |
| 2 | SEC-02 verified email enforcement | P0 |
| 3 | SEC-03 legacy mock authentication and webhook isolation | P0 |
| 4 | SEC-04 authorization and ownership enforcement | P0 |
| 5 | P0.1 truthful CI and deterministic tests | P0 |
| 6 | P0.2 Docker build repair | P0 |
| 7 | FIN-01 order total correction | P0 |
| 8 | FIN-03/04 checkout and cart recovery | P0 |
| 9 | OPS-01 multi-design production traceability | P0 |
| 10 | OPS-02 idempotent PO creation | P0 |
| 11 | OPS-03 real vendor routing and cost model | P1 |
| 12 | OPS-04 handshake retry and expiry | P1 |
| 13 | OPS-05 derived order status | P1 |
| 14 | OPS-06 multi-shipment support | P1 |
| 15 | OPS-07 per-PO settlement and refunds | P1 |
| 16 | FIN-02 EGP and localization | P1 |
| 17 | FIN-05 local payment provider or controlled pilot process | P1 |
| 18 | UI-01 buyer shipment experience | P1 |
| 19 | UI-02 manufacturer PO experience | P1 |
| 20 | UI-03 legacy API cleanup | P1 |
| 21 | P0.3 staging deployment | P1 |
| 22 | Real factory pilot | Launch gate |
| 23 | Legal, finance, monitoring, and general availability | Launch gate |

The exact implementation order may be revised after each task's repository-level dependency analysis.

# 12. Mandatory Agent Operating Rules

You are working in the existing PackagePro repository.

Follow these rules strictly:

1. Read `AGENTS.md`, current `PLAN.md`, and the exact relevant source files before editing.
2. Do not assume documentation accurately reflects current implementation.
3. Do not rewrite large modules without a demonstrated need.
4. Do not reopen the completed M8 geometry/editor milestone unless a reproducible regression is found.
5. Do not modify unrelated code.
6. Do not introduce new dependencies unless justified.
7. Do not use `npm audit fix --force` blindly.
8. Do not expose secrets or request them in source files.
9. Do not mark simulated payment, shipping, or settlement as real.
10. Do not change database schemas without a migration and migration tests.
11. Do not weaken existing tests to make a task pass.
12. Preserve existing API contracts unless the task explicitly requires a versioned change.
13. Do not start the next task until the current task passes its acceptance criteria.

## Required workflow for every task

**Step A — Plan**
- Read current implementation.
- Identify exact files and dependencies.
- Explain the smallest safe change.
- List migration and regression risks.
- Define acceptance criteria.

**Step B — Implement**
- Implement only the approved task.
- Keep changes small and reviewable.
- Add or update tests.

**Step C — Verify**
- Run the narrow test first.
- Run relevant backend/frontend tests.
- Run type checks and builds.
- Inspect the complete diff.
- Confirm no unrelated changes.

**Step D — Report**
Return:
- Files changed.
- Behavior changed.
- Tests executed and actual results.
- Known limitations.
- Migration requirements.
- Whether acceptance criteria passed.

Stop immediately if a baseline regression appears.

# 13. Definition of Done

A task is complete only when:
- The code behavior matches its acceptance criteria.
- Tests cover success, failure, and authorization cases.
- Type checks and builds pass.
- No unrelated regression is introduced.
- Database migration behavior is verified where relevant.
- Documentation reflects the actual implementation.

A feature is not launch-ready merely because its unit tests pass.

# 14. Launch Gates

PackagePro must pass all gates:

**Gate A — Secure Platform**
- Public registration cannot create privileged accounts.
- Email verification and real authorization work.
- No production mock authentication or unsigned webhook remains.

**Gate B — Financial Correctness**
- Cart, order, invoice, payment, refund, and settlement amounts reconcile.
- Currency and tax treatment are documented.

**Gate C — Production Integrity**
- Multiple designs map to correct PO production files.
- PO creation is idempotent.
- Factory routing uses real capability and cost data.
- PO status and QA are independent.

**Gate D — Fulfilment**
- Multiple shipments and tracking numbers work.
- Delivery events update the correct shipment.
- Factory settlement is independently reconcilable.

**Gate E — Operational Pilot**
- A real factory completes a real order.
- Buyer approval, production, QA, shipping, and support are validated.

**Gate F — Public Launch**
- Staging and production deployment pass.
- Backups, monitoring, security, legal, and support procedures are ready.

---

**Immediate next task: SEC-01 — Remove public administrator registration and add regression tests.**

Do not implement the remaining phases until the first task has been reviewed and accepted.