# SPEC-013: Authentication & Authorization (RBAC) — Implementation Analysis

**Date:** June 1, 2026  
**Status:** Clarified & Ready for Planning  
**Reference Spec:** `.specify/specs/spec-013-auth.md`

---

## 1. Current Implementation Status

### ✅ Already Implemented

| Component | Status | Details |
|-----------|--------|---------|
| **JWT Tokens** | ✅ | Access token (15min) + Refresh token (7 days) |
| **Password Hashing** | ✅ | bcrypt with cost 10 (spec: 12) |
| **Role-Based Checks** | ✅ | `authorize(*roles)` middleware working |
| **User Model** | ✅ | email, passwordHash, role, firstName, lastName, phone, emailVerified |
| **Auth Service** | ✅ | register, login, refreshToken endpoints |
| **Auth Middleware** | ✅ | authenticate, authorize, optionalAuth |
| **Token Validation** | ✅ | verifyAccessToken, verifyRefreshToken |
| **Customer/Vendor Linking** | ✅ | Customer record auto-created on CUSTOMER role signup |

### ❌ Missing / Incomplete

| Feature | Spec Requirement | Current State | Priority |
|---------|------------------|---------------|----------|
| **Password Policy** | 8+ chars, 1 upper, 1 lower, 1 number, 1 special | Not enforced | HIGH |
| **Account Lockout** | 5 failed attempts → 15min lockout | Not implemented | HIGH |
| **Session Management** | List active sessions, revoke individually/all | Not implemented | MEDIUM |
| **Password Reset** | Secure token via email, 1hr expiry | Not implemented | MEDIUM |
| **Email Verification** | Required before first order | Fields exist, not enforced | MEDIUM |
| **Granular Permissions** | Permission matrix (orders:read, orders:update:status, etc.) | Only role-based checks | DEFERRED |
| **Audit Logging** | Every login, permission change, sensitive action | Not implemented | MEDIUM |
| **2FA/TOTP** | Two-factor authentication | Not implemented | PHASE 1.5 |
| **bcrypt Cost Factor** | Cost 12 (spec) | Cost 10 (current) | LOW |

---

## 2. Clarifications Applied

### Decision 1: Role System Scope
**Question:** Support all 6 roles (SUPER_ADMIN, ADMIN, CUSTOMER, ENTERPRISE_CUSTOMER, VENDOR, DESIGNER) or keep 3 (CUSTOMER, VENDOR, ADMIN)?

**User Decision:** Keep 3 roles for now, extend in Phase 2  
**Impact:** 
- Focus Phase 1 on core functionality with CUSTOMER, VENDOR, ADMIN
- Designer role → defer or represent as ADMIN subset
- Enterprise Customer → defer to Phase 2 (enterprise features bundle)
- Super Admin → defer to Phase 2
- **Current UserRole enum unchanged**

### Decision 2: Permission System Design
**Question:** Full Permission model with junction tables vs. inline permission checks?

**User Decision:** Inline permission checks (simple approach)  
**Impact:**
- No Permission, RolePermission tables in Phase 1
- Add permission helper functions (e.g., `canUpdateOrder(user, orderId)`) directly in route handlers
- Pattern: `if (!await canUpdateOrder(user.id, orderId)) throw AuthorizationError(...)`
- Simplifies initial implementation, easy to refactor to full model later
- **No new database schema needed for Phase 1**

### Decision 3: Account Lockout Timing
**Question:** Phase 1 requirement or defer to Phase 1.5 with 2FA?

**User Decision:** Implement account lockout in Phase 1  
**Impact:**
- Add LoginAttempt table (userId, timestamp, success)
- Check for 5 failed attempts in last 15 minutes
- Block login if lockout active
- Needs to happen **before** 2FA (Phase 1.5)

---

## 3. Implementation Gaps Analysis

### High Priority (Phase 1 Blockers)

#### 1. **Password Policy Validation**
- **Current:** Only minimum length check (`min(8)`)
- **Spec Requires:** 8+ chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
- **Where:** `auth.controller.ts` registerSchema and `auth.service.ts` register()
- **Type:** Zod schema validation + function logic

**Gap:**
```typescript
// CURRENT
const registerSchema = z.object({
  password: z.string().min(8),
});

// NEEDED
const registerSchema = z.object({
  password: z.string()
    .min(8)
    .regex(/[A-Z]/, "Must contain uppercase")
    .regex(/[a-z]/, "Must contain lowercase")
    .regex(/[0-9]/, "Must contain number")
    .regex(/[!@#$%^&*]/, "Must contain special char"),
});
```

#### 2. **Account Lockout**
- **Current:** None
- **Spec Requires:** Lock after 5 failed attempts × 15min window
- **Table Needed:** `LoginAttempt { id, userId, timestamp, success }`
- **Logic Location:** `auth.service.ts` login() method

