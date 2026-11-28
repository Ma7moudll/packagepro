# Checkout recovery candidate

Local review candidate only. No gateway activation, capture/refund policy change, deployment or production migration has been performed.

## Contract

`POST /api/checkout` requires an authenticated customer and stable `Idempotency-Key` (16..128 ASCII letters/numbers or `_ . : -`). Reservations serialize per customer in PostgreSQL. The order, original cart snapshot and key reserve together. A durable state change claims one provider dispatch. Provider calls run outside the transaction. An ambiguous response is never retried automatically.

`GET /api/checkout/attempt` uses the same authenticated customer/key. It never creates, confirms, captures or refunds a provider payment. Stored results contain no client secret. Existing Stripe references are retrieved and checked against the local order/payment amount, currency and order metadata before returning an ephemeral resumable secret. Missing local payment records do not establish that no external payment exists.

Cart consumption locks original item rows and removes only unchanged originals. Updated/deleted/restored lines and new lines cause `review_required`. An UPDATE revision detects changes even within one timestamp tick. Completed means the checkout result and cart consumption committed, not that payment succeeded.

The browser stores key and intent before POST. Same-origin tabs serialize through Web Locks. Existing keys require recovery, never silent replay as a new cart. Only a verified absent key permits corrected details with the same key. Storage corruption/errors and missing Web Locks fail closed. Authentication refresh preserves the idempotency header. Browser storage loss or separate devices can still require operator help: server-side unknown/review attempts block new checkout.

## Operator prototype

ADMIN-only endpoints:

- `GET /api/admin/checkout-attempts/:id` returns attempt, original snapshot, order, safe local payment fields and current cart. Raw payment metadata and bearer secrets are excluded.
- `POST /api/admin/checkout-attempts/:id/reconcile-existing`, body `{reason: string}` (10..1000 trimmed characters). Only UNKNOWN can transition using a validated existing reference from the original provider. This is NOT a read-only local operation: the transaction conditionally checks state, consumes unchanged original customer-cart lines, sets completed/review-required, and records one reconciliation actor/reason/time/reference entry. That explicit cart mutation completes the interrupted checkout finalization; it is not financial approval or a platform-wide audit history. Admin inspection alone never consumes lines. This neither changes order payment status nor performs a provider write. The operator response excludes client secret. A customer can subsequently recover their own existing payment.

`POST /api/admin/checkout-attempts/:id/isolate-dispatch`, with the same reason constraints, conditionally moves DISPATCHING to UNKNOWN and records a separate isolation entry. This is a local monotonic completion fence, NOT proof of worker death, provider cancellation or quiescence. Original issued requests may still create/persist a payment. They cannot commit checkout finalization after this fence. Both the isolation and later resolution entries remain. No production transition changes UNKNOWN back to DISPATCHING. Same-key, new-key and stale retries remain blocked from provider create.

There is deliberately no force-success, mark-no-charge, retry-create, refund, capture, arbitrary reference attach or timed DISPATCHING reset endpoint.

## Remaining launch boundaries

- DISPATCHING can be explicitly isolated by ADMIN into UNKNOWN, preventing late local finalization. Elapsed time is not used and isolation does not prove that an external request stopped. Existing-reference reconciliation can proceed only after validated payment facts exist.
- UNKNOWN without a local reference remains ambiguous until explicit provider investigation verifies an existing reference. An ADMIN-only inspect/attach workflow is now a local prototype; no automatic new charge is safe.
- `review_required` needs an explicit cart-review/acknowledgement design before new checkout. It currently blocks rather than guessing whether changed quantities are another order.
- Cancel/abandon/correct-address after a durable order, and gateway/payment timing policy, are unresolved business choices. This candidate does not decide them.
- Initial/resumed Stripe Elements mounting passes a browser contract test using the real React wrapper and a synthetic SDK, without provider traffic. A separately approved provider test environment is still needed for actual provider acceptance. The browser gate tests use synthetic API responses, not real payments.
- The shared mobile header still overflows at 320px in English and clips a language label in Arabic; recovery content itself is readable. Shared footer contains existing placeholder and untranslated content. Gate screenshots are not whole-page visual acceptance.

