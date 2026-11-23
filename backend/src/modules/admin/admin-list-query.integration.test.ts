import { beforeAll, afterAll, it, expect, describe } from "vitest";
import Fastify from "fastify";
import { prisma } from "../../lib/prisma";
import { parseAdminListQuery } from "./admin-list-query";
import { adminRoutes } from "./admin.routes";
import { jwtService } from "../auth/services/jwt.service";
import { httpErrorHandler } from "../../utils/http-error-handler";
describe.skipIf(process.env.PACKAGEPRO_ADMIN_QUERY_ISOLATED_DB !== "yes")(
  "isolated admin list query contract",
  () => {
    const app = Fastify();
    let validated = false;
    const users: string[] = [],
      customerIds: string[] = [],
      vendorIds: string[] = [],
      orderIds: string[] = [],
      sampleIds: string[] = [];
    const headers = {
      authorization:
        "Bearer " +
        jwtService.generateAccessToken(
          "synthetic-admin",
          "admin@test.invalid",
          "ADMIN",
        ),
    };
    const request = (kind: string, query = "") =>
      app.inject({ method: "GET", url: "/api/admin/" + kind + query, headers });
    beforeAll(async () => {
      const u = new URL(process.env.DATABASE_URL || "");
      if (
        !["localhost", "127.0.0.1"].includes(u.hostname) ||
        !/^\/packagepro_e2e_adminquery_[a-z0-9]+$/.test(u.pathname)
      )
        throw Error("Isolated admin query database only");
      if (
        (await prisma.user.count()) ||
        (await prisma.order.count()) ||
        (await prisma.sample.count())
      )
        throw Error("Empty business database required");
      validated = true;
      app.setErrorHandler(httpErrorHandler);
      await app.register(adminRoutes, { prefix: "/api" });
      await app.ready();
      for (let i = 0; i < 3; i++) {
        const user = await prisma.user.create({
          data: {
            email: `query-admin-${i}@test.invalid`,
            passwordHash: "unusable",
            role: "VENDOR",
            createdAt: new Date(1000),
            customer: { create: { createdAt: new Date(1000) } },
            vendor: {
              create: {
                companyName: "Synthetic " + i,
                address: "Test",
                city: "Test",
                country: "EG",
                isActive: i !== 1,
                createdAt: new Date(1000),
              },
            },
          },
          include: { customer: true, vendor: true },
        });
        users.push(user.id);
        customerIds.push(user.customer!.id);
        vendorIds.push(user.vendor!.id);
        const o = await prisma.order.create({
          data: {
            orderNumber: "ADMIN-QUERY-" + i,
            customerId: user.customer!.id,
            status: i === 1 ? "completed" : "pending_review",
            currency: "EGP",
            subtotal: 20,
            total: 20,
            tax: 0,
            shippingCost: 0,
            shippingName: "Synthetic",
            shippingPhone: "test",
            shippingAddress: {},
            createdAt: new Date(1000),
          },
        });
        orderIds.push(o.id);
        const po = await prisma.purchaseOrder.create({
          data: {
            orderId: o.id,
            vendorId: user.vendor!.id,
            poNumber: "ADMIN-QUERY-PO-" + i,
            vendorCost: 10,
          },
        });
        const p = await prisma.production.create({
          data: { poId: po.id, vendorId: user.vendor!.id },
        });
        sampleIds.push(
          (
            await prisma.sample.create({
              data: {
                productionId: p.id,
                status: i === 1 ? "approved" : "pending",
                photoUrls: [],
                updatedAt: new Date(1000),
              },
            })
          ).id,
        );
      }
    });
    afterAll(async () => {
      if (validated) {
        await prisma.sample.deleteMany({ where: { id: { in: sampleIds } } });
        await prisma.production.deleteMany({
          where: { purchaseOrder: { orderId: { in: orderIds } } },
        });
        await prisma.purchaseOrder.deleteMany({
          where: { orderId: { in: orderIds } },
        });
        await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
        await prisma.user.deleteMany({ where: { id: { in: users } } });
      }
      await app.close();
      await prisma.$disconnect();
    });
    it.each(["orders", "vendors", "customers", "samples"])(
      "%s default list is bounded and ADMIN only",
      async (kind) => {
        const r = await request(kind);
        expect(r.statusCode, r.body).toBe(200);
        expect(r.json().pagination).toEqual({
          page: 1,
          limit: 20,
          total: 3,
          totalPages: 1,
        });
        expect(
          (await app.inject({ method: "GET", url: "/api/admin/" + kind }))
            .statusCode,
        ).toBe(401);
        for (const role of ["CUSTOMER", "VENDOR"] as const)
          expect(
            (
              await app.inject({
                method: "GET",
                url: "/api/admin/" + kind,
                headers: {
                  authorization:
                    "Bearer " +
                    jwtService.generateAccessToken(
                      users[0],
                      "query-admin-0@test.invalid",
                      role,
                    ),
                },
              })
            ).statusCode,
          ).toBe(403);
      },
    );
    for (const kind of ["orders", "vendors", "customers", "samples"])
      it.each([
        "page=bad",
        "limit=NaN",
        "page=0",
        "limit=0",
        "limit=101",
        "page=1.5",
        "page=1junk",
        "limit=1e2",
        "page=2147483649&limit=1",
        "page=9007199254740992",
        "page=1&page=2",
      ])(kind + " invalid %s returns400", async (query) => {
        const r = await request(kind, "?" + query);
        expect(r.statusCode, r.body).toBe(400);
        expect(r.json().error).toBe("VALIDATION_ERROR");
      });
    it.each(["orders", "samples"])(
      "%s status validates and filters rows/count",
      async (kind) => {
        const status = kind === "orders" ? "pending_review" : "pending";
        const r = await request(kind, "?status=" + status + "&limit=1");
        expect(r.statusCode, r.body).toBe(200);
        expect(r.json().pagination.total).toBe(2);
        expect(r.json().data[0].status).toBe(status);
        for (const query of [
          "status=bad",
          "status=",
          "status=pending&status=approved",
        ])
          expect((await request(kind, "?" + query)).statusCode).toBe(400);
      },
    );
    it("vendor active exact boolean string filters rows/count", async () => {
      const r = await request("vendors", "?active=false");
      expect(r.statusCode).toBe(200);
      expect(r.json().pagination.total).toBe(1);
      expect(r.json().data[0].isActive).toBe(false);
      for (const value of ["yes", "", "false&active=true"])
        expect((await request("vendors", "?active=" + value)).statusCode).toBe(
          400,
        );
    });
    it.each(["orders", "customers"])(
      "%s search trims and rejects repeated/oversized values",
      async (kind) => {
        const r = await request(kind, "?search=%20query-admin-1%20");
        expect(r.statusCode, r.body).toBe(200);
        expect(r.json().pagination.total).toBe(1);
        expect(r.json().data).toHaveLength(1);
        if (kind === "orders")
          expect(r.json().data[0].orderNumber).toBe("ADMIN-QUERY-1");
        else expect(r.json().data[0].email).toBe("query-admin-1@test.invalid");
        const whitespace = await request(kind, "?search=%20%20%20");
        expect(whitespace.statusCode, whitespace.body).toBe(200);
        expect(whitespace.json().pagination.total).toBe(3);
        expect(whitespace.json().data).toHaveLength(3);
        // Controllers historically trim too. Bind the new parser's own contract
        // directly instead of claiming an HTTP case proves this exact line.
        expect(
          parseAdminListQuery(
            { search: " query-admin-1 " },
            kind as "orders" | "customers",
          ).search,
        ).toBe("query-admin-1");
        expect(
          parseAdminListQuery({ search: "   " }, kind as "orders" | "customers")
            .search,
        ).toBeUndefined();
        expect((await request(kind, "?search=")).json().pagination.total).toBe(
          3,
        );
        expect((await request(kind, "?search=a&search=b")).statusCode).toBe(
          400,
        );
        expect(
          (await request(kind, "?search=" + "x".repeat(201))).statusCode,
        ).toBe(400);
      },
    );
    it.each(["orders", "vendors", "customers", "samples"])(
      "%s deterministic paging on tied timestamps",
      async (kind) => {
        const ids =
          kind === "orders"
            ? orderIds
            : kind === "vendors"
              ? vendorIds
              : kind === "customers"
                ? customerIds
                : sampleIds;
        const seen: string[] = [];
        for (let page = 1; page <= 3; page++) {
          const r = await request(kind, `?page=${page}&limit=1`);
          expect(r.statusCode, r.body).toBe(200);
          seen.push(r.json().data[0].id);
        }
        const expected =
          kind === "samples"
            ? [sampleIds[1], ...[sampleIds[0], sampleIds[2]].sort().reverse()]
            : [...ids].sort().reverse();
        expect(seen).toEqual(expected);
        expect((await request(kind, "?page=4&limit=1")).json().data).toEqual(
          [],
        );
      },
    );
    it("list reads preserve order and monetary report projections", async () => {
      const before = await prisma.order.findMany({ orderBy: { id: "asc" } });
      const overview = (
        await app.inject({ method: "GET", url: "/api/admin/overview", headers })
      ).body;
      for (const kind of ["orders", "vendors", "customers", "samples"])
        await request(kind, "?limit=100");
      expect(await prisma.order.findMany({ orderBy: { id: "asc" } })).toEqual(
        before,
      );
      expect(
        (
          await app.inject({
            method: "GET",
            url: "/api/admin/overview",
            headers,
          })
        ).body,
      ).toBe(overview);
    });

    it("all list reads preserve full directory and workflow rows", async () => {
      const snapshot = async () => ({
        users: await prisma.user.findMany({ orderBy: { id: "asc" } }),
        customers: await prisma.customer.findMany({ orderBy: { id: "asc" } }),
        vendors: await prisma.vendor.findMany({ orderBy: { id: "asc" } }),
        orders: await prisma.order.findMany({ orderBy: { id: "asc" } }),
        pos: await prisma.purchaseOrder.findMany({ orderBy: { id: "asc" } }),
        productions: await prisma.production.findMany({
          orderBy: { id: "asc" },
        }),
        samples: await prisma.sample.findMany({ orderBy: { id: "asc" } }),
      });
      const before = await snapshot();
      for (const kind of ["orders", "vendors", "customers", "samples"]) {
        await request(kind);
        await request(kind, "?page=bad");
      }
      expect(await snapshot()).toEqual(before);
    });
    it.each(["orders", "vendors", "customers", "samples"])(
      "%s max offset remains supported empty page",
      async (kind) => {
        const res = await request(kind, "?page=2147483648&limit=1");
        expect(res.statusCode, res.body).toBe(200);
        expect(res.json().data).toEqual([]);
        expect(res.json().pagination).toMatchObject({
          page: 2147483648,
          limit: 1,
          total: 3,
        });
      },
    );
  },
);
