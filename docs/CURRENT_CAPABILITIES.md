# Current repository capability boundaries

This document describes source intent at the review branch, not the deployed service or a launch approval. It supersedes completion and test-count claims in historical reports. Readiness labels are independent declarations, not manufacturing certification. A renderer route does not prove that a seeded editor config has correct faces, usable controls, saved artwork fidelity or production output.

## Source-derived inventory

The block below is checked by `frontend/tests/catalogue-capability-docs.test.ts` in `npm run test:units`. Regenerate it with the exported `catalogueCapabilitySnapshot` function in `frontend/scripts/catalogue-capability-snapshot.ts` after verifying source changes. Do not edit readiness just to make this table look complete.

<!-- capability-snapshot:start -->
Catalogue entries: 55; starting-point design presets: 15.

Preview: in_progress: 31, supported: 1, unavailable: 23.

Production dieline: deferred: 50, supported: 5.

Pricing: estimated: 8, quote_required: 47.

Backend source: 24 module directories, 34 Prisma model declarations. These are code counts, not operational coverage.

Declared dependencies: Fastify ^5.12.8; Next.js ^15.5.18; React ^19.2.6.

| Product ID | Registry preview | Renderer route | Production dieline | Pricing |
|---|---|---|---|---|
| mailer_box | supported | mailer | supported | estimated |
| ecommerce_mailer_box | unavailable | none | deferred | quote_required |
| shipping_box | in_progress | shipping | supported | estimated |
| snap_lock_box | unavailable | none | deferred | quote_required |
| auto_bottom_box | unavailable | none | deferred | quote_required |
| bottle_box | unavailable | none | deferred | quote_required |
| pizza_box | in_progress | pizza | supported | estimated |
| pillow_box | unavailable | none | deferred | quote_required |
| christmas_gift_box | unavailable | none | deferred | quote_required |
| sleeve | unavailable | none | deferred | quote_required |
| folding_carton | in_progress | carton | supported | estimated |
| rigid_box | in_progress | rigid | supported | estimated |
| rigid_magnetic_box | unavailable | none | deferred | quote_required |
| rigid_jewellery_box | unavailable | none | deferred | quote_required |
| rigid_cosmetic_box | unavailable | none | deferred | quote_required |
| rigid_magnetic_cosmetic_box | unavailable | none | deferred | quote_required |
| rigid_wine_box | unavailable | none | deferred | quote_required |
| rigid_magnetic_wine_box | unavailable | none | deferred | quote_required |
| rigid_flower_box | unavailable | none | deferred | quote_required |
| rigid_shirt_box | unavailable | none | deferred | quote_required |
| gift_box | in_progress | rigid | deferred | quote_required |
| paper_bag | in_progress | bag | deferred | estimated |
| cotton_bag | unavailable | none | deferred | quote_required |
| mesh_bag | unavailable | none | deferred | quote_required |
| muslin_bag | unavailable | none | deferred | quote_required |
| paper_mailer_bag | in_progress | mailer-bag | deferred | quote_required |
| poly_mailer_bag | in_progress | mailer-bag | deferred | estimated |
| bio_poly_mailer_bag | in_progress | mailer-bag | deferred | quote_required |
| frosted_ziplock_bag | in_progress | ziplock-bag | deferred | quote_required |
| stand_up_pouch | in_progress | pouch | deferred | quote_required |
| doypack_pouch | in_progress | pouch | deferred | quote_required |
| compostable_doypack | in_progress | pouch | deferred | quote_required |
| recyclable_doypack | in_progress | pouch | deferred | quote_required |
| doypack_valve | in_progress | pouch | deferred | quote_required |
| cup | in_progress | cup | deferred | quote_required |
| smoothie_cup | in_progress | cup | deferred | quote_required |
| tube | in_progress | tube | deferred | quote_required |
| tube_metal_lid | in_progress | tube | deferred | quote_required |
| envelope | in_progress | envelope | deferred | quote_required |
| corrugated_envelope | in_progress | envelope | deferred | quote_required |
| tissue_paper | in_progress | flat | deferred | quote_required |
| packing_paper | in_progress | flat | deferred | quote_required |
| paper_tape | unavailable | none | deferred | quote_required |
| plastic_tape | unavailable | none | deferred | quote_required |
| water_activated_tape | unavailable | none | deferred | quote_required |
| rectangle_label | in_progress | label | deferred | estimated |
| circle_label | in_progress | label | deferred | quote_required |
| square_label | in_progress | label | deferred | quote_required |
| labels_sheet | in_progress | label | deferred | quote_required |
| business_card | in_progress | flat | deferred | quote_required |
| loyalty_card | in_progress | flat | deferred | quote_required |
| thank_you_card | in_progress | flat | deferred | quote_required |
| menu_card | in_progress | flat | deferred | quote_required |
| ribbon | unavailable | none | deferred | quote_required |
| stamp_ink_pad | unavailable | none | deferred | quote_required |
<!-- capability-snapshot:end -->

