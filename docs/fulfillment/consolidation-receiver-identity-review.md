# Receiver workspace revision 2, identity-bound preparation

Separate candidate on5cc69873333ed9dfb9cc92250970a8e6907c8d1a. Preserves reviewed HTTP2aa943e9 and earlier baselines. Supersedes the earlier workspace's claim that React actor identity alone bound outgoing requests. Production qualification remains blocked, see below.

## Request identity

The receiver no longer uses generic apiClient or its token-refresh replay. Workspace opening captures the exact access token only when decoded userId and sub both match displayed session identity. This decode is a mismatch guard, not signature verification or authorization. The backend still verifies signature/claims and explicit capability on every request.

Each actual fetch sends the captured token in Authorization. It never substitutes a later localStorage token. It checks current storage against the captured token before sending and after parsing the response. A changed/malformed/missing token refuses the request or treats the returned outcome as unresolved, invalidates current facts and retains the original retry envelope. No automatic refresh or resend. A same-actor token rotation also requires reopening the workspace and authoritative reconciliation. Nothing infers new grants from a token payload.

Tests cover replacement before submit (zero mutation requests) and replacement while a request is in flight (actual sent Authorization remains old scope actor, response not acknowledged, request retained). This closes the cross-tab token substitution path even if React useAuth has not rerendered.

## Lost-tab and current-state handling

Every newly opened workspace has no current snapshot. Before any new write it requires manual authoritative snapshot/eligibility reads, fully loaded history, and an explicit checkbox reconciling physical cumulative totals against that ledger, including any earlier uncertain attempt. Mutations/refresh reset reconciliation. An existing saved envelope may be retried exactly without being reinterpreted. This does not invent whether physical parts arrived or authorize a changed count. The operator still supplies those facts.

A lost tab can lose sessionStorage retry identity. It cannot restore current state or unlock a new envelope on return. Fresh read and explicit reconciliation are mandatory. Cumulative totals remain replacements, not additive deliveries. A new event after reconciliation is a new reviewed fact, not an automatic retry of unknown old facts. No browser-only cross-device durability is claimed.

Eligibility-fetch failure now has explicit feedback and blocks new receipt/confirmation operations. Mismatched revisions still invalidate current state. No stale positive eligibility, reservation or dispatch claim.

## Evidence

22 enabled browser fixture tests pass, plus a separate disabled-build no-request check. Whole frontend TypeScript check passes. Exact final receiver source SHA256 is recorded in the false-success mutation log: mutant bypasses unpack's success/data guard, targeted test fails; source restored to identical SHA and targeted test passes again. The earlier unbound mutation attempts are not counted as evidence.

One browser-to-real-backend test passes on fresh disposable migrated PostgreSQL with synthetic users/hub/capabilities only. Browser uses real bearer, actual emitted index registration/error/CORS/service endpoints. It records cumulative100/100/0, manually refreshes and reconciles, then explicitly confirms. DB verifies one receipt, one confirmation, zero shipments/payments and unchanged in_production order. Only unrelated cart/analytics shell calls are intercepted. Redis/workers disabled. App processes and disposable DB stop afterward. EN/AR mobile/desktop/focused pixels are from final enabled browser fixture run, and actual-backend acknowledgment state is photographed and inspected.

## Build blocker, not completion

Ordinary full production build did not finish within the120second command window while compiling. A bounded compile-mode retry was killed exit137 with a2.5GB heap. Neither produced a production build. No routes were removed or silently scoped out to make it pass. No production-built browser acceptance, hosted CI, real grants/hubs or operational readiness is claimed. Further build qualification needs a longer-lived or larger execution environment, or separate investigation of the existing whole-app build footprint. The successful browser acceptance uses Next development mode plus emitted backend.

No remote writes, main changes, merge, deploy, live setup, carrier, shipment, status or payment actions. Independent changed-candidate audit and successful production build remain required before calling this UI qualified. The earlier receiver review document is historical baseline context where its identity/multitab limitations conflict with this revision.
