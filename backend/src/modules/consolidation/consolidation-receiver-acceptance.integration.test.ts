import { beforeAll, afterAll, beforeEach, describe, it, expect } from "vitest";
import Fastify from "fastify";
import { httpErrorHandler } from "../../utils/http-error-handler";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { prisma } from "../../lib/prisma";
import { jwtService } from "../auth/services/jwt.service";
import { consolidationRoutes } from "./consolidation.routes";
describe.skipIf(process.env.PACKAGEPRO_CONSOLIDATION_DB !== "yes")(
  "consolidation HTTP candidate",
  () => {
    const app = Fastify();
    let actor: any,
      stranger: any,
      order: any,
      po: any,
      item: any,
      hub: any,
      allocations: any[];
    let validated = false;
    beforeAll(async () => {
      process.env.CONSOLIDATION_RECEIPTS_ENABLED = "true";
      app.setErrorHandler(httpErrorHandler);
      await app.register(consolidationRoutes, { prefix: "/api" });
      await app.ready();
      const u = new URL(process.env.DATABASE_URL || "");
      if (
        !["localhost", "127.0.0.1"].includes(u.hostname) ||
        !/^\/packagepro_e2e_consolidation_[a-z0-9]+$/.test(u.pathname) ||
        process.env.NODE_ENV !== "test" ||
        process.env.EMAIL_PROVIDER !== "test"
      )
        throw Error("Fresh disposable local DB required");
      if ((await prisma.user.count()) || (await prisma.order.count()))
        throw Error("Empty business DB required");
      validated = true;
    });
    beforeEach(async () => {
      // Truncate only the validated disposable fixture, not a service operation.
      process.env.CONSOLIDATION_RECEIPTS_ENABLED = "true";
      await prisma.$executeRawUnsafe(
        "TRUNCATE consolidation_confirmations, consolidation_receipt_events",
      );
      await prisma.consolidationManifest.deleteMany();
      await prisma.consolidationCapability.deleteMany();
      await prisma.consolidationHub.deleteMany();
      await prisma.orderItem.updateMany({ data: { designId: null } });
      await prisma.design.deleteMany();
      await prisma.purchaseOrder.deleteMany();
      await prisma.orderItem.deleteMany();
      await prisma.order.deleteMany();
      await prisma.vendor.deleteMany();
      await prisma.customer.deleteMany();
      await prisma.user.deleteMany();
      actor = await prisma.user.create({
        data: {
          email: "receiver@test.invalid",
          passwordHash: "synthetic",
          role: "CUSTOMER",
          customer: { create: {} },
        },
        include: { customer: true },
      });
      stranger = await prisma.user.create({
        data: {
          email: "unassigned-admin@test.invalid",
          passwordHash: "synthetic",
          role: "ADMIN",
        },
      });
      const vendor = await prisma.user.create({
        data: {
          email: "factory@test.invalid",
          passwordHash: "synthetic",
          role: "VENDOR",
          vendor: {
            create: {
              companyName: "Synthetic factory",
              address: "Synthetic",
              city: "Test",
              country: "EG",
            },
          },
        },
        include: { vendor: true },
      });
      order = await prisma.order.create({
        data: {
          customerId: actor.customer.id,
          orderNumber: "QA-CONSOLIDATION",
          status: "in_production",
          subtotal: 100,
          tax: 14,
          shippingCost: 0,
          total: 114,
          currency: "EGP",
          shippingAddress: { synthetic: true },
          shippingName: "Synthetic",
          shippingPhone: "synthetic",
        },
      });
      item = await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productType: "box",
          quantity: 100,
          dimensions: { length: 1 },
          unitPrice: 1,
          totalPrice: 100,
        },
      });
      po = await prisma.purchaseOrder.create({
        data: {
          orderId: order.id,
          vendorId: vendor.vendor!.id,
          poNumber: "QA-PO",
          status: "confirmed",
          productType: "box",
          vendorCost: 50,
        },
      });
      hub = await prisma.consolidationHub.create({
        data: { id: "synthetic-hub", enabled: true },
      });
      await prisma.consolidationCapability.create({
        data: {
          userId: actor.id,
          hubId: hub.id,
          canPlan: true,
          canReceive: true,
        },
      });
      allocations = [
        {
          id: "part-a",
          orderItemId: item.id,
          poId: po.id,
          unit: "piece",
          required: 100,
        },
      ];
    });
    afterAll(async () => {
      delete process.env.CONSOLIDATION_RECEIPTS_ENABLED;
      await app.close();
      if (validated) await prisma.$disconnect();
    });

    const headers = (user = actor) => ({
      authorization:
        "Bearer " +
        jwtService.generateAccessToken(user.id, user.email, user.role),
    });
    const base = () => "/api/consolidation/orders/" + order.id;
    const makePlan = () =>
      app.inject({
        method: "POST",
        url: base() + "/manifest",
        headers: headers(),
        payload: { hubId: hub.id, expectedRevision: 0, allocations },
      });
    const counts = { received: 100, accepted: 100, rejected: 0 };
    const receipt = () => ({
      manifestRevision: 1,
      receiptRevision: 0,
      allocationId: "part-a",
      eventKey: "http-synthetic-event-001",
      counts,
      reason: "Synthetic receiving review",
    });

    it("synthetic browser writes receipts and explicit confirmation through actual backend", async () => {
      allocations = [
        { ...allocations[0], required: 60 },
        { ...allocations[0], id: "part-b", required: 40 },
      ];
      expect((await makePlan()).statusCode).toBe(200);
      const server = spawn(process.execPath, ["dist/index.js"], {
        env: {
          ...process.env,
          PORT: "3000",
          FRONTEND_URL: "http://localhost:3017",
          HOST: "127.0.0.1",
          REDIS_ENABLED: "false",
          REDIS_URL: "",
          CONSOLIDATION_RECEIPTS_ENABLED: "true",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      const frontend = spawn(
        process.execPath,
        ["node_modules/next/dist/bin/next", process.env.RECEIVER_PRODUCTION_ACCEPTANCE==="yes"?"start":"dev", "-p", "3017"],
        {
          cwd: process.cwd() + "/../frontend",
          env: {
            ...process.env,
            NEXT_PUBLIC_API_URL: "http://localhost:3000",
            NEXT_PUBLIC_CONSOLIDATION_RECEIPTS_ENABLED: "true",
            NODE_OPTIONS: "--max-old-space-size=1450",
          },
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
      let logs = "";
      for (const p of [server, frontend]) {
        p.stdout.on("data", (b) => (logs += b));
        p.stderr.on("data", (b) => (logs += b));
      }
      const { chromium } = createRequire(
        process.cwd() + "/../frontend/package.json",
      )("@playwright/test");
      let browser: any;
      try {
        for (const port of [3000, 3017]) {
          let ready = false;
          for (let n = 0; n < 300; n++) {
            try {
              if (
                (
                  await fetch(
                    "http://localhost:" +
                      port +
                      (port === 3000 ? "/health" : "/receiving"),
                  )
                ).ok
              ) {
                ready = true;
                break;
              }
            } catch {}
            await new Promise((r) => setTimeout(r, 100));
          }
          expect(ready, logs).toBe(true);
        }
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({
          viewport: { width: 390, height: 844 },
        });
        const token = jwtService.generateAccessToken(
          actor.id,
          actor.email,
          actor.role,
        );
        await page.addInitScript(
          ({ token, id, email }: any) => {
            localStorage.setItem("accessToken", token);
            localStorage.setItem("language", "en");
            localStorage.setItem(
              "user",
              JSON.stringify({
                id,
                email,
                name: "Synthetic receiver",
                role: "TRADER",
              }),
            );
          },
          { token, id: actor.id, email: actor.email },
        );
        await page.route("**/api/cart", (r: any) =>
          r.fulfill({
            json: { success: true, data: { items: [], summary: { total: 0 } } },
          }),
        );
        await page.route("**/api/analytics/**", (r: any) =>
          r.fulfill({ contentType: "text/event-stream", body: "" }),
        );
        await page.goto("http://localhost:3017/receiving");
        await page.getByLabel("Order ID", { exact: true }).fill(order.id);
        await page.getByLabel("Hub ID", { exact: true }).fill(hub.id);
        await page
          .getByRole("button", { name: "Open receiver workspace" })
          .click();
        await page
          .getByRole("button", { name: "Refresh current facts" })
          .click();
        await page
          .getByText("I reconciled the refreshed ledger", { exact: false })
          .click();
        await page
          .getByLabel("Allocation", { exact: true })
          .selectOption("part-a");

        const record = async (
          part: string,
          total: string,
          accepted: string,
          rejected: string,
        ) => {
          await page
            .getByLabel("Allocation", { exact: true })
            .selectOption(part);
          await page.getByLabel("Received", { exact: true }).fill(total);
          await page.getByLabel("Accepted", { exact: true }).fill(accepted);
          await page.getByLabel("Rejected", { exact: true }).fill(rejected);
          await page
            .getByLabel("Review / correction reason", { exact: true })
            .fill("Synthetic reviewed totals");
          await page
            .getByRole("button", { name: "Save receipt review" })
            .click();
          await page
            .getByText("Server acknowledged this request.", { exact: false })
            .waitFor();
        };
        const refresh = async () => {
          await page
            .getByRole("button", { name: "Refresh current facts" })
            .click();
          await page
            .getByText("I reconciled the refreshed ledger", { exact: false })
            .click();
        };
        await record("part-a", "60", "59", "1");
        await refresh();
        expect(await page.getByRole("checkbox").last().isEnabled()).toBe(false);
        expect(
          (
            await app.inject({
              method: "POST",
              url: base() + "/confirm",
              headers: headers(),
              payload: { manifestRevision: 1, receiptRevision: 1 },
            })
          ).statusCode,
        ).toBe(409);
        await record("part-a", "60", "60", "0");
        await refresh();
        expect(await page.getByRole("checkbox").last().isEnabled()).toBe(false);
        // Concurrent valid receipt advances server while browser still has revision2.
        expect(
          (
            await app.inject({
              method: "POST",
              url: base() + "/receipts",
              headers: headers(),
              payload: {
                ...receipt(),
                receiptRevision: 2,
                allocationId: "part-b",
                eventKey: "synthetic-concurrent-part-b",
                counts: { received: 40, accepted: 40, rejected: 0 },
              },
            })
          ).statusCode,
        ).toBe(200);
        await page
          .getByLabel("Allocation", { exact: true })
          .selectOption("part-b");
        await page.getByLabel("Received", { exact: true }).fill("40");
        await page.getByLabel("Accepted", { exact: true }).fill("40");
        await page.getByLabel("Rejected", { exact: true }).fill("0");
        await page.getByRole("button", { name: "Save receipt review" }).click();
        await page
          .getByText("Conflict: nothing is assumed saved.", { exact: false })
          .waitFor();
        expect(await prisma.consolidationReceiptEvent.count()).toBe(3);
        await page
          .getByRole("button", { name: "Refresh current facts" })
          .click();
        page.once("dialog", (d: any) => d.accept());
        await page
          .getByRole("button", { name: "Clear retry after reconciliation" })
          .click();
        await page
          .getByText("I reconciled the refreshed ledger", { exact: false })
          .click();
        await page.getByRole("checkbox").last().check();
        await page
          .getByRole("button", { name: "Confirm reviewed parts" })
          .click();
        await page
          .getByText("Server acknowledged this request.", { exact: false })
          .waitFor();
        expect(await prisma.consolidationConfirmation.count()).toBe(1);
        expect(await prisma.shipment.count()).toBe(0);
        expect(await prisma.payment.count()).toBe(0);
        expect(
          (await prisma.order.findUnique({ where: { id: order.id } }))!.status,
        ).toBe("in_production");
        await page.screenshot({
          path: "/downloads/receiver-bound-real-backend.png",
          fullPage: true,
        });
      } finally {
        if (browser) await browser.close();
        for (const p of [frontend, server]) {
          p.kill("SIGTERM");
          await new Promise<void>((resolve) => {
            if (p.exitCode !== null) resolve();
            else p.once("exit", () => resolve());
          });
        }
        writeFileSync("/tmp/receiver-bound-real-backend.log", logs);
      }
    }, 110000);
  },
);