**Gap:**
```typescript
// NEEDED in login()
1. Check if user has 5 failed attempts in last 15 min
2. If locked, throw AuthenticationError("Account temporarily locked")
3. On password validation failure, record LoginAttempt { success: false }
4. On success, clear LoginAttempt records for user
```

#### 3. **bcrypt Cost Factor**
- **Current:** 10
- **Spec Requires:** 12
- **Location:** `auth.service.ts` hashPassword() method
- **Impact:** Slower hashing, better security

**Gap:**
```typescript
// CURRENT
bcrypt.hash(password, 10)

// NEEDED
bcrypt.hash(password, 12)
```

---

### Medium Priority (Phase 1)

#### 4. **Email Verification Enforcement**
- **Current:** `emailVerified` field exists but never set to true
- **Spec Requires:** Required before first order
- **Where:** 
  - Add email verification flow (send link on registration)
  - Check `emailVerified` before order creation
  - Add `verifyEmail(token)` endpoint

**Gap:**
```typescript
// Schema ready, need:
1. generateEmailVerificationToken(userId) → token with 1hr expiry
2. sendVerificationEmail(email, token) → send to user inbox
3. verifyEmail(token) → mark user.emailVerified = true
4. In order creation: throw if !user.emailVerified
```

#### 5. **Password Reset Flow**
- **Current:** None
- **Spec Requires:** Secure token via email, 1hr expiry
- **Endpoints Needed:** 
  - POST /api/auth/forgot-password (send token)
  - POST /api/auth/reset-password (apply token)

**Gap:**
```typescript
// Need:
1. PasswordReset table { id, userId, token, expiresAt, used }
2. generateResetToken(userId) → send email
3. resetPassword(token, newPassword) → mark used, update passwordHash
```

#### 6. **Session Management**
- **Current:** None
- **Spec Requires:** List active sessions, revoke individually/all
- **Table Needed:** `Session { id, userId, deviceInfo, issuedAt, revokedAt }`

**Gap:**
```typescript
// Need:
1. Session table to track active tokens
2. GET /api/auth/sessions → list user's active sessions
3. DELETE /api/auth/sessions/{id} → revoke single session
4. DELETE /api/auth/sessions → revoke all sessions
5. On token generation, create Session record
6. On token verification, check if Session not revoked
```

#### 7. **Audit Logging**
- **Current:** None
- **Spec Requires:** Every login, permission change, sensitive action logged
- **Table Needed:** `AuditLog { id, userId, action, resource, timestamp, details }`

**Gap:**
```typescript
// Need:
1. AuditLog table
2. Log on: login (success/fail), password change, role change, session revoke
3. GET /api/audit?userId=X or /api/audit?action=login for admin
4. Function: async logAction(userId, action, resource, details)
```

---

### Low Priority (Phase 1.5)

#### 8. **Granular Permissions**
- **Current:** Role-based only (CUSTOMER, VENDOR, ADMIN)
- **Spec Requires:** Permission matrix (orders:read, orders:update:status, pricing:admin)
- **Decision:** Defer — Inline checks for Phase 1

**Deferred Pattern:**
```typescript
// Instead of permission table, use inline checks:
async canUpdateOrderStatus(userId, orderId, newStatus) {
  const user = await getUser(userId);
  const order = await getOrder(orderId);
  
  // Business logic
  if (user.role === 'ADMIN') return true;
  if (user.role === 'CUSTOMER' && order.customerId === userId && newStatus === 'DRAFT') return true;
  return false;
}
```

---

## 4. Implementation Roadmap

### Phase 1 (Core Auth) — Implement First
1. **Password Policy** — ~30 min
2. **Account Lockout** — ~1-2 hrs (includes LoginAttempt table)
3. **bcrypt Cost Factor** — ~5 min
4. **Email Verification** — ~1-2 hrs
5. **Password Reset** — ~1-2 hrs
6. **Session Management** — ~2-3 hrs
7. **Audit Logging** — ~1-2 hrs

**Total Phase 1:** ~8-12 hrs

### Phase 1.5 (Security Hardening) — Implement Later
1. **2FA/TOTP** — ~3-4 hrs
2. **Granular Permissions** — ~4-6 hrs (refactor to Permission model)

### Phase 2+ (Enterprise)
1. **SSO/SAML** — ~8+ hrs
2. **Social login** — ~4-6 hrs each
3. **Enterprise roles** — ~4-6 hrs

---

## 5. Database Schema Changes Needed (REVISED)

### Critical Design Decisions (Post-Review)

#### 🔴 PROBLEM 1: JWT Statelessness vs Session Table
**Issue**: If we track all sessions in DB and check on every request, JWT loses its "stateless" benefit. Every request needs a DB query, reducing performance.

