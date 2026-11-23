# Admin directory query contract, local candidate

Base PR70 head1b0fddb920e813348da44b901247bf215080ffb9/tree70e55a98d5e44a5a8d4e819ca60bb13c811962a7. PR70 currency/reporting changes inherited without editing calculations or UI. Delta: shared admin list parser, narrow controller query/orderBy changes, dedicated isolated tests/config/docs. No dependency on PR71/72/73. No migration, provider/account/workflow policy or frontend runtime change. No publication approval.

All four ADMIN lists (/admin/orders, vendors, customers, samples) previously used parseInt and clamps; NaN/repeated/invalid statuses could500 or silently broaden filters. Supplied query values now strictly validate and give400 via the real public application error handler. Defaults remain1/20, valid limit1..100; invalid values are rejected, not clamped. External clients relying on zero/negative/fractional/partial or >100 coercion must correct requests. Maximum offset2147483647 checked before ORM. Search must be one string up to200 characters, trimmed; whitespace/empty preserves unfiltered search. Orders and samples statuses match current enums. Vendor active must be exact true/false; malformed/empty active no longer silently means all. Unsupported filter keys remain ignored as before; this is not a universal query schema.

Unique iddesc ties added after existing createdAtdesc (directories), or statusdesc/updatedAtdesc (samples), preserving sample queue ordering. Deterministic only on static datasets, no snapshot/cursor stability under concurrent inserts/updates. Existing auth gates unchanged. Reporting/count calculations and currency grouping remain PR70's. All queries are reads.

63 real Fastify/auth/PostgreSQL cases and backend types pass. Four-route ADMIN/customer/vendor/unauthenticated contract, defaults, invalid pagination/repeated/exponent/overflow values, status row/count parity, active filter, search/repeated/length, exact tied timestamp sequence, maxoffset empty pages, complete user/customer/vendor/order/PO/production/sample snapshots unchanged and overview response unchanged across reads. Synthetic totals only, not real metrics.

Unmodified PR70 controller fails53/58 earlier cases; removing status predicates fails2, search predicates2 and tie-breaks4. Restored58 then five boundary/read-only assertions gives63. Full broader backend/frontend/browser/hosted checks not claimed. Parser errors can be logged through the existing global handler's URL logging; no new logging behavior is introduced and privacy of query diagnostics is not newly qualified.

Run with PACKAGEPRO_ADMIN_QUERY_ISOLATED_DB=yes, fresh local empty database packagepro_e2e_adminquery_<alnum>, migrations and synthetic JWT env, then `npx vitest run --config vitest.admin-list-query.config.ts`. Guard rejects nonlocal/wrongname/nonempty user/order/sample state. Cleanup scopes to created fixture IDs. Default discovery skips without opt-in. Actual admin clients use20-row pages, valid enum/active values and optional search; no UI change or browser acceptance supplied.

Customer queries are separate PR73. Production aggregation, payment/provider/shipping choices and other workflow gaps remain open. No merge/deploy/live enablement.

## Trim and client enum evidence amendment

Padded-term HTTP matches now assert the actual expected order/customer, and whitespace-only search explicitly returns all three fixture rows. Existing controller trim is redundant with the new parser trim: HTTP alone does not bind the parser's trim line. Direct parser assertions within the same cases bind normalized padded/whitespace values. Removing only parser.trim now fails both cases, restored63pass. No runtime amendment.

Current admin order select's eight values are all valid OrderStatus members, but it omits ready_for_routing, quality_check and ready_to_ship. Thus current offered filter values remain compatible, NOT full lifecycle filter coverage. This candidate neither adds missing UI values nor claims complete admin workflow acceptance. Other client active/status values were checked against current enums; frontend runtime remains unchanged.
