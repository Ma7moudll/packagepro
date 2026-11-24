# Local new-shipment containment proposal

Separate review-only continuation on deab7649d8de86a196209a18eabe408cebc2f648. Not published, activated, deployed or connected to a live carrier. Not a usable shipping-release workflow.

## Boundary

ShipmentService.createShipment retains its admin-role and existing-order checks. Immediately afterward it unconditionally throws409 with a plain paused/unintegrated-release explanation. The assertion is before the parent ready check, existing-shipment lookup, reservation insertion, provider selection/call, parent shipped write, email and notification. No environment switch or admin override bypasses it. It covers both the existing POST /api/shipments/create/:id route and direct service callers. Unknown order stays404, non-admin403, missing auth401. Existing rows are untouched.

This denies ALL new shipments, including fully received/confirmed orders and previously ready orders. It deliberately does not infer usable release from receipt confirmation, parent status, approvedAt or captured payment. If activated it would pause fulfillment, including legitimate new creates. Activation is not authorized. Replacing the unconditional denial later requires a reviewed atomic release/reservation design, not turning on a permissive flag.

The old create implementation remains below the guard for later replacement/review, unreachable in the candidate but not safe to reactivate unchanged. Existing reservations, failed attempts and labels are preserved, never retried/deleted/rebilled by this change. Existing order-shipment reads, authorized tracking and carrier webhooks remain separate; they can still observe/update an already created shipment. This is not cancellation of an existing label or a guarantee that past shipments stop.

## Local evidence

19 real disposable-PostgreSQL tests pass: all11parent statuses denied through HTTP with captured-payment fixture and unchanged order/shipment/payment/notification state;3existing reservation states (created/failed/label_generated) unchanged across retries; direct-service denial;401/403/404 boundaries; owner/admin read and tracking with stranger denied; unknown webhook; known label advancing to in_transit from a stubbed verified carrier response. Provider create, tracking, verified-state fetch, email and notification are mocked. No actual carrier or external message is sent. The non-delivery webhook check is narrow; full delivery/settlement certification is not claimed.

Removing the single boundary call fails15cases. A success-shaped synthetic provider response lets the old ready-order path actually create a label record, change parent state and invoke mocked messages, so failure is bound to wrong201/state/provider effects, not only to an undefined mock result. After restoration all19pass. Existing25writer/22aggregate/39receipt/37production PG regressions pass on this candidate. Backend noEmit and emitted build pass. Earlier unrelated DHL-suite environment limitations are not claimed fixed.

## Decisions and remaining work

No user-owned decision blocked this safe local preparation. Whole-order receipt/review by Mahmoud or his authorized team is settled, not a question to repeat. Current candidate leaves that flow usable as evidence but never as a label purchase.

Before any later activation, show the user the exact consequence: all new shipping is paused, while existing labels/tracking remain. That consequence needs their explicit choice and separate publication/activation approval. Alternatively continue preparing a usable release flow under the settled receipt/review policy. That requires atomic recheck of current source, hub, receipt/manifest revision and confirmer capability plus a unique dispatch reservation, real consolidated pickup/parcel facts, safe carrier ambiguity handling and any payment-release rule actually needed by that implementation. Do not invent commercial/payment exceptions. A shipping block is containment only, not completion of their fulfillment outcome.