## Isolated tests

Generate Prisma client for the candidate schema, apply migrations to an empty disposable local database named `packagepro_e2e_checkout_recovery_<alphanumeric>`, set `PACKAGEPRO_CHECKOUT_RECOVERY_ISOLATED_DB=yes`, and run:

```
cd backend
npx vitest run --config vitest.checkout-recovery.config.ts
npx vitest run --config vitest.checkout-status-projector.config.ts
npx vitest run --config vitest.checkout-recovery-unit.config.ts
npx vitest run --config vitest.checkout-browser-unit.config.ts
cd ../frontend
npx playwright test --config playwright.checkout-recovery.config.ts
```

The HTTP gate rejects nonlocal/misnamed databases and nonempty business tables before fixture writes, uses only fixture-scoped cleanup, and forbids real provider calls. The opt-in tests skip without the flag. Unit configs have no global Redis setup. Database setup and migrations are the operator's responsibility; do not point at a populated database. Migration adds new attempt/key tables and a cart revision trigger; rollback after real checkout use cannot safely discard that evidence and is not automated.

## Bounded qualification evidence

At this checkpoint: 42 isolated HTTP/PostgreSQL cases, 7 adapter units, 11 storage/header units, and 8 browser cases pass. Removing UNKNOWN-only restriction, original-provider match or finalization state CAS each makes the corresponding new HTTP case fail (41 pass, 1 fail). Source was restored and 42/42 rerun. Removing Elements client-secret options makes both initial/resume SDK browser contract cases fail; source was restored. These controls bind those specific guards, not all concurrency or provider behavior. Screenshots inspected show readable initial/resume synthetic payment controls at desktop sizes; mobile shared chrome caveats above remain.

## Technical paths still needing implementation review

The local DISPATCHING fence is recognized by finalization. Proof of quiescence is still required before anyone declares the external operation inactive. A database generation alone cannot stop an already-issued external request. Candidate operational path: stop/drain the responsible worker, investigate the existing provider request/reference, then attach only verified existing facts under a recorded operator action. No automatic create retry follows from a lost response or a provider idempotency key.

A cart-review acknowledgement could compare a freshly fetched current-cart fingerprint and retain all edited/new lines while recording that the customer reviewed the saved order separately. It must explicitly describe that a subsequent checkout is an additional order, and cannot infer abandonment/cancellation of the old one. The current candidate does not implement the cart-review acknowledgement transition.

Prepared/resumed payment now requires saved order number, finite saved total and explicit currency, and shows them beside payment controls independently of current cart. Browser fixture deliberately uses saved 73.25 SAR versus current cart 20 EGP. Missing amount/currency fails closed rather than filling from cart/default currency.

## Explicit fence qualification

58 HTTP/PostgreSQL cases now pass, including late persistence after fencing, refusal before a local reference exists then successful existing-reference reconciliation afterward, barrier after provider return/before finalization, edited-cart preservation when reconciliation wins, two-admin fence/fence and reconcile/reconcile races, unauthorized role denial, disallowed source states, same/new-key no-redispatch, and differing late reference refusing a customer secret. Removing the isolation source-state predicate causes six failures; removing the isolation ADMIN gate causes five. Restored sources must be rerun before acceptance. Recovery responses include freshly read local order/payment states separately from attempt state, since webhook progression is independent. These are local reads, not proof of current external provider outcome.

Saved-order review route is checked through authenticated HTTP ownership tests and a synthetic browser click through to saved address/name. Order page now accepts the checkout's persisted full name in addition to legacy first/last names. Amount display uses currency-aware minor units and fails closed on nonrepresentable precision. No unrelated money projection or payment timing policy was changed.

## Missing-reference investigation and attachment prototype