**Solution Chosen**: 
- **Remove `Session` table** (was problematic)
- Use **Redis blacklist** for revoked `refreshToken` only
- `accessToken` (15min) remains stateless — no DB check
- Only `refreshToken` revocation requires Redis lookup
- On logout: add `refreshToken` to Redis blacklist with 7-day TTL

**Impact**: 
- Most requests (with valid `accessToken`) are still stateless ✅
- Only logout/revocation checks need Redis (acceptable) ✅
- No Session table bloat ✅
- Preserves JWT performance benefits ✅

#### 🔴 PROBLEM 2: Account Lockout (DoS Vulnerability)
**Issue**: Locking after 5 failed attempts = attacker can DoS legitimate users by triggering lockout on their accounts.

**Solution Chosen**:
- Remove hard account lockout
- Implement **exponential backoff** (1s, 2s, 4s, 8s, 16s delays)
- Add **CAPTCHA after 3 failed attempts**
- Track per **email + IP** (not just email)
- Store in Redis with TTL

**Impact**:
- Prevents DoS attacks ✅
- Legitimate users can retry after short delays ✅
- CAPTCHA deters bots ✅

#### 🟡 PROBLEM 3: Email Verification – Incomplete Flow
**Issue**: No way to resend verification link if email is missed or marked as spam.

**Solution Chosen**:
- Add `POST /api/auth/resend-verification` endpoint
- Limit to 3 resend attempts per hour
- Store `verificationAttempts` in Redis
- Allow changing email before verification (re-verify new email)

**Impact**:
- Users can recover if verification email fails ✅
- Rate-limited to prevent abuse ✅

#### 🟡 PROBLEM 4: Inline Permissions = Code Duplication
**Issue**: Scattering permission logic across route handlers duplicates logic and causes inconsistencies.

**Solution Chosen**:
- Create centralized **`permissions.service.ts`**
- Define all permission rules in one place
- Export functions: `canUpdateOrder()`, `canViewDesign()`, etc.
- Import and use in route handlers
- Better than Permission DB table for Phase 1, but still maintainable

**Impact**:
- Single source of truth for permissions ✅
- Easy to audit and modify ✅
- Avoids database overhead ✅

#### 🟡 PROBLEM 5: LoginAttempt Table Growth
**Issue**: Storing every failed login creates rapid table growth, especially during attacks. Scaling becomes problematic.

**Solution Chosen**:
- **Remove `LoginAttempt` table entirely**
- Use **Redis** for failed attempt tracking with **TTL**
- Structure: `failed_login:{email}:{ip} → count` (expires in 15 min)
- Also track: `failed_login_cap:{email} → timestamp` (for CAPTCHA)
- Much faster, auto-expires, memory-bounded

**Impact**:
- Prevents table bloat ✅
- Better performance (Redis >> DB queries) ✅
- Auto-cleanup with TTL ✅

### New Tables (SIMPLIFIED)

```sql
-- Track password resets (must be persistent)
CREATE TABLE "PasswordReset" (
  id STRING PRIMARY KEY,
  userId STRING NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token STRING UNIQUE NOT NULL,
  expiresAt DATETIME NOT NULL,
  usedAt DATETIME,
  
  INDEX idx_token (token),
  INDEX idx_userId_usedAt (userId, usedAt)
);

-- Track email verification (must be persistent)
CREATE TABLE "EmailVerificationToken" (
  id STRING PRIMARY KEY,
  userId STRING NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  token STRING UNIQUE NOT NULL,
  expiresAt DATETIME NOT NULL,
  verifiedAt DATETIME,
  
  INDEX idx_token (token)
);

-- Audit log (must be persistent, with cleanup policy)
CREATE TABLE "AuditLog" (
  id STRING PRIMARY KEY,
  userId STRING NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  action STRING NOT NULL,         -- "login", "password_change", "order_created", etc.
  resource STRING,                -- e.g., "Order:12345"
  details JSON,                   -- additional context
  timestamp DATETIME NOT NULL DEFAULT now(),
  
  INDEX idx_userId (userId),
  INDEX idx_action (action),
  INDEX idx_timestamp (timestamp)
);

-- Note: Refresh token revocation stored in Redis, NOT in DB
-- Key format: blacklist:refreshToken:{tokenJti} (expires in 7 days)
```

### Existing Tables Changes

```sql
-- Update User model
ALTER TABLE "User" 
ADD COLUMN lastLoginAt DATETIME,
ADD COLUMN emailVerificationAttemptsAt DATETIME;

-- Note: Removed failedLoginCount (now tracked in Redis)
-- Note: Removed lastFailedLoginAt (now tracked in Redis)
```

### Redis Storage (NEW – Not in DB)

