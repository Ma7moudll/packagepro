# Remaining release map, local checkpoint

## Finite replacement contract coverage

121 disposable PostgreSQL tests pass. Added isolated refusals for stale version on an eligible cancelled-before-start intent, still-reserved intent with current version and fresh review, and reused request key with otherwise eligible review. Each checks no intent/event/attempt/provider effects. Reserved-state and reused-key guard mutants fail. Removing only the early version check survives because the conditional version predicate still refuses the stale update. Those barriers are redundant in this case; neither lock nor individual predicate is claimed independently proven. No source behavior changed.

## What works within examined limits

Whole-order receiving/review, server packet hashing, persisted packing input, synthetic reservation/claim/result/evidence, explicit unknown hold, source fences on named order/production/design/PO/handshake paths, default-off authenticated redacted inspection, and explicit replacement of never-started invalidation/cancellation. Manual Save keeps artwork and reports local/cloud failure separately. These are local candidates with bounded tests, not an operational shipping/payment release.

## Implementation dependencies

1. Commercial release authority: persisted payment policy is unconfigured and dispatch authorization false. No deposit/full-payment/COD/credit rule inferred. Existing legacy payment mechanics do not settle this business rule.
2. Carrier boundary: no real Egyptian provider create/lookup/quote/cancel implementation or verified ambiguity policy. All new real shipment creation is paused. No external create retry on unknown outcome.
3. Post-attempt recovery: read-only presence/chronology only. No authenticated adjudication UI/command, no actual provider lookup, no automatic expiry sweeper/outbox. Started/unknown/label states block generic source edits/cancellation with no operator resolution.
4. Source integrity: named app writers fenced, but hub/global capability/directDB/operator changes remain outside coordinated protocol. No app hub/capability mutation writer found. Legacy Stripe/DHL status/settlement paths remain unchanged and outside these slices. No global race/deadlock claim.
5. Review/replacement usability: never-started replacement is synthetic/local only, no HTTP action/UI; original creator required. Historical request keys lack a unique journal. Inspection can deny old creators after hub mismatch/disable/revocation; no break-glass policy invented.
6. Runtime integration: registered services depend on prototype tables; full candidate is not runtime-isolated. Migrations required for any eventual deploy. Local work after approved PR79 remains unpublished and not a CI/deployment claim.
7. Product/commercial launch: supplier-verified Egyptian price/cost data, production-ready file and physical-sample validation, usable product coverage, Egyptian merchant/courier accounts, hosting and launch controls are distinct gates. This is a reminder of known work, not a fresh complete audit. Older planning docs and seed data cannot prove current launch readiness. No new user decision was established by this engineering slice.

## Recommended next coherent slice

A read-only launch-preflight diagnostic, server-side and default-off, that combines existing receipt/review blockers, packing-presence/revision, commercial-policy-unconfigured and dispatch-disabled facts, existing shipment, and local attempt hold into one explicit not-ready assessment for a scoped receiver. It must not imply a quote/payment/provider check occurred, expose raw packet, grant capability, create intent, or execute/recover dispatch. This would connect the separately tested boundaries into one explainable readiness view before designing any post-attempt mutation. Keep its output conservative when upstream facts are missing or unverifiable. Actual business choices are raised only when execution needs them, not turned into approval questions from this map.

No publication, deployment, activation, live carrier action, payment change or recovery mutation is authorized by this checkpoint.
