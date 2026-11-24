// Read-only audit harness for unchanged fa7e644 application code. Synthetic pricing,
// provider and email only; real HTTP routing/auth, PostgreSQL orders/cart/payment rows.
import {
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { corsOptions } from "../../utils/cors-options";
vi.mock("stripe", () => ({
  default: class {
    paymentIntents = {
      retrieve: () => {
        throw new Error("External Stripe retrieval forbidden");
      },
      create: () => {
        throw new Error("External Stripe creation forbidden");
      },
    };
  },
}));
vi.mock("../../integrations/payments/stripe.provider", () => ({
  StripePaymentProvider: class {
    constructor() {
      throw new Error("Stripe selection forbidden");
    }
  },
}));
const synthetic = vi.hoisted(() => ({ quote: vi.fn(), notify: vi.fn() }));
vi.mock("../../services/pricing-engine/pricing.service", () => ({
  pricingService: {
    calculatePrice: synthetic.quote,
    quoteCatalog: synthetic.quote,
  },
}));
vi.mock("../notifications/notifications.service", () => ({
  notificationService: { createIfUnseen: synthetic.notify },
}));
import { prisma } from "../../lib/prisma";
import * as registry from "../../integrations/payments/registry";
import { jwtService } from "../auth/services/jwt.service";
import { paymentRoutes } from "../payments/payment.routes";
import { PaymentStatusPreEffectError } from "../../integrations/payments/payment-provider";
import { checkoutRoutes } from "./checkout.routes";
import { checkoutService } from "./checkout.service";
import { orderRoutes } from "../orders/order.routes";
describe.skipIf(process.env.PACKAGEPRO_CHECKOUT_RECOVERY_ISOLATED_DB !== "yes")(
  "isolated checkout recovery gate",
  () => {
    const app = Fastify();
    let customerId: string, userId: string, cartId: string, headers: any;
    let seq = 0;
    const calls: any[] = [];
    const address = {
      name: "Synthetic checkout audit",
      phone: "test-only",
      street: "Test",
      city: "Cairo",
      postalCode: "00000",
      country: "EG",
    };
    const dims = { length: 10, width: 10, height: 10, unit: "mm" };
    async function line(quantity = 2) {
      return prisma.cartItem.create({
        data: {
          cartId,
          quantity,
          productType: "box",
          dimensions: dims,
          materialCode: "synthetic",
        },
      });
    }
    function durableResponse(body: any) {
      const { orderState, localPaymentState, ...data } = body.data;
      return { ...body, data };
    }
    async function state() {
      return {
        orders: await prisma.order.findMany({
          where: { customerId },
          include: { items: true, payment: true },
          orderBy: { createdAt: "asc" },
        }),
        cart: await prisma.cartItem.findMany({ where: { cartId } }),
        calls: structuredClone(calls),
      };
    }
    async function investigationSnapshot() {
      return {
        attempts: await prisma.checkoutAttempt.findMany({
          where: { customerId },
          orderBy: { id: "asc" },
        }),
        operations: await prisma.checkoutStatusOperation.findMany({
          where: { attempt: { customerId } },
          orderBy: { id: "asc" },
        }),
        payments: await prisma.payment.findMany({
          where: { order: { customerId } },
          orderBy: { id: "asc" },
        }),
        orders: await prisma.order.findMany({
          where: { customerId },
          include: { items: true },
          orderBy: { id: "asc" },
        }),
        keys: await prisma.checkoutRequestKey.findMany({
          where: { customerId },
          orderBy: { key: "asc" },
        }),
        cart: await prisma.cart.findUnique({
          where: { id: cartId },
          include: { items: true },
        }),
      };
    }
    function observeProviderMutations() {
      const provider = registry.getPaymentProvider();
      const create = vi.spyOn(provider, "createPayment");
      const refund = vi.spyOn(provider, "refund");
      const project = vi.fn();
      provider.reconcileExistingStatus = project;
      const notificationCount = synthetic.notify.mock.calls.length;
      return () => {
        expect(create).not.toHaveBeenCalled();
        expect(refund).not.toHaveBeenCalled();
        expect(project).not.toHaveBeenCalled();
        expect(synthetic.notify.mock.calls.length).toBe(notificationCount);
      };
    }
    function request(key = "audit-same-intent", patch: any = {}) {
      return app.inject({
        method: "POST",
        url: "/api/checkout",
        headers: { ...headers, "idempotency-key": key },
        payload: { shippingAddress: address, ...patch },
      });
    }
    function stub(fn: (data: any) => Promise<any>) {
      vi.spyOn(registry, "getPaymentProvider").mockReturnValue({
        key: "fawry",
        assertCheckoutAvailable() {},
        createPayment: async (d) => {
          calls.push(d);
          return fn(d);
        },
        getStatus: async () => "pending",
        refund: async () => {
          throw new Error("refund forbidden");
        },
      });
    }
    async function pending(d: any) {
      await prisma.payment.create({
        data: {
          orderId: d.orderId,
          amount: d.amount,
          currency: "EGP",
          status: "pending",
        },
      });
      return { providerRef: `synthetic-fawry-${++seq}` };
    }
    function gate() {
      let release!: () => void;
      const promise = new Promise<void>((r) => (release = r));
      return { promise, release };
    }
    beforeAll(async () => {
      const u = new URL(process.env.DATABASE_URL || "");
      if (
        !["localhost", "127.0.0.1"].includes(u.hostname) ||
        !/^\/packagepro_e2e_checkout_recovery_[a-z0-9]+$/.test(u.pathname)
      )
        throw new Error("Isolated checkout audit database only");
      if (
        (await prisma.user.count()) ||
        (await prisma.order.count()) ||
        (await prisma.cart.count()) ||
        (await prisma.checkoutAttempt.count())
      )
        throw new Error(
          "Checkout gate requires empty isolated business tables",
        );
      await app.register(cors, corsOptions());
      await app.register(rateLimit, { global: false });
      app.setErrorHandler((err: any, _req, rep) =>
        rep.status(err.statusCode || 500).send({ error: err.message }),
      );
      await app.register(checkoutRoutes, { prefix: "/api" });
      await app.register(paymentRoutes, { prefix: "/api" });
      await app.register(orderRoutes, { prefix: "/api" });
      await app.ready();
      const u1 = await prisma.user.create({
        data: {
          email: `checkout-audit-${Date.now()}@test.invalid`,
          passwordHash: "synthetic-unusable",
          role: "CUSTOMER",
          customer: { create: {} },
        },
        include: { customer: true },
      });
      userId = u1.id;
      customerId = u1.customer!.id;
      cartId = (
        await prisma.cart.create({ data: { customerId, currency: "EGP" } })
      ).id;
      headers = {
        authorization: `Bearer ${jwtService.generateAccessToken(userId, u1.email, "CUSTOMER")}`,
      };
    });
    afterEach(() => vi.unstubAllEnvs());
    beforeEach(async () => {
      vi.stubEnv("CHECKOUT_OPERATOR_RECOVERY_ENABLED", "true");
      vi.restoreAllMocks();
      registry.resetPaymentProviderForTests();
      calls.length = 0;
      synthetic.notify.mockClear();
      await prisma.checkoutStatusOperation.deleteMany({
        where: { attempt: { customerId } },
      });
      await prisma.checkoutRequestKey.deleteMany({ where: { customerId } });
      await prisma.checkoutAttempt.deleteMany({ where: { customerId } });
      await prisma.payment.deleteMany({ where: { order: { customerId } } });
      await prisma.order.deleteMany({ where: { customerId } });
      await prisma.cartItem.deleteMany({ where: { cartId } });
      await line();
      synthetic.notify.mockResolvedValue(undefined);
      synthetic.quote.mockImplementation(async (r: any) => ({
        material: { code: "synthetic", currency: "EGP" },
        breakdown: {
          subtotal: r.quantity * 10,
          tax: 0,
          shippingEstimate: 0,
          total: r.quantity * 10,
        },
      }));
    });
    afterAll(async () => {
      if (customerId) {
        await prisma.checkoutStatusOperation.deleteMany({
          where: { attempt: { customerId } },
        });
        await prisma.checkoutRequestKey.deleteMany({ where: { customerId } });
        await prisma.checkoutAttempt.deleteMany({ where: { customerId } });
        await prisma.payment.deleteMany({ where: { order: { customerId } } });
        await prisma.order.deleteMany({ where: { customerId } });
      }
      if (userId) await prisma.user.deleteMany({ where: { id: userId } });
      await app.close();
      await prisma.$disconnect();
    });

    it.each(["fawry", "instapay", "vodafone_cash", "bank_transfer"])(
      "unavailable %s creates no order or attempt",
      async (key) => {
        process.env.PAYMENT_PROVIDER = key;
        expect((await request()).statusCode).toBe(500);
        expect((await request()).statusCode).toBe(500);
        expect((await state()).orders).toHaveLength(0);
        expect(
          await prisma.checkoutAttempt.count({ where: { customerId } }),
        ).toBe(0);
      },
    );
    it("lost response replays exact result after cart consumption and environment change", async () => {
      stub(pending);
      const first = await request();
      expect(first.statusCode, first.body).toBe(200);
      process.env.DEFAULT_CURRENCY = "usd";
      const retry = await request();
      expect(durableResponse(retry.json())).toEqual(
        durableResponse(first.json()),
      );
      expect(calls).toHaveLength(1);
      expect(calls[0].currency).toBe("egp");
      expect((await state()).cart).toHaveLength(0);
    });
    it("changed payload conflicts and foreign customer cannot recover", async () => {
      stub(pending);
      expect((await request()).statusCode).toBe(200);
      expect(
        (await request("audit-same-intent", { notes: "changed" })).statusCode,
      ).toBe(409);
      const token = jwtService.generateAccessToken(
        "foreign-user",
        "foreign@test.invalid",
        "CUSTOMER",
      );
      const res = await app.inject({
        method: "GET",
        url: "/api/checkout/attempt",
        headers: {
          authorization: "Bearer " + token,
          "idempotency-key": "audit-same-intent",
        },
      });
      expect(res.statusCode).toBe(404);
      expect(calls).toHaveLength(1);
    });
    it.each([false, true])(
      "DB-backed concurrent same/cross-key reservation makes one order dispatch crossKey=%s",
      async (cross) => {
        const entered = gate(),
          release = gate();
        stub(async (d) => {
          entered.release();
          await release.promise;
          return pending(d);
        });
        const first = Promise.resolve(request());
        await entered.promise;
        const second = await request(
          cross ? "audit-different-key" : "audit-same-intent",
        );
        expect(second.statusCode, second.body).toBe(200);
        expect(second.json().data.recoveryRequired).toBe(true);
        release.release();
        const done = await first;
        expect(done.statusCode, done.body).toBe(200);
        expect((await state()).orders).toHaveLength(1);
        expect(calls).toHaveLength(1);
        expect(
          durableResponse(
            (
              await request(cross ? "audit-different-key" : "audit-same-intent")
            ).json(),
          ),
        ).toEqual(durableResponse(done.json()));
      },
    );
    it("ambiguous failure remains unknown, no re-dispatch even cross-key or modified cart", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic ambiguous timeout");
      });
      expect((await request()).statusCode).toBe(409);
      expect((await request()).json().data.attemptState).toBe("unknown");
      await line(7);
      expect((await request("audit-different-key")).statusCode).toBe(409);
      expect(calls).toHaveLength(1);
      expect((await state()).orders).toHaveLength(1);
    });
    it.each(["new", "quantity", "config", "delete", "restore"])(
      "preserves changed cart %s and blocks another checkout",
      async (change) => {
        const entered = gate(),
          release = gate();
        stub(async (d) => {
          entered.release();
          await release.promise;
          return pending(d);
        });
        const p = Promise.resolve(request());
        await entered.promise;
        const original = (await state()).cart[0];
        if (change === "new") await line(7);
        if (change === "quantity")
          await prisma.cartItem.update({
            where: { id: original.id },
            data: { quantity: 9 },
          });
        if (change === "config")
          await prisma.cartItem.update({
            where: { id: original.id },
            data: { config: { changed: "yes" } },
          });
        if (change === "delete")
          await prisma.cartItem.delete({ where: { id: original.id } });
        if (change === "restore") {
          await prisma.cartItem.update({
            where: { id: original.id },
            data: { quantity: 8 },
          });
          await prisma.cartItem.update({
            where: { id: original.id },
            data: { quantity: 2 },
          });
        }
        release.release();
        const done = await p;
        expect(done.statusCode, done.body).toBe(200);
        expect(done.json().data.cartChanged).toBe(true);
        expect(done.json().data.attemptState).toBe("review_required");
        const s = await state();
        expect(s.orders[0].items[0].quantity).toBe(2);
        if (change === "new")
          expect(s.cart.map((i) => i.quantity)).toEqual([7]);
        if (change === "quantity")
          expect(s.cart.map((i) => i.quantity)).toEqual([9]);
        if (change === "restore")
          expect(s.cart.map((i) => i.quantity)).toEqual([2]);
        expect((await request("audit-different-key")).statusCode).toBe(409);
        expect(calls).toHaveLength(1);
      },
    );
    it("missing key rejects with no side effects", async () => {
      stub(pending);
      const res = await app.inject({
        method: "POST",
        url: "/api/checkout",
        headers,
        payload: { shippingAddress: address },
      });
      expect(res.statusCode).toBe(400);
      expect((await state()).orders).toHaveLength(0);
      expect(calls).toHaveLength(0);
    });

    it("reservation races at price barrier serialize across DB transactions", async () => {
      const priceEntered = gate(),
        priceRelease = gate();
      let count = 0;
      synthetic.quote.mockImplementation(async (r: any) => {
        if (++count === 1) {
          priceEntered.release();
          await priceRelease.promise;
        }
        return {
          material: { code: "synthetic", currency: "EGP" },
          breakdown: {
            subtotal: r.quantity * 10,
            tax: 0,
            shippingEstimate: 0,
            total: r.quantity * 10,
          },
        };
      });
      stub(pending);
      const a = Promise.resolve(request());
      await priceEntered.promise;
      const b = Promise.resolve(request("audit-cross-key-race"));
      await new Promise((r) => setTimeout(r, 30));
      priceRelease.release();
      const res = await Promise.all([a, b]);
      expect(res.map((r) => r.statusCode)).toEqual([200, 200]);
      expect((await state()).orders).toHaveLength(1);
      expect(calls).toHaveLength(1);
    });
    it("provider await holds no customer transaction advisory lock", async () => {
      stub(async (d) => {
        const lock = await prisma.$transaction(
          async (tx) =>
            tx.$queryRaw<
              Array<{ ok: boolean }>
            >`SELECT pg_try_advisory_xact_lock(hashtextextended(${customerId},6102)) AS ok`,
        );
        expect(lock[0].ok).toBe(true);
        return pending(d);
      });
      expect((await request()).statusCode).toBe(200);
    });
    it.each(["dispatching", "unknown"])(
      "seeded process interruption %s is visible after new service construction and never redispatched",
      async (status) => {
        stub(pending);
        const done = await request();
        const id = done.json().data.attemptId;
        await prisma.checkoutAttempt.update({
          where: { id },
          data: { state: status, result: undefined },
        });
        const { CheckoutService } = await import("./checkout.service");
        const fresh = new CheckoutService();
        const recovered: any = await fresh.recover(
          customerId,
          "audit-same-intent",
        );
        expect(recovered.attemptState).toBe(status);
        expect(recovered.recoveryRequired).toBe(true);
        expect((await request()).json().data.attemptState).toBe(status);
        expect(calls).toHaveLength(1);
      },
    );
    it("rollback after order creation before attempt insert leaves no orphan", async () => {
      stub(pending);
      const { orderService } = await import("../orders/order.service");
      const original = orderService.createOrder.bind(orderService);
      vi.spyOn(orderService, "createOrder").mockImplementation(
        async (...args: any[]) => {
          await (original as any)(...args);
          throw new Error("synthetic interruption after order write");
        },
      );
      expect((await request()).statusCode).toBe(500);
      expect((await state()).orders).toHaveLength(0);
      expect(
        await prisma.checkoutAttempt.count({ where: { customerId } }),
      ).toBe(0);
      expect(calls).toHaveLength(0);
    });
    it("missing quote currency refuses transaction before order/provider effects", async () => {
      stub(pending);
      synthetic.quote.mockResolvedValue({
        material: { code: "synthetic" },
        breakdown: { subtotal: 20, tax: 0, shippingEstimate: 0, total: 20 },
      });
      expect((await request()).statusCode).toBe(400);
      expect((await state()).orders).toHaveLength(0);
      expect(calls).toHaveLength(0);
    });
    it("mixed quote currencies refuse before order/provider effects", async () => {
      await line(7);
      stub(pending);
      synthetic.quote.mockImplementation(async (r: any) => ({
        material: {
          code: "synthetic",
          currency: r.quantity === 2 ? "EGP" : "USD",
        },
        breakdown: { subtotal: 20, tax: 0, shippingEstimate: 0, total: 20 },
      }));
      expect((await request()).statusCode).toBe(400);
      expect((await state()).orders).toHaveLength(0);
      expect(calls).toHaveLength(0);
    });
    it("historical null currency remains unbackfilled with explicit projection provenance", async () => {
      const { serializeOrder } = await import("../orders/order.service");
      const x = serializeOrder({ currency: null, payment: null });
      expect(x.currency).toBe("EGP");
      expect(x.currencyKnown).toBe(false);
    });

    it("stored quote currency reaches pending invoice regardless of environment", async () => {
      stub(pending);
      synthetic.quote.mockImplementation(async () => ({
        material: { code: "synthetic", currency: "SAR" },
        breakdown: { subtotal: 20, tax: 0, shippingEstimate: 0, total: 20 },
      }));
      const done = await request();
      expect(done.statusCode).toBe(200);
      expect(calls[0].currency).toBe("sar");
      const { invoiceService } = await import("../finance/invoice.service");
      const { invoicePdfText } =
        await import("../orders/invoice-pdf.test-helper");
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: done.json().data.orderId },
        include: {
          items: true,
          customer: { include: { user: true } },
          payment: true,
        },
      });
      const text = await invoicePdfText(
        await invoiceService.generateInvoice(order),
      );
      expect(text).toContain("SAR 20.00");
      expect(text).not.toContain("EGP 20.00");
    });

    it("reserved crash window safely resumes one atomic dispatch on retry", async () => {
      stub(pending);
      const done = await request();
      const attemptId = done.json().data.attemptId;
      await prisma.checkoutAttempt.update({
        where: { id: attemptId },
        data: { state: "reserved", result: undefined },
      });
      await prisma.payment.deleteMany({
        where: { orderId: done.json().data.orderId },
      });
      calls.length = 0;
      expect((await request()).statusCode).toBe(200);
      expect(calls).toHaveLength(1);
      expect((await state()).orders).toHaveLength(1);
    });
    it("generic durable result excludes provider bearer client secret", async () => {
      stub(async (d) => ({
        ...(await pending(d)),
        clientSecret: "synthetic-bearer-not-real",
      }));
      const done = await request();
      expect(done.json().data.clientSecret).toBe("synthetic-bearer-not-real");
      const row = await prisma.checkoutAttempt.findUniqueOrThrow({
        where: { id: done.json().data.attemptId },
      });
      expect(JSON.stringify(row.result)).not.toContain("synthetic-bearer");
      expect((await request()).json().data.clientSecret).toBeUndefined();
    });
    it("second existing customer cannot recover first customer key", async () => {
      stub(pending);
      await request();
      const second = await prisma.user.create({
        data: {
          email: `second-checkout-${Date.now()}@test.invalid`,
          passwordHash: "unusable",
          role: "CUSTOMER",
          customer: { create: {} },
        },
      });
      try {
        const res = await app.inject({
          method: "GET",
          url: "/api/checkout/attempt",
          headers: {
            authorization:
              "Bearer " +
              jwtService.generateAccessToken(
                second.id,
                second.email,
                "CUSTOMER",
              ),
            "idempotency-key": "audit-same-intent",
          },
        });
        expect(res.statusCode).toBe(404);
      } finally {
        await prisma.user.delete({ where: { id: second.id } });
      }
    });

    it("legacy create-intent cannot bypass a durable checkout attempt", async () => {
      stub(pending);
      const done = await request();
      expect(done.statusCode).toBe(200);
      const res = await app.inject({
        method: "POST",
        url: "/api/payments/create-intent",
        headers,
        payload: { orderId: done.json().data.orderId },
      });
      expect(res.statusCode).toBe(409);
      expect(calls).toHaveLength(1);
    });
    it("read-only completed recovery returns resumable secret but does not persist it or redispatch", async () => {
      stub(pending);
      const done = await request();
      const id = done.json().data.orderId;
      const provider = registry.getPaymentProvider();
      provider.recoverPayment = vi.fn(async (orderId) => {
        expect(orderId).toBe(id);
        return {
          providerRef: done.json().data.providerRef,
          status: "pending",
          clientSecret: "synthetic-resume-secret",
        };
      });
      const res = await app.inject({
        method: "GET",
        url: "/api/checkout/attempt",
        headers: { ...headers, "idempotency-key": "audit-same-intent" },
      });
      expect(res.json().data.clientSecret).toBe("synthetic-resume-secret");
      expect(res.json().data.recoveryRequired).toBe(false);
      expect(calls).toHaveLength(1);
      const row = await prisma.checkoutAttempt.findUniqueOrThrow({
        where: { orderId: id },
      });
      expect(JSON.stringify(row.result)).not.toContain(
        "synthetic-resume-secret",
      );
    });
    it("read-only lookup cannot turn an interrupted dispatcher into safe payment resumption", async () => {
      stub(pending);
      const done = await request();
      await prisma.checkoutAttempt.update({
        where: { orderId: done.json().data.orderId },
        data: { state: "unknown" },
      });
      registry.getPaymentProvider().recoverPayment = vi.fn(async () => ({
        providerRef: done.json().data.providerRef,
        status: "pending",
        clientSecret: "synthetic-resume-secret",
      }));
      const res = await app.inject({
        method: "GET",
        url: "/api/checkout/attempt",
        headers: { ...headers, "idempotency-key": "audit-same-intent" },
      });
      expect(res.json().data.recoveryRequired).toBe(true);
      expect(res.json().data.clientSecret).toBeUndefined();
      expect(calls).toHaveLength(1);
    });
    const adminHeaders = () => ({
      authorization:
        "Bearer " +
        jwtService.generateAccessToken(
          "qa-admin",
          "admin@test.invalid",
          "ADMIN",
        ),
    });
    it("admin reconciles UNKNOWN with validated existing payment and records actor without dispatch", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic lost local response");
      });
      const done = await request();
      const attemptId = (
        await prisma.checkoutAttempt.findFirstOrThrow({ where: { customerId } })
      ).id;
      registry.getPaymentProvider().recoverPayment = vi.fn(async () => ({
        providerRef: "synthetic-existing-ref",
        status: "pending",
        clientSecret: "synthetic-read-secret",
      }));
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attemptId}/reconcile-existing`,
        headers: adminHeaders(),
        payload: {
          reason: "Validated existing payment reference during synthetic test",
        },
      });
      expect(res.statusCode, res.body).toBe(200);
      expect(calls).toHaveLength(1);
      const row = await prisma.checkoutAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      expect(row.state).toBe("completed");
      expect(row.reconciliation).toMatchObject({
        actorId: "qa-admin",
        action: "existing-payment-reconciled",
      });
      expect(JSON.stringify(row.result)).not.toContain("synthetic-read-secret");
    });
    it("customer reconciliation denies and active dispatching cannot be declared stale", async () => {
      stub(pending);
      const done = await request();
      const attemptId = done.json().data.attemptId;
      const url = `/api/admin/checkout-attempts/${attemptId}/reconcile-existing`;
      const denied = await app.inject({
        method: "POST",
        url,
        headers,
        payload: { reason: "Unauthorized synthetic request" },
      });
      expect(denied.statusCode).toBe(403);
      await prisma.checkoutAttempt.update({
        where: { id: attemptId },
        data: { state: "dispatching" },
      });
      const deniedActive = await app.inject({
        method: "POST",
        url,
        headers: adminHeaders(),
        payload: { reason: "Cannot assume dispatcher is dead" },
      });
      expect(deniedActive.statusCode).toBe(409);
      expect(calls).toHaveLength(1);
    });
    it("admin does not manufacture a payment when UNKNOWN has no local reference", async () => {
      stub(pending);
      const done = await request();
      const attemptId = done.json().data.attemptId;
      await prisma.checkoutAttempt.update({
        where: { id: attemptId },
        data: { state: "unknown" },
      });
      registry.getPaymentProvider().recoverPayment = vi.fn(async () => null);
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attemptId}/reconcile-existing`,
        headers: adminHeaders(),
        payload: { reason: "Investigate missing local reference" },
      });
      expect(res.statusCode).toBe(409);
      expect(calls).toHaveLength(1);
      expect(
        (
          await prisma.checkoutAttempt.findUniqueOrThrow({
            where: { id: attemptId },
          })
        ).state,
      ).toBe("unknown");
    });

    it("real CORS preflight grants Idempotency-Key only for configured origin", async () => {
      const res = await app.inject({
        method: "OPTIONS",
        url: "/api/checkout",
        headers: {
          origin: "http://localhost:3001",
          "access-control-request-method": "POST",
          "access-control-request-headers":
            "authorization,content-type,idempotency-key",
        },
      });
      expect(res.statusCode).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe(
        "http://localhost:3001",
      );
      expect(res.headers["access-control-allow-headers"]).toContain(
        "idempotency-key",
      );
      const denied = await app.inject({
        method: "OPTIONS",
        url: "/api/checkout",
        headers: {
          origin: "https://unapproved.invalid",
          "access-control-request-method": "POST",
          "access-control-request-headers": "idempotency-key",
        },
      });
      expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    });
    it.each(["CUSTOMER", "VENDOR", "DESIGNER", "SUPPORT"])(
      "operator inspect denies %s before lookup",
      async (role) => {
        const res = await app.inject({
          method: "GET",
          url: "/api/admin/checkout-attempts/nonexistent",
          headers: {
            authorization:
              "Bearer " +
              jwtService.generateAccessToken(
                "qa-denied",
                "denied@test.invalid",
                role as any,
              ),
          },
        });
        expect(res.statusCode).toBe(403);
      },
    );
    it("operator inspect needs auth and omits raw payment metadata", async () => {
      expect(
        (
          await app.inject({
            method: "GET",
            url: "/api/admin/checkout-attempts/nonexistent",
          })
        ).statusCode,
      ).toBe(401);
      stub(pending);
      const done = await request();
      const id = done.json().data.attemptId;
      await prisma.payment.update({
        where: { orderId: done.json().data.orderId },
        data: { metadata: { clientSecret: "synthetic-secret-must-not-leak" } },
      });
      const res = await app.inject({
        method: "GET",
        url: `/api/admin/checkout-attempts/${id}`,
        headers: adminHeaders(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).not.toContain("synthetic-secret-must-not-leak");
      expect(res.json().data.cart).toBeTruthy();
    });
    it("operator refuses DISPATCHING before even retrieving a known payment", async () => {
      stub(pending);
      const done = await request();
      const id = done.json().data.attemptId;
      await prisma.checkoutAttempt.update({
        where: { id },
        data: { state: "dispatching" },
      });
      const recover = vi.fn(async () => ({
        providerRef: "synthetic-known",
        status: "pending" as const,
      }));
      registry.getPaymentProvider().recoverPayment = recover;
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${id}/reconcile-existing`,
        headers: adminHeaders(),
        payload: { reason: "Synthetic active dispatch investigation" },
      });
      expect(res.statusCode).toBe(409);
      expect(recover).not.toHaveBeenCalled();
      expect(
        (await prisma.checkoutAttempt.findUniqueOrThrow({ where: { id } }))
          .state,
      ).toBe("dispatching");
    });
    it("operator refuses a switched provider before retrieval or cart consumption", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic lost response");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      const recover = vi.fn(async () => ({
        providerRef: "synthetic-known",
        status: "pending" as const,
      }));
      const provider = registry.getPaymentProvider();
      provider.key = "stripe";
      provider.recoverPayment = recover;
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/reconcile-existing`,
        headers: adminHeaders(),
        payload: { reason: "Synthetic switched provider must refuse" },
      });
      expect(res.statusCode).toBe(409);
      expect(recover).not.toHaveBeenCalled();
      expect((await state()).cart).toHaveLength(1);
    });
    it("finalization CAS rolls cart consumption back if another transition wins during provider read", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic lost response");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      registry.getPaymentProvider().recoverPayment = vi.fn(async () => {
        await prisma.checkoutAttempt.update({
          where: { id: attempt.id },
          data: { state: "dispatching" },
        });
        return { providerRef: "synthetic-known", status: "pending" };
      });
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/reconcile-existing`,
        headers: adminHeaders(),
        payload: { reason: "Synthetic concurrent state transition" },
      });
      expect(res.statusCode).toBe(409);
      expect((await state()).cart).toHaveLength(1);
      expect(
        (
          await prisma.checkoutAttempt.findUniqueOrThrow({
            where: { id: attempt.id },
          })
        ).state,
      ).toBe("dispatching");
    });
    it("saved-order review API authenticates and returns persisted address/amount only to authorized customer", async () => {
      stub(pending);
      const done = await request();
      const id = done.json().data.orderId;
      const review = await app.inject({
        method: "GET",
        url: `/api/orders/${id}`,
        headers,
      });
      expect(review.statusCode, review.body).toBe(200);
      expect(review.json().data.orderNumber).toBe(done.json().data.orderNumber);
      expect(Number(review.json().data.total)).toBe(done.json().data.total);
      expect(review.json().data.currency).toBe("EGP");
      expect(review.json().data.shippingAddress).toMatchObject(address);
      expect(
        (await app.inject({ method: "GET", url: `/api/orders/${id}` }))
          .statusCode,
      ).toBe(401);
      const foreign = await app.inject({
        method: "GET",
        url: `/api/orders/${id}`,
        headers: {
          authorization:
            "Bearer " +
            jwtService.generateAccessToken(
              "nonowner",
              "foreign@test.invalid",
              "CUSTOMER",
            ),
        },
      });
      expect(foreign.statusCode).not.toBe(200);
      expect(foreign.body).not.toContain(address.street);
    });
    async function waitDispatch() {
      for (let i = 0; i < 100; i++) {
        const row = await prisma.checkoutAttempt.findFirst({
          where: { customerId, state: "dispatching" },
        });
        if (row) return row;
        await new Promise((r) => setTimeout(r, 5));
      }
      throw new Error("No dispatcher");
    }
    const isolate = (id: string, h = adminHeaders()) =>
      app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${id}/isolate-dispatch`,
        headers: h,
        payload: { reason: "Synthetic explicit local dispatch isolation" },
      });
    it("local fence keeps late external creation ambiguous, preserves cart and never redispatches", async () => {
      const hold = gate();
      stub(async (d) => {
        await hold.promise;
        return pending(d);
      });
      const inFlight = request();
      const attempt = await waitDispatch();
      const fence = await isolate(attempt.id);
      expect(fence.statusCode).toBe(200);
      expect(fence.json().data.externalOutcome).toBe("unknown");
      registry.getPaymentProvider().recoverPayment = vi.fn(async () => null);
      const premature = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/reconcile-existing`,
        headers: adminHeaders(),
        payload: { reason: "No reference yet cannot reconcile" },
      });
      expect(premature.statusCode).toBe(409);
      hold.release();
      expect((await inFlight).statusCode).toBe(409);
      const row = await prisma.checkoutAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      expect(row.state).toBe("unknown");
      expect(row.isolation).toMatchObject({
        actorId: "qa-admin",
        externalOutcome: "unknown",
      });
      expect((await state()).cart).toHaveLength(1);
      expect(
        await prisma.payment.count({ where: { orderId: attempt.orderId } }),
      ).toBe(1);
      await request();
      expect(calls).toHaveLength(1);
    });
    it("existing-reference reconciliation wins after fence and late dispatcher cannot overwrite it or consume edited lines", async () => {
      const persisted = gate(),
        release = gate();
      let reference = "";
      stub(async (d) => {
        const p = await pending(d);
        reference = p.providerRef;
        persisted.release();
        await release.promise;
        return p;
      });
      const inFlight = request();
      await persisted.promise;
      const attempt = await waitDispatch();
      expect((await isolate(attempt.id)).statusCode).toBe(200);
      const original = await prisma.cartItem.findFirstOrThrow({
        where: { cartId },
      });
      await prisma.cartItem.update({
        where: { id: original.id },
        data: { quantity: 9 },
      });
      registry.getPaymentProvider().recoverPayment = vi.fn(async () => ({
        providerRef: reference,
        status: "pending",
      }));
      const resolved = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/reconcile-existing`,
        headers: adminHeaders(),
        payload: { reason: "Verified persisted existing synthetic payment" },
      });
      expect(resolved.statusCode, resolved.body).toBe(200);
      expect(resolved.json().data.attemptState).toBe("review_required");
      release.release();
      expect((await inFlight).statusCode).toBe(409);
      const row = await prisma.checkoutAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      expect(row.state).toBe("review_required");
      expect(row.reconciliation).toMatchObject({
        actorId: "qa-admin",
        providerRef: reference,
      });
      expect(row.isolation).toBeTruthy();
      expect((await state()).cart[0].quantity).toBe(9);
      expect(calls).toHaveLength(1);
    });
    it("dispatch isolation denies customers, rejects completed state and records no extra provider calls", async () => {
      stub(pending);
      const done = await request();
      const id = done.json().data.attemptId;
      expect((await isolate(id, headers)).statusCode).toBe(403);
      expect((await isolate(id)).statusCode).toBe(409);
      expect(calls).toHaveLength(1);
    });

    it("fence after provider return prevents stale finalization and every re-dispatch path", async () => {
      stub(pending);
      const atFinalize = gate(),
        resumeFinalize = gate();
      const service = checkoutService as any;
      const original = service.finalize.bind(service);
      vi.spyOn(service, "finalize").mockImplementation(
        async (...args: any[]) => {
          atFinalize.release();
          await resumeFinalize.promise;
          return original(...args);
        },
      );
      const inFlight = request();
      await atFinalize.promise;
      const attempt = await waitDispatch();
      expect((await isolate(attempt.id)).statusCode).toBe(200);
      await request();
      await request("synthetic-fenced-new-key");
      expect(calls).toHaveLength(1);
      expect(
        (
          await prisma.checkoutAttempt.findUniqueOrThrow({
            where: { id: attempt.id },
          })
        ).state,
      ).toBe("unknown");
      resumeFinalize.release();
      expect((await inFlight).statusCode).toBe(409);
      expect((await state()).cart).toHaveLength(1);
      expect(calls).toHaveLength(1);
    });
    it("late provider persistence permits only later existing-reference reconciliation", async () => {
      const hold = gate();
      stub(async (d) => {
        await hold.promise;
        return pending(d);
      });
      const inFlight = request();
      const attempt = await waitDispatch();
      const fences = await Promise.all([
        isolate(attempt.id),
        isolate(attempt.id),
      ]);
      expect(fences.map((r) => r.statusCode).sort()).toEqual([200, 409]);
      registry.getPaymentProvider().recoverPayment = vi.fn(async () =>
        (await prisma.payment.findUnique({
          where: { orderId: attempt.orderId },
        }))
          ? { providerRef: "synthetic-known", status: "pending" }
          : null,
      );
      const resolve = () =>
        app.inject({
          method: "POST",
          url: `/api/admin/checkout-attempts/${attempt.id}/reconcile-existing`,
          headers: adminHeaders(),
          payload: {
            reason: "Synthetic verified existing payment reconciliation",
          },
        });
      expect((await resolve()).statusCode).toBe(409);
      hold.release();
      await inFlight;
      expect((await resolve()).statusCode).toBe(200);
      const row = await prisma.checkoutAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      expect(row.isolation).toBeTruthy();
      expect(row.reconciliation).toBeTruthy();
      expect(row.state).toBe("completed");
      expect(calls).toHaveLength(1);
    });
    it("two reconciliations after fence have one winner and preserve both records", async () => {
      const persisted = gate(),
        hold = gate();
      let reference = "";
      stub(async (d) => {
        const p = await pending(d);
        reference = p.providerRef;
        persisted.release();
        await hold.promise;
        return p;
      });
      const inFlight = request();
      await persisted.promise;
      const attempt = await waitDispatch();
      await isolate(attempt.id);
      registry.getPaymentProvider().recoverPayment = vi.fn(async () => ({
        providerRef: reference,
        status: "pending",
      }));
      const resolve = () =>
        app.inject({
          method: "POST",
          url: `/api/admin/checkout-attempts/${attempt.id}/reconcile-existing`,
          headers: adminHeaders(),
          payload: {
            reason: "Synthetic concurrent verified payment resolution",
          },
        });
      const results = await Promise.all([resolve(), resolve()]);
      expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
      hold.release();
      await inFlight;
      const row = await prisma.checkoutAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      expect(row.isolation).toBeTruthy();
      expect(row.reconciliation).toBeTruthy();
      expect(calls).toHaveLength(1);
    });
    it("late differing provider reference cannot expose a secret after local reconciliation", async () => {
      stub(pending);
      const done = await request();
      const id = done.json().data.attemptId;
      registry.getPaymentProvider().recoverPayment = vi.fn(async () => ({
        providerRef: "different-late-reference",
        status: "pending",
        clientSecret: "must-not-return-this-secret",
      }));
      const recovered = await app.inject({
        method: "GET",
        url: "/api/checkout/attempt",
        headers: { ...headers, "idempotency-key": "audit-same-intent" },
      });
      expect(recovered.statusCode).toBe(409);
      expect(recovered.body).not.toContain("must-not-return-this-secret");
      expect(
        (await prisma.checkoutAttempt.findUniqueOrThrow({ where: { id } }))
          .state,
      ).toBe("completed");
      expect(calls).toHaveLength(1);
    });

    it.each(["reserved", "unknown", "review_required", "completed"])(
      "isolation cannot rewrite %s state",
      async (state) => {
        stub(pending);
        const done = await request();
        const id = done.json().data.attemptId;
        await prisma.checkoutAttempt.update({ where: { id }, data: { state } });
        const res = await isolate(id);
        expect(res.statusCode).toBe(409);
        expect(
          (await prisma.checkoutAttempt.findUniqueOrThrow({ where: { id } }))
            .state,
        ).toBe(state);
        expect(calls).toHaveLength(1);
      },
    );
    it.each(["VENDOR", "DESIGNER", "SUPPORT"])(
      "isolation denies %s even with a live dispatcher",
      async (role) => {
        const hold = gate();
        stub(async (d) => {
          await hold.promise;
          return pending(d);
        });
        const inFlight = request();
        const attempt = await waitDispatch();
        const res = await isolate(attempt.id, {
          authorization:
            "Bearer " +
            jwtService.generateAccessToken(
              "qa-denied",
              "qa@test.invalid",
              role as any,
            ),
        });
        expect(res.statusCode).toBe(403);
        expect(
          (
            await prisma.checkoutAttempt.findUniqueOrThrow({
              where: { id: attempt.id },
            })
          ).state,
        ).toBe("dispatching");
        hold.release();
        await inFlight;
      },
    );
    it("fenced recovery shows current local order/payment independently from unresolved attempt", async () => {
      const hold = gate();
      stub(async (d) => {
        await hold.promise;
        return pending(d);
      });
      const inFlight = request();
      const attempt = await waitDispatch();
      await isolate(attempt.id);
      await prisma.order.update({
        where: { id: attempt.orderId },
        data: { status: "awaiting_approval" },
      });
      const res = await app.inject({
        method: "GET",
        url: "/api/checkout/attempt",
        headers: { ...headers, "idempotency-key": "audit-same-intent" },
      });
      expect(res.json().data).toMatchObject({
        attemptState: "unknown",
        orderState: "awaiting_approval",
        localPaymentState: null,
        recoveryRequired: true,
      });
      hold.release();
      await inFlight;
    });
    it("admin missing-reference investigation verifies facts without attachment, cart consumption or redispatch", async () => {
      stub(async () => {
        throw new Error("synthetic outcome unknown");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      registry.getPaymentProvider().inspectPaymentReference = vi.fn(
        async () => ({
          providerRef: "pi_verified",
          amount: 20,
          currency: "EGP",
          status: "pending",
          localReference: { stripePaymentIntentId: "pi_verified" },
        }),
      );
      const url = `/api/admin/checkout-attempts/${attempt.id}/inspect-reference`;
      const payload = { reference: "pi_verified" };
      expect(
        (await app.inject({ method: "POST", url, headers, payload }))
          .statusCode,
      ).toBe(403);
      const res = await app.inject({
        method: "POST",
        url,
        headers: adminHeaders(),
        payload,
      });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().data).toMatchObject({
        localAttachment: false,
        providerRef: "pi_verified",
        amount: 20,
        currency: "EGP",
      });
      expect(res.body).not.toContain("localReference");
      expect(
        await prisma.payment.count({ where: { orderId: attempt.orderId } }),
      ).toBe(0);
      expect((await state()).cart).toHaveLength(1);
      expect(
        (
          await prisma.checkoutAttempt.findUniqueOrThrow({
            where: { id: attempt.id },
          })
        ).state,
      ).toBe("unknown");
      expect(calls).toHaveLength(1);
    });

    it("verified missing reference attaches facts only, keeps UNKNOWN/cart/order, then read-only reconciliation completes", async () => {
      stub(async () => {
        throw new Error("synthetic unknown without local payment");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      registry.getPaymentProvider().inspectPaymentReference = vi.fn(
        async () => ({
          providerRef: "pi_verified",
          amount: 20,
          currency: "EGP",
          status: "succeeded",
          localReference: { stripePaymentIntentId: "pi_verified" },
        }),
      );
      const url = `/api/admin/checkout-attempts/${attempt.id}/attach-reference`,
        payload = {
          reference: "pi_verified",
          reason: "Verified existing provider reference during investigation",
        };
      expect(
        (await app.inject({ method: "POST", url, headers, payload }))
          .statusCode,
      ).toBe(403);
      const res = await app.inject({
        method: "POST",
        url,
        headers: adminHeaders(),
        payload,
      });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().data).toMatchObject({
        attemptState: "unknown",
        providerStatus: "succeeded",
        localPaymentState: "pending",
      });
      expect((await state()).cart).toHaveLength(1);
      expect((await state()).orders[0].status).toBe("pending_review");
      const row = await prisma.checkoutAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      expect(row.attachment).toMatchObject({
        actorId: "qa-admin",
        providerRef: "pi_verified",
      });
      expect(
        (
          await app.inject({
            method: "POST",
            url,
            headers: adminHeaders(),
            payload,
          })
        ).statusCode,
      ).toBe(409);
      expect(calls).toHaveLength(1);
    });
    it("attachment refuses conflicting local reference and amount without overwriting evidence", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic local reference mismatch");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      await prisma.payment.update({
        where: { orderId: attempt.orderId },
        data: { stripePaymentIntentId: "pi_original" },
      });
      registry.getPaymentProvider().inspectPaymentReference = vi.fn(
        async () => ({
          providerRef: "pi_other",
          amount: 20,
          currency: "EGP",
          status: "pending",
          localReference: { stripePaymentIntentId: "pi_other" },
        }),
      );
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/attach-reference`,
        headers: adminHeaders(),
        payload: {
          reference: "pi_other",
          reason: "Synthetic conflicting reference must not overwrite",
        },
      });
      expect(res.statusCode).toBe(409);
      expect(
        (
          await prisma.payment.findUniqueOrThrow({
            where: { orderId: attempt.orderId },
          })
        ).stripePaymentIntentId,
      ).toBe("pi_original");
      expect((await state()).cart).toHaveLength(1);
      expect(
        (
          await prisma.checkoutAttempt.findUniqueOrThrow({
            where: { id: attempt.id },
          })
        ).attachment,
      ).toBeNull();
    });

    it("two admins attaching one verified reference have one winner and cannot overwrite attachment entry", async () => {
      stub(async () => {
        throw new Error("synthetic missing row");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      registry.getPaymentProvider().inspectPaymentReference = vi.fn(
        async () => ({
          providerRef: "pi_verified",
          amount: 20,
          currency: "EGP",
          status: "pending",
          localReference: { stripePaymentIntentId: "pi_verified" },
        }),
      );
      const attach = () =>
        app.inject({
          method: "POST",
          url: `/api/admin/checkout-attempts/${attempt.id}/attach-reference`,
          headers: adminHeaders(),
          payload: {
            reference: "pi_verified",
            reason: "Synthetic concurrent verified reference attachment",
          },
        });
      const results = await Promise.all([attach(), attach()]);
      expect(results.map((r) => r.statusCode).sort()).toEqual([200, 409]);
      expect(
        await prisma.payment.count({ where: { orderId: attempt.orderId } }),
      ).toBe(1);
      expect(
        (
          await prisma.checkoutAttempt.findUniqueOrThrow({
            where: { id: attempt.id },
          })
        ).attachment,
      ).toBeTruthy();
      expect(calls).toHaveLength(1);
      registry.getPaymentProvider().recoverPayment = vi.fn(async () => ({
        providerRef: "pi_verified",
        status: "pending",
      }));
      const resolved = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/reconcile-existing`,
        headers: adminHeaders(),
        payload: {
          reason: "Synthetic attached existing reference reconciliation",
        },
      });
      expect(resolved.statusCode).toBe(200);
      const row = await prisma.checkoutAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      expect(row.attachment).toBeTruthy();
      expect(row.reconciliation).toBeTruthy();
      expect(row.state).toBe("completed");
      expect((await state()).cart).toHaveLength(0);
    });
    it.each(["dispatching", "completed", "review_required", "reserved"])(
      "attachment refuses %s without provider inspection",
      async (state) => {
        stub(pending);
        const done = await request();
        const id = done.json().data.attemptId;
        await prisma.checkoutAttempt.update({ where: { id }, data: { state } });
        const inspect = vi.fn();
        registry.getPaymentProvider().inspectPaymentReference = inspect;
        const res = await app.inject({
          method: "POST",
          url: `/api/admin/checkout-attempts/${id}/attach-reference`,
          headers: adminHeaders(),
          payload: {
            reference: "pi_verified",
            reason: "Synthetic invalid state must refuse before provider read",
          },
        });
        expect(res.statusCode).toBe(409);
        expect(inspect).not.toHaveBeenCalled();
      },
    );
    it("attachment rechecks state after provider inspection and rolls back local insert", async () => {
      stub(async () => {
        throw new Error("synthetic missing row");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      registry.getPaymentProvider().inspectPaymentReference = vi.fn(
        async () => {
          await prisma.checkoutAttempt.update({
            where: { id: attempt.id },
            data: { state: "review_required" },
          });
          return {
            providerRef: "pi_verified",
            amount: 20,
            currency: "EGP",
            status: "pending",
            localReference: { stripePaymentIntentId: "pi_verified" },
          };
        },
      );
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/attach-reference`,
        headers: adminHeaders(),
        payload: {
          reference: "pi_verified",
          reason: "Synthetic changed state during provider read",
        },
      });
      expect(res.statusCode).toBe(409);
      expect(
        await prisma.payment.count({ where: { orderId: attempt.orderId } }),
      ).toBe(0);
      expect(
        (
          await prisma.checkoutAttempt.findUniqueOrThrow({
            where: { id: attempt.id },
          })
        ).attachment,
      ).toBeNull();
    });
    it("attachment provider switch refuses before reference inspection", async () => {
      stub(async () => {
        throw new Error("synthetic missing row");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      const provider = registry.getPaymentProvider();
      provider.key = "stripe";
      const inspect = vi.fn();
      provider.inspectPaymentReference = inspect;
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/attach-reference`,
        headers: adminHeaders(),
        payload: {
          reference: "pi_verified",
          reason: "Synthetic switched provider must not inspect",
        },
      });
      expect(res.statusCode).toBe(409);
      expect(inspect).not.toHaveBeenCalled();
    });
    it("attachment checks provider-origin amount and currency independently from local order", async () => {
      stub(async () => {
        throw new Error("synthetic missing row");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      const provider = registry.getPaymentProvider();
      for (const patch of [{ amount: 21 }, { currency: "USD" }]) {
        provider.inspectPaymentReference = vi.fn(async () => ({
          providerRef: "pi_verified",
          amount: 20,
          currency: "EGP",
          status: "pending",
          localReference: { stripePaymentIntentId: "pi_verified" },
          ...patch,
        }));
        const res = await app.inject({
          method: "POST",
          url: `/api/admin/checkout-attempts/${attempt.id}/attach-reference`,
          headers: adminHeaders(),
          payload: {
            reference: "pi_verified",
            reason: "Synthetic independent provider facts mismatch",
          },
        });
        expect(res.statusCode).toBe(409);
        expect(
          await prisma.payment.count({ where: { orderId: attempt.orderId } }),
        ).toBe(0);
      }
    });

    it("verified status reconciliation uses existing status projector with no payment create/cart consumption", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic missing local completion");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      registry.getPaymentProvider().recoverPayment = vi.fn(async () => ({
        providerRef: "pi_verified",
        status: "succeeded",
      }));
      const project = vi.fn(async () => {
        await prisma.payment.update({
          where: { orderId: attempt.orderId },
          data: { status: "captured" },
        });
        await prisma.order.update({
          where: { id: attempt.orderId },
          data: { status: "awaiting_approval" },
        });
      });
      registry.getPaymentProvider().reconcileExistingStatus = project;
      const url = `/api/admin/checkout-attempts/${attempt.id}/reconcile-status`,
        payload = {
          reason: "Verified status of previously created provider payment",
        };
      expect(
        (await app.inject({ method: "POST", url, headers, payload }))
          .statusCode,
      ).toBe(403);
      expect(project).not.toHaveBeenCalled();
      const res = await app.inject({
        method: "POST",
        url,
        headers: adminHeaders(),
        payload,
      });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().data).toMatchObject({
        attemptState: "unknown",
        orderState: "awaiting_approval",
        localPaymentState: "captured",
      });
      expect(calls).toHaveLength(1);
      expect((await state()).cart).toHaveLength(1);
      expect(
        await prisma.checkoutStatusOperation.findFirst({
          where: { attemptId: attempt.id },
        }),
      ).toMatchObject({ actorId: "qa-admin", state: "observed" });
    });

    it("status reconciliation refuses wrong provider and mismatched attached reference before projector", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic unknown");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      const provider = registry.getPaymentProvider();
      const project = vi.fn();
      provider.reconcileExistingStatus = project;
      provider.recoverPayment = vi.fn(async () => ({
        providerRef: "pi_wrong",
        status: "succeeded",
      }));
      await prisma.checkoutAttempt.update({
        where: { id: attempt.id },
        data: { attachment: { providerRef: "pi_expected" } },
      });
      const url = `/api/admin/checkout-attempts/${attempt.id}/reconcile-status`,
        payload = { reason: "Synthetic mismatched status must refuse" };
      expect(
        (
          await app.inject({
            method: "POST",
            url,
            headers: adminHeaders(),
            payload,
          })
        ).statusCode,
      ).toBe(409);
      expect(project).not.toHaveBeenCalled();
      provider.key = "stripe";
      expect(
        (
          await app.inject({
            method: "POST",
            url,
            headers: adminHeaders(),
            payload,
          })
        ).statusCode,
      ).toBe(409);
      expect(project).not.toHaveBeenCalled();
    });
    it("status reconciliation refuses active dispatch before provider reads", async () => {
      const hold = gate();
      stub(async (d) => {
        await hold.promise;
        return pending(d);
      });
      const inFlight = request();
      const attempt = await waitDispatch();
      const read = vi.fn(async () => ({
          providerRef: "pi_verified",
          status: "pending" as const,
        })),
        project = vi.fn();
      registry.getPaymentProvider().recoverPayment = read;
      registry.getPaymentProvider().reconcileExistingStatus = project;
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/reconcile-status`,
        headers: adminHeaders(),
        payload: {
          reason: "Synthetic active dispatch cannot reconcile status",
        },
      });
      expect(res.statusCode).toBe(409);
      expect(read).not.toHaveBeenCalled();
      expect(project).not.toHaveBeenCalled();
      hold.release();
      await inFlight;
    });

    it("status provider identity guard refuses matching reference from switched provider", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic unknown");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      const provider = registry.getPaymentProvider();
      provider.key = "stripe";
      const read = vi.fn(async () => ({
          providerRef: "pi_verified",
          status: "succeeded" as const,
        })),
        project = vi.fn();
      provider.recoverPayment = read;
      provider.reconcileExistingStatus = project;
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/reconcile-status`,
        headers: adminHeaders(),
        payload: {
          reason: "Synthetic switched provider with matching reference",
        },
      });
      expect(res.statusCode).toBe(409);
      expect(read).not.toHaveBeenCalled();
      expect(project).not.toHaveBeenCalled();
    });
    it("status operation intent survives projector failure and blocks blind concurrent replay", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic unknown");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      const provider = registry.getPaymentProvider();
      provider.recoverPayment = vi.fn(async () => ({
        providerRef: "pi_verified",
        status: "succeeded",
      }));
      const projector = vi.fn(async () => {
        expect(
          await prisma.checkoutStatusOperation.count({
            where: { attemptId: attempt.id, state: "started" },
          }),
        ).toBe(1);
        throw new Error("synthetic outcome write uncertainty");
      });
      provider.reconcileExistingStatus = projector;
      const url = `/api/admin/checkout-attempts/${attempt.id}/reconcile-status`,
        payload = {
          reason: "Synthetic durable operation before local projection",
        };
      expect(
        (
          await app.inject({
            method: "POST",
            url,
            headers: adminHeaders(),
            payload,
          })
        ).statusCode,
      ).toBe(500);
      expect(
        (
          await app.inject({
            method: "POST",
            url,
            headers: adminHeaders(),
            payload,
          })
        ).statusCode,
      ).toBe(409);
      expect(projector).toHaveBeenCalledTimes(1);
      expect(
        await prisma.checkoutStatusOperation.count({
          where: { attemptId: attempt.id, state: "started" },
        }),
      ).toBe(1);
    });
    it("completed stored result reference mismatch refuses status projector", async () => {
      stub(pending);
      const done = await request();
      const id = done.json().data.attemptId;
      const provider = registry.getPaymentProvider();
      provider.recoverPayment = vi.fn(async () => ({
        providerRef: "pi_foreign_local",
        status: "succeeded",
      }));
      const project = vi.fn();
      provider.reconcileExistingStatus = project;
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${id}/reconcile-status`,
        headers: adminHeaders(),
        payload: { reason: "Synthetic completed result reference mismatch" },
      });
      expect(res.statusCode).toBe(409);
      expect(project).not.toHaveBeenCalled();
    });

    it("outcome-write failure retains durable operation after local effects and blocks replay", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic unknown");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      const provider = registry.getPaymentProvider();
      provider.recoverPayment = vi.fn(async () => ({
        providerRef: "pi_verified",
        status: "succeeded",
      }));
      const project = vi.fn(async () => {
        await prisma.payment.update({
          where: { orderId: attempt.orderId },
          data: { status: "captured" },
        });
      });
      provider.reconcileExistingStatus = project;
      const fail = vi
        .spyOn(prisma.checkoutStatusOperation, "update")
        .mockRejectedValueOnce(
          new Error("synthetic outcome persistence unavailable"),
        );
      const url = `/api/admin/checkout-attempts/${attempt.id}/reconcile-status`,
        payload = {
          reason: "Synthetic failure after existing local projection",
        };
      try {
        expect(
          (
            await app.inject({
              method: "POST",
              url,
              headers: adminHeaders(),
              payload,
            })
          ).statusCode,
        ).toBe(500);
      } finally {
        fail.mockRestore();
      }
      expect(
        (
          await prisma.payment.findUniqueOrThrow({
            where: { orderId: attempt.orderId },
          })
        ).status,
      ).toBe("captured");
      expect(
        await prisma.checkoutStatusOperation.count({
          where: { attemptId: attempt.id, state: "started" },
        }),
      ).toBe(1);
      expect(
        (
          await app.inject({
            method: "POST",
            url,
            headers: adminHeaders(),
            payload,
          })
        ).statusCode,
      ).toBe(409);
      expect(project).toHaveBeenCalledTimes(1);
    });
    it("concurrent status admins cannot duplicate an in-flight projector and retain separate later history", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic unknown");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      const provider = registry.getPaymentProvider();
      provider.recoverPayment = vi.fn(async () => ({
        providerRef: "pi_verified",
        status: "pending",
      }));
      const entered = gate(),
        hold = gate();
      const project = vi.fn(async () => {
        entered.release();
        await hold.promise;
      });
      provider.reconcileExistingStatus = project;
      const url = `/api/admin/checkout-attempts/${attempt.id}/reconcile-status`,
        payload = { reason: "Synthetic concurrent status operator intent" };
      const first = app.inject({
        method: "POST",
        url,
        headers: adminHeaders(),
        payload,
      });
      await entered.promise;
      expect(
        (
          await app.inject({
            method: "POST",
            url,
            headers: adminHeaders(),
            payload,
          })
        ).statusCode,
      ).toBe(409);
      hold.release();
      expect((await first).statusCode).toBe(200);
      provider.reconcileExistingStatus = vi.fn(async () => {});
      expect(
        (
          await app.inject({
            method: "POST",
            url,
            headers: adminHeaders(),
            payload,
          })
        ).statusCode,
      ).toBe(200);
      expect(
        await prisma.checkoutStatusOperation.count({
          where: { attemptId: attempt.id },
        }),
      ).toBe(2);
      expect(project).toHaveBeenCalledTimes(1);
    });
    it("database partial uniqueness independently fences concurrent STARTED inserts", async () => {
      stub(pending);
      const done = await request();
      const attemptId = done.json().data.attemptId;
      const data = {
        attemptId,
        actorId: "qa-admin",
        reason: "Synthetic concurrent durable intent",
        providerRef: "pi_verified",
        observedProviderStatus: "pending",
      };
      const inserts = await Promise.allSettled([
        prisma.checkoutStatusOperation.create({ data }),
        prisma.checkoutStatusOperation.create({ data }),
      ]);
      expect(inserts.filter((x) => x.status === "fulfilled")).toHaveLength(1);
      expect(inserts.filter((x) => x.status === "rejected")).toHaveLength(1);
      expect(
        await prisma.checkoutStatusOperation.count({
          where: { attemptId, state: "started" },
        }),
      ).toBe(1);
    });
    it("proven pre-effect provider failure closes only its operation and requires a fresh verified retry", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic unknown");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      const provider = registry.getPaymentProvider();
      provider.recoverPayment = vi.fn(async () => ({
        providerRef: "pi_verified",
        status: "pending",
      }));
      provider.reconcileExistingStatus = vi.fn(async () => {
        throw new PaymentStatusPreEffectError();
      });
      const url = `/api/admin/checkout-attempts/${attempt.id}/reconcile-status`,
        payload = { reason: "Synthetic proven failure before local effects" };
      expect(
        (
          await app.inject({
            method: "POST",
            url,
            headers: adminHeaders(),
            payload,
          })
        ).statusCode,
      ).toBe(500);
      expect(
        await prisma.checkoutStatusOperation.findFirst({
          where: { attemptId: attempt.id },
        }),
      ).toMatchObject({
        state: "failed_before_effects",
        outcome: { projectionInvoked: false },
      });
      provider.reconcileExistingStatus = vi.fn(async () => {});
      expect(
        (
          await app.inject({
            method: "POST",
            url,
            headers: adminHeaders(),
            payload,
          })
        ).statusCode,
      ).toBe(200);
      expect(provider.recoverPayment).toHaveBeenCalledTimes(2);
      expect(
        await prisma.checkoutStatusOperation.count({
          where: { attemptId: attempt.id },
        }),
      ).toBe(2);
    });
    it("uncertain-operation investigation observes facts without closing STARTED, secrets or projection", async () => {
      stub(pending);
      const done = await request();
      const attemptId = done.json().data.attemptId;
      const operation = await prisma.checkoutStatusOperation.create({
        data: {
          attemptId,
          actorId: "qa-admin",
          reason: "Synthetic unresolved operation investigation",
          providerRef: done.json().data.providerRef,
          observedProviderStatus: "pending",
        },
      });
      const provider = registry.getPaymentProvider();
      provider.recoverPayment = vi.fn(async () => ({
        providerRef: done.json().data.providerRef,
        status: "succeeded",
        clientSecret: "synthetic-secret-not-disclosed",
      }));
      const noMutations = observeProviderMutations();
      const before = await investigationSnapshot();
      const url = `/api/admin/checkout-status-operations/${operation.id}/investigate`;
      expect(
        (await app.inject({ method: "GET", url, headers })).statusCode,
      ).toBe(403);
      const res = await app.inject({
        method: "GET",
        url,
        headers: adminHeaders(),
      });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().data).toMatchObject({
        operation: { state: "started" },
        providerObservation: {
          available: true,
          status: "succeeded",
          referenceMatches: true,
        },
      });
      expect(res.body).not.toContain("synthetic-secret-not-disclosed");
      expect(res.body).not.toContain("clientSecret");
      expect(
        (
          await prisma.checkoutStatusOperation.findUniqueOrThrow({
            where: { id: operation.id },
          })
        ).state,
      ).toBe("started");
      expect(await investigationSnapshot()).toEqual(before);
      noMutations();
      expect(calls).toHaveLength(1);
    });
    it("multiple supplied valid references are reported ambiguous with no local attachment or selection", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic missing row");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      await prisma.checkoutStatusOperation.create({
        data: {
          attemptId: attempt.id,
          actorId: "qa-admin",
          reason: "Synthetic unresolved investigation",
          providerRef: "pi_first",
          observedProviderStatus: "pending",
        },
      });
      registry.getPaymentProvider().inspectPaymentReference = vi.fn(
        async (_order, ref) => ({
          clientSecret: "synthetic-reference-secret-not-disclosed",
          providerRef: ref,
          amount: 20,
          currency: "EGP",
          status: "pending",
          localReference: { stripePaymentIntentId: ref },
        }),
      );
      const noMutations = observeProviderMutations();
      const before = await investigationSnapshot();
      expect(
        (
          await app.inject({
            method: "POST",
            url: `/api/admin/checkout-attempts/${attempt.id}/investigate-references`,
            headers,
            payload: { references: ["pi_first"] },
          })
        ).statusCode,
      ).toBe(403);
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attempt.id}/investigate-references`,
        headers: adminHeaders(),
        payload: { references: ["pi_first", "pi_second"] },
      });
      expect(res.statusCode, res.body).toBe(200);
      expect(res.json().data).toMatchObject({
        competingVerifiedReferences: true,
        selectionMade: false,
        uniquenessEstablished: false,
      });
      expect(res.json().data.observations).toHaveLength(2);
      expect(res.body).not.toContain(
        "synthetic-reference-secret-not-disclosed",
      );
      expect(res.body).not.toContain("clientSecret");
      expect(await investigationSnapshot()).toEqual(before);
      noMutations();
      expect(
        await prisma.payment.count({ where: { orderId: attempt.orderId } }),
      ).toBe(1);
      expect(
        (
          await prisma.checkoutAttempt.findUniqueOrThrow({
            where: { id: attempt.id },
          })
        ).attachment,
      ).toBeNull();
      expect(calls).toHaveLength(1);
    });

    it("admin provider investigation budgets deny excess calls before provider reads", async () => {
      stub(async (d) => {
        await pending(d);
        throw new Error("synthetic uncertain result");
      });
      const done = await request();
      const attemptId = (
        await prisma.checkoutAttempt.findFirstOrThrow({ where: { customerId } })
      ).id;
      const operation = await prisma.checkoutStatusOperation.create({
        data: {
          attemptId,
          actorId: "qa-admin",
          reason: "Synthetic bounded investigation",
          providerRef: "pi_budget",
          observedProviderStatus: "pending",
        },
      });
      const provider = registry.getPaymentProvider();
      const recover = vi.fn(async () => ({
        providerRef: "pi_budget",
        status: "pending" as const,
      }));
      const inspect = vi.fn(async (_order: string, ref: string) => ({
        providerRef: ref,
        amount: 20,
        currency: "EGP",
        status: "pending" as const,
        localReference: { stripePaymentIntentId: ref },
      }));
      provider.recoverPayment = recover;
      provider.inspectPaymentReference = inspect;
      const before = await investigationSnapshot();
      const noMutations = observeProviderMutations();
      const paths = [
        {
          method: "GET" as const,
          url: `/api/admin/checkout-status-operations/${operation.id}/investigate`,
          payload: undefined,
          remoteAddress: "192.0.2.81",
        },
        {
          method: "POST" as const,
          url: `/api/admin/checkout-attempts/${attemptId}/investigate-references`,
          payload: { references: ["pi_budget"] },
          remoteAddress: "192.0.2.82",
        },
        {
          method: "POST" as const,
          url: `/api/admin/checkout-attempts/${attemptId}/inspect-reference`,
          payload: { reference: "pi_budget" },
          remoteAddress: "192.0.2.83",
        },
      ];
      for (const path of paths) {
        for (let i = 0; i < 6; i++) {
          const res = await app.inject({ ...path, headers: adminHeaders() });
          expect(res.statusCode, res.body).toBe(200);
        }
        const denied = await app.inject({ ...path, headers: adminHeaders() });
        expect(denied.statusCode, denied.body).toBe(429);
        expect(denied.headers["retry-after"]).toBeDefined();
      }
      expect(recover).toHaveBeenCalledTimes(6);
      expect(inspect).toHaveBeenCalledTimes(12);
      expect(await investigationSnapshot()).toEqual(before);
      noMutations();
    });

    it("operator mutations disabled by default before provider or local effects", async () => {
      stub(async () => {
        throw new Error("synthetic missing row");
      });
      await request();
      const attempt = await prisma.checkoutAttempt.findFirstOrThrow({
        where: { customerId },
      });
      const provider = registry.getPaymentProvider();
      const recover = vi.fn(),
        inspect = vi.fn(),
        project = vi.fn();
      provider.recoverPayment = recover;
      provider.inspectPaymentReference = inspect;
      provider.reconcileExistingStatus = project;
      delete process.env.CHECKOUT_OPERATOR_RECOVERY_ENABLED;
      try {
        for (const path of [
          "isolate-dispatch",
          "reconcile-existing",
          "attach-reference",
          "reconcile-status",
        ]) {
          const res = await app.inject({
            method: "POST",
            url: `/api/admin/checkout-attempts/${attempt.id}/${path}`,
            headers: adminHeaders(),
            payload: {
              reason: "Synthetic flag-off must forbid operator mutation",
              reference: "pi_verified",
            },
          });
          expect(res.statusCode, res.body).toBe(409);
          expect(res.body).toContain("disabled");
        }
        expect(recover).not.toHaveBeenCalled();
        expect(inspect).not.toHaveBeenCalled();
        expect(project).not.toHaveBeenCalled();
        expect(
          await prisma.payment.count({ where: { orderId: attempt.orderId } }),
        ).toBe(0);
        expect(
          await prisma.checkoutStatusOperation.count({
            where: { attemptId: attempt.id },
          }),
        ).toBe(0);
        expect(
          (
            await prisma.checkoutAttempt.findUniqueOrThrow({
              where: { id: attempt.id },
            })
          ).state,
        ).toBe("unknown");
      } finally {
        process.env.CHECKOUT_OPERATOR_RECOVERY_ENABLED = "true";
      }
    });
  },
);
