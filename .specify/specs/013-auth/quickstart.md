# Quickstart: Authentication & Authorization

**Date**: June 1, 2026  
**For**: Developers implementing SPEC-013 auth system

---

## Quick Links

- 📋 **Full Specification**: `spec-013-auth.md`
- 🔍 **Technical Review**: `spec-013-auth-analysis.md`
- 📊 **Data Model**: `data-model.md`
- 🔌 **API Contracts**: `contracts/auth-api.md`
- 📋 **Implementation Plan**: `plan.md`

---

## Prerequisites

- Node.js 20 LTS
- PostgreSQL (or SQLite for dev)
- Redis (already set up in PackagePro)
- SendGrid API key (or similar email service)
- reCAPTCHA v3 account (free)

---

## 1. Setup

### Install Dependencies (if not already installed)

```bash
cd backend
npm install jsonwebtoken bcrypt zod redis
```

### Environment Variables

Add to `.env`:

```
# JWT
JWT_SECRET=your-very-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-very-secret-refresh-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis (already configured)
REDIS_URL=redis://localhost:6379

# Email Service
SENDGRID_API_KEY=sg_...
SENDGRID_FROM_EMAIL=noreply@packagepro.com

# CAPTCHA
RECAPTCHA_SECRET_KEY=6Lc...
RECAPTCHA_SITE_KEY=6Lc...

# Frontend URL (for verification/reset links)
FRONTEND_URL=http://localhost:3000
```

---

## 2. Database Setup

### Create Migration

```bash
cd backend
npx prisma migrate dev --name auth_schema_v2
```

This will:
- Create EmailVerificationToken table
- Create PasswordReset table
- Create AuditLog table
- Add lastLoginAt field to User

### Verify Schema

```bash
npx prisma studio
# Open http://localhost:5555 to view database
```

---

## 3. Implement Auth Service

### File: `backend/src/modules/auth/auth.service.ts`

Key functions to implement/update:

```typescript
export class AuthService {
  // Update to add JTI and backoff logic
  async login(data: LoginData): Promise<{ user; tokens }> {
    // 1. Track failed attempts: failed_login:{email}:{ip}
    // 2. Check CAPTCHA if needed
    // 3. Validate credentials
    // 4. Generate tokens with JTI
    // 5. Log audit: login_success
  }
  
  async register(data: RegisterData): Promise<{ user; tokens }> {
    // 1. Validate password policy
    // 2. Create user
    // 3. Create EmailVerificationToken
    // 4. Send verification email
    // 5. Log audit: register
  }
  
  async logout(refreshToken: string): Promise<void> {
    // 1. Extract JTI from token
    // 2. Add to Redis blacklist
    // 3. Log audit: logout
  }
  
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    // 1. Verify JWT signature
    // 2. Check Redis blacklist for JTI
    // 3. Generate new tokens
    // 4. Return
  }
}
```

---

## 4. Implement Permission Service

### File: `backend/src/services/permissions.service.ts`

```typescript
export class PermissionsService {
  async canUpdateOrder(
    userId: string,
    orderId: string,
    role: UserRole
  ): Promise<boolean> {
    if (role === 'ADMIN') return true;
    
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { customerId: true },
    });
    
    return order?.customerId === userId;
  }
  
  // Add more permission checks as needed
  async canEditDesign(userId, designId, role, status) { ... }
  async canReviewDesign(userId, designId, role) { ... }
}

export const permissionsService = new PermissionsService();
```

---

## 5. Test Authentication Flow

### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cuid123",
      "email": "user@test.com",
      "role": "CUSTOMER",
      "emailVerified": false
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "SecurePass123!"
  }'
```

### Use Protected Endpoint

```bash
curl -X GET http://localhost:3000/api/orders \
  -H "Authorization: Bearer {accessToken}"
```

### Refresh Token

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "{refreshToken}"
  }'
```

### Logout

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "{refreshToken}"
  }'
```

---

## 6. Test Rate Limiting

### Trigger Failed Logins

```bash
# Try 5 wrong passwords (will get delays)
for i in {1..5}; do
  echo "Attempt $i"
  time curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "user@test.com",
      "password": "WrongPassword"
    }'
  echo ""
done
```

Observe:
- Attempt 1: ~0ms (no delay)
- Attempt 2: ~1s delay
- Attempt 3: ~2s delay (CAPTCHA required)
- Attempt 4: ~4s delay + CAPTCHA
- Attempt 5: ~8s delay + CAPTCHA

### Valid Login After Rate Limit Expires

After 15 minutes with no new attempts, the counter resets.

---

## 7. Test Email Verification

### Send Verification Email

(Already sent during registration, but can test resend)

```bash
curl -X POST http://localhost:3000/api/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com"
  }'