ADMIN `POST /api/admin/checkout-attempts/:id/inspect-reference` accepts `{reference}` only in UNKNOWN. It performs an original-provider read, validates reference/order metadata/amount/explicit supported currency, and returns no secret or local mutation. Stripe inspection supports only the checkout adapter's two-decimal currency set; unsupported precision is rejected, never rounded.

Separate ADMIN `POST /api/admin/checkout-attempts/:id/attach-reference` accepts `{reference,reason}`. It independently re-reads provider facts, locks the attempt, rechecks UNKNOWN/provider/order amount/currency, and inserts a local pending payment only if no conflicting reference exists. One separate attachment actor/reason/time/reference entry is retained alongside isolation/resolution. An existing different reference/amount/currency is never overwritten, and a repeated attachment refuses instead of replacing the entry. Two admins have one winner. An external succeeded fact remains a fact in the attachment record; local pending is not a statement that no funds moved. No capture/webhook success/order status transition is synthesized. Cart and UNKNOWN remain unchanged. Explicit existing-reference reconciliation is still a distinct action.

Late Stripe create persistence now uses an empty upsert update and checks matching reference/amount/currency afterward, so an old response cannot replace an attached payment or reset its captured status. A conflict remains ambiguous and must be investigated. This does not search providers automatically, declare that no payment exists, cancel an issued request, or authorize a new charge. Operator must obtain the candidate reference through the merchant's verified records. Actual merchant-account operation has not been tested or approved.

New targeted tests bind attachment state recheck during provider read, provider mismatch, ADMIN denial, duplicate/concurrent attachment, conflicting existing reference preservation, attachment-plus-reconciliation record survival, read-only inspection, and later existing-reference reconciliation. Each of state-recheck/provider-match/ADMIN guard removal produces its intended failing HTTP case. No claim of full payment-provider acceptance follows from mocks.

## Status reconciliation candidate and product boundary

An attached existing payment that the provider reports succeeded may still have local pending/order pending-review state. Attachment now explicitly warns that funds are reported captured but local progression is unreconciled and another charge must not be started. The existing signed webhook returns 500 if no Payment exists, because confirmPayment throws NotFound. Provider retries may repair this after attachment, but are not assumed to continue indefinitely.

New ADMIN `POST /api/admin/checkout-attempts/:id/reconcile-status`, `{reason}`, prepares a local status reconciliation through the existing provider adapter. It requires original provider, an existing validated reference, matching attachment/result references, and no active reserved/dispatching attempt. Stripe adapter uses existing confirmPayment: it re-retrieves provider facts, validates amount/currency/order, and applies the existing local captured/forward-order transition if succeeded. It does not call a provider capture/create/refund API. Existing webhook ledger/manual transition semantics are unchanged. A separate single status-review entry records actor/reason/time and local outcome. This wrapper still requires independent race/negative-control qualification; no production-use or readiness claim.

Safety-only candidate continues to block REVIEW_REQUIRED. A separate optional design patch prototypes customer comparison/fingerprint acknowledgement that would permit an additional order while the original remains active. That is a product decision, not adopted policy and not part of the safety candidate. Exact decision: should a customer who explicitly reviews saved/current quantities be allowed to place an additional order/payment without canceling the saved order, or must support resolve the original first? Neither option is selected here. No original order/payment cancellation, abandonment or address correction is inferred. The optional patch has only backend prototype tests and frontend type checks, not browser qualification.

## Durable status-operation amendment, still under qualification

The status wrapper now persists a separate append-only operation row in STARTED before invoking the existing local projector. A STARTED operation blocks blind retries; if projection or the outcome write fails, durable intent remains for investigation rather than disappearing. Completed outcome observation updates only that operation row, so later admins do not overwrite prior actors/reasons. Response wording names local payment/order advancement and possible customer notification. This is not a full transactional audit of all effects: a crash after projection can leave STARTED with an unknown local outcome. The safe behavior is explicit investigation, not automatic replay. Further failure-window/concurrent-admin tests and independent review remain required.

## Consolidated durable status qualification

