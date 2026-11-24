# Local source-writer fence checkpoint

Private prototype extension. No deployment, shipping activation, provider action, publication, or payment configuration.

## Boundary added

The shared transaction-owned source fence requires the caller to own the order row lock. A reserved intent is invalidated with an append-only event in the source write transaction. Attempt-started, reconciliation-required, and label-created states refuse the source write. Missing or already invalidated reservations add no restriction.

Generic order status transitions now take the order lock and recheck the observed status before the fence and conditional write. Existing notifications stay after commit. This includes generic cancellation; it does not cancel a carrier label or refund money.

Production start and progress/completion invoke the fence after authorization and eligibility checks, before writes. An already-started production replay that changes nothing remains a no-op. Approval reopening invokes the same fence only after existing eligibility checks. Existing PO presence still prevents reopening. A genuinely reviewed reservation requires PO-backed allocations, so normal approval reopening is already unreachable there. Its fence is defense in depth, not demonstrated independent protection.

## Evidence

Disposable local PostgreSQL prototype suite: 71 cases, including generic cancellation across four states, production start/progress across four states, authorization non-invalidation, approval eligibility, and concurrent cancellation/claim. Existing regression suites: 25 writer, 22 aggregate, 39 receiving, 37 production. Backend type check and build pass. Cancellation and production-progress fence-removal mutants fail their intended state assertions. Production-start fence removal also fails its intended state assertion. These are bounded tests, not a proof of all interleavings or deadlock freedom.

## Remaining gaps

Order content, design, PO mutations; hub enablement, global capability changes, direct database/operator changes; real provider implementation, lookup/cancel/quote, outbox and recovery UI/routes, expiry scheduling, actual business/payment release authority. Packet recheck before claim detects some earlier changes but does not protect unfenced writes after claim.

Registered receiving, order, production and approval services now depend on prototype schema. The full candidate is not runtime-isolated. Migrations must accompany any eventual deployment, which is not authorized. All new real shipping remains paused. Payment remains unconfigured and dispatch authority false in persisted inputs.
