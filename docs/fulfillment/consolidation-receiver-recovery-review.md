# Receiver expiry/recovery and bounded integration disposition

Separate local revision on502f0c52a1327a9c90b868db5633f15dfce8bf47. No real assignments, activation, remote writes, main changes, merge, deploy, spend, carrier/status/payment/dispatch actions.

## Explicit same-actor renewal

Existing requests stay pinned to the opening bearer; generic refresh/replay remains unused.401 keeps the exact unresolved envelope and instructs signing in as the original receiver in another tab. The explicit renewed-session button reads the current token, requires decoded userId/sub to match the original actor, and GET-verifies it against the actual receiver snapshot endpoint. Only a successful authorized response with unchanged token adopts it for subsequent user-triggered requests. New actor mismatch is refused. No pending mutation is replayed, edited or cleared by this check. Source/reconciliation/review state is invalidated and the operator may manually refresh/reconcile or explicitly retry the unchanged saved envelope.

This safely handles expiry and benign same-actor rotation, without silently switching accounts. The decode is only a mismatch guard; server signature/claims/current capability remain authoritative. Backend error mapping now preserves status and error/code in receiver-specific errors. Generic client is unchanged.

Targeted browser tests cover expired401, changed token preventing immediate retry, explicit same-actor verification, no automatic replay, identical-envelope manual retry, and refusal of different-actor renewal. Prior cross-tab and midflight token-header binding tests pass against this revision. Lost-tab checkbox remains acknowledgment/reconciliation, not server deduplication or proof of physical counts.

A real multirow update exposed an accessible-name collision: an earlier free-text reason in history could participate in implicit label matching. The reason textarea now has an explicit localized aria-label; repeated correction test passes.

## Production build evidence

Whole-app production build exits0 under temporary experimental cpus1, webpackBuildWorker true, parallelServerCompiles false, parallelServerBuildTraces false, and1.25GB Node heap. No routes removed. One warmup hit75second timeout while compiling, then cached complete build compiled in55seconds and completed page collection/generation/tracing with full route table, including /receiving. Original next.config.js restored byte-for-byte. Type and lint checks are skipped by the repository's existing Next configuration; separate whole frontend tsc passes. No lint success is claimed.

The earlier exit137/timeouts were resource/window failures, not a reproduced source compiler defect. Runtime settings were test-only, not committed. Build artifacts were subsequently overwritten by development-mode targeted browser runs; evidence is build log plus source/config restoration, not retained deployable bundle delivery.

## Material browser-to-real-backend acceptance

Synthetic disposable migrated DB, synthetic actor/hub/grants, actual emitted backend index/bearer/CORS/service. Browser uses two explicit allocations60/40. It records partA60received/59accepted/1rejected and confirmation stays disabled; actual backend confirm returns409. It corrects partA60/60/0, but missing partB still blocks confirm. A valid concurrent partB40/40/0 advances server while browser is stale; browser's old revision gets real409, keeps request and creates no fourth receipt. Manual refresh, explicit local-retry reconciliation/clearing, and explicit team confirmation yield3receipt events/1confirmation, zero shipments/payments, order unchanged in_production.

This passes in development mode and again against the completed production frontend via next start. Next warns next start is not the recommended launcher for output:standalone; no standalone-packaging/launcher/deployment claim is made. Only cart/analytics shell traffic is intercepted, not consolidation calls. Both frontend/backend and local DB stop afterward. Actual final acknowledgment/history image and EN/AR focused fields were inspected; no overlay or false current/eligibility claim.

Affected browser gates:6targeted identity/expiry/manual retry tests pass, plus5final restored false-success/focus/expiry tests. No unchanged full suite was rerun for this narrow revision. Exact-final-source mutation bypassing success/data guard fails and restores identical SHA, then restored target passes. Earlier22browser/disabled checks remain prior-revision evidence, not relabeled as new. Final whole frontend tsc passes.

## Limits

This is bounded local evidence, not full production operational qualification. No independent auditor browser rerun yet; no actual owner/team assignments, hub/contact setup, auth-login-provider lifecycle, physical receiving, carrier flow or external production environment. Standalone artifact packaging remains unqualified. Eligibility remains observation, not dispatch reservation. Existing default-off client/server and explicit capability gates remain unchanged. Broader integration claims must preserve these limits.