77 safety HTTP cases pass, including a projector exception and a post-effect outcome-write exception. In both uncertain cases durable STARTED intent remains and retry refuses. Concurrent admins cannot duplicate a pending projector; subsequent completed operations retain separate history. An isolated real Fastify/Stripe-adapter/PostgreSQL-projector integration case also passes: existing succeeded reference advances local payment/order, emits one customer notification, repeat observation does not emit again, and two operation records remain. All provider mutation methods are forbidden in that harness. Existing signature/idempotency suites passed 23 cases separately.

The remaining result-reference mismatch control now fails its dedicated HTTP case if removed. Provider-origin amount/currency has a provenance-specific control: after validation, mutating the local order test object must not change the response facts; rebuilding from local values fails the case. This is a narrow provenance check, not a realistic concurrent database race test. Full operation crash recovery remains investigation-only; there is no unsafe reset/replay endpoint.

### Multiple valid references remain unresolved

Verifying a candidate reference proves only that reference's metadata/amount/currency. It does not prove uniqueness across the merchant account or rule out a second valid intent for the same order. The current candidate must not be used to silently select among competing references. Merchant-record investigation is required and no operator account workflow has been qualified. Automatic attachment/selection in that situation is not approved. No additional charge, refund, cancellation or payment-timing policy is implied. This limitation remains a readiness blocker for production operator use.

## Database fence and pre-effect failure amendment

A SQL-managed partial unique index now enforces at most one STARTED status operation per attempt independently of application locking. Prisma 5 cannot express this predicate in the model. The application row lock remains, but the guarantee no longer rests on a count/read race. A concurrent direct-insert case binds the index: dropping it makes the case fail (78/79); restoring it returns 79/79. New table FK uses explicit RESTRICT/CASCADE and the modeled composite index's expected name. A migration-to-schema diff now reports only preexisting order_approval_tokens FK drift; no checkout table drift was emitted.

The Stripe status adapter accepts the already verified reference and order identity rather than rereading a potentially changed local reference. It classifies retrieval/validation errors as pre-effect only before invoking any local projector. The wrapper records FAILED_BEFORE_EFFECTS for that proven class, allowing a deliberate fresh-provider-read retry. Any projector/outcome error remains STARTED/uncertain and blocks blind replay. If recording the pre-effect classification itself fails, it also remains conservatively STARTED. Pre-projection provider status is labeled as such; it is not advertised as a post-projection provider observation.

At this amendment 79 isolated HTTP cases, 20 adapter units, the real wrapper/projector integration case and backend types pass. The adapter tests distinguish provider-read failure from post-validation projector failure. No live provider calls, uniqueness investigation or competing-reference selection has been performed. Production operator use remains unqualified for the multiple-reference problem and for resolving an uncertain STARTED operation. The optional additional-order candidate is not included.

## Reviewability and real-adapter controls

Money-service formatting was restored to the earlier narrow candidate, retaining only semantic status-classification edits. Payment retains the inferred Prisma payload type, not any. The real wrapper integration now has three cases: successful status progression/repeat, second provider-read failure recorded as proven pre-effect, and a valid payment from a different expected order refused before projector. Removing expected-order validation or disabling the real adapter's classification flag each fails its specific integration case (2 pass/1 fail), restored to 3/3. Missing expected reference is also classified pre-effect before any projector call.

The partial unique index is not represented by Prisma's schema and can silently disappear if migrations are regenerated only from schema.prisma. Preserve the raw SQL and run the concurrent-STARTED constraint test against migrated databases. Reproducible negative-control route uses the project's existing pg client, not psql: in a disposable isolated database, execute `DROP INDEX checkout_status_operations_one_started` via pg.Client, run the HTTP gate and expect the direct-concurrent-insert case to fail, then restore the exact CREATE UNIQUE INDEX statement from the migration and rerun 79/79. Never run that control against a shared/populated database.

## Required review gate checklist

