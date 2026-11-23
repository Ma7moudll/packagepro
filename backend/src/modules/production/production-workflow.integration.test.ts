import {
  beforeAll,
  afterAll,
  beforeEach,
  it,
  expect,
  describe,
  vi,
} from "vitest";
import Fastify from "fastify";
const synthetic = vi.hoisted(() => ({ notify: vi.fn() }));
vi.mock("../notifications/notifications.service", () => ({
  notificationService: { createIfUnseen: synthetic.notify },
}));
import { prisma } from "../../lib/prisma";
import { jwtService } from "../auth/services/jwt.service";
import { productionService } from "./production.service";
import { productionRoutes } from "./production.routes";
describe.skipIf(process.env.PACKAGEPRO_PRODUCTION_ISOLATED_DB !== "yes")(
  "isolated production replay workflow",
  () => {
    const app = Fastify();
    let userId: string,
      customerId: string,
      vendorId: string,
      orderId: string,
      poId: string,
      headers: any;
    let seq = 0;
    let validated = false;
    beforeAll(async () => {
      const u = new URL(process.env.DATABASE_URL || "");
      if (
        !["localhost", "127.0.0.1"].includes(u.hostname) ||
        !/^\/packagepro_e2e_production_[a-z0-9]+$/.test(u.pathname)
      )
        throw Error("Isolated production DB only");
      if (
        (await prisma.user.count()) ||
        (await prisma.order.count()) ||
        (await prisma.production.count())
      )
        throw Error("Empty business database required");
      validated = true;
      app.setErrorHandler((e: any, _r, p) =>
        p
          .status(e.statusCode || (e.name === "ZodError" ? 400 : 500))
          .send({ error: e.message }),
      );
      await app.register(productionRoutes, { prefix: "/api" });
      await app.ready();
      const user = await prisma.user.create({
        data: {
          email: "synthetic-production@test.invalid",
          passwordHash: "unusable",
          role: "VENDOR",
          vendor: {
            create: {
              companyName: "Synthetic production",
              address: "Test",
              city: "Cairo",
              country: "EG",
            },
          },
          customer: { create: {} },
        },
        include: { vendor: true, customer: true },
      });
      userId = user.id;
      customerId = user.customer!.id;
      vendorId = user.vendor!.id;
      headers = {
        authorization:
          "Bearer " +
          jwtService.generateAccessToken(userId, user.email, "VENDOR"),
      };
    });
    async function clear() {
      if (!validated) return;
      await prisma.production.deleteMany({
        where: { purchaseOrder: { order: { customerId } } },
      });
      await prisma.purchaseOrder.deleteMany({
        where: { order: { customerId } },
      });
      await prisma.order.deleteMany({ where: { customerId } });
    }
    beforeEach(async () => {
      vi.restoreAllMocks();
      synthetic.notify.mockReset();
      synthetic.notify.mockResolvedValue(undefined);
      await clear();
      const o = await prisma.order.create({
        data: {
          orderNumber: "SYNTHETIC-" + ++seq,
          customerId,
          status: "vendor_confirmed",
          subtotal: 20,
          tax: 0,
          shippingCost: 0,
          total: 20,
          shippingAddress: { city: "Test" },
          shippingName: "Synthetic",
          shippingPhone: "test",
        },
      });
      orderId = o.id;
      poId = (
        await prisma.purchaseOrder.create({
          data: {
            orderId,
            vendorId,
            poNumber: "SYNTHETIC-PO-" + seq,
            status: "confirmed",
            vendorCost: 10,
          },
        })
      ).id;
    });
    afterAll(async () => {
      await clear();
      if (userId) await prisma.user.delete({ where: { id: userId } });
      await app.close();
      await prisma.$disconnect();
    });
    const start = () =>
      app.inject({
        method: "POST",
        url: `/api/production/start/${poId}`,
        headers,
      });
    const progress = (id: string, percent: number) =>
      app.inject({
        method: "POST",
        url: `/api/production/${id}/progress`,
        headers,
        payload: { progressPercent: percent },
      });
    async function snapshot() {
      return {
        production: await prisma.production.findMany({
          orderBy: { id: "asc" },
        }),
        order: await prisma.order.findUnique({ where: { id: orderId } }),
      };
    }
    it("starts once, repeated request preserves progress and start time", async () => {
      const a = await start();
      expect(a.statusCode, a.body).toBe(200);
      const id = a.json().data.id;
      expect((await progress(id, 45)).statusCode).toBe(200);
      const before = await snapshot();
      expect((await start()).statusCode).toBe(200);
      expect(await snapshot()).toEqual(before);
      expect(synthetic.notify).toHaveBeenCalledTimes(1);
    });
    it.each(["quality_review", "completed"] as const)(
      "start replay never rewinds %s",
      async (status) => {
        await prisma.production.create({
          data: {
            poId,
            vendorId,
            status,
            progressPercent: 100,
            startedAt: new Date(1000),
            completedAt: new Date(2000),
          },
        });
        await prisma.order.update({
          where: { id: orderId },
          data: {
            status: status === "completed" ? "ready_to_ship" : "quality_check",
          },
        });
        const before = await snapshot();
        expect((await start()).statusCode).toBe(200);
        expect(await snapshot()).toEqual(before);
        expect(synthetic.notify).not.toHaveBeenCalled();
      },
    );
    it.each(["cancelled", "delivered", "completed"] as const)(
      "cannot newly start terminal order %s",
      async (status) => {
        await prisma.order.update({ where: { id: orderId }, data: { status } });
        const before = await snapshot();
        expect((await start()).statusCode).toBe(409);
        expect(await snapshot()).toEqual(before);
        expect(synthetic.notify).not.toHaveBeenCalled();
      },
    );
    it("fractional progress is rejected before persistence", async () => {
      const a = await start();
      const before = await snapshot();
      expect((await progress(a.json().data.id, 12.5)).statusCode).toBe(400);
      expect(await snapshot()).toEqual(before);
    });
    it("customer cannot start production", async () => {
      const r = await app.inject({
        method: "POST",
        url: `/api/production/start/${poId}`,
        headers: {
          authorization:
            "Bearer " +
            jwtService.generateAccessToken(
              userId,
              "synthetic-production@test.invalid",
              "CUSTOMER",
            ),
        },
      });
      expect(r.statusCode).toBe(403);
      expect((await snapshot()).production).toHaveLength(0);
    });

    it("concurrent start requests create one run and one notification", async () => {
      const results = await Promise.all(
        Array.from({ length: 8 }, () => start()),
      );
      expect(results.map((r) => r.statusCode)).toEqual(Array(8).fill(200));
      expect(new Set(results.map((r) => r.json().data.id)).size).toBe(1);
      expect((await snapshot()).production).toHaveLength(1);
      expect(synthetic.notify).toHaveBeenCalledTimes(1);
    });
    it.each(["start"])(
      "order-write failure rolls back %s production change",
      async (kind) => {
        const before = await snapshot();
        const notifications = synthetic.notify.mock.calls.length;
        await prisma.$executeRawUnsafe(
          `CREATE OR REPLACE FUNCTION synthetic_reject_production_order() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'synthetic order failure'; END; $$ LANGUAGE plpgsql`,
        );
        await prisma.$executeRawUnsafe(
          `CREATE TRIGGER synthetic_production_order_failure BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION synthetic_reject_production_order()`,
        );
        try {
          const result = await start();
          expect(result.statusCode).toBe(500);
          expect(await snapshot()).toEqual(before);
          expect(synthetic.notify.mock.calls.length).toBe(notifications);
        } finally {
          await prisma.$executeRawUnsafe(
            `DROP TRIGGER IF EXISTS synthetic_production_order_failure ON orders`,
          );
          await prisma.$executeRawUnsafe(
            `DROP FUNCTION IF EXISTS synthetic_reject_production_order()`,
          );
        }
      },
    );
    it("stranger vendor cannot read or mutate a production", async () => {
      const a = await start();
      const stranger = await prisma.user.create({
        data: {
          email: "stranger-production@test.invalid",
          passwordHash: "unusable",
          role: "VENDOR",
          vendor: {
            create: {
              companyName: "Synthetic stranger",
              address: "Test",
              city: "Test",
              country: "EG",
            },
          },
        },
      });
      try {
        const foreign = {
          authorization:
            "Bearer " +
            jwtService.generateAccessToken(
              stranger.id,
              stranger.email,
              "VENDOR",
            ),
        };
        const before = await snapshot();
        for (const req of [
          { method: "POST" as const, url: `/api/production/start/${poId}` },
          {
            method: "GET" as const,
            url: `/api/production/${a.json().data.id}`,
          },
          {
            method: "POST" as const,
            url: `/api/production/${a.json().data.id}/progress`,
            payload: { progressPercent: 100 },
          },
        ])
          expect(
            (await app.inject({ ...req, headers: foreign })).statusCode,
          ).toBe(403);
        expect(await snapshot()).toEqual(before);
      } finally {
        await prisma.user.delete({ where: { id: stranger.id } });
      }
    });

    it("starts an existing not_started record without replacing identity", async () => {
      const pending = await prisma.production.create({
        data: { poId, vendorId, status: "not_started" },
      });
      const r = await start();
      expect(r.statusCode, r.body).toBe(200);
      expect(r.json().data.id).toBe(pending.id);
      expect(r.json().data.status).toBe("in_progress");
      expect(r.json().data.purchaseOrder.order.status).toBe("in_production");
      expect(synthetic.notify).toHaveBeenCalledTimes(1);
    });
    it("unconfirmed PO is refused without writes", async () => {
      await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { status: "pending" },
      });
      const before = await snapshot();
      expect((await start()).statusCode).toBe(400);
      expect(await snapshot()).toEqual(before);
    });
    it("start refuses an earlier approval state without selecting payment policy", async () => {
      await prisma.order.update({
        where: { id: orderId },
        data: { status: "awaiting_approval" },
      });
      const before = await snapshot();
      expect((await start()).statusCode).toBe(409);
      expect(await snapshot()).toEqual(before);
    });
    it("unauthenticated start is refused", async () => {
      expect(
        (
          await app.inject({
            method: "POST",
            url: `/api/production/start/${poId}`,
          })
        ).statusCode,
      ).toBe(401);
      expect((await snapshot()).production).toHaveLength(0);
    });
    it("notification failure does not reset committed run on retry", async () => {
      synthetic.notify.mockRejectedValueOnce(
        new Error("synthetic notification failure"),
      );
      expect((await start()).statusCode).toBe(500);
      const before = await snapshot();
      expect(before.production).toHaveLength(1);
      expect(before.order!.status).toBe("in_production");
      expect((await start()).statusCode).toBe(200);
      expect(await snapshot()).toEqual(before);
      expect(synthetic.notify).toHaveBeenCalledTimes(1);
    });
    it("direct service also rejects fractional/nonfinite progress before persistence", async () => {
      const id = (await start()).json().data.id;
      const before = await snapshot();
      for (const value of [12.5, NaN, Infinity, -1, 101])
        await expect(
          productionService.updateProgress(id, value),
        ).rejects.toMatchObject({ statusCode: 400 });
      expect(await snapshot()).toEqual(before);
    });

    it.each([false, true])(
      "locked mutation rejects former vendor after PO reassignment, existingRun=%s",
      async (existingRun) => {
        if (existingRun) await start();
        const replacement = await prisma.user.create({
          data: {
            email: "replacement-production@test.invalid",
            passwordHash: "unusable",
            role: "VENDOR",
            vendor: {
              create: {
                companyName: "Synthetic replacement",
                address: "Test",
                city: "Test",
                country: "EG",
              },
            },
          },
          include: { vendor: true },
        });
        const original =
          productionService.startProduction.bind(productionService);
        let interleaved = false;
        vi.spyOn(productionService, "startProduction").mockImplementationOnce(
          async (id, actor) => {
            // Controller ownership has already passed, but its observation is stale.
            await prisma.purchaseOrder.update({
              where: { id: poId },
              data: { vendorId: replacement.vendor!.id },
            });
            interleaved = true;
            return original(id, actor);
          },
        );
        const before = await snapshot();
        const notifications = synthetic.notify.mock.calls.length;
        try {
          const res = await start();
          expect(interleaved).toBe(true);
          expect(res.statusCode, res.body).toBe(403);
          expect(await snapshot()).toEqual(before);
          expect(synthetic.notify.mock.calls.length).toBe(notifications);
        } finally {
          await prisma.purchaseOrder.update({
            where: { id: poId },
            data: { vendorId },
          });
          await prisma.production.updateMany({
            where: { poId },
            data: { vendorId },
          });
          await prisma.user.delete({ where: { id: replacement.id } });
        }
      },
    );
    it("ADMIN can start another vendor PO with existing profile-resolution contract", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/production/start/${poId}?vendorId=${vendorId}`,
        headers: {
          authorization:
            "Bearer " +
            jwtService.generateAccessToken(
              "synthetic-admin",
              "admin@test.invalid",
              "ADMIN",
            ),
        },
      });
      expect(res.statusCode, res.body).toBe(200);
    });

    it("existing run assigned to a different vendor fails closed without rewriting ownership", async () => {
      const foreign = await prisma.user.create({
        data: {
          email: "foreign-run@test.invalid",
          passwordHash: "unusable",
          role: "VENDOR",
          vendor: {
            create: {
              companyName: "Synthetic foreign",
              address: "Test",
              city: "Test",
              country: "EG",
            },
          },
        },
        include: { vendor: true },
      });
      try {
        await prisma.production.create({
          data: { poId, vendorId: foreign.vendor!.id, status: "in_progress" },
        });
        const before = await snapshot();
        const r = await start();
        expect(r.statusCode, r.body).toBe(409);
        expect(await snapshot()).toEqual(before);
        expect(synthetic.notify).not.toHaveBeenCalled();
      } finally {
        await prisma.production.deleteMany({ where: { poId } });
        await prisma.user.delete({ where: { id: foreign.id } });
      }
    });
  },
);
