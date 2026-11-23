import { afterAll, beforeAll, describe, it, expect, vi } from "vitest";
import { prisma } from "../../lib/prisma";
import {
  newApprovalToken,
  verifyApprovalToken,
  hashApprovalToken,
} from "./approval-tokens";
import { approvalService } from "../../modules/orders/approval.service";
import { approvalContentHash } from "../../modules/orders/approval-snapshot";
vi.mock("../email/email.service", () => ({
  emailService: { sendApprovalRequest: vi.fn() },
}));
describe("request-bound durable approval capability", () => {
  let userId: string, customerId: string;
  const orders: string[] = [];
  beforeAll(async () => {
    const u = await prisma.user.create({
      data: {
        email: `approval-bound-${Date.now()}@test.local`,
        passwordHash: "unused",
        customer: { create: {} },
      },
      include: { customer: true },
    });
    userId = u.id;
    customerId = u.customer!.id;
  });
  afterAll(async () => {
    await prisma.design.deleteMany({ where: { orderId: { in: orders } } });
    await prisma.order.deleteMany({ where: { id: { in: orders } } });
    await prisma.user.delete({ where: { id: userId } });
  });
  async function setup() {
    const o = await prisma.order.create({
      data: {
        orderNumber: `bound-${Date.now()}-${orders.length}`,
        customerId,
        status: "awaiting_approval",
        subtotal: 20,
        total: 20,
        tax: 0,
        shippingCost: 0,
        shippingAddress: {},
        shippingName: "Test",
        shippingPhone: "local",
      },
    });
    orders.push(o.id);
    const design = await prisma.design.create({
      data: {
        orderId: o.id,
        sessionId: `bound-${o.id}`,
        ownerId: userId,
        designData: { marker: "A" },
      },
    });
    const r = await prisma.approvalRequest.create({
      data: {
        orderId: o.id,
        designId: design.id,
        status: "pending",
        contentHash: approvalContentHash(design),
        designSnapshot: { designData: design.designData } as any,
        printFileId: "test-fixture",
        printSha256: "test-fixture",
        printSnapshotUrl: "test-fixture",
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const token = newApprovalToken();
    await prisma.orderApprovalToken.create({
      data: {
        orderId: o.id,
        requestId: r.id,
        tokenHash: hashApprovalToken(token),
        expiresAt: r.expiresAt,
      },
    });
    return { o, design, r, token };
  }
  it("stores only a hash, resolves exact request and refuses unbound legacy tokens", async () => {
    const s = await setup();
    expect(await verifyApprovalToken(s.token)).toEqual({
      orderId: s.o.id,
      requestId: s.r.id,
    });
    const row = await prisma.orderApprovalToken.findUniqueOrThrow({
      where: { tokenHash: hashApprovalToken(s.token) },
    });
    expect(JSON.stringify(row)).not.toContain(s.token);
    const legacy = newApprovalToken();
    await prisma.orderApprovalToken.create({
      data: {
        orderId: s.o.id,
        tokenHash: hashApprovalToken(legacy),
        expiresAt: s.r.expiresAt,
      },
    });
    expect(await verifyApprovalToken(legacy)).toBeNull();
  });
  it("refuses expired, malformed, consumed and superseded tokens", async () => {
    const s = await setup();
    await prisma.approvalRequest.update({
      where: { id: s.r.id },
      data: { status: "superseded" },
    });
    expect(await verifyApprovalToken(s.token)).toBeNull();
    expect(await verifyApprovalToken("bad")).toBeNull();
    expect(await verifyApprovalToken("a".repeat(64))).toBeNull();
    const b = await setup();
    await prisma.orderApprovalToken.update({
      where: { tokenHash: hashApprovalToken(b.token) },
      data: { expiresAt: new Date(0) },
    });
    expect(await verifyApprovalToken(b.token)).toBeNull();
    const c = await setup();
    await prisma.orderApprovalToken.update({
      where: { tokenHash: hashApprovalToken(c.token) },
      data: { consumedAt: new Date() },
    });
    expect(await verifyApprovalToken(c.token)).toBeNull();
  });
  it("consumes once under concurrent approvals, with byte check independently tested elsewhere", async () => {
    const s = await setup();
    const bytes = vi
      .spyOn(approvalService, "verifyBytes")
      .mockResolvedValue(undefined);
    try {
      const r = await Promise.allSettled([
        approvalService.approveOrder(s.o.id, s.token),
        approvalService.approveOrder(s.o.id, s.token),
      ]);
      expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id: s.o.id } }))
          .status,
      ).toBe("ready_for_routing");
    } finally {
      bytes.mockRestore();
    }
  });
  it("rejects edited content without consuming the capability or advancing the order", async () => {
    const s = await setup();
    await prisma.design.update({
      where: { id: s.design.id },
      data: { designData: { marker: "B" } },
    });
    const bytes = vi
      .spyOn(approvalService, "verifyBytes")
      .mockResolvedValue(undefined);
    try {
      await expect(
        approvalService.approveOrder(s.o.id, s.token),
      ).rejects.toThrow(/changed/);
      expect(
        (await prisma.order.findUniqueOrThrow({ where: { id: s.o.id } }))
          .status,
      ).toBe("awaiting_approval");
      expect(await verifyApprovalToken(s.token)).not.toBeNull();
    } finally {
      bytes.mockRestore();
    }
  });
});