```
Key Structure                           | TTL    | Purpose
-----------------------------------------|--------|------------------
failed_login:{email}:{ip}              | 15min  | Count of failed attempts
failed_login_cap:{email}               | 24hr   | CAPTCHA requirement timestamp
blacklist:refreshToken:{jti}           | 7d     | Revoked refresh tokens
verification_attempts:{userId}         | 1hr    | Email verification resend count
password_reset_attempt:{userId}        | 5min   | Rate limit password reset requests
```

---

## 6. Success Criteria Mapping

### Already Met ✅
- [x] JWT access + refresh token flow
- [x] Role-based middleware on endpoints
- [x] Resource-level access (design owner checks in place)
- [x] Token verification (verifyAccessToken/verifyRefreshToken)

### In Progress (Phase 1)
- [ ] Password policy enforced on registration and change
- [ ] Account lockout after 5 failed attempts
- [ ] Session management: list active sessions, revoke individually or all
- [ ] Audit log: every login, permission change, sensitive action logged
- [ ] Password reset: secure token via email, expires in 1 hour
- [ ] Email verification: required before first order

### Deferred (Phase 1.5)
- [ ] Two-factor authentication (TOTP)
- [ ] Permission middleware: granular permissions (will implement full matrix)

### Already Met (Non-Functional)
- [x] Password hashing: bcrypt (cost factor 10 → will update to 12)
- [ ] Login API <200ms (will verify after implementation)
- [ ] Token refresh <100ms (will verify after implementation)
- [ ] Permission check <5ms (will verify after implementation)

---

## 7. Key Implementation Decisions (REVISED)

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **JWT Statefulness** | Redis blacklist for `refreshToken` only; `accessToken` remains stateless | Preserves performance, prevents DoS via DB queries |
| **Account Lockout** | Exponential backoff (1s, 2s, 4s, 8s, 16s) + CAPTCHA after 3 attempts | Prevents brute force AND DoS attacks; legitimate users unaffected |
| **Failed Login Storage** | Redis (TTL: 15min), tracked by `{email}:{ip}` | Prevents table bloat, auto-cleanup, better performance |
| **Session Tracking** | REMOVED (not needed with stateless JWT + blacklist) | Avoids DB overhead, keeps JWT benefits |
| **Email Verification** | Persistent DB + resend endpoint (3 attempts/hour) | Allows recovery if email missed; rate-limited |
| **Password Reset Token** | Single-use token with 1hr expiry (in DB) | Per spec; security best practice |
| **Permissions** | Centralized `permissions.service.ts` with inline checks | Simple Phase 1 approach; avoids DB overhead; easy to refactor |
| **Audit Log** | Persistent DB with 90-day retention policy | Compliance; old logs auto-deleted |
| **Redis Setup** | Use existing Redis connection (already available) | No new infrastructure needed |
| **bcrypt Cost** | Update from 10 → 12 | Better security (spec requirement) |
| **2FA Timing** | Phase 1.5 (after core auth stabilized) | Exponential backoff provides good security for Phase 1 |

---

## 9. Implementation Roadmap (REVISED)

### Phase 1 (Core Auth) — Implement First

| # | Task | Complexity | Time | Dependencies |
|---|------|-----------|------|--------------|
| 1 | Password policy validation (regex + test) | Low | 30min | None |
| 2 | Exponential backoff logic (replace lockout) | Medium | 1-2hr | Redis |
| 3 | CAPTCHA integration setup | Medium | 1-2hr | Password policy |
| 4 | bcrypt cost factor (10 → 12) | Low | 5min | None |
| 5 | Email verification flow (DB + send) | Medium | 1-2hr | Email service |
| 6 | Email resend endpoint (rate-limited) | Low | 1hr | Email service |
| 7 | Password reset flow (secure token) | Medium | 1-2hr | Email service |
| 8 | Permissions service (centralized) | Low | 1-2hr | None |
| 9 | Audit logging (DB + helper) | Low | 1-2hr | None |
| 10 | Redis blacklist for `refreshToken` | Low | 1hr | Redis setup |
| 11 | Update User model (remove failed login tracking) | Low | 30min | Prisma |
| 12 | Integration tests (curl + Postman) | Medium | 2-3hr | All above |

**Total Phase 1:** ~14-18 hrs (down from 8-12 hrs due to better design)

### Phase 1.5 (Security Hardening)
- 2FA/TOTP implementation (exponential backoff removes urgency)
- Granular permission model (if needed based on Phase 1 experience)

### Files Modified/Created (REVISED)

**Existing Files to Modify:**
```
backend/src/modules/auth/auth.controller.ts       (add validation, new endpoints)
backend/src/modules/auth/auth.service.ts          (exponential backoff, email flows)
backend/src/middleware/auth.middleware.ts         (add Redis blacklist check)
backend/src/modules/auth/auth.routes.ts           (add resend-verification, reset-password)
backend/prisma/schema.prisma                      (remove LoginAttempt fields, add EmailVerificationToken, PasswordReset)
```

