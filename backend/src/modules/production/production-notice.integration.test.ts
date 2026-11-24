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
import { prisma } from "../../lib/prisma";
import { jwtService } from "../auth/services/jwt.service";
import { notificationService } from "../notifications/notifications.service";
import { notificationHub } from "../notifications/notification-hub";
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
      await prisma.notification.deleteMany({ where: { userId } });
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

    it("run and customer notice commit once under concurrent starts", async () => {
      const publish = vi.spyOn(notificationHub, "publish");
      const r = await Promise.all(Array.from({ length: 8 }, () => start()));
      expect(r.every((r) => r.statusCode === 200)).toBe(true);
      const notices = await prisma.notification.findMany({
        where: { userId, type: "production_started" },
      });
      expect(notices).toHaveLength(1);
      expect(notices[0].metadata).toMatchObject({
        entityId: orderId,
        entityType: "order",
      });
      expect(publish).toHaveBeenCalledTimes(1);
      expect((await snapshot()).production).toHaveLength(1);
    });
    it("notification insertion failure rolls back start and allows safe retry", async () => {
      const publish = vi.spyOn(notificationHub, "publish");
      const before = await snapshot();
      vi.spyOn(notificationService, "createIfUnseenInTx").mockRejectedValueOnce(
        new Error("synthetic persistence failure"),
      );
      expect((await start()).statusCode).toBe(500);
      expect(await snapshot()).toEqual(before);
      expect(await prisma.notification.count({ where: { userId } })).toBe(0);
      expect(publish).not.toHaveBeenCalled();
      expect((await start()).statusCode).toBe(200);
      expect(await prisma.notification.count({ where: { userId } })).toBe(1);
    });
    it("realtime failure cannot erase persisted notice or make successful start fail", async () => {
      vi.spyOn(notificationHub, "publish").mockImplementation(() => {
        throw new Error("synthetic realtime failure");
      });
      expect((await start()).statusCode).toBe(200);
      const before = await snapshot();
      expect(await prisma.notification.count({ where: { userId } })).toBe(1);
      expect((await start()).statusCode).toBe(200);
      expect(await snapshot()).toEqual(before);
      expect(await prisma.notification.count({ where: { userId } })).toBe(1);
    });
    it("actual database notice failure rolls back order and run without realtime", async () => {
      const publish = vi.spyOn(notificationHub, "publish");
      const before = await snapshot();
      await prisma.$executeRawUnsafe(
        `CREATE FUNCTION notice_reject_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic notice DB failure'; END $$`,
      );
      await prisma.$executeRawUnsafe(
        `CREATE TRIGGER notice_reject_insert BEFORE INSERT ON notifications FOR EACH ROW EXECUTE FUNCTION notice_reject_insert()`,
      );
      try {
        expect((await start()).statusCode).toBe(500);
        expect(await snapshot()).toEqual(before);
        expect(await prisma.notification.count({ where: { userId } })).toBe(0);
        expect(publish).not.toHaveBeenCalled();
      } finally {
        await prisma.$executeRawUnsafe(
          "DROP TRIGGER notice_reject_insert ON notifications",
        );
        await prisma.$executeRawUnsafe("DROP FUNCTION notice_reject_insert()");
      }
      expect((await start()).statusCode).toBe(200);
      expect(await prisma.notification.count({ where: { userId } })).toBe(1);
    });
    it("existing order-level notice remains deduplicated and never republished", async () => {
      const existing = await prisma.notification.create({
        data: {
          userId,
          type: "production_started",
          title: "Existing synthetic notice",
          message: "Synthetic",
          metadata: { entityType: "order", entityId: orderId },
        },
      });
      const publish = vi.spyOn(notificationHub, "publish");
      expect((await start()).statusCode).toBe(200);
      expect(await prisma.notification.findMany({ where: { userId } })).toEqual(
        [existing],
      );
      expect(publish).not.toHaveBeenCalled();
    });
  },
);
