# Explicit EGP pricing bootstrap

This is an operator step, not an automatic migration or full development seed.
Do not run it against production without reviewing its dry run and approving the
rate card. Back up the database first. No production data was changed by this PR.

## Built production image

After schema migrations, inspect the plan using the same backend image:

```sh
docker compose run --rm backend npm run pricing:bootstrap:egp
```

Dry-run is the default. It prints each proposed material insert/replacement and
any conflicts. Review the numeric EGP prices, not only the currency labels.
Apply only after review:

```sh
docker compose run --rm backend npm run pricing:bootstrap:egp -- --apply
```

The compiled command is `node dist/scripts/bootstrap-egp.js`. Docker copies
`dist`, including the shared JSON rate card, so it does not need tsx or a source
checkout. This command does not run during ordinary startup. Compose still runs
schema migrations then the application, never the full seed.

## What it changes

- Inserts missing material rows with the numeric EGP rate card already supplied
  by the Egyptian seed. This is a replacement rate card, not FX conversion and
  not a promise that commercial rates remain current. Review before rollout.
- Replaces an old USD rate only if code, name, old numeric price, and original
  `metadata.source=seed` all match the recorded legacy seed fingerprint. Records
  the prior numeric rate in metadata. Preserves inactive status.
- Keeps existing EGP rows, including customized prices, unchanged.
- Refuses active customized/non-EGP rows and conflicting material names. No
  partial apply is committed. The operator must provide an approved EGP rate for
  each conflict; do not relabel USD or guess an exchange rate.
- Does not touch orders, payments, settlements, carts, catalog products,
  discounts, custom pricing rules, user accounts or tax settings.

Both pricing entry points refuse non-EGP material cards. This deliberately
blocks an unmigrated quote instead of allowing EGP cart totals to contain a USD
material rate. Existing non-EGP financial records need their own reconciliation,
not this bootstrap.

## Fresh installations

Schema migrations alone create no catalog. This command enables material-based
pricing, not a complete storefront. A new shop still needs approved product,
variant and pricing-rule data. `npm run prisma:seed` is a development/demo setup
only: it also creates sample accounts and can replace custom product settings.
Do not use that seed as a production startup command.

## Checks performed

On isolated PostgreSQL databases with all migrations: fresh insert, exact legacy
USD replacement, dry-run no mutation, idempotency, customized EGP preservation,
customized USD atomic refusal, and real numeric EGP quote. The default-margin
fallback is used when no approved pricing rule exists. No live data or provider
transaction is part of those checks.
