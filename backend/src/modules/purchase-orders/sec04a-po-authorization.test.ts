// SEC-04A — Purchase Order authorization + idempotency.
//
// Mocked-Prisma tests (no live database): the generated Prisma client is
// not available in this environment (engine binaries cannot be downloaded
// here), so '@prisma/client' is stubbed with the real enum values and
// '../../lib/prisma' is replaced by controllable mocks, including a
// `$transaction` mock that executes the callback against a transaction
// mock. External services (router, PDF, upload, email, handshake,
// settlement) are mocked the way existing tests mock email.
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
  const poFindMany = vi.fn();
  const poCount = vi.fn();
  const poCreate = vi.fn();
  const poUpdate = vi.fn();
  const poFindUnique = vi.fn();
  const vendorFindUnique = vi.fn();
  const handshakeFindUnique = vi.fn();
  const verifyAccessToken = vi.fn();
  const routeOrder = vi.fn();
  const generatePO = vi.fn();
  const uploadFile = vi.fn();
  const sendEmail = vi.fn();
  const createHandshake = vi.fn();
  const settleVendor = vi.fn();
  const approvalFindFirst=vi.fn(),approvalFindUnique=vi.fn(),designFindUnique=vi.fn();
  const tx = {
    $queryRaw:vi.fn().mockResolvedValue([]),
    design:{findUniqueOrThrow:designFindUnique},
    approvalRequest:{findUniqueOrThrow:approvalFindUnique},
    order: { updateMany: orderUpdateMany },
    purchaseOrder: {
      count: poCount,
      create: poCreate,
      findUnique: poFindUnique,
      update: poUpdate,
    },
    vendor: { findUnique: vendorFindUnique },
  };
  return {
    orderFindUnique,
    approvalFindFirst,approvalFindUnique,designFindUnique,
    orderUpdateMany,
    poFindMany,
    poCount,
    poCreate,
    poUpdate,
    poFindUnique,
    vendorFindUnique,
    handshakeFindUnique,
    verifyAccessToken,
    routeOrder,
    generatePO,
    uploadFile,
    sendEmail,
    createHandshake,
    settleVendor,
    tx,
    prisma: {
      approvalRequest:{findFirst:approvalFindFirst},
      order: { findUnique: orderFindUnique, updateMany: orderUpdateMany },
      purchaseOrder: {
        findMany: poFindMany,
        count: poCount,
        create: poCreate,
        findUnique: poFindUnique,
        update: poUpdate,
      },
      vendor: { findUnique: vendorFindUnique },
      handshake: { findUnique: handshakeFindUnique },
      $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(tx)),
    },
  };
});

vi.mock('../../lib/prisma', () => ({
  prisma: mocks.prisma,
  default: mocks.prisma,
}));

vi.mock('../auth/services/jwt.service', () => ({
  jwtService: { verifyAccessToken: mocks.verifyAccessToken },
}));

vi.mock('../../services/vendor-router/router.service', () => ({
  vendorRouterService: { routeOrder: mocks.routeOrder },
}));

vi.mock('../orders/approval.service',()=>({approvalService:{verifyBytes:vi.fn().mockResolvedValue(undefined)}}));

vi.mock('./po-generator', () => ({
  poGenerator: { generatePO: mocks.generatePO },
}));

vi.mock('../../services/file-upload/upload.service', () => ({
  fileUploadService: { uploadFile: mocks.uploadFile },
}));

vi.mock('../../services/email/email.service', () => ({
  emailService: { sendEmail: mocks.sendEmail },
}));

vi.mock('../handshakes/handshake.service', () => ({
  handshakeService: { createHandshake: mocks.createHandshake },
}));

vi.mock('../settlements/settlement.service', () => ({
  settleVendorForDeliveredOrder: mocks.settleVendor,
}));

import { FastifyRequest, FastifyReply } from 'fastify';
import { poController } from './po.controller';
import { poService } from './po.service';
import {approvalContentHash} from '../orders/approval-snapshot';

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

function vendorFixture(id: string, userId: string) {
  return {
    id,
    userId,
    companyName: `Vendor ${id}`,
    user: { email: `${id}@vendor.test`, firstName: 'V', lastName: id },
  };
}

