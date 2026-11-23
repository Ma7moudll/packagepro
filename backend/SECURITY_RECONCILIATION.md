# Security review reconciliation

Reviewed main `18c15de8d01a908e0d3d6f3522db837f3678e759` against the combined
PR30 candidate. Main remains unchanged, so findings about main were valid.
The earlier green result described PR30, not deployed code or unchanged main.

| Reported finding | Combined candidate status and evidence |
|---|---|
| CAPTCHA accepts any string | Fixed before this review. `auth.service.ts` invokes server verification when challenged. `captcha.service.ts` requires Google success, login action, configured hostname, score threshold and fresh challenge timestamp. Unit tests cover invalid/malformed/outage responses. Real configured Google login is still a staging prerequisite. |
| Payment confirmation lacks ownership | Fixed before this review. Controller passes authenticated actor; Stripe service checks owning order before provider lookup. Real HTTP regression rejects another customer. |
| Client payment currency and provider mismatch | Fixed before this review. Server derives amount from order and currency from server config. Tests reject Stripe amount, received amount, currency and order metadata mismatches, and local payment-total mismatch. HTTP creation ignores client currency. Stripe calls are controlled test doubles, not live-provider certification. |
| Shipment authorization | Fixed before this review. Admin-only creation matches SPEC010; tracking/order-shipment reads require owning customer or admin. HTTP/service negative tests and owning-customer positive test cover these paths. Vendor label-printing is a separate capability, not permission to buy a new label. |
| Duplicate carrier labels under concurrency | Fixed before this review. Unique database shipment reservation precedes carrier call. Concurrent requests yield one provider call; ambiguous carrier errors retain a failed claim and refuse blind retry. Manual carrier reconciliation remains necessary after uncertain results. |
| Public approval requests and duplicate proof/email | Fixed before this review. Admin guard precedes service; row lock plus durable order-metadata claim permits one request. Anonymous/customer route tests refuse before proof/email; concurrent admin test yields one proof/email. Claimed failures intentionally need reconciliation rather than automatic resend. |
| Redis security fail-open | Auth operations already refused missing/unready storage. Regressions cover every auth storage method and runtime errors. This review additionally fixes the connection lifecycle: retain one client, exponential backoff capped at30s, no offline buffering, readiness only after Redis ready. Real isolated outage/recovery was tested twice within one application process. |
| Approval links not saved when Redis fails | Confirmed residual and fixed in this review. PostgreSQL stores hashed, expiring approval capabilities before generator returns a link. No raw token is stored in that table. Verification does not need Redis; consuming a token and advancing order are one locked transaction. Real database tests cover expiry, invalid token, unavailable persistence and concurrent single-use approval. |
| PO read ownership | Fixed before this review. Owning vendor or admin only, checked in service before returning the assembled data. Customer/foreign vendor/anonymous HTTP cases refuse; owning vendor/admin HTTP cases pass. Customer access is not silently broadened to internal PO details. |
| CI hides test/lint/audit failures | Fixed before this review. CI uses actual frontend test:units, explicit frontend TypeScript, fail-propagating backend/frontend test/lint/build/audit commands and PR Docker builds. No audit suppression. |
| Deployment health fails open | Confirmed residual and fixed in this review. Required health script propagates failed HTTP/connectivity/timeout exit codes. It checks the actual backend `/health`, replacing the earlier nonexistent `/api/health`. This is liveness, not database/provider readiness. No deployment was performed to test it. |

## Rollout and remaining limits

- Apply schema migration `20261121164000_durable_approval_tokens` before using
  the new token code. Validate it against a backup/staging database first.
- Already-sent Redis-only approval links are not magically migrated. Reconcile
  and reissue those under operator authority before retiring the old release.
  Preserve existing approval request claims until that reconciliation is done.
- Approval tokens expire in seven days and are consumed with the order transition.
  Email/proof failures retain the duplicate-prevention claim for reconciliation.
- Redis persistence/HA is still an operational prerequisite for auth counters
  and refresh revocation state. Reconnect does not reconstruct data lost by the
  Redis service. During an outage security operations refuse, rather than bypass.
- Final provider configuration, real Google CAPTCHA, actual Stripe/carrier/email
  staging checks, production tax settings and visual acceptance remain separate
  release prerequisites. A green test run does not prove every route secure.
- No merge, production deployment, production data update, live charge, carrier
  purchase or external email was performed during reconciliation.
