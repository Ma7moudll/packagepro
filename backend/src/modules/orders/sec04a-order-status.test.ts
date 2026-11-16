// SEC-04A — Order status authorization (PATCH /orders/:id/status).
//
// Mocked-Prisma tests (no live database): the generated Prisma client is
// not available in this environment (engine binaries cannot be downloaded
// here), so '@prisma/client' is stubbed with the real enum values and
// '../../lib/prisma' is replaced by controllable mocks. The authorization
// and matrix logic under test does not depend on the real client.
// Follows the mockRequest/captureReply conventions of
// modules/auth/auth.register-roles.integration.test.ts.

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@prisma/client', () => ({
  OrderStatus: {
    pending_review: 'pending_review',
    awaiting_approval: 'awaiting_approval',
    ready_for_routing: 'ready_for_routing',
    vendor_confirmed: 'vendor_confirmed',
    in_production: 'in_production',
    quality_check: 'quality_check',
    ready_to_ship: 'ready_to_ship',
    shipped: 'shipped',
    delivered: 'delivered',
    completed: 'completed',
    cancelled: 'cancelled',
  },
  UserRole: { ADMIN: 'ADMIN', CUSTOMER: 'CUSTOMER', VENDOR: 'VENDOR' },
  PrismaClient: class {},
  Prisma: { Decimal: class {} },
}));

const mocks = vi.hoisted(() => {
  const orderFindUnique = vi.fn();
  const orderUpdateMany = vi.fn();
  const userFindUnique = vi.fn();
  const verifyAccessToken = vi.fn();
  return {
    orderFindUnique,
    orderUpdateMany,
    userFindUnique,
    verifyAccessToken,
    prisma: {
      order: { findUnique: orderFindUnique, updateMany: orderUpdateMany },
      user: { findUnique: userFindUnique },
    },
  };
});

vi.mock('../../lib/prisma', () => ({
  prisma: mocks.prisma,
  default: mocks.prisma,
}));