function orderFixture() {
  return {
    id: 'order-1',
    orderNumber: 'PP-TEST-1',
    status: 'ready_for_routing',
    items: [
      { productType: 'box', quantity: 10, totalPrice: 100, material: 'cardboard' },
    ],
    design: {id:'design-approved',designData:{},files: []},
  };
}

function poFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'po-1',
    orderId: 'order-1',
    vendorId: 'vendor-a',
    poNumber: 'PO-2026-AAAA',
    productType: 'box',
    vendorCost: 60,
    status: 'pending',
    printFileUrl:'https://files.test/approved.bin',
    dielineFileUrl:null,
    poDocumentUrl: null,
    handshake: null,
    vendor: vendorFixture('vendor-a', 'vendor-user-a'),
    order: orderFixture(),
    ...overrides,
  };
}

function primeJwt(role: string, userId: string) {
  mocks.verifyAccessToken.mockReturnValue({
    userId,
    email: `${userId}@test.local`,
    role,
  });
}

describe('SEC-04A createPO authorization + idempotency', () => {
  beforeEach(() => {
    // resetAllMocks (not clearAllMocks): mock implementations and
    // mockResolvedValueOnce queues from a previous test must not leak.
    // Re-apply every default here, including the $transaction mock.
    vi.resetAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb(mocks.tx)
    );
    mocks.generatePO.mockResolvedValue(Buffer.from('fake-pdf'));
    mocks.uploadFile.mockResolvedValue({ fileUrl: 'https://files.test/po.pdf' });
    mocks.createHandshake.mockResolvedValue({ id: 'hs-1', status: 'pending' });
    mocks.sendEmail.mockResolvedValue(undefined);
    mocks.settleVendor.mockResolvedValue(undefined);
    mocks.orderUpdateMany.mockResolvedValue({ count: 1 });
    mocks.poCount.mockResolvedValue(0);
    const approval={id:'request-approved',designId:'design-approved',status:'approved',contentHash:approvalContentHash(orderFixture().design),printSnapshotUrl:'https://files.test/approved.bin',dielineSnapshotUrl:null};
    mocks.approvalFindFirst.mockResolvedValue(approval);mocks.approvalFindUnique.mockResolvedValue(approval);mocks.designFindUnique.mockResolvedValue(orderFixture().design);
    mocks.tx.$queryRaw.mockResolvedValue([]);
    mocks.handshakeFindUnique.mockResolvedValue(null);
  });

  it('customer createPO → 403, routing never runs', async () => {
    primeJwt('CUSTOMER', 'customer-user-1');
    const reply = captureReply();

    await expect(
      poController.createPO(
        mockRequest({ params: { id: 'order-1' } }),
        reply
      )
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 403 }));
    expect(mocks.routeOrder).not.toHaveBeenCalled();
    expect(mocks.poCreate).not.toHaveBeenCalled();
  });

  it('admin createPO happy path → 201, one PO per group, order stays ready_for_routing', async () => {
    primeJwt('ADMIN', 'admin-1');
    mocks.orderFindUnique.mockResolvedValue(orderFixture());
    mocks.poFindMany.mockResolvedValue([]);
    const vendorA = vendorFixture('vendor-a', 'vendor-user-a');
    mocks.routeOrder.mockResolvedValue({ selectedVendor: vendorA, scores: [] });
    mocks.poCreate.mockImplementation(async ({ data }: any) => ({
      ...poFixture(),
      ...data,
      id: 'po-1',
      vendor: vendorA,
    }));
    mocks.poUpdate.mockImplementation(async ({ data }: any) => ({
      ...poFixture(),
      ...data,
      poDocumentUrl: 'https://files.test/po.pdf',
      vendor: vendorA,
    }));
    const reply = captureReply();

    await poController.createPO(
      mockRequest({ params: { id: 'order-1' } }),
      reply
    );

    expect(reply.statusCode).toBe(201);
    expect(reply.payload?.data?.count).toBe(1);
    expect(mocks.poCreate).toHaveBeenCalledTimes(1);
    expect(mocks.createHandshake).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    // The transaction claim runs; no order-status move is made (SEC-04A:
    // ready_for_routing is kept, the existing-POs guard closes re-runs).
    expect(mocks.orderUpdateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', status: 'ready_for_routing' },
      data: { status: 'ready_for_routing' },
    });
  });

  it('duplicate createPO (complete POs already exist) → 409, no new PO', async () => {
    const complete = poFixture({
      poDocumentUrl: 'https://files.test/po.pdf',
      handshake: { id: 'hs-1', status: 'pending' },
    });
    mocks.orderFindUnique.mockResolvedValue(orderFixture());
    mocks.poFindMany.mockResolvedValue([complete]);

    await expect(poService.createPO('order-1', 'ADMIN')).rejects.toThrowError(
      expect.objectContaining({ statusCode: 409 })
    );
    expect(mocks.routeOrder).not.toHaveBeenCalled();
    expect(mocks.poCreate).not.toHaveBeenCalled();
  });

  it('createPO resumes POs left incomplete by a failed run instead of 409-ing', async () => {
    const incomplete = poFixture(); // no document, no handshake
    mocks.orderFindUnique.mockResolvedValue(orderFixture());
    mocks.poFindMany.mockResolvedValue([incomplete]);
    mocks.poUpdate.mockImplementation(async ({ data }: any) => ({
      ...incomplete,
      ...data,
      vendor: vendorFixture('vendor-a', 'vendor-user-a'),
    }));

    const result = await poService.createPO('order-1', 'ADMIN');

    expect(result.count).toBe(1);
    expect(mocks.poCreate).not.toHaveBeenCalled();
    expect(mocks.generatePO).toHaveBeenCalledWith('po-1');
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it('non-admin service call with a role → 403', async () => {
    await expect(poService.createPO('order-1', 'CUSTOMER')).rejects.toThrowError(
      expect.objectContaining({ statusCode: 403 })
    );
  });
});

