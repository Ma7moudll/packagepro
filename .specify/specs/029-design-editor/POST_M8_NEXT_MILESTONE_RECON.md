# §1. Purpose & Scope

This is a RECONNAISSANCE-ONLY report. It resolves, from repository-authoritative
sources, what the legitimate next milestone / work package after M8 (design editor,
closed at `fcaf773`) actually is, without implementing, committing, or inventing an
"M9". M8 is treated as final and closed. No source/test/migration/config was
modified; the only artifact produced is this report.

Rule used for classification: a candidate must be **explicitly connected** to the
project roadmap / milestone plan to qualify as authoritative next (Class A).
Generic directives ("post-M8", "deferred", "TBD next sprint") are Class B/C — NOT
an authoritative next milestone.

# §2. Repository-Authoritative State

| Source | What it says |
|--------|--------------|
| `git log` | 14 commits `3748b71` (Specify template) → `fcaf773`. Commit `ea89acb` = "SPEC-029 baseline work-in-progress"; `feat(spec-029)` chain for M8-I/M8-J; HEAD `fcaf773` "complete M8 product coverage". No M9 anywhere. |
| `AGENTS.md` (SPECKIT block) | **Current Feature: SPEC-029 End-to-End Marketplace Implementation**; Plan = `.specify/specs/spec-029-marketplace-implementation.md`. |
| `.specify/specs/spec-029-marketplace-implementation.md` | Full 5-phase / 12-week P0 plan (508 lines). Status "Planning", Priority P0 — Critical Path, Dependencies "All prior SPECs (001-028)". Contains §1 Current State, §2 Roadmap (Phase 1 Connect the Frontend → Phase 5 Polish & Scale), §3 API contract, §4 Risk, §5 Success Criteria, §6 File Map, §7 Effort (81 dev-days), §8 Quick Wins. |
| `.specify/specs/029-design-editor/` | The ACTUAL M8 feature work: `spec.md` "Feature Specification: Design Session Management (2D/3D Editor)", branch `001-design-editor`. M8_SPEC §21 Deferred Scope, M8_TASKS deferred backlog, M8-J reports. Committed under `feat(spec-029)` messages. |
| `.specify/specs/README.md` | 28-feature roadmap table SPEC-001…SPEC-028. **029 appears in neither form** (design-editor nor marketplace). |
| `.specify/feature.json` | `{"feature_directory": ".specify/specs/013-auth"}` — stale, contradicts AGENTS.md and the modern branch. |
| `backend/prisma/seed.ts:1455` | Only "post-M8" mention in repo code (paper-bag deferral `supportReason`). |
| `docs/IMPLEMENTATION_STATUS.md`, `FEATURES.md`, `PROJECT_REVIEW.md`, `QUICK_SUMMARY.md` | Arabic status/review docs. No roadmap/milestone-next section. |

# §3. Evidence Conflicts (shown, not reconciled)

1. **Spec-029 naming collision.** Two artifacts both self-identify as "029":
   - `.specify/specs/029-design-editor/` = Design Session Management (committed via `feat(spec-029)` messages) — the finished M8 feature.
   - `.specify/specs/spec-029-marketplace-implementation.md` = End-to-End Marketplace Implementation Plan (the AGENTS.md "current feature").
   The README roadmap table lists neither. So "SPEC-029" is ambiguous across docs; the design-editor branch is a *prerequisite component* of the marketplace plan, not the same work package.

2. **AGENTS.md vs actual work.** AGENTS.md declares the marketplace plan as the current feature/plan, yet the most recent committed work is the 029-design-editor M8 series. Interpretation supported by the marketplace plan itself (§1 row "Frontend Editor … Need to connect design save → create order flow"): the design editor is a "partially built" building block the marketplace plan consumes, not the marketplace plan executing. AGENTS.md therefore points at the broader umbrella, while the recent branch completed one of its dependencies.

3. **feature.json points to `013-auth`.** Neither 029 artifact, nor AGENTS.md's plan. No authority source resolves this; treated as stale.

4. **Marketplace plan Phase 1 files already exist.** The plan's §8 Quick Wins / §6 file map lists `frontend/lib/api/{client,products,pricing,orders,payments,vendors,shipments}.ts`, `frontend/lib/ecommerce/{cart-store,types}.ts`, `app/admin/*`, `app/vendor/*` as "new". `ls frontend/lib/api/` shows client.ts, products.ts, pricing.ts, orders.ts, payments.ts, vendors.ts, shipments.ts, plus analytics/auth/cart/checkout/designs/finance/notifications/templates already present; `app/admin/` and `app/vendor/` dirs exist. So the marketplace work stream was partially pre-built in the baseline; remaining phases (pricing wiring, real checkout, account/order tracking, proof approval UI, vendor self-service, admin ops) are still open.

