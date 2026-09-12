<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan:

**Current Feature**: SPEC-029 End-to-End Marketplace Implementation
**Plan**: `.specify/specs/spec-029-marketplace-implementation.md`

**NOTE**: Backend is ~90% complete (17 modules, 11 services, 18 Prisma tables, 5 workers, Stripe/DHL integrations). This plan focuses on connecting the frontend to real APIs and building missing UIs (customer portal, vendor portal, admin dashboard).

Tech Stack:
- Backend: Node.js 20 LTS, Fastify, Prisma, PostgreSQL
- Auth: JWT (15min access + 7d refresh), bcrypt (cost 12), reCAPTCHA v3
- Rate Limiting: Redis with exponential backoff (1s-16s) + CAPTCHA
- Email: SendGrid/Nodemailer for verification & password reset
- Audit: Persistent AuditLog table + Redis for temporary tracking
- Queue: BullMQ with Redis (email, settlement, reminders, marketing, export)
- Payments: Stripe (intents + webhooks), PayPal, COD
- Shipping: DHL API (shipment creation, tracking, labels)
<!-- SPECKIT END -->
