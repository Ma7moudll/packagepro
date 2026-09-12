# SPEC-013: Authentication & Authorization (RBAC)

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P0 — Core Feature  
> **Dependencies:** None (foundation layer)

---

## 1. What

Role-based access control with JWT authentication:

**Roles:**
- **Super Admin**: Full system access, manage admins, system configuration
- **Admin**: Manage orders, vendors, customers, pricing, reports
- **Customer (B2B/B2C)**: Create orders, manage designs, track orders, pay, review
- **Enterprise Customer**: Team management, spending limits, custom pricing
- **Vendor**: View assigned orders, update production, upload samples, confirm POs
- **Designer/Pre-Press**: Review designs, run pre-press checks, approve soft proofs

**Authentication:**
- JWT access token (15min expiry)
- Refresh token (7 days) in httpOnly cookie
- Password policy: 8+ chars, 1 upper, 1 lower, 1 number, 1 special
- Account lockout: 5 failed attempts = 15min lockout
- Session management: view active sessions, revoke from any device

**Authorization:**
- Permission matrix: granular permissions (e.g., `orders:read`, `orders:update:status`, `pricing:admin`)
- Role-based middleware on every API endpoint
- Resource-level access: customer A cannot see customer B's orders

---

## 2. Why

Current system lacks granular permissions. RBAC ensures data security, prevents unauthorized actions, enables audit trails, and supports multi-tenant operations.

**Business Impact:**
- Eliminate unauthorized access: 100% endpoint coverage
- Reduce data breaches: granular permissions
- Enable audit compliance: every action traced to user
- Support enterprise sales: role delegation

---

## 3. Who

| Role | Permissions |
|------|-------------|
| **Super Admin** | `*:*` (all permissions) |
| **Admin** | `orders:*`, `vendors:*`, `customers:*`, `pricing:admin`, `reports:*` |
| **Customer** | `orders:own:*`, `designs:own:*`, `payments:own:*`, `reviews:own:*` |
| **Enterprise Customer** | Customer permissions + `team:manage`, `spending:view` |
| **Vendor** | `orders:assigned:*`, `production:update`, `samples:upload`, `po:confirm` |
| **Designer/Pre-Press** | `designs:review`, `prepress:run`, `prepress:approve` |

---

## 4. Success Criteria

### Functional
- [ ] JWT access + refresh token flow
- [ ] Password policy enforced on registration and change
- [ ] Account lockout after 5 failed attempts
- [ ] Session management: list active sessions, revoke individually or all
- [ ] Permission middleware: every endpoint checks permissions
- [ ] Resource-level access: users can only access their own data (unless admin)
- [ ] Audit log: every login, permission change, sensitive action logged
- [ ] Password reset: secure token via email, expires in 1 hour
- [ ] Email verification: required before first order
- [ ] Two-factor authentication (TOTP) — Phase 1.5

### Non-Functional
- [ ] Login API <200ms
- [ ] Token refresh <100ms
- [ ] Permission check <5ms (cached in Redis)
- [ ] Password hashing: bcrypt with cost factor 12

---

## 5. Out of Scope

- SSO/SAML integration (Phase 2)
- Social login (Google, LinkedIn)
- Biometric authentication
- OAuth2 provider (becoming an identity provider)

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/auth/auth.controller.ts` | Auth API endpoints |
| `backend/src/modules/auth/auth.service.ts` | Authentication logic |
| `backend/src/modules/auth/jwt.strategy.ts` | JWT validation |
| `backend/src/modules/auth/roles.guard.ts` | Role-based guard |
| `backend/src/modules/auth/permissions.guard.ts` | Permission-based guard |
| `backend/src/modules/auth/dto/login.dto.ts` | Login validation |
| `backend/src/modules/auth/dto/register.dto.ts` | Registration validation |
| `backend/prisma/schema.prisma` | User, Role, Permission, Session tables |
| `frontend/app/(auth)/login/page.tsx` | Login page |
| `frontend/app/(auth)/register/page.tsx` | Registration page |
| `frontend/components/auth/LoginForm.tsx` | Login form |
| `frontend/components/auth/PermissionGuard.tsx` | Frontend permission wrapper |
| `frontend/lib/auth/api.ts` | Auth API client |
| `frontend/store/auth.store.ts` | Auth state (Zustand) |
