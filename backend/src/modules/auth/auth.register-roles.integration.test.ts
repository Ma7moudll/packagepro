// SEC-01 — Public registration cannot create privileged accounts.
//
//   A  controller: a public body with role 'ADMIN' is rejected (400) and
//      creates no user row.
//   B  default registration (no role) → CUSTOMER user + Customer record.
//   C  role 'VENDOR' → vendor created PENDING (isActive=false).
//   D  service defense-in-depth: authService.register called directly with a
//      forged role:'ADMIN' still creates CUSTOMER.
//   E  pending-vendor property: an inactive vendor can still authenticate and
//      complete/submit their profile (PATCH /vendors/me) for admin review —
//      activation stays admin-only.
//
// Email is mocked (register sends verification mail; nothing here asserts on
// mail content). Marker-scoped cleanup: users cascade customer/vendor/tokens.

import { describe, it, expect, afterAll, vi } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { authController } from './auth.controller';
import { authService } from './auth.service';
import { vendorController } from '../vendors/vendor.controller';
import { jwtService } from './services/jwt.service';

vi.mock('../../services/email/email.service', () => ({
  // AuthEmailService constructs this class at import time — the mock must
  // export the class, not just the singleton.
  EmailService: class {
    async sendEmail() {}
  },
  emailService: { sendEmail: vi.fn().mockResolvedValue(undefined) },
}));

function mockRequest(payload: {
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string>;
}): FastifyRequest {
  return {
    body: payload.body,
    headers: payload.headers ?? {},
    query: payload.query ?? {},
  } as unknown as FastifyRequest;
}

/** Reply capture: records status/send so controller error paths are assertable. */
function captureReply(): FastifyReply & { statusCode: number; payload: any } {
  const reply: any = {
    statusCode: 0,
    payload: undefined,
    status(code: number) {
      reply.statusCode = code;
      return reply;
    },
    send(body?: unknown) {
      reply.payload = body;
      return reply;
    },
  };
  return reply as FastifyReply & { statusCode: number; payload: any };
}

describe('SEC-01 public registration roles', () => {
  const marker = `sec01-${Date.now().toString(36)}`;
  const emails: string[] = [];
  let seq = 0;

  const nextEmail = (label: string) => {
    const email = `${marker}-${label}-${++seq}@test.local`;
    emails.push(email);
    return email;
  };

  const PASSWORD = 'SecurePassword123!';

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('A: controller rejects a public role:"ADMIN" registration with 400 and no user row', async () => {
    const email = nextEmail('admin-try');

    const reply = captureReply();
    await authController.register(
      mockRequest({ body: { email, password: PASSWORD, name: 'Privilege Escalation', role: 'ADMIN' } }),
      reply
    );

    expect(reply.statusCode).toBe(400);
    expect(reply.payload?.success).toBe(false);

    const user = await prisma.user.findUnique({ where: { email } });
    expect(user).toBeNull();

    // Sanity: no ADMIN user exists for this marker at all.
    const admins = await prisma.user.count({
      where: { email: { startsWith: marker }, role: 'ADMIN' },
    });
    expect(admins).toBe(0);
  });

  it('B: default registration (no role) creates CUSTOMER + Customer record', async () => {
    const email = nextEmail('customer');

    await authService.register({ email, password: PASSWORD, name: 'Buyer One' });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { customer: true },
    });

    expect(user?.role).toBe('CUSTOMER');
    expect(user?.customer).toBeTruthy();
  });

  it('C: role:"VENDOR" creates a pending vendor (isActive=false)', async () => {
    const email = nextEmail('vendor-pending');

    await authService.register({
      email,
      password: PASSWORD,
      name: 'Factory Pending',
      role: 'VENDOR',
    });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { vendor: true },
    });

    expect(user?.role).toBe('VENDOR');
    expect(user?.vendor?.isActive).toBe(false);
  });

  it('D: service defense — forged role:"ADMIN" still yields CUSTOMER', async () => {
    const email = nextEmail('forged-admin');

    // Cast: the type no longer allows ADMIN; this simulates any future caller
    // (or drifted schema) attempting to smuggle it through the service layer.
    await authService.register({
      email,
      password: PASSWORD,
      name: 'Forged Role',
      role: 'ADMIN' as unknown as 'CUSTOMER',
    });

    const user = await prisma.user.findUnique({
      where: { email },
      include: { customer: true, vendor: true },
    });

    expect(user?.role).toBe('CUSTOMER');
    expect(user?.customer).toBeTruthy();
    expect(user?.vendor).toBeNull();
  });

  it('E: pending vendor can still complete and submit their profile for review', async () => {
    const email = nextEmail('vendor-profile');

    await authService.register({
      email,
      password: PASSWORD,
      name: 'Pending Profile',
      role: 'VENDOR',
    });
    const user = (await prisma.user.findUnique({ where: { email } }))!;
    const vendorBefore = await prisma.vendor.findUnique({ where: { userId: user.id } });
    expect(vendorBefore?.isActive).toBe(false);

    // Same handler PATCH /vendors/me uses: requireVendorProfile → zod → update.
    // No isActive gate — the pending vendor submits info for admin review.
    const token = jwtService.generateAccessToken(user.id, user.email, 'VENDOR');
    const reply = captureReply();
    await vendorController.updateVendorProfile(
      mockRequest({
        headers: { authorization: `Bearer ${token}` },
        body: {
          companyName: 'Pending Factory Ltd',
          phone: '+201000000000',
          country: 'Egypt',
          city: 'Cairo',
          address: '1 Review Street',
        },
      }),
      reply
    );

    expect(reply.payload?.success).toBe(true);

    const vendorAfter = await prisma.vendor.findUnique({ where: { userId: user.id } });
    expect(vendorAfter?.companyName).toBe('Pending Factory Ltd');
    expect(vendorAfter?.country).toBe('Egypt');
    // Still pending — only PATCH /admin/vendors/:id {isActive:true} activates.
    expect(vendorAfter?.isActive).toBe(false);
  });
});
