# Tasks: Authentication & Authorization (RBAC) — SPEC-013

**Input**: Design documents from `.specify/specs/013-auth/`

**Prerequisites**: 
- ✅ `plan.md` (complete)
- ✅ `spec-013-auth.md` (original spec)
- ✅ `research.md` (Phase 0 research)
- ✅ `data-model.md` (Phase 1 data model)
- ✅ `contracts/auth-api.md` (Phase 1 API contracts)
- ✅ `quickstart.md` (Phase 1 developer guide)

**Status**: Ready for implementation

**Tests**: Included (unit + integration tests required per Constitution Gate)

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story reference (US1, US2, US3, etc.)
- **Exact file paths**: All paths use `backend/src/`, `backend/prisma/` conventions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for authentication system

### Environment & Dependencies

- [X] T001 Install dependencies: `npm install jsonwebtoken bcrypt zod redis`
- [X] T002 Add environment variables to `.env`: JWT secrets, Redis URL, SendGrid API key, reCAPTCHA keys, FRONTEND_URL
- [X] T003 [P] Create directory structure per plan: `backend/src/modules/auth/`, `backend/src/services/`, `backend/src/utils/`, `backend/src/middleware/`
- [X] T004 [P] Configure TypeScript types: Create `backend/src/types/index.ts` with UserRole, JWTPayload, AuthTokens types
- [X] T005 Copy and update auth.controller.ts from existing codebase to use new services

---

## Phase 2: Foundational Infrastructure

**Purpose**: Core auth infrastructure that BLOCKS all user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database Schema

- [X] T006 Create Prisma migration: `backend/database/migrations/005_auth_schema_v2.sql`
  - Add `EmailVerificationToken` table (id, userId FK, token, expiresAt, verifiedAt)
  - Add `PasswordReset` table (id, userId FK, token, expiresAt, usedAt)
  - Add `AuditLog` table (id, userId FK, action, resource, details JSON, timestamp)
  - Update User model: Add lastLoginAt field
  - Create indexes on token, userId, timestamp fields

- [X] T007 Run Prisma migration: `npx prisma migrate dev --name add_auth_tables`

### Core Services (Foundation)

- [X] T008 [P] Implement `backend/src/utils/password-validator.ts`
  - Validate password policy: 8+ chars, 1 upper, 1 lower, 1 number, 1 special
  - Export: `validatePassword(password): { valid: boolean; errors: string[] }`
  - Include unit tests in same file

- [X] T009 [P] Implement `backend/src/services/redis.service.ts`
  - Redis client initialization and helpers
  - Export functions:
    - `trackFailedLogin(email: string, ip: string): Promise<number>` — increment counter, return count
    - `getFailedLoginCount(email: string, ip: string): Promise<number>` — get current count
    - `clearFailedLogins(email: string, ip: string): Promise<void>` — clear on success
    - `blacklistRefreshToken(jti: string): Promise<void>` — add to blacklist (7d TTL)
    - `isTokenBlacklisted(jti: string): Promise<boolean>` — check if revoked
    - `trackVerificationAttempt(userId: string): Promise<number>` — increment resend attempts
    - `trackPasswordResetAttempt(userId: string): Promise<number>` — rate limit password resets

- [X] T010 [P] Implement `backend/src/utils/token-generator.ts`
  - Export: `generateSecureToken(): string` — generate 32-byte random token, URL-safe encoded
  - Unit tests included

- [X] T011 Implement `backend/src/utils/captcha-validator.ts`
  - Export: `verifyCaptcha(token: string, ip: string): Promise<boolean>` — call reCAPTCHA API
  - Return: risk score < 0.5 = valid, >= 0.5 = invalid
  - Handle API errors gracefully

