# SPEC-014: Email Service with Templates

> **Project:** PackagePro  
> **Status:** Draft  
> **Priority:** P1 — Important  
> **Dependencies:** SPEC-013 (Auth)

---

## 1. What

Centralized email service using SendGrid or AWS SES:

**Email Types:**
- **Transactional**: Welcome, Order Confirmation, Payment Success, Shipping Label, Delivery Confirmation, Review Request
- **Vendor**: Handshake Offer, PO Notification, Production Reminder, Delay Alert
- **Admin**: Urgent Order Alert, System Exception, Daily Summary
- **Reminders**: Payment Reminder (x3), Approval Reminder (x3), Cart Abandonment

**Template System:**
- Handlebars templates with shared layout
- Bilingual: Arabic (RTL) and English (LTR)
- Branding: logo, colors, footer
- Dynamic content: user name, order details, tracking links

**Delivery:**
- Retry logic: 3 attempts with exponential backoff
- Dead letter queue after failure
- Open/click tracking
- Bounce and spam complaint handling

---

## 2. Why

Inconsistent email communication damages brand trust. A centralized service ensures professional, branded, and reliable email delivery with 99%+ delivery rate.

**Business Impact:**
- Improve delivery rate: 99%+
- Reduce bounce rate: -80%
- Brand consistency: unified templates
- Reduce dev time: no ad-hoc email code

---

## 3. Who

| Role | Emails Received |
|------|-----------------|
| **Customer** | Welcome, Order, Payment, Shipping, Delivery, Review, Reminders |
| **Vendor** | Handshake, PO, Production, Delay, Settlement |
| **Admin** | Alerts, Exceptions, Daily Summary |

---

## 4. Success Criteria

### Functional
- [ ] All transactional emails via centralized service (no direct SMTP)
- [ ] Template system: Handlebars with shared layout, header, footer
- [ ] 15+ email templates covering all user journeys
- [ ] Bilingual: Arabic RTL and English LTR per user preference
- [ ] Tracking: open rate, click rate, bounce rate, spam complaints
- [ ] Retry logic: 3 attempts (1m, 5m, 30m), dead letter queue after
- [ ] Unsubscribe: one-click for marketing; transactional cannot unsubscribe
- [ ] Attachments: PDF invoices, shipping labels, POs
- [ ] Scheduled emails: reminders at configurable intervals

### Non-Functional
- [ ] Email queue processing <1s per email
- [ ] Template rendering <100ms
- [ ] Delivery rate >99%
- [ ] Bounce rate <2%

---

## 5. Out of Scope

- Marketing email campaigns (newsletters, promotions — Phase 1.5)
- SMS notifications
- Push notifications (browser/mobile)
- Email A/B testing (Phase 2)

---

## 6. Related Files

| Path | Purpose |
|------|---------|
| `backend/src/modules/email/email.service.ts` | Email service |
| `backend/src/modules/email/email.controller.ts` | Email API (admin only) |
| `backend/src/modules/email/providers/sendgrid.provider.ts` | SendGrid integration |
| `backend/src/modules/email/providers/ses.provider.ts` | AWS SES integration |
| `backend/src/modules/email/templates/` | Handlebars templates |
| `backend/src/modules/email/templates/layouts/main.hbs` | Shared layout |
| `backend/src/modules/email/templates/partials/header.hbs` | Header partial |
| `backend/src/modules/email/templates/partials/footer.hbs` | Footer partial |
| `backend/src/modules/email/templates/customer/welcome.hbs` | Welcome email |
| `backend/src/modules/email/templates/customer/order-confirmation.hbs` | Order confirmation |
| `backend/src/workers/email.worker.ts` | Background email sending |
| `backend/prisma/schema.prisma` | EmailLog, EmailTemplate tables |
