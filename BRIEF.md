# PackagePro — Brief

> The first thing you hand to your AI agent. Answers the Step-1 checklist.

## Step 1 — Get Clear on What You're Building

**1. What does the app actually do (one sentence)?**
A custom packaging marketplace that connects packaging factories with traders —
catalog + search, custom design editor, dynamic quoting, Stripe payments,
vendor routing, production/QA workflow, DHL fulfilment, settlements, reviews
and analytics.

**2. Who is it for?**
The public — a two-sided marketplace: **buyers** (traders / SMEs ordering
custom packaging), **vendor factories**, and platform **admins**.

**3. Must-have features (core only, 5):**
1. Marketplace catalog — search, categories, verified factories, featured
   products, sample requests
2. Custom design editor + dynamic pricing engine (`POST /api/pricing/calculate`)
3. Full order lifecycle — orders → pre-press quality check → soft-proof
   approval → vendor router (multi-criteria scoring + 4h handshake) → PO
   (PDF) → production/QA → DHL shipment → settlement (72h) → reviews
4. Payments — Stripe payment intents + webhooks (PayPal / COD scaffolding)
5. Roles + trust — customer / vendor / admin roles, reviews, persistent audit log

**4. Do you need user accounts / login?**
Yes — three roles (customer, vendor, admin). Security baseline: JWT (15-min
access + 7-day refresh), bcrypt cost 12, Redis rate limiting with exponential
backoff (1s–16s) + reCAPTCHA v3, email verification & password reset, audit log.

**5. Tech stack preference?**
Already chosen and built — and it **matches the guide's recommended
beginner-friendly combo**:

| Layer | Tech |
|---|---|
| Frontend | Next.js 15 (App Router) · React 19 · TypeScript 5.3 · Tailwind · 3D preview |
| Backend | Fastify 4 (Node.js 20 LTS) · TypeScript |
| Database | PostgreSQL 15 + Prisma 5 ORM |
| Cache/Queue | Redis 7 · BullMQ (email, settlement, reminders, marketing, export workers) |
| Payments | Stripe (intents + webhooks) · PayPal · COD |
| Shipping | DHL API (shipment creation, tracking, labels) |
| Files | AWS S3 / Cloudflare R2 storage + image optimization |
| Email | SendGrid / SES via nodemailer |
| Auth | JWT · bcrypt · reCAPTCHA v3 · persistent AuditLog |

## Current state

- **Backend ~90% complete** — 17 modules, 11 services, 18 Prisma tables, 5
  BullMQ workers, Stripe/DHL/SES wired (per `docs/guides/COMPLETION_SUMMARY.md`).
- **Active work is the frontend** — per SPEC-029
  (`.specify/specs/spec-029-marketplace-implementation.md`): connect the
  frontend to real APIs and build the customer portal, vendor portal, and
  admin dashboard. Several pages currently render seed/fixture data; FAQ /
  landing statistics show seed figures until wired to the live API.
- **Not deployed** — `deploy.yml` is a pipeline stub; hosting and environment
  provisioning are the operator's responsibility.
- Third-party credentials (Stripe, DHL, SendGrid/SES, S3/R2, reCAPTCHA,
  analytics) come from `backend/.env` (`cp env.example .env`) — none committed.

## Pointers

| Path | What |
|---|---|
| `backend/` | Fastify + TypeScript API on port 3000 (API docs at `/api`) |
| `frontend/` | Next.js 15 app on port 3001 |
| `shared/` | Shared types and utilities |
| `docs/ARCHITECTURE.md` | Architecture documentation |
| `docs/guides/DEPLOYMENT_GUIDE.md` | Deployment guide |
| `docs/guides/TESTING_GUIDE.md` | Testing guide |
| `.specify/specs/spec-029-marketplace-implementation.md` | Current plan (SPEC-029) |
| `scripts/setup.sh` | One-shot local setup |

- Quick start: `./scripts/setup.sh` → `cd backend && npm run dev` +
  `cd frontend && npm run dev` → http://localhost:3001
- DB studio: `cd backend && npm run prisma:studio`
- CI: lint, type-check, tests and build on push/PR (`.github/workflows/ci.yml`)

## Main API surface

- **Auth:** `/api/auth/register` · `login` · `refresh`
- **Pricing:** `/api/pricing/calculate` · `/api/pricing/materials`
- **Orders:** `POST /api/orders` · `GET /api/orders/:id` · `PATCH /api/orders/:id/status`
- **Designs:** `/api/designs/session` · `save` · `GET /api/designs/:id`
- **Payments:** `/api/payments/create-intent` · `confirm` · `/api/webhooks/stripe`
- **Pre-press & approval:** `prepress-check` · `request-approval` · `approve`
- **POs & production:** `create-po` · `confirm` · `production/start/:poId` · `progress`
- **Samples & QA:** `production/:id/samples` · `samples/:id/approve` · `reject`
- **Shipping:** `/api/shipments/create/:id` · `tracking` · `/api/webhooks/dhl`
- **Reviews:** `/api/reviews` · `GET /api/reviews/order/:orderId` · vendors' reviews
- **Settlements & finance:** `settlements/process/:id` · `vendors/:id/payments` · `finance/reports`
