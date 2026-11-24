# Whole-order shipping release, local design proposal

Design baseline: containment tree 1a41f55eb695e13299abb142edc06115013ea526. No implementation, schema migration, endpoint, activation, publication or carrier request is introduced by this document. The unconditional new-shipment containment stays in place.

## Outcome and settled rule

Mahmoud or his authorized team receives every factory's parts at one hub, reviews the whole order, and explicitly confirms it. That current confirmation is the final whole-order receipt/review gate. Do not add an invented second QA signature, factory-specific shipping shortcut, automatic notification, commercial exception or payment/settlement rule.

A usable workflow must take that confirmed whole order through measured packing, a reviewable shipping preview, one durable dispatch reservation, one controlled carrier attempt and truthful recovery. A green readiness read or a parent ready_to_ship string does not buy shipping. A label is not proof of pickup. The final result must say which stage actually happened.

## Source-grounded gaps

- ConsolidationService.confirm persists actor/sourceHash/hubRevision and exact manifest/receipt revisions. Existing source/hub/capability locks are useful but expire on commit. observeAggregateReadiness starts its own transaction, returns dispatch.available=false and cannot be used as an atomic release check by calling it before an insert.
- ConsolidationHub currently has id/revision/enabled, no pickup address. Shipment currently stores one aggregate weight/dimensions and carrier-specific tracking field, no immutable multi-parcel packet or durable attempt/result protocol.
- ShippingProvider.createShipment has no request/attempt reference, quote/price contract, lookup-by-reference or typed failure semantics. Bosta/Aramex implementations always throw; DHL is the registry default, which conflicts with the user's Egyptian-carrier instruction. Do not call any of these adapters as a usable release path.
- Current createShipment reserves before a carrier call but collapses errors into failed, uses the first factory's pickup address and placeholder dimensions, then marks shipped on label creation. The containment candidate prevents new entry, not these latent semantics.
- Current Payment status is a fact. No source establishes shipping payment terms, cash-on-delivery, deposit percentage, vendor settlement timing or credit exceptions. Local payment adapters are separate from shipping release. None may be inferred from Stripe/DHL legacy code.

## Engineering choices

### 1. Keep review and dispatch authority separate

Reuse current manifest receipt/review confirmation, including current confirmer canReceive at that hub. No ADMIN bypass for review. Require a separate server-side dispatch capability for label-purchase execution, assigned only under later operator authority. Until that assignment exists, allow private preview preparation but no execution. The reviewer's identity and executor are both audited; they need not be the same person. A canReceive grant alone does not silently acquire spending authority.

### 2. Explicit packing packet and pickup revision

Add a versioned hub pickup record containing actual contact name, address, city/country/postal/phone as required by the selected Egyptian carrier. Keep secrets outside the record. A missing value blocks preview rather than falling back to a factory address.

Add an order packing revision: nonempty list of parcels with measured mass in integer grams and dimensions in integer millimeters, unique parcel IDs, packer/time and any required package count/carrier constraints. Validate finite positive integer units and explicit provider limits. No default1kg/30x20x10. Delivery address is read server-side and versioned/hashed in the packet; never take destination from a release POST. Editing pickup, destination, contents or parcels invalidates any not-started reservation.

### 3. Immutable release packet

The server builds a canonical packet with orderId, hubId+revision, manifestId+revision, receiptRevision, sourceHash, confirmationId+actor, packingRevision+parcel data, pickup revision+address, delivery hash+address, explicit provider+account identity, quoted service/currency/total/expiry (when supported), configured payment-clearance revision if one is required, and actor/execution authority reference. Hash canonical values with sorted keys, defined units and a format version. Exclude bearer secrets and never expose unrelated private data in a provider reference.

Payment clearance remains an explicit unresolved policy input, not `status === captured` hardcoded. While no applicable policy is selected, a preview truthfully says payment-release rule unconfigured and cannot become executable. This does not require asking a policy question to build the rest locally. An implementation can accept only a server-owned, versioned policy decision with its recorded authority, not an arbitrary client `paymentApproved` boolean. Revalidation never captures/refunds/settles money.

### 4. New durable dispatch protocol

Use a separate dispatch table rather than reinterpret every legacy Shipment.created/failed record. Proposed logical records:

