# Consolidation receipt and release, local preparation

Status: design/reference contract only. Not a shipping implementation or authorization to buy labels. Based on reviewed tree `16dc6ffbf3ee9da4558c4b4319d0ddafc8281174`, which remains frozen.

## Confirmed operating decisions

The owner's authenticated conversation on 24 November 2026 settles:
- Factory outputs gather at one place, then one outbound customer shipment. This answers the earlier consolidated-versus-separate shipment question.
- The owner and his team receive factory outputs and confirm completeness/readiness at that place.
- Outbound shipping becomes available only after they confirm all parts were received and reviewed. A missing or rejected part blocks departure. One factory finishing does not make the whole order ready.

This does not identify actual team accounts, grant every ADMIN or vendor receiving authority, provide a pickup address, choose a carrier, authorize fees, or approve partial dispatch exceptions.

## Current source gaps

- `backend/prisma/schema.prisma`, PurchaseOrder has order/vendor/productType but no explicit allocation to OrderItem quantities. OrderItem carries quantity. Counting POs, or assuming a PO productType uniquely identifies its parts, cannot prove completeness.
- `ProductionService.writeProgress` updates the parent to quality_check when one production completes. `QAService.completeQA` independently updates ready_to_ship. Neither is consolidation receipt evidence.
- `ShipmentService.createShipment` trusts ready_to_ship, takes the first PO vendor's pickup address, uses placeholder weight/dimensions and marks shipped after label creation. It has no team confirmation or physical handover record.
- Shipment.orderId is unique, compatible with one outbound shipment but not proof of consolidation implementation. Factory-to-hub movements must not be confused with that outbound record.
- The carrier registry still defaults to DHL; no provider/default activation is part of this preparation. Existing Egypt courier direction remains a separate integration requirement.

## Proposed data contract, not a migration

1. **Expected-parts manifest**: order ID, immutable revision, approved order/config identity, explicit entries linking order item, source PO and required quantity/unit. Every required item must be covered exactly by allocations. Unknown/unallocated/cancelled/replaced entries require reconciliation, not silent omission. The mapping must come from grounded allocation data or an authorized recorded planning step, never productType alone.
2. **Hub reference**: configured location ID and revision. No first-vendor or signup-location fallback. Address/contact are required before a real pickup, not to run this local contract.
3. **Receipt/review ledger**: manifest revision, entry ID, event ID, actor ID, timestamp, quantities received and accepted/rejected, notes/reason and any supporting evidence. Receipt does not itself mean accepted. Corrections append attributable events, not destructive edits. Rejected stock is not deleted to make a counter reach its target.
4. **Team confirmation**: actor with explicit receiver/release capability, hub ID, exact manifest revision and receipt-ledger revision, confirmation time. A role label or a client-supplied authorized boolean is not authentication. The executable model below accepts pre-resolved facts solely to test the policy; real authorization must be enforced server-side.
5. **Release projection**: reports blockers or eligible-for-outbound-preparation, never creates a carrier label, changes payment/settlement, or reports physical dispatch. Revision-bound confirmation becomes stale if parts, allocation, acceptance or hub identity changes.

The approved rule supplies the all-parts receipt/review condition. Revision binding, append-only audit, duplicate-event handling and stale-evidence refusal are proposed safety mechanics to implement that condition faithfully, not additional owner-approved business exceptions.

## State and action boundaries

- Awaiting manifest: expected parts cannot yet be established. No release confirmation.
- Awaiting receipt/review: at least one required part lacks accepted receipt, or a rejection remains unresolved. No outbound release.
- Awaiting team confirmation: all required parts have accepted receipt but no current team confirmation. Still blocked.
- Eligible for outbound preparation: confirmed team decision matches current manifest, receipt revision and hub. This is necessary, not sufficient for a paid carrier booking.
- Carrier preparation still requires actual hub pickup data, parcel weights/dimensions, carrier/account configuration, booking authority and existing payment/order safety gates. No label request in this draft.
- Label prepared is not physically dispatched. Handover and delivery are separate evidence events. Their eventual status mapping needs explicit implementation/review, not reuse of the current premature shipped write.

