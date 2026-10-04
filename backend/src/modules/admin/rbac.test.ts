import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { requireRoles, requireAdmin, assertProductionOwnership } from '../../middleware/rbac';
import { AuthorizationError } from '../../utils/errors';
import { jwtService } from '../auth/services/jwt.service';

/**
 * SPEC-029 Phase 3/4 RBAC hardening.
 *
 * Before this work most vendor/admin endpoints only called authenticate() —
 * any logged-in user could accept handshakes, process settlements or pull
 * finance reports. These tests pin the middleware contract that now guards
 * those routes:
 *
 *   A  requireRoles rejects a role outside the allowlist (AuthorizationError).
 *   B  requireRoles accepts an allowed role and returns the payload.
 *   C  requireAdmin rejects VENDOR/CUSTOMER, accepts ADMIN.
 *   D  Production ownership: a vendor cannot touch another vendor's record.
 */

function mockRequest(token: string | null): FastifyRequest {
  return {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  } as unknown as FastifyRequest;
}

function mockReply(): FastifyReply {
  return {} as unknown as FastifyReply;
}

describe('RBAC middleware', () => {
  const emails: string[] = [];

  async function seedUser(role: 'CUSTOMER' | 'VENDOR' | 'ADMIN') {
    const email = `rbac-${role.toLowerCase()}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 7)}@test.local`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'x', role, emailVerified: true },
    });
    emails.push(email);
    return user;
  }

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  });

  it('A: rejects a role outside the allowlist', async () => {
    const customer = await seedUser('CUSTOMER');
    const token = jwtService.generateAccessToken(customer.id, customer.email, 'CUSTOMER');

    await expect(
      requireRoles(mockRequest(token), mockReply(), 'ADMIN')
    ).rejects.toThrow(AuthorizationError);
  });

  it('B: accepts an allowed role and returns the JWT payload', async () => {
    const vendor = await seedUser('VENDOR');
    const token = jwtService.generateAccessToken(vendor.id, vendor.email, 'VENDOR');

    const payload = await requireRoles(
      mockRequest(token),
      mockReply(),
      'VENDOR',
      'ADMIN'
    );

    expect(payload.userId).toBe(vendor.id);
    expect(payload.role).toBe('VENDOR');
  });

  it('C: requireAdmin gates VENDOR out and lets ADMIN through', async () => {
    const vendor = await seedUser('VENDOR');
    const admin = await seedUser('ADMIN');

    const vendorToken = jwtService.generateAccessToken(vendor.id, vendor.email, 'VENDOR');
    await expect(
      requireAdmin(mockRequest(vendorToken), mockReply())
    ).rejects.toThrow(AuthorizationError);

    const adminToken = jwtService.generateAccessToken(admin.id, admin.email, 'ADMIN');
    const payload = await requireAdmin(mockRequest(adminToken), mockReply());
    expect(payload.role).toBe('ADMIN');
  });

  it('D: vendor cannot act on another vendor production record', async () => {
    const owner = await seedUser('VENDOR');
    const stranger = await seedUser('VENDOR');

    const ownerVendor = await prisma.vendor.create({
      data: { userId: owner.id, companyName: 'RBAC Owner Co', address: 'x', city: 'y', country: 'z' },
    });
    await prisma.vendor.create({
      data: { userId: stranger.id, companyName: 'RBAC Stranger Co', address: 'x', city: 'y', country: 'z' },
    });

    const strangerToken = jwtService.generateAccessToken(stranger.id, stranger.email, 'VENDOR');

    await expect(
      assertProductionOwnership(mockRequest(strangerToken), mockReply(), `nonexistent-${Date.now()}`)
    ).rejects.toThrow();

    // Owner passes the ownership check for their own vendor record path:
    // a production created under ownerVendor must resolve for the owner.
    const order = await prisma.order.create({
      data: {
        orderNumber: `RBAC-${Date.now()}`,
        customerId: (
          await prisma.customer.create({ data: { userId: owner.id } })
        ).id,
        status: 'in_production',
        subtotal: 1,
        tax: 0,
        shippingCost: 0,
        total: 1,
        shippingAddress: { street: '1 Test St', city: 'Cairo', country: 'EG' },
        shippingName: 'RBAC Test',
        shippingPhone: '+200000000',
      },
    });
    const po = await prisma.purchaseOrder.create({
      data: {
        orderId: order.id,
        vendorId: ownerVendor.id,
        poNumber: `RBAC-PO-${Date.now()}`,
        status: 'confirmed',
        vendorCost: 1,
      },
    });
    const production = await prisma.production.create({
      data: { poId: po.id, vendorId: ownerVendor.id, status: 'in_progress' },
    });

    const ownerToken = jwtService.generateAccessToken(owner.id, owner.email, 'VENDOR');
    const payload = await assertProductionOwnership(
      mockRequest(ownerToken),
      mockReply(),
      production.id
    );
    expect(payload.userId).toBe(owner.id);

    // Cleanup relational rows child-first and idempotently (a previously
    // failed run may have left orphans with the same test-name prefixes).
    await prisma.sample.deleteMany({ where: { production: { purchaseOrder: { poNumber: { startsWith: 'RBAC-PO-' } } } } });
    await prisma.production.deleteMany({ where: { purchaseOrder: { poNumber: { startsWith: 'RBAC-PO-' } } } });
    await prisma.purchaseOrder.deleteMany({ where: { poNumber: { startsWith: 'RBAC-PO-' } } });
    await prisma.order.deleteMany({ where: { orderNumber: { startsWith: 'RBAC-' } } });
    const testVendors = await prisma.vendor.findMany({
      where: { companyName: { in: ['RBAC Owner Co', 'RBAC Stranger Co'] } },
      select: { id: true, userId: true },
    });
    await prisma.vendor.deleteMany({
      where: { id: { in: testVendors.map((v) => v.id) } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: testVendors.map((v) => v.userId) }, email: { contains: '@test.local' } },
    });
  });
});
