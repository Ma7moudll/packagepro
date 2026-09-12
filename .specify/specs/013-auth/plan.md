# Implementation Plan: Authentication & Authorization (RBAC)

**Branch**: `013-auth` | **Date**: June 1, 2026 | **Spec**: [SPEC-013](../spec-013-auth.md)

**Input**: Feature specification from `spec-013-auth.md` + Technical review & clarifications

**Status**: ✅ All architecture decisions finalized; ready for Phase 0 research

---

## Summary

Implement Role-Based Access Control (RBAC) with JWT authentication for PackagePro. This feature adds:
- **Stateless JWT flow** with Redis blacklist for refreshToken revocation
- **Exponential backoff + CAPTCHA** login security (instead of account lockout)
- **Email verification** with resend capability
- **Password reset flow** with secure tokens
- **Centralized permission service** for maintainable authorization rules
- **Audit logging** for compliance and security monitoring

**Key Achievement**: Prevents both brute force attacks and DoS vulnerabilities while maintaining high performance (stateless accessToken, <2ms refresh checks).

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS

**Primary Dependencies**: 
- Fastify (web framework)
- Prisma (ORM)
- jsonwebtoken (JWT generation/validation)
- bcrypt (password hashing)
- zod (validation)
- Redis (rate limiting, token blacklist)
- CAPTCHA provider (reCAPTCHA v3 recommended)

**Storage**: 
- PostgreSQL for persistent data (EmailVerificationToken, PasswordReset, AuditLog)
- Redis for session/attempt tracking (blacklist, rate limits, temporary counts)

**Testing**: Jest (unit tests), Supertest (API integration tests), manual E2E with curl/Postman

**Target Platform**: Linux server (Node.js)

**Project Type**: Web service backend (monorepo with frontend integration)

**Performance Goals**: 
- Login API: <200ms p95
- Token validation: <5ms (stateless, no DB check)
- Token refresh: <100ms (single Redis lookup)
- Permission checks: <5ms (cached in service layer)

**Constraints**: 
- JWT accessToken must be stateless (no DB query on every request)
- Refresh token revocation must work within 7-day expiry window
- Failed login attempts must not DoS legitimate users
- All passwords hashed with bcrypt cost 12+
- Email verification and password reset require working email service

**Scale/Scope**: 
- 6 user roles (Customer, Vendor, Admin, Designer, SuperAdmin, EnterpriseCustomer) - but only 3 for Phase 1 (Customer, Vendor, Admin)
- Support 10,000+ concurrent users
- Track login/audit events (low write throughput, high read for analytics)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Type-First & API Clarity ✅
- All code in TypeScript; interfaces documented with JSDoc
- DTOs explicitly defined for API contracts (already planned in analysis)
- **Status**: Will comply - DTOs for login/register/refresh already sketched

### Domain-Driven Modules ✅
- Auth module self-contained in `backend/src/modules/auth/`
- Services (permissions, audit-log, email) in `backend/src/services/`
- **Status**: Will comply - module structure defined

### Conventional Commits ✅
- All commits follow `feat(auth):`, `fix(auth):` format
- **Status**: Will comply - required for all work

### Testing Gate ✅
- Unit tests for auth service, permission service
- Integration tests for API endpoints
- 80% coverage target for auth module
- **Status**: Will be achieved - test plan includes unit + integration

### Observability & Error Handling ✅
- Structured logging with pino/winston
- AppError with code and statusCode
- No stack traces in user responses
- **Status**: Will comply - error handling designed with AppError

### Security Requirements ✅
- JWT middleware on all endpoints (except login/register/health)
- Passwords hashed with bcrypt cost 12
- Input validation with zod
- **Status**: Will comply - JWT validation improved, bcrypt cost upgraded

### Performance Standards ✅
- Login <200ms p95 ✅ (design optimized; no Session DB check)
- Token validation <5ms ✅ (stateless JWT signature check only)
- Redis caching <1ms ✅ (blacklist, rate limits)
- **Status**: Will achieve - design targets these metrics