**New Files to Create:**
```
backend/src/services/permissions.service.ts       (centralized permission checks)
backend/src/services/email.service.ts             (send emails – must already exist?)
backend/src/services/redis.service.ts             (helper for Redis operations)
backend/src/utils/password-validator.ts           (password policy + test)
backend/src/utils/captcha-validator.ts            (CAPTCHA verification)
backend/src/services/audit-log.service.ts         (audit logging)
backend/src/modules/auth/auth.types.ts            (TypeScript types for auth)
```

**Database Migrations:**
```
backend/database/migrations/005_auth_schema_v2.sql
  - Create EmailVerificationToken table
  - Create PasswordReset table
  - Create AuditLog table
  - Remove failed login fields from User (if re-scheming)
```

## 10. Implementation Details for Each Solution

### Solution 1: Redis Blacklist (Instead of Session Table)

**Workflow:**

```
Login:
1. Validate credentials
2. Generate accessToken (JWT, 15min)
3. Generate refreshToken (JWT, 7d) with `jti` (JWT ID)
4. Return both to client
5. No DB/Redis write for happy path

Logout/Revoke:
1. Client sends POST /api/auth/logout with refreshToken
2. Extract `jti` from refreshToken
3. Add to Redis: blacklist:refreshToken:{jti} with TTL=7d
4. Return 200 OK

Token Refresh:
1. Client sends POST /api/auth/refresh with refreshToken
2. Check Redis: is blacklist:refreshToken:{jti} present?
3. If yes, reject (revoked) → 401 Unauthorized
4. If no, verify JWT signature and expiry
5. Generate new accessToken + refreshToken
6. Return both to client

Protected Route:
1. Client sends GET /api/designs with Authorization: Bearer {accessToken}
2. Verify JWT signature and expiry (NO DB CALL)
3. Attach user to request, proceed
```

**Code Implementation:**

```typescript
// auth.service.ts - Login
async login(data: LoginData): Promise<{ user; tokens }> {
  // ... validate credentials ...
  const jti = generateUUID();
  
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    jti: jti, // Add JWT ID
  };
  
  const accessToken = this.generateAccessToken(payload);
  const refreshToken = this.generateRefreshToken(payload);
  
  // No DB write needed!
  return { user, tokens: { accessToken, refreshToken, expiresIn: 15*60 } };
}

// auth.service.ts - Logout
async logout(refreshToken: string): Promise<void> {
  const payload = this.verifyRefreshToken(refreshToken);
  const redis = getRedisClient();
  
  await redis.setex(
    `blacklist:refreshToken:${payload.jti}`,
    7 * 24 * 60 * 60, // 7 days TTL
    '1'
  );
}

// auth.middleware.ts - Token validation
async function authenticate(request: FastifyRequest): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthenticationError('Missing token');
  }
  
  const token = authHeader.substring(7);
  const payload = this.verifyAccessToken(token); // No DB/Redis check!
  (request as AuthenticatedRequest).user = payload;
}

// auth.service.ts - Refresh with blacklist check
async refreshToken(refreshToken: string): Promise<AuthTokens> {
  const payload = this.verifyRefreshToken(refreshToken);
  const redis = getRedisClient();
  
  // Check if refreshToken is blacklisted
  const isBlacklisted = await redis.exists(`blacklist:refreshToken:${payload.jti}`);
  if (isBlacklisted) {
    throw new AuthenticationError('Refresh token revoked');
  }
  
  // Generate new tokens
  const newJti = generateUUID();
  const newPayload = { ...payload, jti: newJti };
  
  return {
    accessToken: this.generateAccessToken(newPayload),
    refreshToken: this.generateRefreshToken(newPayload),
    expiresIn: 15*60,
  };
}
```

### Solution 2: Exponential Backoff + CAPTCHA

**Workflow:**

```
Failed Login Attempt:
1. User enters wrong password
2. Get current attempt count from Redis: failed_login:{email}:{ip}
3. Increment count
4. If count === 1 → delay 1s before response
5. If count === 2 → delay 2s
6. If count === 3 → delay 4s + REQUIRE CAPTCHA on next attempt
7. If count === 4 → delay 8s + REQUIRE CAPTCHA
8. If count === 5+ → delay 16s + REQUIRE CAPTCHA
9. After 15min with no attempts → auto-clear from Redis (TTL)
10. Legitimate user can keep retrying (just gets longer delays)

CAPTCHA Validation:
1. If attempt count >= 3, client must include `captcha_token`
2. Verify CAPTCHA token with provider (e.g., reCAPTCHA)
3. If valid, proceed with login attempt
4. If invalid, return 400 + increment attempt count
```

**Code Implementation:**

