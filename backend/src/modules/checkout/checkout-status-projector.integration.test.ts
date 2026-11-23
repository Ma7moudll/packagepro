import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  it,
  expect,
  vi,
  describe,
} from "vitest";
import Fastify from "fastify";
const stub = vi.hoisted(() => ({ retrieve: vi.fn() }));
vi.mock("stripe", async (importOriginal) => {
  const actual: any = await importOriginal();
  class FakeStripe extends actual.default {
    constructor(...args: any[]) {
      super(...args);
      this.paymentIntents.retrieve = stub.retrieve;
      this.paymentIntents.create = () => {
        throw new Error("Provider create forbidden");
      };
      this.paymentIntents.capture = () => {
        throw new Error("Provider capture forbidden");
      };
    }
  }
  return { ...actual, default: FakeStripe };
});
import { stripeService } from "../../integrations/stripe/stripe.service";
import { StripePaymentProvider } from "../../integrations/payments/stripe.provider";
import { prisma } from "../../lib/prisma";
import { checkoutRoutes } from "./checkout.routes";
import { jwtService } from "../auth/services/jwt.service";
import { resetPaymentProviderForTests } from "../../integrations/payments/registry";
describe.skipIf(process.env.PACKAGEPRO_CHECKOUT_RECOVERY_ISOLATED_DB !== "yes")(
  "isolated real status wrapper to projector",
  () => {
    const app = Fastify();
    let userId: string, customerId: string, orderId: string, attemptId: string;
    beforeEach(() => vi.stubEnv("CHECKOUT_OPERATOR_RECOVERY_ENABLED", "true"));
    afterEach(() => vi.unstubAllEnvs());
    beforeAll(async () => {
      const url = new URL(process.env.DATABASE_URL || "");
      if (
        !["localhost", "127.0.0.1"].includes(url.hostname) ||
        !/^\/packagepro_e2e_checkout_recovery_[a-z0-9]+$/.test(url.pathname)
      )
        throw new Error("Isolated DB only");
      if ((await prisma.user.count()) || (await prisma.order.count()))
        throw new Error("Empty business DB required");
      process.env.PAYMENT_PROVIDER = "stripe";
      resetPaymentProviderForTests();
      app.setErrorHandler((e: any, _r, p) =>
        p.status(e.statusCode || 500).send({ error: e.message }),
      );
      await app.register(checkoutRoutes, { prefix: "/api" });
      await app.ready();
      const user = await prisma.user.create({
        data: {
          email: `status-wrapper-${Date.now()}@test.invalid`,
          passwordHash: "unusable",
          role: "CUSTOMER",
          customer: { create: {} },
        },
        include: { customer: true },
      });
      userId = user.id;
      customerId = user.customer!.id;
      const order = await prisma.order.create({
        data: {
          customerId,
          orderNumber: `WRAP-${Date.now()}`,
          currency: "EGP",
          total: 20,
          subtotal: 20,
          tax: 0,
          shippingCost: 0,
          shippingAddress: { street: "Synthetic" },
          shippingName: "Synthetic",
          shippingPhone: "test",
        },
      });
      orderId = order.id;
      const attempt = await prisma.checkoutAttempt.create({
        data: {
          customerId,
          orderId,
          snapshotHash: "synthetic",
          intentHash: "synthetic",
          provider: "stripe",
          cartSnapshot: [],
          state: "unknown",
          attachment: { providerRef: "pi_wrapper" },
        },
      });
      attemptId = attempt.id;
      await prisma.payment.create({
        data: {
          orderId,
          stripePaymentIntentId: "pi_wrapper",
          amount: 20,
          currency: "EGP",
          status: "pending",
        },
      });
      stub.retrieve.mockImplementation(async () => ({
        id: "pi_wrapper",
        amount: 2000,
        amount_received: 2000,
        currency: "egp",
        metadata: { orderId },
        status: "succeeded",
      }));
    });
    afterAll(async () => {
      if (customerId) {
        await prisma.checkoutStatusOperation.deleteMany({
          where: { attemptId },
        });
        await prisma.checkoutAttempt.deleteMany({ where: { id: attemptId } });
        await prisma.notification.deleteMany({ where: { userId } });
        await prisma.order.deleteMany({ where: { id: orderId } });
        await prisma.user.deleteMany({ where: { id: userId } });
      }
      await app.close();
      await prisma.$disconnect();
    });
    it("projects a previously captured provider payment exactly once, retains operation history and sends no provider mutation", async () => {
      const headers = {
        authorization:
          "Bearer " +
          jwtService.generateAccessToken(
            "synthetic-admin",
            "admin@test.invalid",
            "ADMIN",
          ),
      };
      const url = `/api/admin/checkout-attempts/${attemptId}/reconcile-status`,
        payload = {
          reason:
            "Verified existing provider status after missing-row investigation",
        };
      const first = await app.inject({ method: "POST", url, headers, payload });
      expect(first.statusCode, first.body).toBe(200);
      expect(first.json().data).toMatchObject({
        attemptState: "unknown",
        orderState: "awaiting_approval",
        localPaymentState: "captured",
      });
      expect(await prisma.notification.count({ where: { userId } })).toBe(1);
      expect(
        await prisma.checkoutStatusOperation.count({
          where: { attemptId, state: "observed" },
        }),
      ).toBe(1);
      const again = await app.inject({ method: "POST", url, headers, payload });
      expect(again.statusCode, again.body).toBe(200);
      expect(await prisma.notification.count({ where: { userId } })).toBe(1);
      expect(
        await prisma.checkoutStatusOperation.count({
          where: { attemptId, state: "observed" },
        }),
      ).toBe(2);
      expect(stub.retrieve).toHaveBeenCalledTimes(4);
    });
    it("real adapter classifies second provider read failure before local effects", async () => {
      const headers = {
        authorization:
          "Bearer " +
          jwtService.generateAccessToken(
            "synthetic-admin",
            "admin@test.invalid",
            "ADMIN",
          ),
      };
      stub.retrieve.mockClear();
      stub.retrieve
        .mockResolvedValueOnce({
          id: "pi_wrapper",
          amount: 2000,
          amount_received: 2000,
          currency: "egp",
          metadata: { orderId },
          status: "succeeded",
        })
        .mockRejectedValueOnce(
          new Error("synthetic provider read unavailable"),
        );
      const res = await app.inject({
        method: "POST",
        url: `/api/admin/checkout-attempts/${attemptId}/reconcile-status`,
        headers,
        payload: { reason: "Synthetic real adapter pre-effect classification" },
      });
      expect(res.statusCode).toBe(500);
      expect(
        await prisma.checkoutStatusOperation.findFirst({
          where: { attemptId },
          orderBy: { createdAt: "desc" },
        }),
      ).toMatchObject({ state: "failed_before_effects" });
      expect(await prisma.notification.count({ where: { userId } })).toBe(1);
    });
    it("actual confirm refuses valid payment of different expected order before projector", async () => {
      stub.retrieve.mockResolvedValue({
        id: "pi_wrapper",
        amount: 2000,
        amount_received: 2000,
        currency: "egp",
        metadata: { orderId },
        status: "succeeded",
      });
      const apply = vi
        .spyOn(stripeService as any, "applyCapturedTransition")
        .mockResolvedValue(undefined);
      try {
        await expect(
          stripeService.confirmPayment(
            "pi_wrapper",
            undefined,
            undefined,
            true,
            "foreign-order",
          ),
        ).rejects.toMatchObject({ name: "PaymentStatusPreEffectError" });
        expect(apply).not.toHaveBeenCalled();
      } finally {
        apply.mockRestore();
      }
      await expect(
        new StripePaymentProvider().reconcileExistingStatus(orderId),
      ).rejects.toMatchObject({ name: "PaymentStatusPreEffectError" });
    });
  },
);
