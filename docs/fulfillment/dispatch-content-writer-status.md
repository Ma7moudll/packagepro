# Local content and alternate-writer checkpoint

Private local prototype. No publication, deployment, payment setup, carrier activation or live carrier operation.

## Examined writers

- Handshake acceptance: order-first lock, fresh pending/expiry check, dispatch fence before handshake/PO/order mutation. This prevents late acceptance from changing a reserved or started packet silently. Rejection changes only handshake metadata and remains outside the packet fence.
- PO confirmation: order-first lock and fresh PO read, existing auth/status check, then fence. Tests use a pending additional PO with the reviewed allocations on a confirmed PO. A pending allocated PO cannot be reviewed, so tests do not bypass that eligibility rule.
- PO creation: defense-in-depth fence after approved-content and no-existing-PO checks. A genuine reviewed reservation already has POs, so this path is normally ineligible. PO PDF URL fill remains unfenced because it is not a packet/source-hash field. Print/dieline/spec URLs are set on creation; no separate edit writer was found.
- Design save, session rotation/creation, file metadata attachment and all five lifecycle transitions: transaction-owned locks for every direct and item-linked order, sorted, then design lock and binding recheck. Existing auth/save eligibility applies; refusal rolls back content and dispatch changes. Lifecycle writes recheck observed updatedAt/status. File bytes are uploaded before the DB boundary, so a refused upload can leave an unused stored object. Tests mock storage, never a live upload.
- Approval request reservation, generated-proof finalization and token acceptance: defense-in-depth fence inside existing order-first transactions after eligibility. These have no new independent dispatch-specific end-to-end test; existing approval contract regressions pass. Reopen fence remains defense in depth.
- No existing-order item/address/content edit service was found in source inventory. Order creation creates items and attaches only an unbound design to the new order. This is an inventory result, not protection for future/directDB writers.

## Evidence and limits

94 disposable PostgreSQL prototype cases pass, including four-state handshake/PO/content/session coverage, lifecycle refusal, item-only design upload, unauthorized non-invalidation, and design-save versus claim. 25 writer +22 aggregate +39 receiving +37 production regressions pass. Four additional design ownership/row-lock/save-gate/approval-contract files pass 30 cases. One legacy deletion test was replaced because it mocked a nontransactional write that no longer exists: its replacement pauses the actual transaction and verifies concurrent deletion waits. Missing-order 403 translation is retained. Backend type check and build pass.

Four guard-removal mutants (handshake, PO confirm, design save, lifecycle) fail their intended assertions. Individual locks and freshness rechecks are not all independently proven. No broad race/deadlock/atomicity claim is made. Every generic transition after attempt start, including cancellation, still conflicts with no operator resolution path.

## Open boundaries

Registered DHL delivery webhook and Stripe capture remain outside this slice. Their legacy guarded parent updates, payment/settlement semantics and existing-shipment handling were not changed. New shipment creation remains unconditionally paused. Prototype reservation refuses existing shipments, but that is not an end-to-end proof against stale/directDB combinations or new future writers. No Egyptian provider integration has been activated or replaced by these legacy paths.

Hub enablement/global capability/directDB/operator changes, authenticated recovery/outbox/reconciliation, provider lookup/cancel/quote and expiry scheduling remain open. Persisted payment rule remains unconfigured; dispatch authorization remains false. Reserved invalidation still requires explicit re-review/new flow; no automatic retry or new provider create.

Registered receiving/order/production/approval/design/PO/handshake services depend on prototype schema. Full candidate is not runtime-isolated. Any eventual deployment needs migrations and separate authorization. Nothing deployed.