```typescript
// auth.service.ts - Login with exponential backoff
async login(data: LoginData, captchaToken?: string): Promise<{ user; tokens }> {
  const redis = getRedisClient();
  const clientIp = getClientIp(request);
  const attemptKey = `failed_login:${data.email}:${clientIp}`;
  
  // Get current attempt count
  let attemptCount = parseInt(await redis.get(attemptKey) || '0');
  
  // Check CAPTCHA requirement
  if (attemptCount >= 3 && !captchaToken) {
    return { error: 'CAPTCHA_REQUIRED', attemptCount };
  }
  
  if (attemptCount >= 3) {
    const isValidCaptcha = await verifyCaptcha(captchaToken);
    if (!isValidCaptcha) {
      attemptCount++;
      await redis.setex(attemptKey, 15*60, attemptCount.toString());
      throw new ValidationError('Invalid CAPTCHA');
    }
  }
  
  // Find user
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    attemptCount++;
    await redis.setex(attemptKey, 15*60, attemptCount.toString());
    
    // Apply delay
    const delay = getBackoffDelay(attemptCount);
    await sleep(delay);
    
    throw new AuthenticationError('Invalid email or password');
  }
  
  // Verify password
  const isValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isValid) {
    attemptCount++;
    await redis.setex(attemptKey, 15*60, attemptCount.toString());
    
    const delay = getBackoffDelay(attemptCount);
    await sleep(delay);
    
    throw new AuthenticationError('Invalid email or password');
  }
  
  // Success! Clear attempt counter
  await redis.del(attemptKey);
  
  // Generate tokens and return
  const tokens = this.generateTokens(user);
  return { user, tokens };
}

// Helper: Calculate backoff delay
function getBackoffDelay(attemptCount: number): number {
  const delays = [0, 1000, 2000, 4000, 8000, 16000];
  return delays[Math.min(attemptCount, 5)]; // Cap at 16s
}
```

### Solution 3: Centralized Permissions Service

**Workflow:**

```
Before: Permission checks scattered in each route
├── /api/orders/{id}   → canUpdateOrder() defined here
├── /api/designs/{id}  → canEditDesign() defined here
└── /api/payments/{id} → canProcessPayment() defined here
→ Result: Code duplication, hard to maintain

After: Centralized permissions service
├── permissions.service.ts
│   ├── canUpdateOrder(userId, orderId)
│   ├── canEditDesign(userId, designId)
│   ├── canProcessPayment(userId, paymentId)
│   └── ... all rules in one place
└── Routes import and use:
    ├── /api/orders/{id}   → call permissions.canUpdateOrder()
    ├── /api/designs/{id}  → call permissions.canEditDesign()
    └── /api/payments/{id} → call permissions.canProcessPayment()
```

**Code Implementation:**

```typescript
// backend/src/services/permissions.service.ts
import { prisma } from '../lib/prisma';
import { UserRole } from '../types';

export class PermissionsService {
  // Orders
  async canUpdateOrder(userId: string, orderId: string, userRole: UserRole): Promise<boolean> {
    if (userRole === 'ADMIN') return true;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true },
    });
    
    return order?.customerId === userId;
  }
  
  // Designs
  async canEditDesign(userId: string, designId: string, userRole: UserRole, designStatus: string): Promise<boolean> {
    if (userRole === 'ADMIN') return true;
    if (designStatus !== 'DRAFT') return false;
    
    const design = await prisma.design.findUnique({
      where: { id: designId },
      select: { order: { select: { customerId: true } } },
    });
    
    return design?.order.customerId === userId;
  }
  
  async canReviewDesign(userId: string, designId: string, userRole: UserRole): Promise<boolean> {
    if (!['ADMIN', 'DESIGNER'].includes(userRole)) return false;
    
    // Designers can only review designs in their assigned orders
    if (userRole === 'DESIGNER') {
      const design = await prisma.design.findUnique({
        where: { id: designId },
        select: {
          order: {
            select: {
              assignedDesigners: { select: { userId: true } },
            },
          },
        },
      });
      return design?.order.assignedDesigners.some(d => d.userId === userId) ?? false;
    }
    
    return true; // ADMIN can review any design
  }
  
  // Payments
  async canProcessPayment(userId: string, paymentId: string, userRole: UserRole): Promise<boolean> {
    if (userRole === 'ADMIN') return true;
    
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { order: { select: { customerId: true } } },
    });
    
    return payment?.order.customerId === userId;
  }
}

export const permissionsService = new PermissionsService();

// Usage in routes:
// backend/src/modules/orders/orders.routes.ts
import { permissionsService } from '../../services/permissions.service';

routes.put<{ Params: { id: string } }>('/orders/:id', async (request, reply) => {
  const { user } = request as AuthenticatedRequest;
  
  const canUpdate = await permissionsService.canUpdateOrder(user.userId, request.params.id, user.role);
  if (!canUpdate) {
    throw new AuthorizationError('Cannot update this order');
  }
  
  // Proceed with update
  const order = await ordersService.update(request.params.id, request.body);
  reply.send(order);
});
```