- DispatchReservation: id, unique orderId for a single whole-order shipping intent, requestKey, requestHash, immutable packet+hash, reservedBy/time, state/version, last checked source revisions, failure code, provider/account key. Unique(orderId) prevents a second active intent even with another client key. An existing Shipment of any ambiguous/active status blocks creating this new intent until reconciled.
- DispatchAttempt: id, reservationId, unique attempt ordinal/provider reference, immutable packet hash, state, startedAt, response evidence reference, tracking/label facts, last error classification. Attempt1 only at first release. A second attempt requires authoritative proof the prior attempt did not create a label plus an audited explicit retry decision. No lease expiry automatically grants another attempt.
- DispatchEvent: append-only actor/state transition/evidence IDs; redact raw credentials/provider payload secrets.
- Transactional outbox for any later approved notification. No new recipient-facing notification is enabled in this design. A notification failure must not cause another label purchase.

Proposed states: reserved (not attempted), invalidated_before_start, attempt_started, label_created, reconciliation_required, confirmed_not_created, cancelled_before_start. Physical picked_up/in_transit/delivered are carrier-verified shipment facts, not substitutes for attempt state.

## Atomic reservation and mutation fencing

### Reservation transaction

Use one PostgreSQL transaction, not an observation call followed by a write:

1. Lock the order first. Lock hub/config, actor dispatch capability and confirmer receiving capability in deterministic key order, then source items/POs/designs/production facts, payment-clearance facts if configured, manifest/receipts/confirmation and packing/destination sources. Extract the existing context logic into a transaction-owned helper rather than open nested transactions or make a private-method cast.
2. Reject closed/cancelled/physically shipped orders, an existing legacy Shipment, conflicting dispatch reservation, disabled hub, missing authority/configuration or stale request revisions. Parent ready_to_ship is neither necessary nor sufficient. Reject missing/mismatched/revoked confirmation and any current receipt blocker. Use the already-settled whole-order receipt/review gate, no invented second QA approval.
3. Recompute source/parcel/address packet and require exact expected revision/hash. Missing commercial clearance or carrier capability remains an explicit blocker. Repeated same requestKey+same requestHash returns the existing reservation; same key/different packet is409. Another key does not create another intent.
4. Insert reservation plus its first event atomically. Commit without a carrier call and without marking shipped. Return reserved/not purchased.

### Between reservation and external attempt

A reservation is revocable preparation, not a forever-valid eligibility result. The worker takes the same order-first transaction, rereads all packet inputs/current capabilities and compares exact revisions. Any edit or revoked permission invalidates an unstarted reservation with no external call. When ready, atomically claim reserved -> attempt_started, create the unique attempt and freeze its immutable provider packet. No automatic worker reclaim that can repeat create.

Every application writer of the packet inputs must honor the order-first protocol and reservation state. Before attempt_started, either invalidate reservation atomically or refuse the edit with a visible conflict. After attempt_started, refuse edits/cancel/replan that would pretend to undo an external commitment and route to reconciliation. Hub-wide updates must not lock hub first and then many orders; prepare per-order invalidation under consistent order-first locking. Revoking global credentials/capabilities is still allowed, but cannot recall an already-started carrier request; record its effective time and surface that consequence. Direct arbitrary database writes remain outside application guarantees and require restricted operational access, not a claim that row locks last forever.

Do not hold an interactive database transaction across a network request. The durable attempt-start is the linearization point. After it commits, later cancellation is a cancellation/reconciliation request, never proof no label exists. If cancellation wins the order lock before claim, no create starts. If claim wins first, tell the operator the external outcome is pending. Tests must prove both orders of that race.

## Carrier call and truthful failure handling

The worker uses only the immutable attempted packet and explicit supported Egyptian carrier/account. Provider must pass an availability/capability check; presence of an environment variable is not proof an adapter exists. Do not default to DHL. Provider interface needs create reference support and, where available, read-only lookup by reference and label cancellation capability. Implement actual adapters only against verified current carrier contracts; do not invent endpoint/idempotency guarantees.

| Event | Durable result | Automatic next action |
|---|---|---|
| Validation/config/revocation before attempt-start | invalidated_before_start, no label purchased | Refresh facts/preview; no carrier call |
| Claim succeeded, process crashes before call | reconciliation_required after bounded timeout | Read-only investigation; never blindly create again |
| Timeout/reset/malformed body/5xx or unknown external result | reconciliation_required, may have bought label | Lookup by durable provider reference if supported; otherwise operator investigation |
| Carrier definitively rejects and contract proves no create | confirmed_not_created with evidence | No automatic second purchase; explicit retry after corrected packet and revalidation |
| Valid tracking+label response, DB finalize fails | reconciliation_required, label may exist | Preserve result evidence outside failed transaction and recover read-only; never recreate |
| Carrier lookup confirms same label | label_created linked to existing attempt | Idempotent finalize, no create |
| Ambiguous/multiple label matches | reconciliation_required | Operator picks supported evidence; no automated choice |
| Operator cancels before start | cancelled_before_start | No create |
| Operator cancels after start | keep attempted state, cancellation requested | Verify carrier cancel outcome separately; never claim free/complete cancellation without evidence |