No bypass based on ADMIN role alone, progress100, QA complete, first PO, label URL, payment success, empty manifest or unassigned receiver. No automatic shortage substitution, partial shipment, rejection waiver or cancellation treatment is invented. These cases stay blocked for resolution within the confirmed full-order policy.

## Reference contract tests

Run `node --test docs/fulfillment/consolidation-contract.test.cjs` from the repository root. This is deliberately isolated documentation/reference code: no production import, HTTP route, database, environment feature flag or carrier call. It checks the necessary receipt/review/confirmation gate only. It checks internal manifest coverage against the supplied order-item snapshot, but cannot prove that snapshot is authoritative, PO ownership/allocation provenance, real authorization, database concurrency or shipping safety.

The model takes a separate authoritative order-item quantity/unit snapshot and requires exact manifest coverage of it, including split allocations. Real services must derive that snapshot from locked server data; this model cannot authenticate the input. Receipt snapshots must match entry, PO, item and unit identities. Extra received stock is flagged for reconciliation, not silently accepted, discarded or interpreted as a partial-dispatch exception. Its physical disposition remains undecided.

Cases cover manifest understatement/omission/over-allocation, wrong receipt identities/units, missing source PO, overreceipt reconciliation, valid split allocations, two factories where only one arrives; received-but-unreviewed stock; rejection; stale manifest or receipt revision; wrong hub; unassigned actor; no confirmation; empty/invalid manifest; duplicate identities; and a complete confirmed example. The pure result is not launch acceptance.

## Future implementation sequence

1. Establish explicit order-item/PO allocation and manifest revision semantics, preserving approval/config identity.
2. Add receipt/review and capability storage/API with actor checks and ledger idempotency. Do not assign actual accounts without grounded identities.
3. Lock order then manifest/receipts consistently; confirm against a freshly validated manifest/ledger snapshot. Dispatch reservation rechecks the same revisions under lock. Test receipt correction/reassignment versus confirmation and dispatch races.
4. Replace order-level readiness shortcuts with a reviewed aggregate projector. Keep production/QA state distinct from physical receipt/review at the hub.
5. Integrate outbound pickup from configured hub, measured parcels and the chosen carrier. Preserve ambiguous-label reconciliation, no blind retry and no false physical-dispatch state.
6. Qualify on disposable migrated data and actual UI pixels, then separately seek publication/deployment/live operational authority.

## Remaining configuration and acceptance gates

Real receiver account mappings and hub address/contact remain unset. They do not block this local design, but they block real operation. No new question about consolidation/operator/full-order receipt policy is needed. Live carrier choice/accounts, fees, physical measurements, merchant/payment release conditions, populated-data migration, real handover events and operational acceptance remain separate. No publication, main change, merge, deployment or live shipping was performed.


## Separate transactional service candidate

The local candidate now also contains an unregistered ConsolidationService, additive schema/migration and an opt-in disposable PostgreSQL suite. It creates no hub or capability records outside synthetic test fixtures. There is no HTTP route, caller integration, parent-status change, carrier call, dispatch reservation or UI. Passing a userId directly in service tests is not HTTP authentication acceptance.

The service reads authoritative OrderItem quantities/configuration and same-order confirmed POs, validates explicit piece allocations, records a source fingerprint, and serializes its own planning/receipt/confirmation operations under order then hub/capability locks. Receipt events retain cumulative reviewed snapshots, event-key identity and expected revisions. They are append-only through this service and ordinary SQL triggers, not immutable against privileged trigger-disabling writers. A later correction/replan invalidates current confirmation; prior audit rows remain. Overreceipt is recorded but refuses eligibility pending reconciliation, without a stock-disposition policy.