```

### Verify Email (Simulate User Clicking Link)

```bash
curl -X POST "http://localhost:3000/api/auth/verify-email/{token}" \
  -H "Content-Type: application/json"
```

Verify in database:
```bash
npx prisma studio
# Go to User table, check emailVerified = true
```

---

## 8. Test Password Reset

### Request Reset

```bash
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com"
  }'
```

### Reset Password (Simulate User Clicking Email Link)

```bash
curl -X POST http://localhost:3000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "{token from email}",
    "newPassword": "NewSecurePass456!"
  }'
```

### Login with New Password

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "NewSecurePass456!"
  }'
```

---

## 9. Check Audit Logs

### View All Login Audits

```bash
npx prisma studio
# Go to AuditLog table
# Filter: action = 'login_success' or 'login_failed'
```

### Query via API (Future Implementation)

```bash
curl -X GET "http://localhost:3000/api/audit?action=login_success" \
  -H "Authorization: Bearer {adminToken}"
```

---

## 10. Common Issues & Fixes

### Issue: "Password does not meet policy"
**Fix**: Ensure password has:
- 8+ characters
- 1 uppercase letter
- 1 lowercase letter
- 1 digit
- 1 special character (!@#$%^&*)

**Example**: `SecurePass123!`

### Issue: "Email already exists"
**Fix**: Use a unique email address or delete the user:
```bash
npx prisma studio
# Delete the user and try again
```

### Issue: "CAPTCHA verification failed"
**Fix**: Check `RECAPTCHA_SECRET_KEY` in `.env`. Make sure reCAPTCHA v3 is configured in Google Console.

### Issue: Email not sent
**Fix**: Check `SENDGRID_API_KEY` and `SENDGRID_FROM_EMAIL`. Verify email service is running:
```bash
# Test email service
curl -X POST https://api.sendgrid.com/v3/mail/send \
  -H "Authorization: Bearer $SENDGRID_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"personalizations": [...], "from": {...}, "subject": "Test", "content": [...]}'
```

### Issue: Redis connection failed
**Fix**: Ensure Redis is running:
```bash
redis-cli ping
# Should return "PONG"
```

---

## 11. Integration Checklist

- [ ] Create Prisma migrations
- [ ] Install dependencies (jsonwebtoken, bcrypt, zod, redis)
- [ ] Update `.env` with secrets
- [ ] Implement AuthService (login, register, logout, refresh)
- [ ] Implement PermissionsService (canUpdateOrder, etc.)
- [ ] Implement email service (sendVerificationEmail, sendResetEmail)
- [ ] Implement rate limiting middleware
- [ ] Implement CAPTCHA validation
- [ ] Test all endpoints with curl
- [ ] Test rate limiting (5 failed attempts)
- [ ] Test email verification flow
- [ ] Test password reset flow
- [ ] Check audit logs
- [ ] Write unit tests (>80% coverage)
- [ ] Write integration tests
- [ ] Update Frontend JWT integration
- [ ] Deploy to staging
- [ ] Load testing (target: <200ms p95 for login)

---

## 12. Next Steps

1. ✅ Run `npm install` for dependencies
2. ✅ Run `npx prisma migrate dev` to create tables
3. ✅ Implement auth service (password validation, bcrypt, JWT)
4. ✅ Implement permissions service
5. ✅ Test with curl
6. ✅ Add unit tests
7. ✅ Add integration tests
8. ✅ Run `/speckit.tasks` to create task breakdown

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Register | <200ms | DB write + email send (async) |
| Login (no backoff) | <50ms | Password check + token generation |
| Login (1s backoff) | ~1000ms | Includes delay |
| Token validation | <5ms | JWT signature only, no DB |
| Token refresh | <100ms | Redis blacklist check + token generation |

---

## Security Checklist

- [ ] All passwords hashed with bcrypt cost 12+
- [ ] JWT tokens signed with strong secret (32+ chars)
- [ ] No sensitive data in JWT payload
- [ ] Rate limiting active (exponential backoff + CAPTCHA)
- [ ] Email tokens single-use
- [ ] Password reset tokens single-use
- [ ] Audit logging on all sensitive actions
- [ ] No stack traces returned to clients
- [ ] HTTPS in production (only)
- [ ] Refresh token in httpOnly cookie (frontend setup)

---

## Support

- Questions: Check `data-model.md` for entity definitions
- API details: See `contracts/auth-api.md`
- Full spec: See `spec-013-auth.md`
- Implementation issues: Check `.specify/specs/013-auth/` docs

---

**Status**: ✅ Quickstart complete. Ready to implement!