Finalize label_created in a transaction bound to reservationId+attemptId+packetHash and a monotonic state/version claim. Duplicate responses return the same persisted result; mismatched provider reference/packet or another tracking number goes to reconciliation. Store provider-neutral identity fields and adapt legacy tracking consumers without rewriting historical tracking data. A label response does NOT set parent shipped. Mark physical shipping only from the implemented carrier's verified pickup/dispatch evidence. This change must be reconciled with existing UI/status/settlement consumers before activation. Leave vendor settlements untouched by label creation or this new finalizer.

## Operator/customer result

Before execution, show which reviewed revision, actual hub pickup, parcel count/masses, destination and selected Egyptian carrier/service will be committed, with final charge when the carrier supplies one. Approval/execution permission must cover the amount/terms; no invented fee cap or assumption label creation is free. If the carrier charges later with no final quote, the commercial authority must explicitly cover those billing terms before live execution.

Use distinct messages: review complete, shipping preparation incomplete (named blockers), reserved/not purchased, attempt outcome unknown/do not retry, label created/not yet picked up, carrier pickup verified. Keep recorded legacy status caveats. A timeout must not display Failed, try again. Preserve the same reservation on reload and show investigation progress. A one-time operator success alert cannot double as customer-notification approval.

## Finite implementation sequence

1. Local schema/service prototype with synthetic provider, no production route/worker registration. Implement reservation, packet hashing, optimistic revisions and attempt/result protocol. Add tests below. Keep legacy create409.
2. Integrate all packet-source writer fences, including receipt correction/replan, packing/pickup/address edit, capability change, production/order cancellation and approval reopen. No usable-race claim before inventory and negative controls bind these paths.
3. Implement explicit Egyptian adapter against verified carrier documentation/account test environment. Preserve read-only investigation evidence and real units/addresses. Carrier/account credentials are operational setup, not a request to change the user's already-stated courier preference.
4. Prepare operator preview/recovery UI and narrowly revised status/tracking consumers with real EN/AR visual checks. Keep customer notifications disabled unless separately approved. Only then request the concrete missing business/operational inputs and explicit publication/activation authority.

## Acceptance matrix for the local prototype

- Complete current team confirmation permits reservation only when every technical/policy input is configured; missing parts, rejected/overreceived parts, stale source/hub/receipt, revoked confirmer or actor, wrong hub and legacy ready without evidence all refuse with no attempt.
- Same request key replay stable; changed packet/key conflicts; two concurrent keys/orders claims create one reservation/attempt. Database failure leaves no partial reservation/outbox.
- Any source change after preview or reservation and before claim invalidates; no provider call. Both cancellation-versus-claim orderings tested. Other writer gates and nonparticipating direct-write limits stated.
- Crash before/after started marker, timeout, malformed success, DB finalize failure, duplicate/mismatched provider response and lookup ambiguity never cause another create. Read-only reconciliation of known label finalizes once.
- Label does not set shipped, settle vendors or notify customer. Verified physical pickup can update shipping facts only through supported-carrier verification. Delivery/settlement regressions remain separate.
- Provider default absent/DHL/stub rejected; amount/units/currency/destination/pickup/parcel validation exact. No fabricated quote or free-cancellation assumption.
- Mutants removing confirmation/currentness/capability check, uniqueness, writer fence, claim or ambiguity hold must fail their specific behavioral assertions, not merely type/import infrastructure.

## Business decisions, only when needed

No business question blocks this design or steps1-2. The team receipt/review rule is settled. Do not ask it again. The only commercial variable not established by the inspected sources is the payment condition at shipping release. When a prototype reaches that gate, ask one concrete choice with actual examples: must the full order balance be confirmed before shipping, or are unpaid/part-paid shipments allowed under an explicit per-order clearance? That changes whether a fully reviewed order with pending/partial payment can reserve/execute shipping. Do not add COD, credit, percentages or vendor settlement timing without instruction. Keep that gate unconfigured until decided. Carrier billing authority and actual pickup/measurements are needed before live purchase, not before local prototype work.