## What these counts mean

- Catalogue entries are product identities from `shared/catalog/products.ts`, not finished templates or orderable products. The 15 entries in the static starting-point collection `frontend/lib/editor/data/templates.ts` are separate. This count does not enumerate database templates, user designs, future assets or every meaning of "template"; it neither proves nor disproves an arbitrary marketing total.
- Preview `supported` is the registry label for the mailer preview. It is not a production release sign-off. `in_progress` is unfinished; `unavailable` must not display an unrelated substitute box. The model factory in `frontend/components/design-editor/models/BoxModels.tsx` returns an explicit unavailable notice when no route exists.
- Dieline `supported` means a source blueprint path is declared. It does not certify tooling, substrate, fold allowance, bleed, supplier tolerances or finished manufacturing output. The other products remain deferred rather than using a generic box blueprint.
- Pricing `estimated` uses the existing estimate rules, not supplier-approved rates. `quote_required` is not a hidden zero price. Candidate stock codes are catalogue intent, not availability, physical grade or commercial certification.
- Actual seeded editor configuration is a separate dependency. The baseline editor initialization in `frontend/lib/editor/state/store.ts` falls back to six box-like face IDs if structure faces are absent. A 3D route alone does not correct that fallback. The current disposable-database catalogue check found explicit structure faces on eight products: mailer, folding carton, shipping box, rigid box, pizza box, business card, thank-you card and loyalty card. Subsequent scoped candidates add stand-up pouch, frosted ziplock and menu card structures with their own qualification; this original eight-product check is not a current full inventory. Menu card qualification uses its own disposable seeded API and production editor, not live seed application. This is local seeded evidence, not a statement about any live database. Remaining products need product-specific face/edit/save/output qualification before claiming a useful complete editor.
- Existing deployed rows do not gain reviewed structure changes just because code is merged. Applying seed data or a migration requires deliberate environment-specific execution and separate deployment/data authority. Disposable local databases were reseeded during qualification. No live or production database seed was run for this checkpoint.

## Editor and output limits

- Business, thank-you, loyalty and menu card work adds scoped two-face illustrative previews. Menu card has its own seeded faces, white-stock hook, legacy unsupported-face guard/recovery and centered 3D framing; it is not qualified by sibling analogy. This does not qualify wrapping sheets or every flat product. Width 1 is the existing preview coordinate, not stock caliper.
- Artwork on unsupported inside sheet faces remains saved but warns and blocks design output until moved or removed. See `frontend/lib/editor/print-coverage.ts`. A successful save is not proof that every artwork face is represented or printable.
- General design exports are RGB review/reference output. They do not supply certified CMYK conversion, editable artwork layers or production bleed. `frontend/components/editor/export/ExportDialog.tsx` states these limits. The method named `convertRGBtoCMYK` in `backend/src/services/file-processor/processor.service.ts` currently re-encodes JPEG without an ICC CMYK conversion, so its name is not evidence of production conversion.
- Saved artwork review creation has a mailer-specific scope. It is not available for all catalogue products. See `frontend/components/editor/export/ArtworkReviewDownload.tsx` and the design-review backend.
- Physical appearance is illustrative. Stock color, flute, handle, cup and fold geometry require supplier confirmation; no material strength, food-contact or capacity certification is implied.
- `docs/product-family-construction-preview.md`, section "Unresolved performance regression", records an earlier local software-rendered settling probe of 10.42 seconds versus 6.67 seconds at checkpoint `72ed631`. This documentation pass did not rerun that probe, so these are historical recorded timings, not current measured performance. No evidence closing that recorded gap was established here. Stable captures or software-rendered test passes do not establish real-device interaction performance.

