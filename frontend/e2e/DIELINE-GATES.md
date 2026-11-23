# Dieline qualification gates

## Automated frontend presentation gate

`npx playwright test --config=playwright.compatibility.config.ts`

The existing frontend CI compatibility gate includes `dieline-presentation.spec.ts`.
It needs no database or provider credentials. It checks EN/AR nonzero-origin
carton fit, resize fit, actual SVG download, runtime status wording and the
historical overlap notice. It operates the real editor/store with seed geometry.

## Manual disposable-local history gate

`npx playwright test --config=playwright.dieline-history.config.ts`

This is a manual local integration gate, not part of the frontend-only hosted
compatibility job. Before running, install frontend/backend dependencies, build
the frontend, and start the real backend on port 3000 with a migrated and seeded
**disposable local** database and Redis. Export the same backend test environment
into the Playwright process, including `NODE_ENV=test`, `EMAIL_PROVIDER=test`,
`PACKAGEPRO_DISPOSABLE_E2E_DATABASE=yes`, and a `DATABASE_URL` whose database name
starts `packagepro_e2e_`. `local-customer-fixture.ts` validates that the database
host is local before creating any users. Never point this gate at a live account
or database. The backend also needs its ordinary test JWT and provider-stub
configuration. The config starts the built frontend on port 3001.

The gate uses real API registration/verification, cloud design load/save,
IndexedDB fallback, the real Zustand store, undo/redo, product configuration
initialization and SVG download. Its two pre-change fixtures were captured from
the old geometry resolver. Rigid's old and current geometry agree, so it tests
carrier-state consistency and coherent export, not divergent historical mode.
The enlarged mailer fixture does exercise divergent historical mode and unsafe
export blocking. No test changes manufacturing topology or catalogue defaults.

The narrow state fix was mutation-tested by restoring the uncorrected Muse rev2
store: both history cases failed at the first dimension edit because the live
carrier survived while `history.present` had cleared it. Corrected production
builds pass that same assertion and the remaining history flow.

## Limits

These gates do not certify physical SVG scale, manufacturing sufficiency or
historical delivered-artifact identity. Serializer-version markers do not prove
that old delivered bytes are unchanged. The current SVG dimensions remain
unitless. Pre-existing `resetHistory` return-only behavior is outside this fix.
