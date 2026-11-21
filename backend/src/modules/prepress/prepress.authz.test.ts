import { describe, it, expect, afterAll } from 'vitest';
import { prisma } from '../../lib/prisma';
import { prePressController } from './prepress.controller';
import { jwtService } from '../auth/services/jwt.service';

/**
 * Prepress endpoints must enforce the same access rule as GET /orders/:id:
 * the owning customer, a vendor with a PO on the order, or an ADMIN. Before
 * the fix, any authenticated user could trigger a check on (or read results
 * of) any order id.
 *
 * Controller-level test: requests carry a real signed token; the reply is a
 * minimal stub. The service itself is never reached by unauthorized callers,
 * so no asset fixtures are needed.
 */
describe('prepress controller — order access rule', () => {
  const marker = `PP-${Date.now().toString(36)}`;
  const userIds: string[] = [];
  let orderId = '';

  function reqFor(token: string | null, id: string): any {
    return {
      params: { id },
      headers: token ? { authorization: `Bearer ${token}` } : {},
    };
  }

  const replyStub: any = {
    status() {
      return this;
    },
    send() {
      return this;
    },
  };

  async function seedUser(role: 'CUSTOMER' | 'ADMIN') {
    const email = `${marker.toLowerCase()}-${role.toLowerCase()}-${userIds.length}@test.local`;
    const user = await prisma.user.create({
      data: { email, passwordHash: 'x', role, emailVerified: true },
    });
    userIds.push(user.id);
    if (role === 'CUSTOMER') {
      await prisma.customer.create({ data: { userId: user.id } });
    }
    return user;
  }

  afterAll(async () => {
    if (orderId) {
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (userIds.length) {
      await prisma.customer.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  it('rejects a stranger, a missing token, and admits the owner and an admin', async () => {
    const owner = await seedUser('CUSTOMER');
    const stranger = await seedUser('CUSTOMER');
    const admin = await seedUser('ADMIN');
    const ownerCustomer = await prisma.customer.findUniqueOrThrow({
      where: { userId: owner.id },
    });

    const order = await prisma.order.create({
      data: {
        customerId: ownerCustomer.id,
        orderNumber: `${marker}-1`,
        subtotal: 10,
        tax: 0,
        shippingCost: 0,
        total: 10,
        shippingAddress: {},
        shippingName: 'Owner',
        shippingPhone: '000',
      },
    });
    orderId = order.id;

    const ownerToken = jwtService.generateAccessToken(owner.id, owner.email, owner.role);
    const strangerToken = jwtService.generateAccessToken(
      stranger.id,
      stranger.email,
      stranger.role
    );
    const adminToken = jwtService.generateAccessToken(admin.id, admin.email, admin.role);

    // No token at all -> authentication error.
    await expect(
      prePressController.getResults(reqFor(null, orderId), replyStub)
    ).rejects.toThrow();

    // Authenticated stranger -> access denied before any processing.
    await expect(
      prePressController.checkOrder(reqFor(strangerToken, orderId), replyStub)
    ).rejects.toThrow(/access denied/i);
    await expect(
      prePressController.getResults(reqFor(strangerToken, orderId), replyStub)
    ).rejects.toThrow(/access denied/i);

    // Owner and admin pass the guard (the service then fails on missing
    // design data / returns 404 — anything EXCEPT an access-denied error
    // proves the authorization step let them through).
    await expect(
      prePressController.checkOrder(reqFor(ownerToken, orderId), replyStub)
    ).rejects.not.toThrow(/access denied/i);
    await expect(
      prePressController.checkOrder(reqFor(adminToken, orderId), replyStub)
    ).rejects.not.toThrow(/access denied/i);
    // Owner reading results: guard passes, service finds nothing, 404 path.
    const res = await prePressController.getResults(
      reqFor(ownerToken, orderId),
      replyStub
    );
    expect(res).toBe(replyStub);
  });
});