### Solution 4: Email Resend with Rate Limiting

**Workflow:**

```
POST /api/auth/register
1. Validate email/password
2. Create user with emailVerified=false
3. Generate verification token (1hr expiry)
4. Send email
5. Return 201, ask user to check email

User doesn't receive email (or marks as spam), tries to resend:

POST /api/auth/resend-verification
1. Client sends { email }
2. Find user in DB
3. Check Redis: verification_attempts:{userId}
4. If count >= 3 in last hour → 429 Too Many Requests
5. If count < 3 → generate new token, send email, increment Redis
6. Return 200 OK
```

**Code Implementation:**

```typescript
// auth.routes.ts - New endpoint
routes.post('/resend-verification', async (request, reply) => {
  const { email } = request.body;
  
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal if email exists (security)
    return reply.status(200).send({ message: 'Check your email' });
  }
  
  if (user.emailVerified) {
    return reply.status(200).send({ message: 'Email already verified' });
  }
  
  const redis = getRedisClient();
  const attemptKey = `verification_attempts:${user.id}`;
  
  // Check rate limit
  let attempts = parseInt(await redis.get(attemptKey) || '0');
  if (attempts >= 3) {
    return reply.status(429).send({ 
      error: 'Too many resend attempts. Try again in 1 hour.' 
    });
  }
  
  // Generate and send verification token
  const token = generateSecureToken();
  const expiresAt = new Date(Date.now() + 1*60*60*1000); // 1 hour
  
  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
    },
  });
  
  await emailService.sendVerificationEmail(user.email, token);
  
  // Increment attempt counter
  await redis.incr(attemptKey);
  await redis.expire(attemptKey, 60*60); // 1 hour TTL
  
  return reply.status(200).send({ message: 'Verification email sent' });
});
```

### Phase 1 (Core Auth) — Implement First

| # | Task | Complexity | Time | Dependencies |
|---|------|-----------|------|--------------|
| 1 | Password policy validation (regex + test) | Low | 30min | None |
| 2 | Exponential backoff logic (replace lockout) | Medium | 1-2hr | Redis |
| 3 | CAPTCHA integration setup | Medium | 1-2hr | Password policy |
| 4 | bcrypt cost factor (10 → 12) | Low | 5min | None |
| 5 | Email verification flow (DB + send) | Medium | 1-2hr | Email service |
| 6 | Email resend endpoint (rate-limited) | Low | 1hr | Email service |
| 7 | Password reset flow (secure token) | Medium | 1-2hr | Email service |
| 8 | Permissions service (centralized) | Low | 1-2hr | None |
| 9 | Audit logging (DB + helper) | Low | 1-2hr | None |
| 10 | Redis blacklist for `refreshToken` | Low | 1hr | Redis setup |
| 11 | Update User model (remove failed login tracking) | Low | 30min | Prisma |
| 12 | Integration tests (curl + Postman) | Medium | 2-3hr | All above |

**Total Phase 1:** ~14-18 hrs (down from 8-12 hrs due to better design)

### Files Modified/Created (REVISED)

**Existing Files to Modify:**
```
backend/src/modules/auth/auth.controller.ts       (add validation, new endpoints)
backend/src/modules/auth/auth.service.ts          (exponential backoff, email flows)
backend/src/middleware/auth.middleware.ts         (add Redis blacklist check)
backend/src/modules/auth/auth.routes.ts           (add resend-verification, reset-password)
backend/prisma/schema.prisma                      (remove LoginAttempt fields, add EmailVerificationToken, PasswordReset)
```

**New Files to Create:**
```
backend/src/services/permissions.service.ts       (centralized permission checks)
backend/src/services/email.service.ts             (send emails – must already exist?)
backend/src/services/redis.service.ts             (helper for Redis operations)
backend/src/utils/password-validator.ts           (password policy + test)
backend/src/utils/captcha-validator.ts            (CAPTCHA verification)
backend/src/services/audit-log.service.ts         (audit logging)
backend/src/modules/auth/auth.types.ts            (TypeScript types for auth)
```

**Database Migrations:**
```
backend/database/migrations/005_auth_schema_v2.sql
  - Create EmailVerificationToken table
  - Create PasswordReset table
  - Create AuditLog table
  - Remove failed login fields from User (if re-scheming)
```

### Critical Issues Addressed

| # | Problem | Original Approach | Issue Found | New Solution |
|---|---------|-------------------|-------------|--------------|
| 1 | JWT Statefulness | DB `Session` table + revocation checks | Every request requires DB query; loses JWT benefits | Redis blacklist for `refreshToken` only; `accessToken` stateless |
| 2 | Account Lockout | Hard lock after 5 attempts (15min) | Vulnerable to DoS attacks on legitimate accounts | Exponential backoff (1s→16s) + CAPTCHA after 3 attempts |
| 3 | Failed Login Tracking | `LoginAttempt` table for persistence | Rapid table growth during attacks; scaling issues | Redis with TTL (15min); tracked by `{email}:{ip}` |
| 4 | Email Verification | Send once, no recovery | Users trapped if email missed/marked spam | Add resend endpoint (3x/hour limit) |
| 5 | Permission Logic | Scattered in route handlers | Code duplication; hard to maintain | Centralized `permissions.service.ts` |

