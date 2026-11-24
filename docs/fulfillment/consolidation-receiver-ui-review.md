# Receiver workspace candidate

Separate local delta on reviewed HTTP tree2aa943e95a738cf1a4bbede51b1634d8334edd77. No backend changes. Direct /receiving route, no navigation link or role inference. NEXT_PUBLIC_CONSOLIDATION_RECEIPTS_ENABLED defaults false in example configuration. Backend flag and explicit receiver capability remain independently required. No real assignments or hub setup.

## Behavior

Signed-in actor opens a fixed order/hub workspace. Actor changes block the session until reload. No automatic reads, polling or postcommit refresh. Manual refresh fetches snapshot then eligibility; revision mismatch invalidates current state, failure does not leave a positive eligibility claim. current:false never enables receipt editing/confirmation. Planner-only read access remains denied by the backend.

Receipt inputs describe cumulative totals, not this delivery. Required allocation quantities and item/PO IDs remain visible. Counts use nonnegative integer bounds and accepted+rejected<=received. Required reason is submitted but server audit reasons/actors remain unexposed in history. Input values remain after errors. The client cannot create manifests or grants.

Before sending, the exact request envelope is stored in sessionStorage, keyed by actor/order/hub. Storage failure sends nothing. Receipt event key is generated once for that envelope. Uncertain responses,409 and success:false retain that exact request and lock edits. Retrying sends identical facts/key, including after page reload in the same browser tab session. Confirmation retries also keep exact revisions. A successful response clears the retry but invalidates current UI state; manual refresh is required before another operation. A failed subsequent refresh never revokes the earlier acknowledgment or invents current facts.

This is tab-session persistence, not durable cross-device recovery. Closing the tab/browser can lose it; the workspace says so and warns on unload while unresolved. No retry from another tab is recommended. Local clearing is offered only after a successful manual read and an explicit reconciliation confirmation; clearing never undoes a server event. Saved request details can be inspected locally. No data is put in URLs or persistent localStorage by this workspace.

Confirmation needs complete loaded receipt history, latest current-manifest counts exactly accepted, no reject/excess, and a separate review checkbox. Any mutation/refresh resets that checkbox. Server remains authoritative and rechecks revisions/completeness. A page with more history cannot enable confirmation until continued. Mismatched continuation revisions invalidate the snapshot instead of mixing facts. Eligibility is always labeled an observation, never reservation or shipment creation.

## Focused shell

Only the receiver path gets compact header and omits marketing footer/floating simulated support. Other paths retain their shell. Development indicators are disabled when this explicitly experimental UI flag is true, avoiding dev-overlay input obstruction in local review. No overflow masking is used. Operator content wraps at320px. EN/AR scrolled focused Received input is center-hit-tested, photographed and visually inspected; no overlay covers its label or input.

## Evidence and limits

18 enabled route-mocked Playwright cases pass, plus a separate disabled-build case proving no consolidation request: stable uncertain retry across reload;409; success:false; acknowledged mutation then refresh failure; stale source blocking; six EN/AR320/390/1440 layouts and no extra background reads; explicit confirmation with complete snapshot; receiver403; storage-before-send failure; two focused-input states; matching and mismatched pagination. The whole frontend TypeScript check passes. Scratch mutations accepting false success, removing stale-source gating and replacing retry event identity fail targeted assertions; source restored and full18suite rerun. Screenshots contain synthetic data only.

These are real rendered browser interactions against controlled HTTP fixtures, not a UI-to-live-backend integration or actual fulfillment acceptance. Reviewed backend23HTTP/39service/38model evidence belongs to the unchanged HTTP baseline. No frontend production build, hosted CI, auth lifecycle, multiple-tab coordination, actual accounts/hubs or physical receiving is claimed. No carrier/status/payment/dispatch wiring, access expansion, remote writes, main changes, merge or deployment.

Remaining before use: independent UI/source/retry audit, actual permitted receiver/hub setup through a separate authorized workflow, and synthetic browser-to-real-backend acceptance. Review whether tab-scoped retry persistence meets operational expectations before enabling. No broader planner/audit history policy is inferred.
