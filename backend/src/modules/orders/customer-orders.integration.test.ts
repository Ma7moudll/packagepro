import { beforeAll, afterAll, it, expect, describe } from "vitest";
import Fastify from "fastify";
import { prisma } from "../../lib/prisma";
import { orderRoutes } from "./order.routes";
import { jwtService } from "../auth/services/jwt.service";
import { httpErrorHandler } from "../../utils/http-error-handler";
import { orderService } from "./order.service";
describe.skipIf(process.env.PACKAGEPRO_CUSTOMER_ORDERS_ISOLATED_DB !== "yes")(
  "isolated customer order query contract",
  () => {
    const app = Fastify();
    let userId: string, foreignId: string, customerId: string, headers: any;
    let validated = false;
    const ids: string[] = [];
    beforeAll(async () => {
      const u = new URL(process.env.DATABASE_URL || "");
      if (
        !["localhost", "127.0.0.1"].includes(u.hostname) ||
        !/^\/packagepro_e2e_customerorders_[a-z0-9]+$/.test(u.pathname)
      )
        throw Error("Isolated customer orders database only");
      if ((await prisma.user.count()) || (await prisma.order.count()))
        throw Error("Empty business database required");
      validated = true;
      app.setErrorHandler(httpErrorHandler);
      await app.register(orderRoutes, { prefix: "/api" });
      await app.ready();
      const user = await prisma.user.create({
        data: {
          email: "customer-list@test.invalid",
          passwordHash: "unusable",
          role: "CUSTOMER",
          customer: { create: {} },
        },
        include: { customer: true },
      });
      userId = user.id;
      customerId = user.customer!.id;
      headers = {
        authorization:
          "Bearer " +
          jwtService.generateAccessToken(user.id, user.email, "CUSTOMER"),
      };
      const other = await prisma.user.create({
        data: {
          email: "foreign-list@test.invalid",
          passwordHash: "unusable",
          role: "CUSTOMER",
          customer: { create: {} },
        },
        include: { customer: true },
      });
      foreignId = other.id;
      for (const [i, status] of [
        "pending_review",
        "in_production",
        "pending_review",
        "completed",
      ].entries())
        ids.push(
          (
            await prisma.order.create({
              data: {
                orderNumber: "QUERY-" + i,
                customerId,
                status: status as any,
                subtotal: 20,
                total: 20,
                tax: 0,
                shippingCost: 0,
                shippingName: "Synthetic",
                shippingPhone: "test",
                shippingAddress: {},
                createdAt: new Date("2026-01-01T00:00:00Z"),
              },
            })
          ).id,
        );
      await prisma.order.create({
        data: {
          orderNumber: "FOREIGN-QUERY",
          customerId: other.customer!.id,
          status: "pending_review",
          subtotal: 20,
          total: 20,
          tax: 0,
          shippingCost: 0,
          shippingName: "Synthetic",
          shippingPhone: "test",
          shippingAddress: {},
        },
      });
    });
    afterAll(async () => {
      if (validated && customerId) {
        await prisma.order.deleteMany({
          where: { customer: { userId: { in: [userId, foreignId] } } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: [userId, foreignId] } },
        });
      }
      await app.close();
      await prisma.$disconnect();
    });
    const request = (query = "") =>
      app.inject({ method: "GET", url: "/api/orders" + query, headers });
    it("default list is owner scoped and has finite pagination", async () => {
      const r = await request();
      expect(r.statusCode, r.body).toBe(200);
      expect(r.json().pagination).toEqual({
        page: 1,
        limit: 20,
        total: 4,
        totalPages: 1,
      });
      expect(r.json().data).toHaveLength(4);
      expect(r.body).not.toContain("FOREIGN-QUERY");
    });
    it("status filter applies to rows and total for the owner only", async () => {
      const r = await request("?status=pending_review&limit=1");
      expect(r.statusCode, r.body).toBe(200);
      expect(r.json().pagination).toEqual({
        page: 1,
        limit: 1,
        total: 2,
        totalPages: 2,
      });
      expect(r.json().data).toHaveLength(1);
      expect(r.json().data[0].status).toBe("pending_review");
    });
    it("tie-safe pagination has no overlapping or missing rows", async () => {
      const seen: string[] = [];
      for (let page = 1; page <= 4; page++) {
        const r = await request(`?page=${page}&limit=1`);
        expect(r.statusCode, r.body).toBe(200);
        seen.push(r.json().data[0].id);
      }
      expect(new Set(seen).size).toBe(4);
      expect(seen).toEqual([...ids].sort().reverse());
      expect([...seen].sort()).toEqual([...ids].sort());
      const r = await request("?page=5&limit=1");
      expect(r.statusCode).toBe(200);
      expect(r.json().data).toEqual([]);
      expect(r.json().pagination.total).toBe(4);
    });
    it.each([
      "page=abc",
      "limit=NaN",
      "page=0",
      "page=-1",
      "page=1.5",
      "page=1junk",
      "limit=0",
      "limit=101",
      "limit=1e2",
      "page=9007199254740992",
      "page=9007199254740991&limit=100",
      "status=not_real",
      "page=1&page=2",
    ])("invalid query %s gives actionable400 not ORM500", async (query) => {
      const r = await request("?" + query);
      expect(r.statusCode, r.body).toBe(400);
      expect(r.json().error).toBe("VALIDATION_ERROR");
      expect(r.body).not.toContain("prisma");
    });
    it("unauthenticated list is refused", async () => {
      expect(
        (await app.inject({ method: "GET", url: "/api/orders" })).statusCode,
      ).toBe(401);
    });
    it("direct service refuses unsafe pagination before ORM execution", async () => {
      for (const [page, limit] of [
        [NaN, 20],
        [1, Infinity],
        [1, 0],
        [0, 20],
        [1, 101],
        [1.5, 20],
        [Number.MAX_SAFE_INTEGER, 100],
      ])
        await expect(
          orderService.getCustomerOrders(customerId, page, limit),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it("maximum supported offset gives a finite empty page, over-budget offset is400", async () => {
      const r = await request("?page=2147483648&limit=1");
      expect(r.statusCode, r.body).toBe(200);
      expect(r.json().data).toEqual([]);
      expect(r.json().pagination).toMatchObject({
        page: 2147483648,
        limit: 1,
        total: 4,
      });
      expect((await request("?page=2147483649&limit=1")).statusCode).toBe(400);
    });
    it("empty status is invalid, absent status remains all", async () => {
      expect((await request("?status=")).statusCode).toBe(400);
      const r = await request("?status=cancelled");
      expect(r.statusCode).toBe(200);
      expect(r.json().data).toEqual([]);
      expect(r.json().pagination.total).toBe(0);
    });

    it("valid and invalid reads leave stored orders unchanged", async () => {
      const before = await prisma.order.findMany({ orderBy: { id: "asc" } });
      await request("?limit=100");
      await request("?status=pending_review");
      await request("?page=bad");
      expect(await prisma.order.findMany({ orderBy: { id: "asc" } })).toEqual(
        before,
      );
    });
    it("direct service rejects unrecognized status as400", async () => {
      await expect(
        orderService.getCustomerOrders(customerId, 1, 20, "not_real" as any),
      ).rejects.toMatchObject({ statusCode: 400 });
    });
  },
);
