# Cart-only tax response correction

Local, unpushed review change following `fc26876154690d9d0751487dabe883f5fbc3d98b` on `review/mailer-catalog-price-reconciliation`. This is not a commercial-rate approval or financial-readiness claim. No checkout, order, invoice, payment, rate, tax-setting, discount or shipping-grouping changes are included.

## Response contract

Cart item `totalPrice` is now the rounded quoted line subtotal before tax and shipping. Display `unitPrice` is that line amount divided by quantity and rounded to cents. It must not be multiplied back into quantity to reconstruct the authoritative line amount, because display-unit rounding can lose or add cents.

`summary.subtotal = sum(tax-exclusive line amounts)`

`summary.tax = sum(line taxes)`

`summary.shipping = sum(existing line shipping estimates)`

`summary.total = subtotal + tax + shipping`

The existing pricing engine still owns adjustments, discounts, rates and tax calculation. This patch consumes its quoted post-adjustment subtotal rather than rebuilding it. The existing shipping split is unchanged.

This deliberately corrects nonzero-tax response semantics: line prices and summary subtotal no longer contain tax. Zero-tax responses retain the same amounts. Shared CartItem and CartSummary comments now state the convention explicitly. The cart summary UI already renders subtotal, tax and shipping separately; the provider/store pass server amounts through.

## Minimal code repair

`CartService.enrichItem` previously added breakdown.tax to breakdown.subtotal when constructing the line amount. `toCartResponse` then added that tax a second time. The construction now uses only breakdown.subtotal. The existing summary formula remains unchanged, as do cart mutation/ownership/quote guards and all pricing/shipping services.

All add, merge, update and removal responses still return through the same getCart enrichment path. No persisted price migration is needed for this cart response calculation, because cart items are priced again on retrieval. This statement does not cover stored order amounts.

## Demonstrated regression and verification

Before the repair, six of the initial nine new contract tests failed on tax-inclusive line/summary amounts; the zero-tax and empty-cart cases passed. The final suite has ten cases, including an additional check that quoted discounts and adjustment breakdowns are unchanged.

Independent reproduction against compiled CartService code with in-memory dependencies:

| Synthetic case | Expected | Before | After |
| --- | ---: | ---: | ---: |
| Generic: subtotal 100, tax 10, shipping 5 | 115 | 125 | 115 |
| Catalog: subtotal 100, tax 10, shipping 5 | 115 | 125 | 115 |
| Mixed lines: subtotal 150, tax 15, shipping 12 | 177 | 192 | 177 |
| Zero tax: subtotal 100, shipping 5 | 105 | 105 | 105 |

These are synthetic tax fixtures, not evidence that a particular tax rate applies to a real customer. No business tax setting or database rate row was changed to run them.

Verification completed:
- Ten cart-contract tests passed: generic/catalog positive tax and zero tax, mixed lines, discount preservation, cent/display-unit rounding, new-line addition, merging, quantity changes, removal and clearing.
- Twenty-four targeted backend tests passed across the new suite, existing design ownership/quote guards, generic margin isolation and shipping split regressions.
- Backend production TypeScript build passed.
- All four independent compiled-code reproductions now pass; previously the three nonzero-tax cases failed.
- Frontend TypeScript and all 219 frontend unit tests passed. Frontend runtime code is unchanged in this patch; the previously verified production artifact was used for native regression checks.
- Seven native cases passed against the rebuilt backend in separate groups of five and two: the prior artwork/save/error/reload/guest handoff cases, all-three-surface/cart parity at quantities 30/100/300, and the retained nonzero-tax editor guard with zero cart POSTs. Existing local API rate limits were not changed.
- Zero-tax parity stayed EGP 409.99, EGP 1210.81 and EGP 3414.94 for the tested quantities. These remain supplier-unconfirmed prototype estimates.

## Deliberately unresolved

The analogous order aggregation is still unresolved and was already identified by FIN-01 in `MASTER_EXECUTION_PLAN.md`. This patch neither edits nor certifies order creation, checkout, payment totals, invoices, stored orders or reports. Cart-only correction cannot establish end-to-end financial consistency.

The editor's nonzero-tax quote-required guard remains unchanged. It is not lifted by this cart repair. The strict preset/custom-configuration limits from the earlier reconciliation also remain unchanged. Earlier review notes describe the state at their own commit; this note updates only the cart-response tax finding.

No push, merge, integration, deployment, real-customer payment or order submission occurred.