Run all four backend gates, not only the recovery gate: `vitest.checkout-recovery.config.ts`, `vitest.checkout-status-projector.config.ts`, `vitest.checkout-recovery-unit.config.ts`, and `vitest.checkout-browser-unit.config.ts`. The projector gate requires the same empty disposable isolated database/opt-in setup and a synthetic Stripe key; all provider mutations are forbidden. Expected-order, real-adapter classification and missing-reference controls are bound by the separate projector gate, not by the recovery gate alone. The frontend unit/browser/type gates remain separate. Hosted checks and live merchant acceptance are not established by these local runs.

## Safety scope versus disabled operator mutation prototypes

`CHECKOUT_OPERATOR_RECOVERY_ENABLED` defaults to false/absent. Every operator mutation (isolate-dispatch, attach-reference, reconcile-existing, reconcile-status) fails closed inside the service before provider reads, local writes or projector calls unless its exact value is `true`. Enabling this flag for production is NOT approved or qualified. Synthetic test suites explicitly enable it. Customer idempotency and owner-scoped read-only recovery do not require the flag. Manual investigation blocks remain, rather than exposing experimental repair tools as launch-ready.

ADMIN read-only investigation endpoints remain separate:
- `GET /api/admin/checkout-status-operations/:id/investigate` shows durable intent/outcome, current local order/payment/attempt and same-reference provider observation if available. No bearer secret, operation closing, reset or projector call. Current facts do not prove which operation caused a state or notification.
- `POST /api/admin/checkout-attempts/:id/investigate-references`, `{references: string[]}`, checks at most ten supplied merchant-found candidates and reports individual verified observations. More than one verified reference is explicitly competing. No list, even one valid reference, proves merchant-wide uniqueness; `uniquenessEstablished` and `selectionMade` remain false. No reference is selected or attached by this route.

Current local gate has 82 HTTP cases, including flag absent refusing all four mutation paths before provider/local effects and read-only unresolved/competing-reference observations. Bypassing the service flag makes the dedicated flag-off case fail. Restored 82/82 and real adapter/projector 3/3 pass. This separation is a preparation design, not an operational protocol or approval to activate it. Uncertain STARTED remains blocked; competing references remain unresolved; additional-order behavior remains excluded.

## Final local scope / read-only boundary controls (v13)

Both investigation routes now compare complete before/after operation, attempt, payment and order rows, including timestamps, plus request aliases and cart/items. Their synthetic fixtures include the rows being checked. They assert no new provider create/refund/projector calls or customer notification and check actual HTTP bodies for bearer-secret field/value absence. Eight controls inject updatedAt writes, one model at a time at each endpoint. All eight fail their matching snapshot case; restored HTTP gate passes 83/83. These bind state equality, not an assertion that a SQL write that leaves literally identical persisted bytes is detectable.

Recovery and projector harnesses scope the operator flag with beforeEach stubEnv and afterEach unstubAllEnvs; each case restores the incoming process environment, not a hardcoded enabled value. Default-off refusal remains explicit.

Admin provider investigation GET, supplied-reference POST and single-reference POST have separate fixed-IP buckets of six requests/minute/endpoint, reusing the application's rate-limit plugin and Redis store when configured. Supplied lists remain capped at ten, so the list route is bounded to sixty provider retrieves/minute/IP/instance without Redis. Shared-IP admins share a bucket. Unauthenticated requests can consume that IP budget but cannot retrieve facts. The real plugin HTTP case proves six allowed then 429/Retry-After and exactly the allowed provider calls; raising the cap fails it. This is bounded protection, not merchant-wide quota management. No actor/reason/reference is added to logs; those remain private ADMIN response/audit data.

Local final backend evidence: recovery 83, real projector 3, adapter units 20, browser helper units 13, backend tsc clean. All synthetic/offline-provider. Frontend is unchanged from v11/v12 and has not been newly reaccepted in this slice. Checkout remains uncommitted local preparation. Operator flag enablement, competing-reference resolution, uncertain-operation reset/replay, additional-order policy, live payment/merchant acceptance, hosted CI and launch qualification are not supplied by these results. No main/merge/deploy or remote changes.
