# Contracts: Authentication & Authorization API

**Date**: June 1, 2026  
**Reference**: `data-model.md` | `plan.md`

---

## Overview

All authentication endpoints are public (no JWT required for register/login). All other API endpoints require JWT Bearer token. Errors return structured JSON with code and statusCode.

---

## Authentication Endpoints

### POST /api/auth/register

**Purpose**: Create a new user account

**Request**:
```typescript
{
  email: string;                    // Valid email, must be unique
  password: string;                 // 8+ chars, 1 upper, 1 lower, 1 number, 1 special
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'CUSTOMER' | 'VENDOR';    // Default: CUSTOMER
}
```

**Response (201 Created)**:
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
      emailVerified: false;
      createdAt: ISO8601;
    },
    tokens: {
      accessToken: string;          // JWT, 15min expiry
      refreshToken: string;         // JWT, 7 days expiry
      expiresIn: number;            // Seconds (900)
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Email already exists, password doesn't meet policy, invalid email format
- `500 Internal Server Error`: Database error, email service failure

**Side Effects**:
- Creates User record with emailVerified = false
- Creates EmailVerificationToken (1hr expiry)
- Sends verification email
- Logs audit: register

**Notes**:
- Verification email contains link: `{FRONTEND_URL}/auth/verify?token={token}`
- User cannot create orders until emailVerified = true

---

### POST /api/auth/login

**Purpose**: Authenticate user and return tokens

**Request**:
```typescript
{
  email: string;
  password: string;
  captchaToken?: string;          // Required if failed attempts >= 3
}
```

**Response (200 OK)**:
```typescript
{
  success: true,
  data: {
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
      emailVerified: boolean;
      lastLoginAt?: ISO8601;
    },
    tokens: {
      accessToken: string;          // JWT, 15min expiry
      refreshToken: string;         // JWT, 7 days expiry
      expiresIn: number;            // Seconds (900)
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: CAPTCHA_REQUIRED (if attempts >= 3 and no captchaToken)
- `400 Bad Request`: Invalid CAPTCHA (reCAPTCHA risk score < 0.5)
- `401 Unauthorized`: Invalid email or password (generic message, don't reveal which)
- `429 Too Many Requests`: Rate limited (exponential backoff applied; response includes Retry-After header)

**Side Effects**:
- On success: Clear failed login attempt counter, update User.lastLoginAt, log audit: login_success
- On failure: Increment failed login counter (Redis), apply exponential backoff delay (1s → 16s), log audit: login_failed
- Response includes delay if backoff applied

**Rate Limiting**:
- Tracked per {email}:{ip}
- Failed attempts expire after 15 minutes
- Exponential backoff: 1s, 2s, 4s, 8s, 16s
- CAPTCHA required after 3 failed attempts

**Notes**:
- Delays are **applied before response** (user waits server-side)
- CAPTCHA check happens after delay
- emailVerified is included so frontend knows if email verification needed

---

### POST /api/auth/logout

**Purpose**: Revoke refresh token and end session

**Request**:
```typescript
{
  refreshToken: string;             // JWT refresh token
}
```

**Response (200 OK)**:
```typescript
{
  success: true,
  message: "Logged out successfully"
}
```

**Headers Required**:
- `Authorization: Bearer {accessToken}` (must be valid JWT)

**Error Responses**:
- `401 Unauthorized`: Invalid or missing accessToken
- `400 Bad Request`: Invalid or malformed refreshToken

**Side Effects**:
- Adds refreshToken JTI to Redis blacklist (TTL: 7 days)
- Invalidates all tokens issued from this refresh token
- Log audit: logout

**Notes**:
- accessToken still valid until expiry (15 min); logout doesn't revoke accessToken
- After logout, client cannot use refreshToken to get new accessToken
- If accessToken expired but refreshToken valid, refresh will fail (blacklist check)

---

### POST /api/auth/refresh

**Purpose**: Get new accessToken using valid refreshToken

**Request**:
```typescript
{
  refreshToken: string;             // JWT refresh token
}
```

**Response (200 OK)**:
```typescript
{
  success: true,
  data: {
    tokens: {
      accessToken: string;          // New JWT, 15min expiry
      refreshToken: string;         // New JWT, 7 days expiry (can be same as old)
      expiresIn: number;            // Seconds (900)
    }
  }
}
```

**Error Responses**:
- `401 Unauthorized`: refreshToken invalid, expired, or revoked (in blacklist)
- `401 Unauthorized`: User not found (user deleted after token issued)

**Side Effects**:
- Generates new accessToken + refreshToken
- New refreshToken gets new JTI (new blacklist entry if revoked)
- Old refreshToken JTI still valid for full 7 days (can be used multiple times until revoked)

**Notes**:
- No need to logout before refresh (old refreshToken remains valid)
- Client should always use latest tokens returned
- Can be called anytime during accessToken validity (for forward compatibility with token rotation)

---

### POST /api/auth/forgot-password

**Purpose**: Initiate password reset (send email with token)

**Request**:
```typescript
{
  email: string;                    // Email of account to reset
}
```

**Response (200 OK)**:
```typescript
{
  success: true,
  message: "If an account exists with this email, a reset link has been sent."
}
```

**Error Responses**:
- `429 Too Many Requests`: User has requested 3+ password resets in last hour (rate limited)

**Side Effects**:
- If email found: Create PasswordReset token (1hr expiry), send email, log audit: password_reset_requested
- If email not found: No error (security: don't reveal if email exists)
- Rate limiting tracked in Redis per userId

**Email Sent**:
```
Subject: Reset Your PackagePro Password

Click here to reset your password:
{FRONTEND_URL}/auth/reset?token={token}

This link expires in 1 hour.
```

---

### POST /api/auth/reset-password

**Purpose**: Complete password reset using token from email

**Request**:
```typescript
{
  token: string;                    // Token from email link
  newPassword: string;              // 8+ chars, 1 upper, 1 lower, 1 number, 1 special
}
```

**Response (200 OK)**:
```typescript
{
  success: true,
  message: "Password has been reset. Please log in with your new password."
}
```

**Error Responses**:
- `400 Bad Request`: Token invalid, expired, or already used
- `400 Bad Request`: newPassword doesn't meet policy
- `404 Not Found`: User associated with token not found

**Side Effects**:
- On success:
  - Update User.passwordHash with bcrypt-hashed newPassword
  - Set PasswordReset.usedAt = now()
  - Blacklist all existing refresh tokens (force re-login on all devices)
  - Delete all other PasswordReset tokens for user
  - Log audit: password_reset_completed

**Notes**:
- Invalidates all existing sessions (all devices must re-login)
- Token can only be used once (single-use)

---

### POST /api/auth/verify-email/:token

**Purpose**: Verify email address using token from registration email

**Request**:
```
URL parameter: token (from email link)
No request body needed
```

**Response (200 OK)**:
```typescript
{
  success: true,
  message: "Email verified successfully. You can now place orders."
}
```

**Error Responses**:
- `400 Bad Request`: Token invalid, expired, or already verified
- `404 Not Found`: User associated with token not found

**Side Effects**:
- On success:
  - Update User.emailVerified = true
  - Set EmailVerificationToken.verifiedAt = now()
  - Log audit: email_verified

**Notes**:
- No authentication required (token is the proof)
- User can now create orders
- Same token can be used multiple times (idempotent if already verified)

---

### POST /api/auth/resend-verification

**Purpose**: Resend verification email (if original was missed or marked as spam)

**Request**:
```typescript
{
  email: string;                    // Email to resend verification for
}
```

**Response (200 OK)**:
```typescript
{
  success: true,
  message: "Verification email sent. Check your inbox."
}
```

**Error Responses**:
- `400 Bad Request`: User not found (no account with that email)
- `400 Bad Request`: Email already verified (can't resend)
- `429 Too Many Requests`: User has requested 3+ resends in last hour

**Side Effects**:
- On success:
  - Delete old EmailVerificationToken (if any)
  - Create new EmailVerificationToken (1hr expiry)
  - Send verification email with new token
  - Log audit: email_verification_resent
- Rate limiting tracked in Redis per userId (max 3/hour)

**Notes**:
- Doesn't require authentication (email is identifier)
- Replaces old token with new one
- Rate-limited to prevent abuse

---

## Protected Endpoints (Require JWT)

All other API endpoints require valid JWT accessToken in Authorization header:

```
GET /api/orders
Authorization: Bearer {accessToken}
```

**Error if missing/invalid**:
```typescript
{
  error: 'AUTHENTICATION_ERROR',
  statusCode: 401,
  message: 'Missing or invalid authorization header'
}
```

---

## Error Response Format

All errors return structured JSON:

```typescript
{
  error: string;                    // Error code (VALIDATION_ERROR, AUTHENTICATION_ERROR, etc.)
  statusCode: number;               // HTTP status code
  message: string;                  // User-friendly message
  details?: Record<string, any>;   // Additional context (validation errors, etc.)
  timestamp: ISO8601;              // When error occurred
}
```

**Example**:
```json
{
  "error": "VALIDATION_ERROR",
  "statusCode": 400,
  "message": "Password does not meet policy requirements",
  "details": {
    "password": "Must contain uppercase letter, lowercase letter, number, and special character"
  },
  "timestamp": "2026-06-01T10:30:00Z"
}
```

---

## JWT Payload Format

**Access Token (15 min)**:
```typescript
{
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  iat: number;                      // Issued at
  exp: number;                      // Expiry
}
```

**Refresh Token (7 days)**:
```typescript
{
  userId: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  jti: string;                      // JWT ID (for blacklisting)
  iat: number;                      // Issued at
  exp: number;                      // Expiry
}
```

---

## Rate Limiting Headers

When rate-limited, response includes:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 16
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1685707200
```

---

## Integration Notes

### Frontend
1. Store accessToken in memory (not localStorage for security)
2. Store refreshToken in httpOnly cookie (sent automatically by browser)
3. On token expiry (optional): Call `/api/auth/refresh` to get new accessToken
4. On logout: Call `/api/auth/logout` with refreshToken from cookie
5. On API error 401: Redirect to login

### Backend
1. Verify accessToken on every protected endpoint (JWT signature check, no DB needed)
2. Check Redis blacklist only on `/api/auth/refresh` (minimal DB/Redis usage)
3. Log all auth actions to AuditLog
4. Send emails asynchronously (don't block response)

---

**Status**: ✅ Contracts complete. Ready for implementation.
