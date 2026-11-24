# Session conflict disposition

Local only. No publication, deployment or activation.

## Reachability

The rendered editor calls ensureCloudSession, which creates an unbound session with name only. Its API proxy likewise omits orderId. The legacy DesignService.createSession(orderId) wrapper has no application consumers in the examined source. Thus the new same-order creation conflict is not currently a rendered-editor entry path. Backend PostgreSQL coverage now checks concurrent same-order starts, one design row, and a usable explicit retry preserving existing designData. A stale successful session can still be rotated by a later same-order request; no automatic adoption/reload of another session was added.

## UI issue fixed

Manual Save previously saved IndexedDB, swallowed a cloud error, and displayed Saved. It now retains a persistent EN/AR notice explaining that a copy is saved on this device only, keeps the design in the editor, and offers explicit Retry save. A successful cloud save clears the notice. No automatic retry, session switch or artwork replacement. The cloud failure still returns through finally so Save is enabled. Autosave remains local-only, and cannot clear this notice. This is a bounded fix for manual Save, not a complete save-status redesign across cart/export/autosave.

## Evidence

95 local disposable PostgreSQL cases pass. Eight Chrome UI cases pass at 1280, 320, 360 and 390 widths in EN/AR with controlled session409 followed by success. They assert retained in-memory state and IndexedDB artwork, no save/automatic retry on conflict, enabled Save, one explicit retry, and original artwork in the successful save payload. These API responses are synthetic and do not demonstrate a real frontend-to-backend race. Screenshots inspected for visible notice/button, wrapping and EN/AR layout. Frontend typecheck passes. Build passes using a temporary single-worker setting, restored afterward; initial development-server/default-build attempts exceeded local resources. No production config change.

## Next meaningful gap

An operator-visible authenticated reconciliation/disposition path is the most useful next finite slice: expose durable unknown/started evidence read-only and explain why edits/cancellation are blocked, without any retry-create, refund or carrier cancellation. The current post-attempt generic transition block has no operator resolution. Real reconcile decisions and permission, provider lookup/cancel, payment policy and recovery/outbox remain separate gates. Hub/global capability/directDB and legacy webhook/Stripe boundaries remain open. Full candidate still depends on prototype schema and is not runtime-isolated; no deployment is authorized.

## Manual local-failure correction

If an earlier cloud conflict is followed by a manual IndexedDB failure, the old local-copy-success notice is now replaced. The notice says latest changes could not be saved on this device or sent to the account, artwork remains in the editor, keep the page open and retry. Earlier stored revisions may still exist; no claim of deletion or successful latest persistence is made. EN/AR tests inject IndexedDB put failure after a cloud409, assert no additional cloud call, retained editor artwork, enabled retry, then recover. Separate500 cloud-failure cases preserve the local-only wording. Four added Chrome cases pass. Original eight conflict width/language cases also each passed on this build, but a combined12-case invocation hit the execution timeout before final summary; the four added cases were rerun separately to completion.

Negative controls modify the exact built editor bundle, not source: removing the local-issue replacement fails the prior-conflict/local-failure test; reinstating cloud-error fallthrough without a notice fails the500 test. Bundle restored, positive four-case rerun passes. These are two targeted emitted-code negative controls, not independent source mutants.

Autosave scope: EditorHeader calls scheduleAutoSave with saveToCloud=false,30seconds after dependencies change. It is local-only here; its onSaved/onError update the small status pill, not the persistent manual-save issue notice. The helper's optional saveToCloud=true branch exists, and saveDesignToCloud can catch a cloud error and fall back locally; this broader helper behavior is unchanged and not covered as cloud success. This correction does not claim a global autosave/cloud-status redesign.