vi.mock('../notifications/notifications.service', () => ({
  notificationService: { createIfUnseen: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../services/pricing-engine/pricing.service', () => ({
  pricingService: {},
}));

vi.mock('../../services/pricing-engine/calculations', () => ({
  groupShippingByProductType: vi.fn(() => []),
}));

vi.mock('../auth/services/jwt.service', () => ({
  jwtService: { verifyAccessToken: mocks.verifyAccessToken },
}));

import { FastifyRequest, FastifyReply } from 'fastify';
import { orderController } from './order.controller';
import { orderService } from './order.service';

function mockRequest(payload: {
  params?: Record<string, string>;
  body?: unknown;
  headers?: Record<string, string>;
}): FastifyRequest {
  return {
    params: payload.params ?? {},
    body: payload.body,
    headers: payload.headers ?? { authorization: 'Bearer test-token' },
  } as unknown as FastifyRequest;
}

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

function orderFixture(status: string, ownerUserId = 'customer-user-1') {
  return {
    id: 'order-1',
    orderNumber: 'PP-TEST-1',
    status,
    customerId: 'customer-1',
    customer: { user: { id: ownerUserId } },
    purchaseOrders: [],
    payment: null,
    shipment: null,
    subtotal: 0,
    tax: 0,
    shippingCost: 0,
    total: 0,
  };
}

function userFixture(role: string, userId = 'admin-1') {
  return { id: userId, role, customer: null, vendor: null };
}

describe('SEC-04A PATCH /orders/:id/status authorization', () => {
  beforeEach(() => {
    // resetAllMocks (not clearAllMocks): mockResolvedValueOnce queues from
    // a previous test must not leak into the next one.
    vi.resetAllMocks();
    mocks.orderUpdateMany.mockResolvedValue({ count: 1 });
  });

  function primeOrderFlow(opts: {
    status: string;
    actorRole: string;
    actorUserId?: string;
    ownerUserId?: string;
  }) {
    const { status, actorRole } = opts;
    const actorUserId = opts.actorUserId ?? 'admin-1';
    const ownerUserId = opts.ownerUserId ?? 'customer-user-1';
    mocks.verifyAccessToken.mockReturnValue({
      userId: actorUserId,
      email: 'a@test.local',
      role: actorRole,
    });
    // getOrder: order read, then user read (authz inside getOrder).
    // reload after updateMany: second order read with the new status.
    mocks.orderFindUnique
      .mockResolvedValueOnce(orderFixture(status, ownerUserId))
      .mockResolvedValueOnce(orderFixture('awaiting_approval', ownerUserId));
    mocks.userFindUnique.mockResolvedValue(userFixture(actorRole, actorUserId));
  }

  it('customer PATCH status → 403, no status write attempted', async () => {
    primeOrderFlow({ status: 'pending_review', actorRole: 'CUSTOMER', actorUserId: 'customer-user-1' });
    const reply = captureReply();

    await expect(
      orderController.updateOrderStatus(
        mockRequest({ params: { id: 'order-1' }, body: { status: 'shipped' } }),
        reply
      )
    ).rejects.toThrowError(
      expect.objectContaining({ statusCode: 403 })
    );
    expect(mocks.orderUpdateMany).not.toHaveBeenCalled();
  });

  it('admin PATCH with a legal transition → 200, conditional write on the observed status', async () => {
    primeOrderFlow({ status: 'pending_review', actorRole: 'ADMIN' });
    const reply = captureReply();

    await orderController.updateOrderStatus(
      mockRequest({
        params: { id: 'order-1' },
        body: { status: 'awaiting_approval' },
      }),
      reply
    );

    expect(reply.payload?.success).toBe(true);
    expect(reply.payload?.data?.status).toBe('awaiting_approval');
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', status: 'pending_review' },
      data: expect.objectContaining({ status: 'awaiting_approval' }),
    });
  });

  it('admin PATCH with an illegal transition → 409, no status write attempted', async () => {
    primeOrderFlow({ status: 'delivered', actorRole: 'ADMIN' });
    const reply = captureReply();

    await expect(
      orderController.updateOrderStatus(
        mockRequest({ params: { id: 'order-1' }, body: { status: 'shipped' } }),
        reply
      )
    ).rejects.toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
    expect(mocks.orderUpdateMany).not.toHaveBeenCalled();
  });

  it('admin PATCH to the same status → 409 (no-op changes are not allowed)', async () => {
    primeOrderFlow({ status: 'shipped', actorRole: 'ADMIN' });
    const reply = captureReply();

    await expect(
      orderController.updateOrderStatus(
        mockRequest({ params: { id: 'order-1' }, body: { status: 'shipped' } }),
        reply
      )
    ).rejects.toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
  });

  it('concurrent transition (0-row claim) → 409', async () => {
    primeOrderFlow({ status: 'pending_review', actorRole: 'ADMIN' });
    mocks.orderUpdateMany.mockResolvedValue({ count: 0 });
    const reply = captureReply();

    await expect(
      orderController.updateOrderStatus(
        mockRequest({
          params: { id: 'order-1' },
          body: { status: 'awaiting_approval' },
        }),
        reply
      )
    ).rejects.toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
  });

  it('internal method allows a legal transition without a user, enforces the matrix', async () => {
    mocks.orderFindUnique
      .mockResolvedValueOnce(orderFixture('shipped'))
      .mockResolvedValueOnce(orderFixture('delivered'));

    const result = await orderService.updateOrderStatusInternal(
      'order-1',
      'delivered' as any
    );
    expect(result.status).toBe('delivered');

    mocks.orderFindUnique.mockResolvedValueOnce(orderFixture('pending_review'));
    await expect(
      orderService.updateOrderStatusInternal('order-1', 'delivered' as any)
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 409 }));
  });
});
