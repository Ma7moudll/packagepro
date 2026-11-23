# Production start replay, local candidate

Base: PR68 head 7394918b784ce8b54ce61605cc78ec5e020f5cd1. No dependency on checkout recovery PR71 or reporting PR69/70. Local only, not committed/published. No migration, provider calls, live production, account changes, external sends or business-policy selection.

## Bounded changes

Start requests lock the parent order then PO in one PostgreSQL transaction. A run already beyond not_started is returned without resetting progress/status/start/completion timestamps, rewriting the order or invoking another start notification. A new/not_started run requires confirmed PO and order vendor_confirmed or in_production, preventing terminal/earlier-state regression. Run creation/update and the applicable vendor_confirmed to in_production order write commit together. Existing authorization/ownership gates are unchanged and exercised over HTTP.

Only the transaction that starts the run attempts the existing post-commit notification. Its failure can still return500 after the run committed. Retry observes the run without resetting it, but does NOT repair a missing notification. No outbox or delivery guarantee is provided. Returned nested order is reloaded after the transition rather than stale pre-transition data.

Production.progressPercent is an Int in the existing schema. HTTP zod and direct service now explicitly reject fractions/nonfinite/out-of-range values before persistence. No rounding or changed payment policy.

## Evidence

17 synthetic Fastify/auth/PostgreSQL cases pass with backend TypeScript clean. Full before/after production and order rows include timestamps. Covers repeat after45%, quality_review/completed replay, three terminal new-start refusals, earlier approval state refusal, unconfirmed PO refusal, not_started identity preservation, eight concurrent start requests yielding one run/notification, real database trigger failure rolling back both writes, customer/unauthenticated/stranger-vendor denials, fractional HTTP/direct-service input and post-commit notification failure/retry.

Against unchanged service, 12/17 fail. Removing replay guard causes5fail; removing order eligibility causes4fail; removing direct integer guard causes1fail. Restored17pass. HTTP integer rejection also depends on the independently changed zod int guard. Failure trigger is only created in a validated empty disposable database and dropped in finally. Normal test discovery skips the suite without explicit opt-in.

Run: set PACKAGEPRO_PRODUCTION_ISOLATED_DB=yes and DATABASE_URL to a fresh local database named packagepro_e2e_production_<alphanumeric>, apply migrations, set synthetic JWT_SECRET/JWT_REFRESH_SECRET and NODE_ENV=test/EMAIL_PROVIDER=test, then `npx vitest run --config vitest.production-workflow.config.ts`. Real external notification service is mocked. The harness refuses nonlocal/wrongname/nonempty business databases. No frontend/runtime UI change or new browser acceptance.

## Explicitly unresolved

This is NOT a whole production state-machine repair. updateProgress/completeProduction behavior remains unchanged except integer input validation. It still has stale100% response/nontransactional completion and can mutate closed runs. One PO can advance the whole order quality_check while other POs are incomplete. QA service independently writes ready_to_ship and has no exposed caller found. Sample approval can reset a production to in_progress; late handshake acceptance can rewind a nonterminal parent order. Their writers do not share this start-only lock protocol, so no cross-lifecycle race guarantee is claimed.

MASTER_EXECUTION_PLAN.md OPS-05 already identifies all-PO projection and partial production/shipment/delivery/cancellation as future definitions. No implemented aggregate protocol was found. Options are (A) this narrow start protection with completion explicitly open, (B) fail-closed multi-PO completion which could strand valid work, (C) a designed aggregate state protocol spanning PO/handshake/sample/QA. Only A is this candidate; B/C are not silently implemented. Broader local completion rewrite was parked, not included. No gateway, courier, payment-timing or additional-order policy selected.

## Locked actor recheck amendment (v2)

No current application route/service was found that reassigns PurchaseOrder.vendorId: observed update sites set document URL, confirmed state/time, not vendor. However the foreign key is writable by an operator/direct database writer. A real disposable-DB interleaving proves such reassignment between controller authorization and the locked mutation. Start now requires authenticated actor context and rechecks its resolved vendor against the freshly locked PO before returning an existing run or creating one. ADMIN retains the existing controller vendor-profile resolution contract. A preexisting run with a vendor different from its PO fails409 for investigation, never silently transfers ownership. No vendor reassignment action is introduced.

21 HTTP/DB cases now pass. Both no-run/existing-run reassignment interleavings give403 with unchanged production/order snapshots and no notification. Removing the locked actor comparison makes both fail. An additional mismatched run/PO vendor case gives409 and ADMIN start is covered. TypeScript clean. Failed-mutant fixture cleanup now restores run ownership before deleting its synthetic vendor; the dedicated disposed database was rebuilt once after the first mutant deliberately created such a mismatched row.

Qualification precision: the .int HTTP schema line is redundant with direct-service integer rejection; its independent removal does not fail the current suite, so no independent controller-line binding is claimed. Same-PO concurrency binds at least one of order/PO locks, not each separately or lock ordering against uncoordinated writers. New parent eligibility refusal follows the existing forward transition table, changes previously permissive behavior, and does not add payment verification or select a payment-release policy. Postcommit notification500/missingnotice gap and progress/sample/handshake/QA/multiPO aggregation defects remain open as above.