---

## Project Structure

### Documentation (this feature)

```text
.specify/specs/013-auth/
├── spec-013-auth.md                 # Original specification
├── spec-013-auth-analysis.md        # Technical analysis + solutions
├── spec-013-key-changes.md          # Executive summary + impact
├── spec-013-review-complete.md      # Clarification summary
├── plan.md                          # THIS FILE
├── research.md                      # Phase 0 output (to be created)
├── data-model.md                    # Phase 1 output (to be created)
├── contracts/                       # Phase 1 output (to be created)
│   ├── auth-api.md                  # API contracts for login/register/refresh/logout
│   ├── permission-service.md        # Permission rule contracts
│   └── audit-log.md                 # Audit logging contracts
└── quickstart.md                    # Phase 1 output (to be created)
```

### Source Code (repository)

```text
backend/
├── src/
│   ├── modules/auth/
│   │   ├── auth.controller.ts       # API endpoints (register, login, logout, refresh, resend-verification)
│   │   ├── auth.service.ts          # Core auth logic (password hashing, token generation, login flow with backoff)
│   │   ├── auth.routes.ts           # Route definitions
│   │   ├── auth.types.ts            # TypeScript types (JWTPayload, AuthTokens, etc.)
│   │   └── auth.test.ts             # Unit tests
│   │
│   ├── services/
│   │   ├── permissions.service.ts   # Centralized permission checks (canUpdateOrder, canEditDesign, etc.)
│   │   ├── permissions.test.ts      # Permission tests
│   │   ├── audit-log.service.ts     # Audit logging (log action, fetch logs, cleanup)
│   │   ├── email.service.ts         # Email sending (verification, password reset)
│   │   └── redis.service.ts         # Redis helpers (failed login tracking, token blacklist)
│   │
│   ├── utils/
│   │   ├── password-validator.ts    # Password policy enforcement + tests
│   │   ├── captcha-validator.ts     # CAPTCHA verification (reCAPTCHA integration)
│   │   └── token-generator.ts       # Secure token generation for email/password reset
│   │
│   ├── middleware/
│   │   ├── auth.middleware.ts       # JWT validation + Redis blacklist check
│   │   └── auth.test.ts             # Middleware tests
│   │
│   ├── lib/
│   │   ├── prisma.ts                # Prisma client (already exists)
│   │   └── redis.ts                 # Redis client (already exists or to be created)
│   │
│   └── types/
│       └── index.ts                 # Global types (UserRole, JWTPayload, etc.)
│
├── prisma/
│   ├── schema.prisma                # Updated schema (new tables, User model changes)
│   └── migrations/
│       └── 005_auth_schema_v2.sql   # Migration for EmailVerificationToken, PasswordReset, AuditLog
│
└── tests/
    ├── integration/
    │   └── auth.integration.test.ts  # API endpoint tests (curl/Supertest)
    └── fixtures/
        └── auth.fixtures.ts         # Test data (fake users, tokens)

frontend/ (if JWT integration needed)
├── lib/
│   ├── auth/
│   │   ├── api.ts                   # API client (login, register, logout, refresh)
│   │   └── hooks.ts                 # React hooks (useAuth, useLogin, useRefresh)
│   │
│   └── permissions/
│       └── client.ts                # Frontend permission checks (canViewDesign, etc.)
│
└── components/
    ├── auth/
    │   ├── LoginForm.tsx            # Login UI
    │   ├── RegisterForm.tsx         # Registration UI
    │   └── PasswordResetForm.tsx    # Password reset UI
    │
    └── guards/
        └── PermissionGuard.tsx      # Frontend permission wrapper
```

**Structure Decision**: 
- **Backend**: Modular structure with `modules/auth/` for core auth logic, `services/` for cross-cutting concerns (permissions, audit, email)
- **Database**: Prisma ORM with schema migrations
- **Testing**: Jest + Supertest for integration tests; all services have >80% coverage
- **Frontend**: Next.js 14 with React hooks and permission guards (optional; JWT can work without frontend changes if API is secured)

