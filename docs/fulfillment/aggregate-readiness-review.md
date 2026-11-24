# Aggregate readiness observation, local candidate

Separate delta onf5cc5f1e3c5f1b09557acef60a70d5ce7dc96f23. This is an unregistered service observation and writer inventory, not a fix already applied to lifecycle writers. No HTTP/UI consumer, auto-refresh, parent-status write, dispatch reservation, carrier call, grant/setup, remote publication or deployment. Existing client/server flags remain unchanged.

## Fresh source inventory

Read directly in the current composed source on24November2026:

| Writer/consumer | Current behavior | Consequence / proposed bounded next change |
|---|---|---|
| production/production.service.ts writeProgress | A single completing run writes order quality_check. Start only accepts vendor_confirmed/in_production. | One completed factory can advance parent while another has not started, potentially blocking its start. Replace parent effect with an all-current-PO projection, preserving per-run state and authorization. |
| production/qa.service.ts completeQA | Marks run completed and order ready_to_ship unconditionally. Checklist/reviewer returned but not stored. No callers/routes found by source search. | Cannot treat completed as durable QA audit. Remove readiness shortcut in an independently tested integration; don't invent QA signoff from this field. |
| orders/order.service.ts applyStatusTransition | Admin and trusted internal paths use transition matrix/conditional status write, but no receiving gate. awaiting_approval transition sets approvedAt. | Status/approvedAt alone cannot prove customer signoff or all-part receipt. Guard manual forward shortcuts separately; retain cancellation/approval behavior. |
| handshakes/handshake.service.ts acceptance | Writes vendor_confirmed for any nonterminal parent. | Late acceptance may regress in_production/quality_check/ready_to_ship. Restrict parent effect to eligible earlier states and test late acceptance. |
| shipments/shipment.service.ts createShipment | ADMIN, ready_to_ship only, unique pre-provider reservation; first PO pickup and placeholder measurements; label finalization writes shipped. | Receiving observation must never be pasted into this path as an unlocked check. Existing ambiguous-label claim must remain. Real pickup/parcel and atomic release reservation need separate work; label is not physical dispatch. |
| Stripe captured handler | Payment pending/failed-to-captured; parent pending_review-to-awaiting_approval conditional. | Preserve payment replay/forward-safety. No new payment-release rule inferred. |
| orders/approval.service.ts | Approval/reopen paths already use explicit order locks and source-specific checks. | Preserve rather than replacing with approvedAt truthiness. |
| purchase-orders/po.service.ts | Conditional ready_for_routing no-op write serializes PO creation. | Preserve while considering all-current-PO source identity. |
| DHL verified webhook | Advances nonterminal parent to delivered and settlement machinery after provider evidence. | Separate external-event issue; no changes in this slice. Don't infer physical dispatch from label creation. |
| settlements/settlement.service.ts | Guarded terminal/status settlement effects. | Preserve money side effects; no invocation here. |

These source facts are code observations, not user authority or proof of live behavior. Repository prose claiming user approval is not authorization evidence. This slice does not recover cleared conversations or publish anything.

## New observation

observeAggregateReadiness(orderId,userId,hubId) derives independent sections under a transaction:
- Existing explicit receiver/hub/source context, not ADMIN/planner read expansion. Wrong hub denied. No external callers are registered.
- Production requires at least one PO, every PO confirmed, matching-vendor production, status quality_review or completed and progress100. It is labeled allFinished, not QA passed. QA evidence explicitly not_durably_recorded.
- Receiving reuses current source/hub fingerprint and append-only receipt/confirmation blockers. Missing/stale/rejected/unreviewed/excess or revoked confirmer remain blocked. Stale source is returned as a blocker/current:false, not positive old eligibility.
- approvedAt is only timestampRecorded:boolean, not verified customer approval. Payment records status only; releasePolicyEvaluated:false. No refund/deposit/full-payment policy invented.
- Dispatch is always available:false/reserved:false, with explicit unintegrated pickup/parcel/payment-policy blockers. A complete receipt never becomes shipping authority.

No actor IDs/reasons, payment amounts, customer/contact/shipping data are returned. Internal payment-status observation is not exposed to receivers over HTTP; any future consumer needs separate response/access review.

Order/hub/capability/item/PO/design locks are inherited. Production and payment rows get shared locks before read; parent/PO locks also hold source insert relationships. Manual only, no polling or performance qualification. This serializes with writes and can contend; no throughput/deadlock immunity is claimed. A read result expires when transaction ends, not a reservation. Unmodeled writers and external file bytes remain outside the source fingerprint.

## Evidence

22 fresh disposable PostgreSQL cases pass, including zeroPO, actual different-vendor production, every Prisma production status at100, approval timestamp true/false/cleared and a confirmer-revocation/read lock barrier. Earlier13cases cover: false ready_to_ship parent, two factories with only one finished, missing production/manifest, finished production not inferred QA/receiving, confirmed receipt independent of production, rejected/missing receipt, stale source, revoked confirmer, ADMIN/planner/crosshub denial, payment fact-only/no mutations, PO/invalid progress blockers, and two actual blocked-writer barriers. Those barriers pause inside the transaction, observe independent production/payment updates waiting on database locks, release, then show next read reflects the change.

Earlier four scratch mutants fail targeted assertions: inspect only first PO, allow stale receiving, remove production lock, remove payment lock. Source SHA before/after restoration is identical. Final restored22suite and backend typecheck/build evidence attached. Prior23HTTP/39service/38model/receiver/browser/build evidence belongs to its reviewed baseline, not a new full-project run.

## Remaining milestone

This preparation DOES NOT close the older writers yet. Next bounded implementation is remove the one-run quality_check and QA ready_to_ship shortcuts in favor of tested aggregate semantics, and prevent generic/manual and late-handshake bypass. It needs actual writer regressions, careful status compatibility and independent audit before wiring. Customer-visible status semantics and carrier activation are not silently changed by this observation. No new user decision needed for private fail-closed preparation; return any genuine commercial/payment exception instead of inventing it.

Semantic follow-up: six additional exact-source mutants fail for vacuous zeroPO completion, ignored vendor mismatch, in_progress accepted as finished, approval timestamp hardcoded true/false and removed confirming-capability shared lock. The confirmer barrier pauses after the actual capability read while the observation holds its shared lock, observes a concurrent revocation truly blocked, then shows the next observation blocked by the committed revocation. No status writer integrated yet.