### Clarifications Applied

| # | Topic | User Input (Original) | Revised Decision | Rationale |
|---|-------|----------------------|------------------|-----------|
| 1 | Role System | Keep 3 roles for Phase 1 | **CONFIRMED** | Simplifies scope; extend in Phase 2 |
| 2 | Permissions Model | Inline checks (simple) | **REFINED**: Use centralized service | Avoids duplication while staying simple |
| 3 | Account Lockout | Phase 1 requirement | **REDESIGNED**: Exponential backoff + CAPTCHA | Prevents DoS while meeting spec intent (security) |

---

## 11. Critical Decisions Summary (Final)

### What Changed (vs. Original Analysis)

| Component | Original | Revised | Impact |
|-----------|----------|---------|--------|
| **Session Tracking** | DB `Session` table | Redis blacklist + stateless JWT | ✅ Eliminates DB overhead |
| **Account Lockout** | Hard lock (5 attempts) | Exponential backoff + CAPTCHA | ✅ Prevents DoS attacks |
| **Failed Attempt Storage** | `LoginAttempt` table | Redis with TTL | ✅ Prevents table bloat |
| **Permission Architecture** | Scattered in routes | Centralized service | ✅ Single source of truth |
| **Database Tables** | 5 new tables (Session, LoginAttempt, etc.) | 3 new tables (only persistent data) | ✅ Simplified schema |

### Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Redis unavailable | All key Redis data has 15min-7day TTL; failed logins auto-clear without Redis | Graceful degradation |
| CAPTCHA provider down | Exponential backoff still active; users can retry without CAPTCHA after 3 failures clear | Fallback to backoff |
| Email service failure | User can retry resend; tokens persist in DB until expiry | Retryable |

## 12. Next Steps

1. **Create Prisma migrations** for:
   - `EmailVerificationToken` table
   - `PasswordReset` table
   - `AuditLog` table
   - Update `User` model

2. **Create utility functions**:
   - `password-validator.ts` (regex + tests)
   - `captcha-validator.ts` (provider integration)
   - `redis.service.ts` (helper functions)

3. **Implement services**:
   - `permissions.service.ts` (centralized rules)
   - `audit-log.service.ts` (logging)

4. **Update auth flow**:
   - Add exponential backoff to `login()`
   - Add CAPTCHA requirement logic
   - Add email verification on register
   - Add resend-verification endpoint
   - Add password reset endpoints

5. **Update middleware**:
   - Add Redis blacklist check to token refresh
   - Add audit logging to sensitive operations

6. **Test all flows**:
   - Password policy validation
   - Exponential backoff timing
   - CAPTCHA requirement
   - Email verification
   - Password reset
   - Audit logs

---

## 13. Spec Conformance

### Original Spec Requirements Met

| Requirement | Status | Notes |
|-------------|--------|-------|
| **JWT tokens (15min + 7d refresh)** | ✅ | Already implemented; improved with blacklist |
| **Password policy (8+ chars, upper, lower, number, special)** | ✅ | Will be implemented in Phase 1 |
| **Account security** | ✅ IMPROVED | Exponential backoff + CAPTCHA is better than hard lockout |
| **Session management** | ✅ | `refreshToken` revocation via Redis blacklist |
| **Email verification** | ✅ | With resend capability |
| **Password reset (1hr expiry)** | ✅ | Will be implemented in Phase 1 |
| **Audit logging** | ✅ | Will be implemented in Phase 1 |
| **Role-based access** | ✅ | With centralized permission service |
| **Resource-level access** | ✅ | Via permission service functions |

### Phase 1.5+ Requirements (Deferred)

| Requirement | Timing | Rationale |
|-------------|--------|-----------|
| **2FA/TOTP** | Phase 1.5 | Exponential backoff provides strong security for Phase 1; can defer |
| **Granular permission model** | Phase 1.5 | Permission service provides extensibility; DB model can be added later |

---

**Status:** ✅ **Ready for `/speckit.plan`**

This revised analysis addresses all critical issues raised:
1. ✅ JWT statefulness preserved with Redis blacklist
2. ✅ DoS attacks prevented with exponential backoff + CAPTCHA
3. ✅ Email verification recovery with resend endpoint
4. ✅ Permission logic centralized in service
5. ✅ No table bloat with Redis-based attempt tracking

**Next action:** Create detailed task breakdown via `/speckit.plan`
