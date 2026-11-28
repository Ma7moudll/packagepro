import { beforeAll, afterAll, it, expect, describe } from "vitest";
import Fastify from "fastify";
import { prisma } from "../../lib/prisma";
import { jwtService } from "../auth/services/jwt.service";
import { sampleRoutes } from "./sample.routes";
import { sampleService } from "./sample.service";
describe.skipIf(process.env.PACKAGEPRO_SAMPLE_ACCESS_DB !== "yes")(
  "sample object read access",
  () => {
    const app = Fastify();
    let owner: any,
      vendor: any,
      stranger: any,
      otherVendor: any,
      sample: any,
      order: any,
      po: any,
      run: any;
    let validated = false;
    beforeAll(async () => {
      const u = new URL(process.env.DATABASE_URL || "");
      if (
        !["localhost", "127.0.0.1"].includes(u.hostname) ||
        !/^\/packagepro_e2e_sampleaccess_[a-z0-9]+$/.test(u.pathname) ||
        process.env.NODE_ENV !== "test" ||
        process.env.EMAIL_PROVIDER !== "test"
      )
        throw Error("Disposable local sample access DB required");
      if (
        (await prisma.user.count()) ||
        (await prisma.order.count()) ||
        (await prisma.sample.count())
      )
        throw Error("Empty business DB required");
      validated = true;
      app.setErrorHandler((e: any, _r, p) =>
        p.status(e.statusCode || 500).send({ error: e.message }),
      );
      await app.register(sampleRoutes, { prefix: "/api" });
      await app.ready();
      owner = await prisma.user.create({
        data: {
          email: "sample-owner@test.invalid",
          passwordHash: "unusable",
          role: "CUSTOMER",
          customer: { create: {} },
        },
        include: { customer: true },
      });
      stranger = await prisma.user.create({
        data: {
          email: "sample-stranger@test.invalid",
          passwordHash: "unusable",
          role: "CUSTOMER",
          customer: { create: {} },
        },
        include: { customer: true },
      });
      for (const [key, email] of [
        ["owner", "vendor-owner@test.invalid"],
        ["stranger", "vendor-stranger@test.invalid"],
      ]) {
        const v = await prisma.user.create({
          data: {
            email,
            passwordHash: "unusable",
            role: "VENDOR",
            vendor: {
              create: {
                companyName: "Synthetic sample vendor",
                address: "Test",
                city: "Test",
                country: "EG",
              },
            },
          },
          include: { vendor: true },
        });
        if (key === "owner") vendor = v;
        else otherVendor = v;
      }
      order = await prisma.order.create({
        data: {
          orderNumber: "SYNTHETIC-SAMPLE-ACCESS",
          customerId: owner.customer.id,
          status: "in_production",
          subtotal: 20,
          tax: 0,
          total: 20,
          shippingCost: 0,
          shippingAddress: { privateSyntheticMarker: "not-for-stranger" },
          shippingName: "Synthetic buyer",
          shippingPhone: "synthetic-only",
        },
      });
      po = await prisma.purchaseOrder.create({
        data: {
          orderId: order.id,
          vendorId: vendor.vendor.id,
          poNumber: "SYNTHETIC-SAMPLE-PO",
          vendorCost: 10,
          status: "confirmed",
        },
      });
      run = await prisma.production.create({
        data: {
          poId: po.id,
          vendorId: vendor.vendor.id,
          status: "sample_production",
        },
      });
      sample = await prisma.sample.create({
        data: {
          productionId: run.id,
          photoUrls: ["https://example.invalid/synthetic-private-sample.png"],
          notes: "Synthetic private notes",
        },
      });
    });
    const auth = (user: any) => ({
      authorization:
        "Bearer " +
        jwtService.generateAccessToken(user.id, user.email, user.role),
    });
    const get = (user?: any, id?: string) =>
      app.inject({
        method: "GET",
        url: "/api/samples/" + (id || sample.id),
        headers: user ? auth(user) : {},
      });
    it("buyer can read own sample", async () => {
      const r = await get(owner);
      expect(r.statusCode, r.body).toBe(200);
      expect(r.json().data.id).toBe(sample.id);
    });
    it("assigned vendor can read own sample", async () => {
      expect((await get(vendor)).statusCode).toBe(200);
    });
    it("ADMIN can inspect sample", async () => {
      expect(
        (await get({ id: "admin", email: "admin@test.invalid", role: "ADMIN" }))
          .statusCode,
      ).toBe(200);
    });
    it("unrelated customer sees same404 as absent sample, no private payload", async () => {
      const r = await get(stranger);
      expect(r.statusCode, r.body).toBe(404);
      expect(r.body).toBe((await get(stranger, "absent-synthetic")).body);
      expect(r.body).not.toContain("private");
      expect(r.body).not.toContain(sample.id);
    });
    it("unrelated vendor sees404 without artwork/order context", async () => {
      const r = await get(otherVendor);
      expect(r.statusCode, r.body).toBe(404);
      expect(r.body).not.toContain(order.id);
    });
    it("unauthenticated request denied", async () => {
      expect((await get()).statusCode).toBe(401);
    });
    it("direct service requires scoped actor and denies unsupported role", async () => {
      await expect(
        sampleService.getSample(sample.id, {
          userId: stranger.id,
          role: "CUSTOMER",
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
      await expect(
        sampleService.getSample(sample.id, {
          userId: owner.id,
          role: "UNSUPPORTED",
        }),
      ).rejects.toMatchObject({ statusCode: 404 });
    });
    it("mismatched PO/run vendor does not transfer read access to either vendor", async () => {
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { vendorId: otherVendor.vendor.id },
      });
      try {
        expect((await get(vendor)).statusCode).toBe(404);
        expect((await get(otherVendor)).statusCode).toBe(404);
        expect((await get(owner)).statusCode).toBe(200);
      } finally {
        await prisma.purchaseOrder.update({
          where: { id: po.id },
          data: { vendorId: vendor.vendor.id },
        });
      }
    });
    afterAll(async () => {
      if (validated) {
        await prisma.sample.deleteMany();
        await prisma.production.deleteMany();
        await prisma.purchaseOrder.deleteMany();
        await prisma.order.deleteMany();
        await prisma.user.deleteMany();
      }
      await app.close();
      await prisma.$disconnect();
    });
  },
);