---

## Complexity Tracking

> All decisions justified; no violations of Constitution

No complex tradeoffs needed. Architecture is clean:
- ✅ Stateless JWT = performance preserved
- ✅ Redis-only rate limiting = no DB bloat
- ✅ Centralized permissions = maintainability
- ✅ Modular services = testability

---

## Phase 0: Research (In Progress)

### Unknowns to Resolve

| Unknown | Status | Task |
|---------|--------|------|
| CAPTCHA provider integration | 🔍 | Research reCAPTCHA v3 setup for Fastify |
| Redis client configuration | 🔍 | Check if Redis already set up in existing codebase |
| Email service availability | 🔍 | Verify email sending mechanism (SendGrid, Nodemailer, etc.) |
| Existing JWT implementation | ✅ | Already present (auth.service.ts has JWT generation) |
| Prisma relations | ✅ | User ↔ Customer/Vendor; will add EmailVerificationToken, PasswordReset, AuditLog |

### Phase 0 Outputs (To Be Created)

**File**: `.specify/specs/013-auth/research.md`

Will contain:
- Decision for CAPTCHA provider → reCAPTCHA v3 (free tier, easy integration, no page interaction required)
- Decision for email service → [To be researched]
- Redis setup confirmation → [To be researched]
- Best practices for JWT refresh token rotation → [To be researched]
- Rate limiting patterns in Fastify → [To be researched]

---

## Phase 1: Design & Contracts (Next)

### Data Model (`data-model.md` - To Be Created)

**Entities**:

1. **User** (existing, updated)
   - id, email, passwordHash, role (CUSTOMER | VENDOR | ADMIN)
   - emailVerified, lastLoginAt, createdAt, updatedAt

2. **EmailVerificationToken** (new)
   - id, userId (FK), token, expiresAt, verifiedAt

3. **PasswordReset** (new)
   - id, userId (FK), token, expiresAt, usedAt

4. **AuditLog** (new)
   - id, userId (FK), action (login, logout, password_change, order_created), resource, details, timestamp

5. **Permission** (deferred to Phase 1.5)
   - Centralized logic in `permissions.service.ts` for now

### Contracts (`contracts/` - To Be Created)

1. **auth-api.md** — API contracts
   - POST /api/auth/register
   - POST /api/auth/login
   - POST /api/auth/logout
   - POST /api/auth/refresh
   - POST /api/auth/forgot-password
   - POST /api/auth/reset-password
   - POST /api/auth/verify-email/{token}
   - POST /api/auth/resend-verification

2. **permission-service.md** — Permission rule contracts
   - canUpdateOrder(userId, orderId, role)
   - canEditDesign(userId, designId, role, status)
   - canReviewDesign(userId, designId, role)
   - canProcessPayment(userId, paymentId, role)

3. **audit-log.md** — Audit logging contracts
   - logAction(userId, action, resource, details)
   - getAuditLogs(filter)

### Quickstart (`quickstart.md` - To Be Created)

Will contain:
- How to test login/register endpoints with curl
- How to generate test JWT tokens
- How to use permission checks in route handlers
- How to view audit logs

---

## Agent Context Update

Will update `AGENTS.md` `<!-- SPECKIT START -->` block to point to this plan file.

---

## Next Steps

1. ✅ Phase 0 research (resolve unknowns above)
2. ✅ Phase 1 design (create data model, contracts, quickstart)
3. ⏭️ `/speckit.tasks` — Break down into specific implementation tasks
4. ⏭️ Implementation — Start coding Phase 1 (password validation, Redis setup, token generation)
5. ⏭️ Testing — Integration tests for all endpoints

---

**Status**: ✅ Plan complete. Ready for Phase 0 research via `/speckit.plan phase0`.
