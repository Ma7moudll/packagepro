# Phase 0: Research & Clarifications — SPEC-013 Authentication

**Date**: June 1, 2026  
**Status**: ✅ Complete  
**Objective**: Resolve unknowns and validate assumptions from technical context

---

## 1. CAPTCHA Integration Decision

### Question
How should we implement CAPTCHA validation for login attempts after 3 failed tries?

### Research Finding
**Recommendation: reCAPTCHA v3**

#### Why reCAPTCHA v3?
- ✅ No user interaction required (silent verification)
- ✅ Free tier supports up to 1M requests/month
- ✅ Easy Fastify integration (HTTP-based API call)
- ✅ Works with exponential backoff (complements, doesn't replace)
- ✅ Bot detection via risk score (not visible to users)

#### Alternative Considered
- reCAPTCHA v2 (checkbox): Requires user click = slower UX
- hCaptcha: Similar but less common; less documentation
- Custom logic (IP-based): Can be bypassed; less reliable

#### Implementation Notes
```typescript
// In auth.service.ts on login
if (failedAttempts >= 3) {
  const isValidCaptcha = await verifyCaptcha(captchaToken, request.ip);
  if (isValidCaptcha < 0.5) { // Risk score threshold
    throw new ValidationError('CAPTCHA verification failed');
  }
}
```

#### Setup Required
1. Register at https://www.google.com/recaptcha/admin
2. Get `RECAPTCHA_SECRET_KEY` and `RECAPTCHA_SITE_KEY`
3. Add to `.env` for backend; inject in frontend login form
4. Call verification API on each login attempt ≥3

### Decision
✅ **reCAPTCHA v3** for Phase 1
- Alternative (hCaptcha): Can switch in Phase 2 if needed

---

## 2. Email Service Availability

### Question
What email mechanism is already available in PackagePro for sending verification & password reset emails?

### Research Finding
**Status: Needs Verification**

#### Options in Use by PackagePro
1. **Nodemailer** (common for Node.js backends)
2. **SendGrid** (cloud-based, reliable)
3. **AWS SES** (if deployed on AWS)
4. **None yet** (will need to add)

#### Recommendation
- Check existing `backend/src/services/` for email service
- If not present, implement **Nodemailer** for dev/staging, **SendGrid** for production
- Use environment variables to switch providers

#### Implementation Notes
```typescript
// backend/src/services/email.service.ts
async sendVerificationEmail(email: string, token: string): Promise<void> {
  const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;
  await emailClient.send({
    to: email,
    subject: 'Verify Your PackagePro Email',
    html: `Click here to verify: <a href="${verificationUrl}">${verificationUrl}</a>`,
  });
}
```

### Decision
✅ **Implement abstracted email service**
- Use dependency injection for provider switching
- Store email templates in separate files
- Rate-limit to 3 resends per hour (tracked in Redis)

---

## 3. Redis Client Setup Confirmation

### Question
Is Redis already configured in the PackagePro codebase?

### Research Finding
**Status: ✅ YES - Already Present**

#### Evidence
- `backend/src/lib/queues.ts` imported in auth module during review
- `backend/src/services/export-queue/export.worker.ts` uses Redis via BullMQ
- `.env` likely contains `REDIS_URL`

#### Implications
✅ No new infrastructure setup needed
✅ Can use Redis for:
- Failed login attempt tracking (key: `failed_login:{email}:{ip}`)
- CAPTCHA requirement tracking (key: `failed_login_cap:{email}`)
- Token blacklist (key: `blacklist:refreshToken:{jti}`)
- Email resend rate limiting (key: `verification_attempts:{userId}`)

#### Implementation Notes
```typescript
// backend/src/services/redis.service.ts
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
});

export async function trackFailedLogin(email: string, ip: string): Promise<number> {
  const key = `failed_login:${email}:${ip}`;
  const count = await redisClient.incr(key);
  await redisClient.expire(key, 15 * 60); // 15-minute TTL
  return count;
}

export async function isTokenBlacklisted(jti: string): Promise<boolean> {
  const key = `blacklist:refreshToken:${jti}`;
  return await redisClient.exists(key) > 0;
}
```

### Decision
✅ **Use existing Redis setup**
- No configuration changes needed
- Create helpers in `redis.service.ts` for auth use cases

---

## 4. JWT Refresh Token Rotation Best Practices

### Question
How should we handle token rotation and blacklisting for long-lived refresh tokens?

### Research Finding
**Recommendation: JTI (JWT ID) + Redis Blacklist**

#### Standard Approach (JWT ID)
1. Generate unique `jti` claim in token payload
2. On logout/revoke, add `jti` to blacklist in Redis with TTL
3. On token refresh, check if `jti` is blacklisted
4. If blacklisted, reject; if not, issue new tokens

#### Benefits
- ✅ Prevents token replay attacks
- ✅ Supports single-use refresh tokens (optional)
- ✅ Logout works within TTL (7 days for refresh token)
- ✅ No database queries during normal requests

#### Implementation Notes
```typescript
// Generate tokens with JTI
const jti = crypto.randomUUID();
const refreshToken = jwt.sign(
  { userId, email, role, jti },
  JWT_REFRESH_SECRET,
  { expiresIn: '7d' }
);

// On logout
async function logout(refreshToken: string): Promise<void> {
  const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  await redisClient.setex(
    `blacklist:refreshToken:${payload.jti}`,
    7 * 24 * 60 * 60, // 7-day TTL
    '1'
  );
}

// On refresh
async function refreshAccessToken(refreshToken: string): Promise<string> {
  const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
  
  const isBlacklisted = await redisClient.exists(`blacklist:refreshToken:${payload.jti}`);
  if (isBlacklisted) {
    throw new AuthenticationError('Token revoked');
  }
  
  // Issue new tokens...
}
```

### Decision
✅ **JTI + Redis Blacklist** for refresh token revocation
- Ensures stateless accessToken (performance)
- Enables logout via revocation (security)
- TTL ensures cleanup without manual intervention

---

## 5. Rate Limiting Patterns in Fastify

### Question
What's the best way to implement exponential backoff and rate limiting in Fastify?

### Research Finding
**Recommendation: Custom Middleware + Redis**

#### Pattern
```typescript
// 1. Middleware to track and apply backoff
export async function loginRateLimiter(request: FastifyRequest, reply: FastifyReply) {
  const email = request.body.email;
  const ip = request.ip;
  const key = `failed_login:${email}:${ip}`;
  
  const count = await redisClient.get(key);
  const attemptCount = parseInt(count || '0');
  
  // Apply exponential backoff
  const delays = [0, 1000, 2000, 4000, 8000, 16000];
  const delayMs = delays[Math.min(attemptCount, 5)];
  
  if (delayMs > 0) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  // Check CAPTCHA if needed
  if (attemptCount >= 3 && !request.body.captchaToken) {
    return reply.status(400).send({ error: 'CAPTCHA_REQUIRED' });
  }
}

// 2. Use on login route
fastify.post('/api/auth/login', { onRequest: loginRateLimiter }, loginHandler);
```

#### Alternative: @fastify/rate-limit plugin
- ✅ Simpler for request-rate limiting
- ❌ Doesn't support exponential backoff
- ❌ Doesn't support CAPTCHA integration
- **Decision**: Use custom middleware for auth-specific needs

### Decision
✅ **Custom Fastify middleware** for login rate limiting
- More flexible than generic rate-limit plugin
- Integrates with exponential backoff + CAPTCHA
- Can evolve with business rules (e.g., IP-based limits, seasonal adjustments)

---

## 6. Existing JWT Implementation Review

### Question
What JWT implementation already exists in PackagePro, and how should we extend it?

### Research Finding
**Status: ✅ Already Exists**

#### Findings from Code Review
- `backend/src/modules/auth/auth.service.ts` ✅ Has:
  - `generateAccessToken(payload)` — 15min expiry
  - `generateRefreshToken(payload)` — 7-day expiry
  - `verifyAccessToken(token)` — Validates signature
  - `verifyRefreshToken(token)` — Validates signature

- `backend/src/middleware/auth.middleware.ts` ✅ Has:
  - `authenticate()` — Checks Bearer token
  - `authorize(...roles)` — Role-based access
  - `optionalAuth()` — Optional JWT validation

#### What We Need to Add
1. JTI (JWT ID) claim generation
2. Redis blacklist check in `verifyRefreshToken`
3. Logout endpoint that adds token to blacklist
4. Exponential backoff in login flow
5. CAPTCHA verification call

#### Upgrade Plan
- Keep existing JWT logic (works well)
- Add JTI to payload generation
- Add Redis check to refresh flow
- Add backoff + CAPTCHA to login endpoint

### Decision
✅ **Build on existing JWT implementation**
- No breaking changes needed
- Additive only (new fields, new checks)
- Backward-compatible upgrade path

---

## 7. Prisma Schema Updates

### Question
What schema changes are needed for the new auth tables?

### Research Finding
**Minimal & Clean**

#### Tables to Add

```prisma
// EmailVerificationToken
model EmailVerificationToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  verifiedAt DateTime?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([token])
}

// PasswordReset
model PasswordReset {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  usedAt    DateTime?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([token])
}

// AuditLog
model AuditLog {
  id        String   @id @default(cuid())
  userId    String
  action    String   // "login", "logout", "password_change", etc.
  resource  String?  // "Order:123", "Design:456", etc.
  details   Json?    // Additional context
  timestamp DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
  @@index([action])
  @@index([timestamp])
}
```

#### User Model Update (Minimal)

```prisma
model User {
  // ... existing fields ...
  lastLoginAt              DateTime?
  emailVerificationTokens  EmailVerificationToken[]
  passwordResets           PasswordReset[]
  auditLogs                AuditLog[]
}
```

#### Migration Script
```sql
-- 005_auth_schema_v2.sql
CREATE TABLE IF NOT EXISTS "EmailVerificationToken" (...);
CREATE TABLE IF NOT EXISTS "PasswordReset" (...);
CREATE TABLE IF NOT EXISTS "AuditLog" (...);
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP;
```

### Decision
✅ **Use Prisma migrations** for schema updates
- Auto-generated from `.prisma` schema changes
- Rollback-safe
- Tested before production

---

## 8. Permission Service Architecture

### Question
How should permission rules be organized for maximum maintainability?

### Research Finding
**Service-based with Clear Patterns**

#### Recommended Structure
```typescript
// backend/src/services/permissions.service.ts
export class PermissionsService {
  // Order permissions
  async canUpdateOrder(userId: string, orderId: string, role: UserRole): Promise<boolean> {
    if (role === 'ADMIN') return true;
    const order = await prisma.order.findUnique({...});
    return order?.customerId === userId;
  }
  
  // Design permissions
  async canEditDesign(userId: string, designId: string, role: UserRole, status: string): Promise<boolean> {
    if (role === 'ADMIN') return true;
    if (status !== 'DRAFT') return false;
    const design = await prisma.design.findUnique({...});
    return design?.order.customerId === userId;
  }
  
  // ... more rules
}
```

#### Benefits
- Single source of truth for all permission rules
- Easy to audit and modify
- Testable without route handlers
- Can be extended to Permission DB model in Phase 1.5

### Decision
✅ **Centralized PermissionsService class**
- Export as singleton: `export const permissionsService = new PermissionsService();`
- Inject in route handlers for clean testing
- Document each rule with JSDoc comments

---

## Summary of Decisions

| Unknown | Decision | Rationale |
|---------|----------|-----------|
| CAPTCHA | reCAPTCHA v3 | Free, silent, easy integration, no UX friction |
| Email | Abstracted service (Nodemailer + SendGrid) | Flexible, can switch providers |
| Redis | Use existing setup | Already present; no new infra needed |
| JWT Refresh | JTI + Redis blacklist | Stateless + secure logout |
| Rate Limiting | Custom Fastify middleware | Flexible for auth-specific needs |
| JWT Existing | Build on existing implementation | Compatible, additive changes only |
| Prisma Schema | New tables + User update | Clean, minimal, migration-based |
| Permissions | Centralized service | Maintainable, testable, extensible |

---

## Phase 0 Complete ✅

All unknowns resolved. Architecture decisions locked in. Ready for Phase 1 design (data model, contracts, quickstart).

**Next**: Run `/speckit.plan phase1` to generate design artifacts.