# §4. Candidate Enumeration

| # | Candidate | Source reference |
|---|-----------|------------------|
| C1 | **SPEC-029 End-to-End Marketplace Implementation** (Phase 1 "Connect the Frontend" onward) | AGENTS.md current-feature; `.specify/specs/spec-029-marketplace-implementation.md` (§2 Roadmap, Phase 1 Weeks 1-3: API layer, product/pricing pages, checkout/payment; Phases 2-5: customer exp, vendor portal, admin/ops, polish/scale). |
| C2 | Deferred-work backlog | `M8_TASKS.md:234` "Deferred-work backlog: G-23, G-24 items, export worker, prepress deferred set"; `M8_SPEC.md` §21 (mobile/tablet editor, vendor/admin portal completion, brand-kit & template-marketplace expansion, 4K/3D export, backend `export.worker.ts` real rasterization + real S3 export); deferrable products paper-bag / poly-mailer / label. |
| C3 | SPEC-005 deferred set | `M8_TASKS.md:200-205` (72h auto-escalation reminder, approval workflow UI, AI scoring, Pantone verification, auto color conversion, 3D print simulation — all deferred post-M8). |
| C4 | Implicit continuation of 029-design-editor | No "M8-K"/"M9" markers exist anywhere; M8 reports explicitly assert "No `M8-K` / premature-milestone markers". Feature milestone numbering ends at M8. |

# §5. Candidate Classification

| Candidate | Class | Rationale |
|-----------|-------|-----------|
| **C1 — Marketplace Implementation** | **A — authoritative next work package** | Explicitly connected to the roadmap: P0 critical path, status Planning, committed plan with phase/week breakdown, success criteria, effort estimate, file map. AGENTS.md names it the current feature. It explicitly lists the design-editor save→order gap as open work to complete. This is the only repository-authoritative, explicitly-scoped next work package. |
| **C2 — Deferred backlog** | B — deferred work, NOT next milestone | Explicit "post-M8" deferrals with documented reasons and a checklist box, but no milestone framing, no owner/sequence. Per recon rule, generic "post-M8 production hardening" is Class B, not A. |
| **C3 — SPEC-005 set** | B — deferred (overlaps C2) | Same deferral language ("post-M8"), explicit triage table. |
| **C4 — Design-editor continuation** | E — NOT DEFINED | Absence of any M8-K/M9 marker is an explicit negative; no roadmap text defines a continuation of the feature-quality milestone series. |

# §6. Confidence & Recommendation

- **Confidence (C1 = next work package): MEDIUM.** Strong positive evidence: the
  plan is committed, prioritized P0, roadmap-connected, and AGENTS.md designates it
  current. Countervailing: the spec-029 naming collision and the fact that the
  design-editor M8 work is *inside* the marketplace umbrella mean "the next
  milestone" is strictly not an M-numbered milestone. The marketplace plan uses
  phases/weeks, not milestones. If the user expects an M-series continuation, the
  honest answer is **NOT DEFINED** (no M9).
- **Recommendation:** open `spec-029-marketplace-implementation.md` Phase 1
  ("Connect the Frontend") as the next work package — starting with the Quick Wins
  (§8: base `client.ts`, wiring `pricing.ts` to product page, merging
  `frontend/lib/ecommerce/types.ts` with `shared/types/index.ts`) and the
  product/pricing page wiring. Treat C2/C3 as a separate backlog to be blended in
  or explicitly re-prioritized, not as milestone M9. Do NOT invent an "M9".

# §7. Artifacts & Verification

- Baseline commit for both 029 artifacts (committed together): `ea89acb`.
- M8 acceptance: `fcaf773` (HEAD), clean tree except scratch (`M8_FINAL_ACCEPTANCE_REPORT.md`, `M8-B/C/D/E_REPORT.md`, `QA_REPORT.md`, `.qa-tmp/`, `frontend/playwright-report/`, `frontend/test-results/`) + this report (untracked).
- Design-editor deferred surface: `M8_SPEC.md` §21 (line ~733: mobile/tablet editor; vendor/admin portal completion; brand-kit & template-marketplace expansion; 4K/3D export; export.worker + real S3).
- Marketplace plan: `.specify/specs/spec-029-marketplace-implementation.md` (508 lines; §2 roadmap; §5 success criteria; §6 file map; §7 effort 81 dev-days; §8 quick wins).
- M9/next-milestone search: `M9` → only package-lock hash + SVG path literals (`M10 …`); `post-M8` → only `seed.ts:1455`; proactively verified credit to the recon brief that M8 work must not be continued.