- [X] T012 [P] Implement `backend/src/services/email.service.ts`
  - Abstract email service with provider switching (Nodemailer/SendGrid)
  - Export functions:
    - `sendVerificationEmail(email: string, token: string): Promise<void>`
    - `sendPasswordResetEmail(email: string, token: string): Promise<void>`
  - Use environment variables to switch providers
  - Send emails asynchronously (don't block)

- [X] T013 Implement `backend/src/services/audit-log.service.ts`
  - Export functions:
    - `logAction(userId: string, action: string, resource?: string, details?: any): Promise<void>` — create AuditLog record
    - `getAuditLogs(userId?: string, action?: string, limit?: number): Promise<AuditLog[]>` — fetch logs

- [X] T014 [P] Implement `backend/src/services/permissions.service.ts`
  - Centralized permission checks (inline for Phase 1)
  - Export functions:
    - `canUpdateOrder(userId: string, orderId: string, role: UserRole): Promise<boolean>`
    - `canEditDesign(userId: string, designId: string, role: UserRole, status: string): Promise<boolean>`
    - `canReviewDesign(userId: string, designId: string, role: UserRole): Promise<boolean>`
    - `canProcessPayment(userId: string, paymentId: string, role: UserRole): Promise<boolean>`
  - Include detailed JSDoc comments explaining each rule

### JWT & Authentication Core

- [X] T015 Update `backend/src/modules/auth/auth.service.ts` — Core JWT & Login Logic
  - Update `generateAccessToken(payload)`: Add to existing, no changes needed
  - Update `generateRefreshToken(payload)`: Add `jti` field to payload (unique JWT ID)
  - Update `login(data: LoginData)`:
    - Get failed attempt count from Redis
    - Apply exponential backoff delay (1s, 2s, 4s, 8s, 16s) if count >= 1
    - If count >= 3: Require CAPTCHA token, verify via reCAPTCHA
    - Validate email + password
    - On success: Clear Redis counter, update User.lastLoginAt, log audit: login_success
    - On failure: Increment counter, log audit: login_failed, apply delay before response
  - Add `logout(refreshToken: string): Promise<void>`:
    - Extract JTI from token
    - Add to Redis blacklist (7d TTL)
    - Log audit: logout
  - Add `refreshAccessToken(refreshToken: string): Promise<AuthTokens>`:
    - Verify JWT signature
    - Check if JTI in Redis blacklist
    - Generate new tokens (new JTI)
    - Return both tokens
  - Add `verifyEmailToken(token: string): Promise<void>`:
    - Find EmailVerificationToken
    - If expired or already verified: throw error
    - Update User.emailVerified = true
    - Set token.verifiedAt = now()
    - Log audit: email_verified
  - Add `requestPasswordReset(email: string): Promise<void>`:
    - Check rate limit (max 3/hour)
    - Create PasswordReset token
    - Send email
    - Log audit: password_reset_requested
  - Add `resetPassword(token: string, newPassword: string): Promise<void>`:
    - Find PasswordReset token
    - If expired or used: throw error
    - Validate new password
    - Hash with bcrypt cost 12
    - Update User.passwordHash
    - Mark token as used
    - Blacklist all existing refresh tokens for user (force re-login)
    - Log audit: password_reset_completed

- [X] T016 [P] Implement `backend/src/modules/auth/auth.types.ts`
  - Define TypeScript interfaces:
    - `JWTPayload { userId, email, role, jti? }`
    - `AuthTokens { accessToken, refreshToken, expiresIn }`
    - `RegisterData { email, password, firstName?, lastName?, phone?, role? }`
    - `LoginData { email, password, captchaToken? }`

- [X] T017 Update `backend/src/middleware/auth.middleware.ts` — JWT Validation
  - Update `authenticate(request, reply)`:
    - Extract Bearer token from Authorization header
    - Verify JWT signature (CPU only, no DB)
    - Attach user to request
    - **IMPORTANT**: Do NOT check Redis blacklist here (only on refresh)
  - Update `authorize(...allowedRoles)`: No changes needed
  - Keep: `optionalAuth()`, `canViewDesign()`, `canEditDesign()`, `canReviewDesign()`

**Checkpoint**: Foundation complete — all user stories can now begin in parallel

---

## Phase 3: User Story 1 - User Registration (Priority: P1) 🎯 MVP

**Goal**: Users can register with email/password, receive verification email, and verify their email

**Independent Test**: Register user → receive email → click link → emailVerified = true

### Tests for User Story 1 ⚠️

- [X] T018 [P] [US1] Unit tests for password validation: `backend/src/utils/password-validator.test.ts`
  - Valid password: "SecurePass123!"
  - Invalid: no uppercase, no lowercase, no number, no special char
  - Boundary: exactly 8 chars, 7 chars

- [X] T019 [P] [US1] Unit tests for auth.service register: `backend/src/modules/auth/auth.service.test.ts`
  - Happy path: register, create user, return tokens
  - Duplicate email: should throw error
  - Password validation: invalid passwords rejected
  - EmailVerificationToken created
  - Mock Prisma and email service

- [X] T020 [P] [US1] Integration test for register endpoint: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/register → 201 Created
  - Response includes user + tokens
  - User.emailVerified = false
  - Email sent (mock/spy on sendVerificationEmail)

- [X] T021 [P] [US1] Integration test for verify-email endpoint: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/verify-email/{token} → 200 OK
  - User.emailVerified = true
  - Token marked as used
  - Audit log: email_verified

- [X] T022 [P] [US1] Integration test for resend-verification endpoint: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/resend-verification → 200 OK
  - New EmailVerificationToken created
  - Email sent again
  - Rate limit: max 3/hour

### Implementation for User Story 1

- [X] T023 [P] [US1] Implement `backend/src/modules/auth/auth.controller.ts` — Register Endpoint
  - Add `register(request: FastifyRequest, reply: FastifyReply)` handler
  - Validate request body (email, password, firstName?, lastName?, role?)
  - Call `authService.register()`
  - Return 201 with user + tokens
  - Handle errors: duplicate email (400), validation error (400), server error (500)

- [X] T024 [US1] Update `backend/src/modules/auth/auth.controller.ts` — Verify Email Endpoint
  - Add `verifyEmail(request: FastifyRequest, reply: FastifyReply)` handler
  - Extract token from URL params
  - Call `authService.verifyEmailToken(token)`
  - Return 200 OK
  - Handle errors: invalid/expired token (400), already verified (400)

- [X] T025 [US1] Update `backend/src/modules/auth/auth.controller.ts` — Resend Verification Endpoint
  - Add `resendVerification(request: FastifyRequest, reply: FastifyReply)` handler
  - Extract email from body
  - Check rate limit (max 3/hour via Redis)
  - Create new EmailVerificationToken
  - Send email
  - Return 200 OK (don't reveal if email exists)
  - Handle errors: rate limit (429)

- [X] T026 [US1] Update `backend/src/modules/auth/auth.routes.ts` — Register Routes
  - Add POST /api/auth/register → register handler
  - Add POST /api/auth/verify-email/:token → verifyEmail handler
  - Add POST /api/auth/resend-verification → resendVerification handler

- [X] T027 [US1] Add logging to registration flow: `backend/src/modules/auth/auth.service.ts`
  - Structured log on register: user created, email sent
  - Structured log on verify: email verified
  - Use existing logger (pino/winston)

**Checkpoint**: User Story 1 complete — registration, verification, resend all work independently

---

## Phase 4: User Story 2 - User Login & Logout (Priority: P1) 🎯 MVP

**Goal**: Users can login with email/password, receive JWT tokens, and logout (revoke refresh token)

**Independent Test**: Login → receive tokens → verify token works → logout → token revoked

### Tests for User Story 2 ⚠️

- [X] T028 [P] [US2] Unit tests for login with backoff: `backend/src/modules/auth/auth.service.test.ts`
  - Happy path: login success, return tokens
  - Failed login: invalid password, increment counter
  - Exponential backoff: delays 1s, 2s, 4s, 8s, 16s after attempts
  - CAPTCHA required after 3 attempts
  - Rate limit: cleared after 15 min with no attempts

- [X] T029 [P] [US2] Unit tests for JWT generation with JTI: `backend/src/modules/auth/auth.service.test.ts`
  - generateRefreshToken includes jti field
  - JTI is unique per call

- [X] T030 [P] [US2] Integration test for login endpoint: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/login → 200 OK
  - Response includes user + tokens
  - User.lastLoginAt updated
  - Audit log: login_success

- [X] T031 [P] [US2] Integration test for login rate limiting: `backend/tests/integration/auth.integration.test.ts`
  - 5 failed attempts with wrong password
  - Observe exponential backoff delays
  - After 3 attempts, CAPTCHA required
  - Response time increases: 0ms → 1s → 2s → 4s → 8s

- [X] T032 [P] [US2] Integration test for logout endpoint: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/logout → 200 OK
  - Old refreshToken no longer works (blacklisted)
  - Audit log: logout

- [X] T033 [P] [US2] Integration test for protected endpoints: `backend/tests/integration/auth.integration.test.ts`
  - GET /api/designs with valid accessToken → 200 OK
  - GET /api/designs without token → 401 Unauthorized
  - GET /api/designs with expired token → 401 Unauthorized

### Implementation for User Story 2

- [X] T034 [US2] Implement `backend/src/modules/auth/auth.controller.ts` — Login Endpoint
  - Add `login(request: FastifyRequest, reply: FastifyReply)` handler
  - Extract email, password, captchaToken? from body
  - Get client IP from request
  - Call `authService.login(email, password, ip, captchaToken)`
  - Apply backoff delay (response waits for delay)
  - Return 200 with user + tokens OR 400 CAPTCHA_REQUIRED
  - Handle errors: invalid credentials (401), rate limited (429), CAPTCHA invalid (400)

- [X] T035 [US2] Implement `backend/src/modules/auth/auth.controller.ts` — Logout Endpoint
  - Add `logout(request: FastifyRequest, reply: FastifyReply)` handler
  - Require valid JWT in Authorization header
  - Extract refreshToken from body
  - Call `authService.logout(refreshToken)`
  - Return 200 OK
  - Handle errors: invalid token (400), not authenticated (401)

- [X] T036 [US2] Update `backend/src/modules/auth/auth.controller.ts` — Login Endpoint Implementation Detail
  - Calculate backoff delay before calling login logic
  - If failed attempts >= 1: await sleep(delay)
  - Return response after delay (user experiences delay, not artificial)

- [X] T037 [US2] Update `backend/src/modules/auth/auth.routes.ts`
  - Add POST /api/auth/login → login handler
  - Add POST /api/auth/logout → logout handler (requires JWT)

- [X] T038 [US2] Update `backend/src/middleware/auth.middleware.ts` — Token Refresh Protection
  - In `authenticate()`: No Redis check needed (only for refresh)
  - Keep stateless for every request

- [X] T039 [US2] Add logging to login/logout: `backend/src/modules/auth/auth.service.ts`
  - Structured log on login success: user ID, IP, timestamp
  - Structured log on login failure: IP, attempt count, reason
  - Structured log on logout: user ID, token JTI

**Checkpoint**: User Story 2 complete — login, exponential backoff, logout all work independently

---

## Phase 5: User Story 3 - Token Refresh & Session Management (Priority: P1) 🎯 MVP

**Goal**: Users can refresh expired accessToken using refreshToken; old refreshToken can be revoked

**Independent Test**: Login → get tokens → wait for accessToken expire → refresh → get new tokens

### Tests for User Story 3 ⚠️

- [X] T040 [P] [US3] Unit tests for token refresh with blacklist: `backend/src/modules/auth/auth.service.test.ts`
  - Happy path: refresh with valid token, return new tokens
  - Revoked token: in blacklist, should error
  - Expired token: JWT invalid, should error

- [X] T041 [P] [US3] Unit tests for Redis blacklist: `backend/src/services/redis.service.test.ts`
  - Add token to blacklist
  - Check if token in blacklist
  - TTL set to 7 days

- [X] T042 [P] [US3] Integration test for refresh endpoint: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/refresh with valid refreshToken → 200 OK
  - Response includes new accessToken + refreshToken
  - Old refreshToken still valid (not single-use)

- [X] T043 [P] [US3] Integration test for refresh with revoked token: `backend/tests/integration/auth.integration.test.ts`
  - Login → logout (blacklist refreshToken)
  - POST /api/auth/refresh with blacklisted token → 401 Unauthorized

- [X] T044 [P] [US3] Integration test for using new token after refresh: `backend/tests/integration/auth.integration.test.ts`
  - Refresh → get new accessToken
  - Use new accessToken to access protected endpoint → 200 OK

### Implementation for User Story 3

- [X] T045 [US3] Implement `backend/src/modules/auth/auth.controller.ts` — Refresh Endpoint
  - Add `refresh(request: FastifyRequest, reply: FastifyReply)` handler
  - Extract refreshToken from body
  - Call `authService.refreshAccessToken(refreshToken)`
  - Return 200 with new tokens
  - Handle errors: invalid token (401), expired token (401), revoked token (401)

- [X] T046 [US3] Update `backend/src/modules/auth/auth.service.ts` — Refresh Implementation Detail
  - Before issuing new tokens: Check if old JTI in Redis blacklist
  - Generate new JTI for new refreshToken
  - Return both new tokens

- [X] T047 [US3] Update `backend/src/modules/auth/auth.routes.ts`
  - Add POST /api/auth/refresh → refresh handler (public, no JWT required)

- [X] T048 [US3] Add logging to refresh flow: `backend/src/modules/auth/auth.service.ts`
  - Structured log on refresh: user ID, old JTI, new JTI
  - Structured log on blacklist check: JTI found/not found

**Checkpoint**: User Story 3 complete — token refresh, revocation, blacklist all work independently

---

## Phase 6: User Story 4 - Password Reset (Priority: P2)

**Goal**: Users can reset forgotten password via secure email link

**Independent Test**: Request reset → receive email → click link → set new password → login with new password

### Tests for User Story 4 ⚠️

- [X] T049 [P] [US4] Unit tests for password reset: `backend/src/modules/auth/auth.service.test.ts`
  - Request reset: create token, send email
  - Reset password: validate token, hash password, update user
  - Single-use: token marked as used, can't be reused
  - Expired: token past expiresAt, error
  - Rate limit: max 3 resets/hour per user

- [X] T050 [P] [US4] Integration test for forgot-password endpoint: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/forgot-password → 200 OK (regardless of email existence)
  - Email sent to user (if exists)
  - PasswordReset token created

- [X] T051 [P] [US4] Integration test for reset-password endpoint: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/reset-password → 200 OK
  - User.passwordHash updated
  - Token marked as used
  - Audit log: password_reset_completed
  - Old refresh tokens blacklisted

- [X] T052 [P] [US4] Integration test for reset password rate limiting: `backend/tests/integration/auth.integration.test.ts`
  - Max 3 forget-password requests/hour
  - 4th request → 429 Too Many Requests

- [X] T053 [P] [US4] Integration test for password reset security: `backend/tests/integration/auth.integration.test.ts`
  - Attempt to use same token twice → second attempt fails
  - Attempt with expired token → error

### Implementation for User Story 4

- [X] T054 [US4] Implement `backend/src/modules/auth/auth.controller.ts` — Forgot Password Endpoint
  - Add `forgotPassword(request: FastifyRequest, reply: FastifyReply)` handler
  - Extract email from body
  - Check rate limit (max 3/hour via Redis)
  - Call `authService.requestPasswordReset(email)`
  - Return 200 OK (don't reveal if email exists)
  - Handle errors: rate limit (429)

- [X] T055 [US4] Implement `backend/src/modules/auth/auth.controller.ts` — Reset Password Endpoint
  - Add `resetPassword(request: FastifyRequest, reply: FastifyReply)` handler
  - Extract token, newPassword from body
  - Validate new password policy
  - Call `authService.resetPassword(token, newPassword)`
  - Return 200 OK
  - Handle errors: invalid token (400), expired (400), password invalid (400)

- [X] T056 [US4] Update `backend/src/modules/auth/auth.service.ts` — Password Reset Logic
  - Add implementation to `requestPasswordReset()` method (T015)
  - Add implementation to `resetPassword()` method (T015)

- [X] T057 [US4] Update `backend/src/modules/auth/auth.routes.ts`
  - Add POST /api/auth/forgot-password → forgotPassword handler
  - Add POST /api/auth/reset-password → resetPassword handler

- [X] T058 [US4] Add logging to password reset flow: `backend/src/modules/auth/auth.service.ts`
  - Structured log on forgot-password: email (hashed?), rate limit
  - Structured log on reset-password: user ID, success/failure

**Checkpoint**: User Story 4 complete — password reset flow works end-to-end

---

## Phase 7: User Story 5 - Audit Logging (Priority: P2)

**Goal**: All sensitive actions (login, logout, password change, permission change) are logged for compliance

**Independent Test**: Perform auth action → check AuditLog table → entry created with correct action/timestamp

### Tests for User Story 5 ⚠️

- [X] T059 [P] [US5] Unit tests for audit logging: `backend/src/services/audit-log.service.test.ts`
  - logAction creates AuditLog record
  - getAuditLogs filters by userId, action
  - Timestamps correct

- [X] T060 [P] [US5] Integration test for audit logging on login: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/login → check AuditLog has login_success entry
  - Failed login → check AuditLog has login_failed entry

- [X] T061 [P] [US5] Integration test for audit logging on password reset: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/reset-password → check AuditLog has password_reset_completed entry

- [X] T062 [P] [US5] Integration test for audit logging on email verification: `backend/tests/integration/auth.integration.test.ts`
  - POST /api/auth/verify-email/{token} → check AuditLog has email_verified entry

### Implementation for User Story 5

- [X] T063 [P] [US5] Audit logging already integrated in T015 (auth.service.ts)
  - Verify: `auditLog.logAction()` called in:
    - login() → login_success, login_failed
    - register() → register
    - logout() → logout
    - verifyEmailToken() → email_verified
    - requestPasswordReset() → password_reset_requested
    - resetPassword() → password_reset_completed
  - Each call includes: userId, action, details (IP, attemptCount, etc.)

- [X] T064 [US5] Create admin endpoint to view audit logs (optional for Phase 1)
  - Add GET /api/audit?userId=X&action=Y → return AuditLog entries
  - Require admin role

- [X] T065 [US5] Add audit log cleanup (optional for Phase 1)
  - Create periodic job to delete logs older than 6 months
  - Or implement in separate task

**Checkpoint**: User Story 5 complete — audit logging operational

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories + final validation

### Documentation & Testing

- [X] T066 [P] Documentation: Run through `quickstart.md` end-to-end
  - Follow all curl commands
  - Verify all flows work as documented
  - Update if any changes needed

- [X] T067 [P] Code review & cleanup
  - Ensure all files follow TypeScript strict mode
  - All functions have JSDoc comments
  - No `any` types without justification
  - Proper error handling in all endpoints

- [X] T068 [P] Performance validation
  - Login endpoint: measure <200ms p95 (with backoff, should still be <1s total)
  - Token validation: <5ms (no DB queries)
  - Token refresh: <100ms (one Redis lookup)
  - Use `time curl` to measure

- [X] T069 [P] Security hardening
  - Verify bcrypt cost = 12
  - Verify JWT secrets are strong (32+ chars)
  - Verify no sensitive data in logs (email addresses OK, passwords NOT OK)
  - Verify rate limiting active
  - Verify CAPTCHA integrated

- [X] T070 [P] Error handling consistency
  - All endpoints return structured error responses
  - No internal error details exposed
  - Proper HTTP status codes (400, 401, 429, 500)
  - User-friendly error messages

### Final Integration

- [X] T071 [P] Frontend integration (optional for Phase 1 backend completion)
  - If frontend available: update login form to send CAPTCHA token
  - Update JWT storage (accessToken in memory, refreshToken in httpOnly cookie)
  - Add logout button to call POST /api/auth/logout

- [X] T072 [P] E2E workflow test
  - Complete user journey:
    1. Register → verify email
    2. Login → get tokens
    3. Access protected endpoint
    4. Refresh token
    5. Logout
    6. Attempt to use revoked token → error

- [X] T073 Deployment checklist
  - Environment variables configured
  - Database migrated
  - Redis running
  - Email service tested
  - CAPTCHA configured
  - Ready for staging deployment

---

## Dependencies & Execution Order

### Critical Path (Must Complete in Order)

```
Phase 1: Setup (T001-T005)
    ↓
Phase 2: Foundation (T006-T017)  ← BLOCKS all user stories
    ↓
Phase 3-7: User Stories (can run in parallel after foundation)
    ↓
Phase 8: Polish (T066-T073)
```

### Parallel Opportunities

**Within Phase 1** (all [P] tasks):
- T001-T003: Parallel

**Within Phase 2** (after T006 complete):
- T008-T014: Parallel (independent services)
- T015-T017: Sequential (dependent on T008-T014)

**After Phase 2 complete** (Phases 3-7):
- US1, US2, US3: Parallel (all start at same time)
- US4, US5: Parallel (both P2, after P1 stories done)

**Within each User Story** (marked [P]):
- All tests [P]: Parallel
- Tests before implementation

### Team Allocation Example

With 3 developers:
- Developer A: Phase 1 + T018-T027 (US1)
- Developer B: T028-T039 (US2) — start after Phase 2 done
- Developer C: T040-T048 (US3) — start after Phase 2 done
- Dev A: T049-T058 (US4) after US1 complete
- Dev B: T059-T065 (US5) after US2 complete
- All: T066-T073 (Polish) at end

---

## Notes

- **[P]** tasks: Can run in parallel (different files, no dependencies)
- **[Story]** label: Maps task to user story for traceability
- **Tests first**: Write tests before implementation, ensure they FAIL
- **Each checkpoint**: Verify story works independently before moving on
- **Commits**: After each major task or logical group (e.g., after T017 "foundation ready")
- **No skipping**: Each phase must complete before next (Phase 2 blocks everything)

---

## Validation Checkpoints

| Checkpoint | When | What to Test |
|-----------|------|-------------|
| Foundation Ready | After T017 | Services, Redis, password validation all work |
| US1 Complete | After T027 | Register → verify email → resend works standalone |
| US2 Complete | After T039 | Login → backoff → CAPTCHA → logout works standalone |
| US3 Complete | After T048 | Refresh token → new tokens → old token revoked works |
| US4 Complete | After T058 | Forgot password → reset → login works |
| US5 Complete | After T065 | Audit logs created for all actions |
| Polish Complete | After T073 | E2E test passes, perf targets met, security hardened |

---

**Status**: ✅ Tasks ready for implementation

**Total Tasks**: 73 (20 Phase 1+2 foundational, 53 stories + polish)

**Estimated Time**: 
- Phase 1-2 (Foundation): 4-6 hours
- Phase 3 (US1): 3-4 hours
- Phase 4 (US2): 4-5 hours
- Phase 5 (US3): 2-3 hours
- Phase 6 (US4): 3-4 hours
- Phase 7 (US5): 1-2 hours
- Phase 8 (Polish): 2-3 hours
- **Total**: 19-27 hours (1-2 developer weeks)

**Next Action**: Begin Phase 1 Setup tasks or proceed directly to Phase 2 if dependencies ready.
