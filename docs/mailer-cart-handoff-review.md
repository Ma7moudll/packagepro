# Supported mailer handoff, local review candidate

Base: accepted checkpoint 65e98d5. This change is local, not integrated or deployed. No prices, rates, readiness flags, checkout/payment/order submission or renderer source changed.

## Reproduced defects

- The sidebar Continue button was enabled but had no action.
- A cart failure appeared only in the console.
- An existing session bypassed saving current artwork, leaving the cart linked to an older design.
- Updating the URL after the first cloud save could trigger a late cloud restore and overwrite a newer edit made during the handoff.

## Scope

The header and sidebar open one existing cart dialog. Every authenticated cart submission saves through the existing cloud-session contract, including an existing session. Save failures and local changes during the save stop before cart submission. Cart failures have visible feedback and warn that an update could not be confirmed, rather than promising a failed response means nothing was added.

A local content fingerprint compares authored model/artwork/background/product data across the save/cart await points. It ignores display selection, camera and equivalent cloud-rehydration object identities. This is not a server revision token or a cross-device locking guarantee. If newer edits arrive after a successful cart request, the editor stays open and says only the saved version was added. A second submission is disabled until that dialog is dismissed. Modal fields and background editor keyboard shortcuts are disabled during the operation.

The mounted EditorPage has a one-shot marker set only by its own successful cloud-save callback. It prevents the resulting URL update from being mistaken for an external restore. A new page/reload has no marker; navigation to any different session consumes/clears the marker and performs the normal restore. No URL skip flag or authentication bypass was added.

## Verification

- Exact accepted source reproduced the missing action, invisible cart failure and stale-artwork link before editing.
- Full frontend build passes; TypeScript passes; all 214 frontend unit tests pass.
- Five native browser tests pass on isolated local QA accounts/data. Tests stop at cart, never an order/payment.
- Tests cover both dialog triggers, save failure with zero cart requests, visible cart failure/retry, existing-session edits, a controlled edit during an awaited save with no cart submission, successful current-artwork cart linkage, a controlled newer edit during the cart response without navigation/data loss, quote guards, real reload, external A/B session navigation and normal SPA guest sign-in return.
- Actual cart item product/variant/SKU, dimensions, quantity, material, design reference and saved LATEST artwork were inspected. The saved manifest matches the product/SKU/dimensions. This is canonical product/dieline configuration coverage, not a new admin-template approval.
- Native dialog error, newer-edit warning and cart screenshots were visually inspected. No claims about guest recovery after a hard refresh, production prices, manufacturing approval or general concurrent-device editing follow from this test.

## Explicit limitations

The existing quote and cart estimates disagree for the same tested 30-unit kraft mailer: editor/dialog EGP 397.59, cart EGP 409.99. This was present before this change. Neither number is established as commercially correct. The difference needs a separate read-only pricing-path diagnosis and approved reconciliation scope. This handoff fix is not a price-consistency or launch-readiness approval.

During local QA cleanup, browser cross-origin DELETE /cart failed its preflight while a direct authenticated test request succeeded. The test cleanup uses the direct request on the isolated QA account. No CORS fix is included, and this local configuration finding does not establish production behavior.
