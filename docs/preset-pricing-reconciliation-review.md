# Bounded preset pricing reconciliation

Local review candidate only. No push, integration, merge, deployment, checkout or order submission. Existing rates remain supplier-unconfirmed prototype estimates, not approved commercial prices or launch readiness.

## Commit boundaries

- Artwork/save/cart handoff: unchanged local commit `23d18e084ec7c50218a70ac8f945a8f73e16a951`.
- Generic margin selector: separate local commit `0d1d7ff297fec5bdab85ced26f14a27ebef03075`.
- This editor reconciliation is a further separate commit on `review/mailer-catalog-price-reconciliation`.

## Original discrepancy

For the same f42 kraft variant, 115 x 70 x 38 mm and quantity 30, the generic editor calculator returned EGP 397.59 while catalog/cart returned EGP 409.99. Material, conversion, shipping, dimensions and quantity matched. The generic lookup selected a newer pizza product conversion rule because it did not filter rule scope or type, then used its existing 30% code fallback. Catalog selected the mailer's existing 35% margin row. The global default margin row was also already 35%.

The generic selector patch constrains the query to productType scope, null scopeId and margin type. It changes no rate, fallback value, date or quantity policy. Its three regressions cover unrelated newer scoped/non-margin rows, inclusive quantity bounds/date validity/newest eligible selection, and the unchanged no-rule 30% fallback. The contamination regression failed before the patch and passed afterward.

A selector fix alone cannot make the two engines equivalent: catalog has product conversion rules, option markups and bulk factors that differ from generic conversion heuristics. The editor now uses the same catalog path as the preset-backed cart rather than changing numbers to make one example match.

## Strict editor bridge

All three editor price surfaces use one shared adapter and the existing catalog detail/quote endpoints:

- Right sidebar summary.
- Shared Add-to-Cart dialog.
- Price Calculator and its comparison quantities.

The bridge only prices the supported mailer preset flow when current product, variant, SKU, unit-normalized dimensions, material, selected size/finish and print mode match live catalog data. Unknown option families or metadata, custom dimension mismatches, mismatched materials, unsupported print choices, finishing, lamination, adhesive requests and non-default flute requests are unpriced. Other product families remain unpriced by this bridge. There is no fallback to the generic calculator and no public API or config-schema expansion.

Every pinned material/size/print-side/print-mode/finish string is sent in the quote and cart option map. Adding a design name extends that map instead of replacing saved options. The existing server still owns the final cart price.

New preset initialization maps catalog none/mono/full_color to explicit editor No print/One Colour/Full colour (preset) choices. This does not migrate restored saved requests. A saved One Colour request attached to a print-none variant stays One Colour and quote-required. Unknown print modes are not guessed. Product and variant switching use new preset initialization; session restoration preserves authored choices.

Shipping-inclusive totals and per-unit estimates remain labelled as such in the summary/dialog. The Price Calculator's merchandise unit price and quantity comparisons explicitly exclude shipping and show shipping separately. Response identity/options/dimensions are checked, stale responses are discarded, old prices disappear immediately when pricing inputs change, unavailable prices have a retry, and submission is disabled without a current valid quote.

## Verified parity, not commercial approval

One freshly cleared cart item, the same saved-artwork f42 kraft preset:

| Quantity | Merchandise | Shipping | Editor surfaces and cart total |
| --- | ---: | ---: | ---: |
| 30 | EGP 334.99 | EGP 75.00 | EGP 409.99 |
| 100 | EGP 1060.81 | EGP 150.00 | EGP 1210.81 |
| 300 | EGP 3014.94 | EGP 400.00 | EGP 3414.94 |

All are zero-tax estimates from existing rows. These figures document computational parity, not which rates a supplier should charge. Existing-line merges, multi-item totals, custom configurations and checkout were not certified.

## Separate unresolved tax finding

`CartService.enrichItem` sets item.totalPrice to breakdown.subtotal + breakdown.tax. `toCartResponse` then sums those item prices and adds summed tax again. This source finding is unresolved. Neither cart/tax semantics nor tax settings were changed.

The strict editor adapter refuses nonzero-tax responses, visibly reports quote-required and blocks continuation. It does not zero the tax or display a tax-free replacement. This is only an editor guard, not a server fix or global protection: direct cart calls, other clients, existing carts and later cart operations remain outside it. The bridge also rejects a rounded quote total that would not equal the current zero-tax cart's rounded merchandise plus shipping.

The existing catalog service's variant-first dimension precedence and material-alias behavior remain unchanged. Strict matching prevents this editor flow from silently using those fallbacks for mismatched custom requests. It does not repair other callers.

## Verification

- Backend production build passed for the isolated selector commit.
- Three selector regression tests passed, including a demonstrated pre-patch failure.
- Frontend TypeScript check passed.
- All 219 frontend unit tests passed, including preset matching/rejection, print mapping, response mismatch, rounding and nonzero-tax guards.
- Complete frontend production build passed with a lower process memory ceiling. An earlier attempt was memory-killed after compilation and is not counted as a successful build.
- Ten native browser cases passed in bounded groups of 5, 1 and 4, without changing the API rate limit. The first combined expanded run exceeded the existing 100-requests/minute cap; its incomplete cases were not counted. Each group used isolated local PostgreSQL/Redis/backend/frontend lifecycles and a dedicated QA account.
- Prior five handoff cases still pass: shared triggers, keyboard/modal safety, current-artwork saves, save/cart failures, edits during save/response, genuine reload and external session navigation, quote guards and normal guest sign-in return.
- New cases cover all three price surfaces and real saved-artwork cart at quantities 30/100/300; unsupported dimensions/material/options; saved print restoration and product/variant switching; quote failure/retry and stale responses; and nonzero tax with zero cart POSTs.
- The newer-edit test waits for the actual saved session ID to reach the URL before checking the cloud snapshot; it still verifies old saved artwork versus retained newer local artwork.
- Inspected actual screenshots of all three prices together, preserved saved One Colour selection with disabled continuation, and the nonzero-tax quote-required state. Screenshots disable finite animations to avoid capturing a transient closed panel/dialog.

No rate rows, readiness declarations, API contracts, cart/tax semantics or rate limits changed. No production customer account, payment or order was used.