The superseding candidate passes 39 real disposable-database tests with all composed migrations, plus 38 isolated reference tests and backend TypeScript. The initial 15-test and intermediate 30-test candidates are superseded. This is service-level evidence only. The DB suite covers rollback on an injected database failure, same-event concurrency/idempotency, different-event stale-revision competition, exact allocation, capability denial including unassigned ADMIN, missing/unreviewed/rejected/excess receipts, revision invalidation and no order/shipment/payment mutation. No real accounts or hub were configured.

The migration is ordered after the existing 20261124100000 checkout migration. All nine operational foreign keys are represented in Prisma relations. Fresh-database schema comparison shows only the inherited order_approval_tokens foreign-key onUpdate drift, not new consolidation FK drift. Raw CHECK constraints, validation/counter triggers and append-only ledger triggers remain SQL-owned and must be preserved outside Prisma's relation view.

DB triggers reject ordinary ledger UPDATE/DELETE, invalid count/identity inserts and mismatched receipt counters. Privileged owners can still disable triggers or truncate tables; no protection against malicious database administrators is claimed. Tests truncate only their validated disposable fixture. Receipt counters are checked at commit, so event and counter cannot commit separately. Counts are nonnegative integer piece counts capped at PostgreSQL Int range.

Barrier tests pause confirmation after acquiring its context, observe a genuinely lock-blocked independent database query, then release it. They cover receipt correction, manifest replanning, hub disablement, capability revocation, referenced design editing and nonparticipating item/PO updates. A separate reverse-order barrier holds a capability revocation uncommitted before receipt, proves the receipt query waits, then verifies denial after revocation commits. The latter write their own rows without taking the parent-order protocol; those source rows are explicitly locked by the service. A correction or replan after confirmation invalidates eligibility. A later item/PO change makes the next inspection refuse the stale source. Referenced Design rows are share-locked and their designData/lifecycle metadata included in the source fingerprint; a content-change test refuses stale eligibility and the design-edit barrier binds the share lock. External file bytes referenced by a URL, design files outside those rows, and arbitrary unmodeled state remain outside the fingerprint. This is not approval or physical artwork validation.

Mutation controls: removing the order lock fails the actual-blocked-order barrier; removing each item/PO source-row lock fails its corresponding nonparticipating-writer barrier; removing the explicit team-confirmation requirement makes its dedicated complete-receipt-without-confirmation test fail. Removing hub/capability/design locks also fails each matching barrier. Disabling validate-receipt in a scratch database makes the direct foreign-entry/missing/string/fractional-count cases incorrectly commit; disabling only the receipt-side deferred counter trigger makes the otherwise-valid orphan event incorrectly commit. Both mutations fail their dedicated tests independently of the other triggers. These are specific bindings, not proof of every lock or every possible lifecycle writer.

Known boundaries before operational use: no server auth routes/capability management; no approval/production-release/dispatch integration; no allocation provenance beyond the explicit planner mapping and source snapshot; no physical hub/address/parcel configuration; no carrier or paid booking. Eligibility is an observation, not a reservation, so a real dispatcher must atomically recheck the same source/capability/hub and receipt revisions before consuming a release. No global immunity to concurrent unmodeled writers, resource deadlocks or privileged SQL is claimed. Actual actor identities, hub data and overreceipt disposition remain unset. No whole lifecycle, UI, live shipping or populated-data migration acceptance.


Standard-check boundary for this slice: candidate Prisma validation, client generation and backend TypeScript passed. Current 39-case PostgreSQL suite and 38-case reference model passed with no skips after source/SQL mutation controls. There was no new frontend code, UI acceptance, HTTP authentication, hosted workflow, production build, normal full backend suite or paid carrier check for this slice. Earlier reviewed-stack builds/tests remain attributed to their earlier exact revisions. No unrelated settled baseline tests were rerun. Fresh migration relation comparison retained only the previously known order_approval_tokens FK onUpdate drift; SQL triggers/checks were exercised separately, not inferred from Prisma diff.
