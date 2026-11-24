# Consolidation HTTP candidate, revision 2

Local delta on frozen20b4d0c. Earlier16dc and20b4 baselines remain unchanged. No remote publication, merge, deploy, real assignments, hub setup or carrier actions.

## Scope and access preparation

The app registers five receipt/review endpoints under /api/consolidation/orders/:orderId. Every request checks CONSOLIDATION_RECEIPTS_ENABLED is exactly true, otherwise403. The example environment sets false. Authentication uses the existing bearer verifier; actor/role body fields never supply identity. Existing service checks require a present user, enabled hub and explicit current capability. ADMIN alone grants nothing.

This is proposed technical preparation, not a grant to actual people. There are no real assignments or capability-management endpoints. Snapshot read access is narrowed to the existing canReceive capability, rather than adding planner access to receiving history. A planner-only actor can submit an explicit manifest but cannot read the receipt snapshot, receive, confirm or inspect eligibility. Whether a future planner role should see receipt history remains deferred, not inferred from the user's team-receiving policy.

Routes:
- GET base?hubId=...: receiver-only source/manifest/receipt snapshot. Other-hub manifest denied. Stale source is reported current:false, never silently rewritten. Items expose only ID, quantity and product type; POs expose only ID, status and product type. No customer, contact, shipping or financial data. History defaults50, max100; after/limit keyset parameters and receiptPage provide explicit continuation.
- POST /manifest: planning capability, explicit allocations and expectedRevision.
- POST /receipts: receiver capability, stable event key, allocation, expected revisions, bounded integer counts and required correction/review reason.
- POST /confirm: receiver capability, explicit matching manifest/receipt revision.
- GET /eligibility: receiver capability, observed eligibility only, not a reservation or dispatch operation.

HTTP DTOs, including mutation replies, omit actor IDs, creator IDs, free-text reasons, event keys, request hashes and source hashes. Actor/reason audit data remains recorded internally, but is not needed for the bounded count/revision task here. No history UI, audit-person lookup or free-text display is enabled. A later request for such exposure needs a defined task and audience review.

## Lock and refresh limits

Snapshot and eligibility reads reuse the service's source-coherence transactions, including exclusive order/hub/capability/item/PO locks and shared design locks. They serialize with writes and can contend across orders at the same hub or same capability. Pagination bounds result size, not the source-lock footprint. This is not qualified for background polling. No automatic polling, refresh timer or retry loop is added; any future UI should begin with explicit manual refresh and stale/error handling. A higher-volume read design needs separate lock/latency evidence and must not weaken current:false truthfulness.

## Evidence

23 real Fastify/PostgreSQL cases pass with the actual production httpErrorHandler, including400/401/403/404/409 mapping. Missing eligibility query, allocation field and confirmation strict-input cases are covered. Multirow receipt pages prove ascending order and no gaps; reversing the service order fails with actual [4,3] versus expected [1,2], then source is restored.

The suite also launches emitted dist/index.js twice on an ephemeral loopback port with Redis disabled: disabled mode proves all five paths are registered and return403/AUTHORIZATION_ERROR, not404; enabled mode exercises GET snapshot/eligibility, manifest conflict, actual receipt write, stale confirmation, unauthenticated401, malformed400 and missing manifest404 through the real app. Child processes stop after checks. The app reports workers disabled. Build before running this suite so emitted code matches the candidate. The test database must be empty, local, test-mode and correctly named; fixtures are synthetic. No external services are called intentionally.

39 existing service DB cases pass on a separate fresh migrated database.38reference-model cases pass. Backend typecheck and emitted build pass. Earlier flag/verified-actor/strict-body mutation assertions remain supporting evidence; new ordering mutation is included. No visual UI, hosted CI, external network/proxy, production login lifecycle, full baseline suite or live operation is claimed.

## Remaining boundary

No operator UI yet, no live grants/hub/contact configuration. No partial/excess disposition or allocation automation is inferred. Eligibility remains an observation and must be rechecked atomically by any future dispatch consumer. Existing shipping/status/payment code is not connected or changed here. Independent changed-candidate review precedes UI work.