## Tests, integration and operational limits

- Frontend units run with `npm run test:units`; backend tests run with `npm test -- --run`. Counts change, so use the exact revision's logs rather than historical totals.
- Hosted CI builds the production frontend and runs the frontend-only compatibility specs selected by `frontend/playwright.compatibility.config.ts`. That config does not include every real-backend product integration spec. Local real-database/browser evidence must stay separate from hosted compatibility results.
- Payment adapters in `backend/src/integrations/payments/egyptian.providers.ts` inherit `EgyptianProviderStub`; its `createPayment`, `getStatus` and `refund` call `fail`, which always throws `PaymentProviderNotConfiguredError`. `backend/src/integrations/providers.test.ts`, case "Egyptian stubs throw a descriptive not-configured error", exercises Vodafone Cash creation. Source shows the same inherited methods for Fawry, InstaPay and bank transfer; that test alone does not individually execute all four. Filling environment names alone does not implement those providers. Stripe integration presence is not proof of live merchant onboarding, credentials, settlements or refunds.
- Source bootstrap in `backend/src/workers/index.ts`, functions `startWorkers` and `getBackgroundWorkerStatus`, checks Redis readiness, imports email/settlement/reminder/marketing worker modules and imports export definitions without calling an export factory. `backend/src/index.ts` calls bootstrap in the API process. `backend/src/workers/worker-status.test.ts` tests disabled boot then Redis recovery reporting `not_started_restart_required`, plus post-bootstrap Redis loss reporting a non-ready status. These are source/test contracts, not an observation of a live worker fleet. A healthy HTTP process does not prove every job is being processed.
- Source counts, tests and documentation do not establish deployment, live external connectivity, paid-order readiness or completion of the whole project. Unmerged review branches also do not fix `main`.

## Next qualification boundaries

Prioritize actual saved-product contracts over adding more marketing names: identify missing structure faces, validate the intended product shape/material from grounded requirements, then test edit/save/reload/output and inspect real mobile/desktop pixels. Keep unresolved product semantics explicit rather than extending a nearby card or box by assumption. Production and commercial approval remain separate work.

## Exact source checks for these caveats

- `frontend/components/editor/export/ExportDialog.tsx`, RGB-only warning in the export-options section: no CMYK conversion, editable artwork layers or production bleed in this general design-export UI. This wording does not claim that every unrelated export path has identical behavior.
- `backend/src/services/file-processor/processor.service.ts`, `convertRGBtoCMYK`: calls `sharp`, metadata validation and JPEG encoding; no ICC profile or CMYK conversion is invoked in that method. No image-color conversion experiment was run in this documentation pass.
- `frontend/components/editor/export/ArtworkReviewDownload.tsx`, non-mailer/no-file branch and F42 dimensions notice: new saved-review creation is restricted, while an already returned file can still be downloaded. This is distinct from a generic product-wide ban on all downloads.
- `frontend/lib/editor/print-coverage.ts`, `unsupportedSheetArtwork` and `unsupportedArtworkOutputMessage`: saved inside-face layers on two-face sheets produce the shared output warning. Real save/reload and current-face PNG denial were separately checked in the reviewed loyalty browser scenario, not newly rerun in this documentation pass.
