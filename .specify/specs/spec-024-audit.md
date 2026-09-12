# SPEC-024: Audit Trail & Compliance Logging

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Compliance  
> **Dependencies:** SPEC-013 (Auth)

---

## 1. What

Comprehensive audit logging for all sensitive operations:

**Logged Events:**
- Order status changes
- Payment events (create, success, failure, refund)
- Design approvals and rejections
- Vendor assignments and handshake responses
- Permission changes (role grants, revocations)
- Data access (who viewed what sensitive data)
- Login/logout events
- File downloads
- Admin overrides (pre-press, pricing, routing)

**Log Format:**
- Who: user ID, name, role
- What: action type, details
- When: timestamp (UTC)
- Where: IP address, device info, geolocation
- Why: reason/comment (for manual actions)

**Storage:**
- Immutable: append-only, no delete or modify
- Retention: 7 years financial, 2 years general
- Searchable: filter by user, action, date, entity
- Export: CSV/PDF for regulatory submission

**Security:**
- Cryptographic hash chain for tamper detection
- Alert on integrity compromise
- Separate storage from application database

---

## 2. Why

Regulatory compliance and dispute resolution require proof of who did what and when. Audit trails protect PackagePro from legal liability and enable transparent operations.

**Business Impact:**
- Ensure compliance: GDPR, financial regulations
- Reduce dispute resolution time: -80%
- Prevent fraud: detect suspicious patterns
- Build trust: transparent operations

---

## 3. Who

| Role | Access |
|------|--------|
| **Compliance Officer** | Full audit logs, regulatory export |
| **Admin** | Search, filter, investigate incidents |
| **Developer** | Debug using operation logs |

---

## 4. Success Criteria

### Functional
- [ ] Log all sensitive operations: who, what, when, where, why
- [ ] Immutable storage: append-only, no modification
- [ ] Retention: 7 years financial, 2 years general
- [ ] Searchable: filter by user, action type, date range, entity
- [ ] Tamper detection: cryptographic hash chain
- [ ] Export: CSV/PDF for regulatory submission
- [ ] Real-time alerts: suspicious patterns (mass deletions, unauthorized access)
- [ ] Log integrity: alert if hash chain compromised
- [ ] Performance: no impact on application performance (<1% overhead)

### Non-Functional
- [ ] Log write: <10ms (async)
- [ ] Log query: <2s for 1-year range
- [ ] Storage: compressed, 90% size reduction
- [ ] Backup: daily to separate region

---

## 5. Out of Scope

- Blockchain-based immutable logging
- Real-time fraud detection AI
- Automated compliance reporting for multiple jurisdictions
- Video/audio recording of user sessions

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/audit/audit.service.ts` | Audit logging service |
| `backend/src/modules/audit/audit.controller.ts` | Audit API (admin only) |
| `backend/src/modules/audit/audit.middleware.ts` | Automatic audit middleware |
| `backend/src/modules/audit/integrity.service.ts` | Hash chain verification |
| `backend/src/modules/audit/dto/audit-query.dto.ts` | Audit query validation |
| `backend/prisma/schema.prisma` | AuditLog, AuditHash tables |
| `frontend/app/(admin)/audit/page.tsx` | Audit log viewer |
| `frontend/components/audit/AuditLogTable.tsx` | Log table |
| `frontend/components/audit/AuditFilters.tsx` | Filter panel |
| `frontend/components/audit/AuditExporter.tsx` | Export component |
| `frontend/components/audit/IntegrityStatus.tsx` | Integrity check status |
