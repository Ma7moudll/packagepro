# Phase 1: Data Model — SPEC-013 Authentication

**Date**: June 1, 2026  
**Status**: ✅ Complete  
**Reference**: `plan.md` | `research.md`

---

## Entity-Relationship Diagram

```
┌─────────────┐         ┌──────────────────────┐         ┌──────────────────┐
│    User     │         │EmailVerificationToken│         │ PasswordReset    │
├─────────────┤         ├──────────────────────┤         ├──────────────────┤
│ id (PK)     │────────→│ id (PK)              │         │ id (PK)          │
│ email       │         │ userId (FK)          │         │ userId (FK)      │
│ passwordHash│         │ token (UNIQUE)       │         │ token (UNIQUE)   │
│ role        │         │ expiresAt            │         │ expiresAt        │
│ emailVerif. │         │ verifiedAt           │         │ usedAt           │
│ lastLoginAt │         └──────────────────────┘         └──────────────────┘
└─────────────┘
      │
      │ 1:N
      └─────────────────────┐
                            │
                    ┌───────▼────────┐
                    │  AuditLog      │
                    ├────────────────┤
                    │ id (PK)        │
                    │ userId (FK)    │
                    │ action         │
                    │ resource       │
                    │ details (JSON) │
                    │ timestamp      │
                    └────────────────┘
```

---

## Core Entities

### 1. User (Updated)

**Purpose**: Store user identity and authentication credentials

**Fields**:

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (CUID) | PK | Auto-generated |
| email | String | UNIQUE, NOT NULL | Login identifier |
| passwordHash | String | NOT NULL | bcrypt hash (cost 12) |
| role | Enum | CUSTOMER \| VENDOR \| ADMIN | Default: CUSTOMER |
| firstName | String | Optional | User's first name |
| lastName | String | Optional | User's last name |
| phone | String | Optional | Contact phone |
| emailVerified | Boolean | Default: false | Verification gate before orders |
| lastLoginAt | DateTime | Optional | Audit trail |
| createdAt | DateTime | Default: now() | Record creation |
| updatedAt | DateTime | Auto-update | Record modification |

**Relations**:
- 1:N → EmailVerificationToken (one user, many verification attempts)
- 1:N → PasswordReset (one user, many reset attempts)
- 1:N → AuditLog (one user, many audit events)
- 1:1 → Customer (if role = CUSTOMER)
- 1:1 → Vendor (if role = VENDOR)

**Validation Rules**:
- email: Must be valid email format, unique
- passwordHash: Never null; always bcrypt hashed
- role: Only CUSTOMER, VENDOR, or ADMIN (Phase 1)
- emailVerified: Required before creating first order

**State Transitions**:
- New user: emailVerified = false
- After email click: emailVerified = true
- Password changed: passwordHash updated, previous not retained

---

### 2. EmailVerificationToken (New)

**Purpose**: Enable secure email verification and recovery (resend capability)

**Fields**:

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (CUID) | PK | Auto-generated |
| userId | String | FK(User), NOT NULL | Owner of token |
| token | String | UNIQUE, NOT NULL | Secure random token |
| expiresAt | DateTime | NOT NULL | 1-hour from creation |
| verifiedAt | DateTime | Optional | When user clicked link |
| createdAt | DateTime | Default: now() | Creation timestamp |

**Indexes**:
- `token` (for lookup during email click)
- `userId, expiresAt` (for cleanup query)

**Validation Rules**:
- token: Random 32+ bytes, URL-safe encoded
- expiresAt: Always 1 hour from creation
- verifiedAt: Can only be set once per token

**Lifecycle**:
1. On registration: Create EmailVerificationToken with 1hr expiry
2. Send verification email with link: `{FRONTEND_URL}/auth/verify?token={token}`
3. User clicks link: POST /api/auth/verify-email/{token}
4. If token valid and not expired: Set verifiedAt, update User.emailVerified = true
5. If token expired or used: Delete token, prompt resend
6. Auto-cleanup: Delete tokens older than 1 hour (optional batch job)

**Resend Flow**:
- User missed email or marked as spam
- POST /api/auth/resend-verification
- Check Redis: `verification_attempts:{userId}` (max 3/hour)
- Create new token, send email again
- Increment attempt counter in Redis

---

### 3. PasswordReset (New)

**Purpose**: Secure password reset via email with single-use tokens

**Fields**:

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (CUID) | PK | Auto-generated |
| userId | String | FK(User), NOT NULL | Owner of token |
| token | String | UNIQUE, NOT NULL | Secure random token |
| expiresAt | DateTime | NOT NULL | 1 hour from creation |
| usedAt | DateTime | Optional | When password was reset |
| createdAt | DateTime | Default: now() | Creation timestamp |