describe('SEC-04A confirmPO ownership + state gate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.prisma.$transaction.mockImplementation(async (cb: (tx: unknown) => unknown) =>
      cb(mocks.tx)
    );
    mocks.settleVendor.mockResolvedValue(undefined);
  });

  function primeConfirmPO(po: Record<string, unknown>) {
    mocks.poFindUnique.mockResolvedValue(po);
    mocks.poUpdate.mockImplementation(async ({ data }: any) => ({
      ...(po as any),
      ...data,
    }));
  }

  it('vendor B confirming vendor A’s PO → 403, no update, no settlement', async () => {
    primeConfirmPO(poFixture());
    mocks.vendorFindUnique.mockResolvedValue(vendorFixture('vendor-b', 'vendor-user-b'));

    await expect(
      poService.confirmPO('po-1', { userId: 'vendor-user-b', role: 'VENDOR' })
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 403 }));
    expect(mocks.poUpdate).not.toHaveBeenCalled();
    expect(mocks.settleVendor).not.toHaveBeenCalled();
  });

  it('confirming an already-confirmed PO → 409', async () => {
    primeConfirmPO(poFixture({ status: 'confirmed' }));

    await expect(
      poService.confirmPO('po-1', { userId: 'admin-1', role: 'ADMIN' })
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 409 }));
    expect(mocks.poUpdate).not.toHaveBeenCalled();
    expect(mocks.settleVendor).not.toHaveBeenCalled();
  });

  it('admin confirm → ok, settlement helper runs (SEC-03a preserved)', async () => {
    primeConfirmPO(poFixture());

    const result = await poService.confirmPO('po-1', {
      userId: 'admin-1',
      role: 'ADMIN',
    });

    expect(result.status).toBe('confirmed');
    expect(result.confirmedAt).toBeDefined();
    expect(mocks.settleVendor).toHaveBeenCalledWith(
      expect.anything(),
      'order-1',
      'vendor-a',
      'po-confirmed',
      expect.anything()
    );
  });

  it('owning vendor confirm → ok', async () => {
    primeConfirmPO(poFixture());
    mocks.vendorFindUnique.mockResolvedValue(vendorFixture('vendor-a', 'vendor-user-a'));

    const result = await poService.confirmPO('po-1', {
      userId: 'vendor-user-a',
      role: 'VENDOR',
    });

    expect(result.status).toBe('confirmed');
  });

  it('customer confirm via controller → 403', async () => {
    primeJwt('CUSTOMER', 'customer-user-1');
    const reply = captureReply();

    await expect(
      poController.confirmPO(
        mockRequest({ params: { id: 'po-1' } }),
        reply
      )
    ).rejects.toThrowError(expect.objectContaining({ statusCode: 403 }));
    expect(mocks.poUpdate).not.toHaveBeenCalled();
  });
});
