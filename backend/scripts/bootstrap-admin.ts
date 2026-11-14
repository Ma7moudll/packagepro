/**
 * SEC-01 — Secure ADMIN bootstrap.
 *
 * Creates the first administrator account from environment variables. This is
 * the ONLY sanctioned path to an ADMIN account: public registration cannot
 * create privileged roles (auth.controller registerSchema + auth.service
 * whitelist).
 *
 * Run:  npm run admin:bootstrap
 *   or  npx tsx scripts/bootstrap-admin.ts
 *
 * Required environment:
 *   BOOTSTRAP_ADMIN_EMAIL     — the new administrator's email
 *   BOOTSTRAP_ADMIN_PASSWORD  — a strong password (min 8 chars)
 * Optional:
 *   BOOTSTRAP_ADMIN_NAME      — display name
 *
 * Safety rules (do not weaken):
 *   - If the configured email already exists, the script ABORTS and makes NO
 *     changes — it never modifies an existing user's role or password
 *     (deliberately NOT an upsert).
 *   - The password / password hash are never logged, echoed, or written to
 *     the audit details.
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { AuditAction } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

void (async () => {
  const email = (process.env.BOOTSTRAP_ADMIN_EMAIL || '').trim();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD || '';
  const name = process.env.BOOTSTRAP_ADMIN_NAME?.trim();

  if (!email || !password) {
    console.error(
      'Missing environment. Set BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD ' +
        '(values are read from the environment and never echoed back).'
    );
    await prisma.$disconnect();
    process.exit(2);
  }

  if (!EMAIL_REGEX.test(email)) {
    console.error('BOOTSTRAP_ADMIN_EMAIL is not a valid email address.');
    await prisma.$disconnect();
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters.');
    await prisma.$disconnect();
    process.exit(1);
  }

  // Abort-if-exists: select only operator-safe fields — the hash is never
  // fetched into a context where it could be printed, and no update is issued.
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existing) {
    console.error(
      `Refusing to bootstrap: an account already exists for this email ` +
        `(id ${existing.id}, role ${existing.role}). No changes were made. ` +
        `Choose a different BOOTSTRAP_ADMIN_EMAIL or manage the existing ` +
        `account through the database/admin tooling.`
    );
    await prisma.$disconnect();
    process.exit(1);
  }

  // Same cost as the auth service (AGENTS.md: bcrypt cost 12).
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: name,
      role: 'ADMIN',
      emailVerified: true,
    },
    select: { id: true, email: true, role: true },
  });

  // Audit trail for account creation. Details intentionally exclude any
  // credential material.
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: AuditAction.REGISTER,
      resource: `email:${user.email}`,
      details: { source: 'bootstrap-admin' },
      ipAddress: 'unknown',
      userAgent: 'bootstrap-admin-script',
    },
  });

  console.log(`ADMIN account created: ${user.email} (id ${user.id}).`);
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (error) => {
  console.error('Bootstrap failed:', error instanceof Error ? error.message : error);
  await prisma.$disconnect();
  process.exit(1);
});