**Indexes**:
- `token` (for lookup during reset)
- `userId, createdAt` (for list user's reset attempts)

**Validation Rules**:
- token: Random 32+ bytes, URL-safe encoded
- expiresAt: Always 1 hour from creation
- usedAt: Can only be set once per token (single-use)

**Lifecycle**:
1. User forgot password: POST /api/auth/forgot-password with email
2. Create PasswordReset token with 1hr expiry
3. Send reset email: `{FRONTEND_URL}/auth/reset?token={token}`
4. User clicks link, enters new password: POST /api/auth/reset-password {token, newPassword}
5. If token valid, not expired, not used:
   - Hash new password with bcrypt cost 12
   - Update User.passwordHash
   - Set PasswordReset.usedAt = now()
6. If token expired or already used: Prompt forgot-password again
7. Auto-cleanup: Delete tokens older than 1 hour or marked usedAt >7 days

**Rate Limiting**:
- Max 3 password reset requests per user per hour (tracked in Redis)
- Key: `password_reset_attempt:{userId}` (TTL: 1 hour)

---

### 4. AuditLog (New)

**Purpose**: Track all sensitive actions for compliance and security monitoring

**Fields**:

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | String (CUID) | PK | Auto-generated |
| userId | String | FK(User), NOT NULL | Who performed action |
| action | String | NOT NULL | Action type (see values below) |
| resource | String | Optional | What was acted upon |
| details | JSON | Optional | Additional context |
| timestamp | DateTime | Default: now(), NOT NULL | When action occurred |

**Indexes**:
- `userId` (for user-specific audit trails)
- `action` (for aggregating action types)
- `timestamp` (for time-range queries)
- Composite: `userId, timestamp DESC` (for efficient user history)

**Action Types**:

| Action | Trigger | Details |
|--------|---------|---------|
| login_success | Successful login | { ip, userAgent, method } |
| login_failed | Failed login attempt | { ip, reason, attemptCount } |
| logout | User clicks logout | { token_jti } |
| register | New user registration | { email, role } |
| email_verified | User verified email | { email } |
| password_changed | User changed password | { changedBy: 'user' \| 'admin' } |
| password_reset_requested | Forgot password flow | { email } |
| password_reset_completed | Reset via email token | {} |
| permission_elevated | Role changed by admin | { oldRole, newRole } |
| account_locked | Account locked (future) | { reason } |
| account_unlocked | Account unlocked (future) | { unlockedBy } |

**Details Field**:
```json
{
  "ip": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "reason": "invalid_password",
  "attemptCount": 2
}
```

**Retention Policy**:
- Keep: Last 6 months (or per compliance requirement)
- Archive: Older than 6 months to separate storage (optional)
- Delete: Marked for retention > 1 year (if no compliance hold)

**Query Patterns**:
- Admin dashboard: "Show me all failed logins from IP X in last 24 hours"
- Security: "Did user Y make any suspicious changes?"
- Compliance: "Export all password_changed events for Q4"

---

## API Contracts (Related)

See `contracts/auth-api.md` for:
- POST /api/auth/register → Create User
- POST /api/auth/login → Validate credentials, track attempt
- POST /api/auth/logout → Add token to blacklist
- POST /api/auth/refresh → Validate refresh token, check blacklist
- POST /api/auth/forgot-password → Create PasswordReset
- POST /api/auth/reset-password → Consume PasswordReset, update User
- POST /api/auth/verify-email/{token} → Consume EmailVerificationToken, update User
- POST /api/auth/resend-verification → Create new EmailVerificationToken

---

## Redis Data Model (Non-Persistent)

These are stored in Redis with automatic expiry (TTL):

```
# Failed login tracking (expires 15 min)
failed_login:{email}:{ip} → count (int)

# CAPTCHA requirement flag (expires 24 hr)
failed_login_cap:{email} → timestamp

# Token blacklist (expires 7 days)
blacklist:refreshToken:{jti} → 1

# Email verification resend limit (expires 1 hour)
verification_attempts:{userId} → count (int)

# Password reset rate limit (expires 1 hour)
password_reset_attempt:{userId} → count (int)
```

---

## Validation & State Transitions

### User Registration

```
Input: { email, password, firstName?, lastName?, role? }
       Validation:
         ✓ email: Valid email format, NOT already in DB
         ✓ password: 8+ chars, 1 upper, 1 lower, 1 number, 1 special
         ✓ role: CUSTOMER (default) | VENDOR | ADMIN (admin-only)

Process:
  1. Hash password with bcrypt cost 12
  2. Create User record
  3. Create EmailVerificationToken
  4. Send verification email
  5. Log audit: register

Output: { user, tokens: { accessToken, refreshToken } }
        Note: emailVerified = false until user clicks email link
```

### User Login

```
Input: { email, password, captchaToken? }
       Validation:
         ✓ email: Valid format
         ✓ password: Non-empty

Process:
  1. Check failed login attempts: failed_login:{email}:{ip}
  2. If count >= 3: Check captchaToken (if missing, return 400 CAPTCHA_REQUIRED)
  3. If count >= 3: Verify CAPTCHA (reCAPTCHA v3)
  4. Look up User by email
  5. If not found: Increment attempt, apply backoff delay, return error
  6. Compare password with hash
  7. If mismatch: Increment attempt, apply backoff delay, return error
  8. If match:
     - Clear attempt counter
     - Generate accessToken (15 min) + refreshToken (7 days) with JTI
     - Update User.lastLoginAt
     - Log audit: login_success
     - Return tokens

Output: { user, tokens: { accessToken, refreshToken, expiresIn } }
```

### Email Verification

```
Input: token (from email link)

Process:
  1. Find EmailVerificationToken by token
  2. If not found or expired: Return error
  3. If already verified (verifiedAt set): Return error
  4. Update User.emailVerified = true
  5. Set EmailVerificationToken.verifiedAt = now()
  6. Log audit: email_verified
  7. Delete token (optional; or keep for audit)

Output: { success: true, message: "Email verified" }
        Gate: User can now create orders
```

### Password Reset

```
Input: email

Process:
  1. Check rate limit: password_reset_attempt:{userId} (max 3/hour)
  2. If limit exceeded: Return error (don't reveal if email exists)
  3. Find User by email
  4. If not found: Return success anyway (don't reveal if email exists)
  5. Create PasswordReset token
  6. Send reset email
  7. Log audit: password_reset_requested
  8. Increment rate limit counter in Redis

Output: { success: true, message: "Check your email" }

---

Then User Clicks Reset Link:

Input: { token, newPassword }
       Validation:
         ✓ token: Non-empty
         ✓ newPassword: 8+ chars, 1 upper, 1 lower, 1 number, 1 special

Process:
  1. Find PasswordReset by token
  2. If not found or expired: Return error
  3. If already used (usedAt set): Return error
  4. Hash newPassword with bcrypt cost 12
  5. Update User.passwordHash
  6. Set PasswordReset.usedAt = now()
  7. Invalidate all existing refresh tokens (blacklist all previous JTIs)
  8. Log audit: password_reset_completed
  9. Delete all other PasswordReset tokens for this user

Output: { success: true, message: "Password reset. Please login." }
        Gate: User must login again with new password
```

---

## Constraints & Assumptions

### Hard Constraints
- ✅ All passwords hashed with bcrypt cost 12
- ✅ JWT accessToken (15 min) is stateless, no DB check on every request
- ✅ JWT refreshToken (7 days) checked against Redis blacklist on refresh
- ✅ Email verification required before first order
- ✅ Rate limiting prevents DoS attacks on any account
- ✅ All sensitive actions logged to AuditLog

### Assumptions
- ✅ Email service is available (SendGrid, Nodemailer, etc.)
- ✅ Redis is available for rate limiting and token blacklist
- ✅ reCAPTCHA v3 is configured with API keys
- ✅ Frontend can send CAPTCHA tokens to backend
- ✅ Database is PostgreSQL (Prisma ORM)

### Out of Scope (Phase 1)
- ❌ Two-factor authentication (2FA) — Phase 1.5
- ❌ SSO/SAML integration — Phase 2
- ❌ Social login (Google, LinkedIn) — Phase 2
- ❌ Permission database model — Phase 1.5 (use inline checks now)
- ❌ Device/session management — Phase 2

---

## Data Migration & Cleanup

### Initial Data Load
- No seed data needed
- First-run: Create Prisma tables with migrations

### Cleanup Policies

| Table | Policy | Trigger |
|-------|--------|---------|
| EmailVerificationToken | Delete if expiresAt < now | Daily cron job (optional; data minimal) |
| PasswordReset | Delete if expiresAt < now OR usedAt > 7d | Daily cron job (optional) |
| AuditLog | Delete if timestamp < 6mo ago | Weekly cron job (compliance) |
| Redis keys | Auto-expire via TTL | Built-in to Redis |

---

## Testing Strategy

### Unit Tests
- Password validation regex
- bcrypt hashing/comparison
- Token generation (JWT with JTI)
- Rate limit logic
- Permission checks

### Integration Tests
- Full login flow (success + failure cases)
- Email verification flow
- Password reset flow
- Token refresh with blacklist
- Audit logging on each action
- Rate limiting (exponential backoff, CAPTCHA)

### E2E Tests (Manual)
- Register → verify email → login → logout → password reset → re-login

---

**Status**: ✅ Data model complete. Ready for contracts and quickstart.
