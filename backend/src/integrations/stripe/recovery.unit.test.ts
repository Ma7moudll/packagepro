import { beforeEach, describe, it, expect, vi } from "vitest";
const fixture = vi.hoisted(() => ({
  payment: null as any,
  retrieve: vi.fn(),
  create: vi.fn(),
  upsert: vi.fn(),
  order: vi.fn(),
}));
vi.mock("stripe", () => ({
  default: class {
    paymentIntents = { retrieve: fixture.retrieve, create: fixture.create };
  },
}));
vi.mock("../../lib/prisma", () => ({
  prisma: {
    order: { findUnique: fixture.order },
    payment: {
      findUnique: vi.fn(async () => fixture.payment),
      upsert: fixture.upsert,
    },
  },
}));
import { stripeService } from "./stripe.service";
beforeEach(() => {
  fixture.payment = {
    orderId: "qa-order",
    stripePaymentIntentId: "pi_qa",
    amount: 100,
    currency: "EGP",
    order: { id: "qa-order", total: 100, currency: "EGP" },
  };
  fixture.order.mockResolvedValue({
    id: "qa-order",
    orderNumber: "QA-1",
    total: 100,
    currency: "EGP",
    status: "pending_review",
    customer: { user: { email: "qa@test.invalid" } },
  });
  fixture.retrieve.mockReset();
  fixture.create.mockClear();
  fixture.upsert.mockClear();
  fixture.retrieve.mockResolvedValue({
    id: "pi_qa",
    amount: 10000,
    currency: "egp",
    metadata: { orderId: "qa-order" },
    status: "requires_payment_method",
    client_secret: "synthetic-ephemeral-secret",
  });
});
describe("read-only existing Stripe payment recovery", () => {
  it("retrieves existing reference and returns resumable secret without mutation", async () => {
    expect(
      await stripeService.recoverExistingPayment("qa-order"),
    ).toMatchObject({
      providerRef: "pi_qa",
      status: "failed",
      clientSecret: "synthetic-ephemeral-secret",
    });
    expect(fixture.retrieve).toHaveBeenCalledWith("pi_qa");
    expect(fixture.create).not.toHaveBeenCalled();
    expect(fixture.upsert).not.toHaveBeenCalled();
  });
  it("missing local payment does not create or search for a payment", async () => {
    fixture.payment = null;
    expect(await stripeService.recoverExistingPayment("qa-order")).toBeNull();
    expect(fixture.retrieve).not.toHaveBeenCalled();
    expect(fixture.create).not.toHaveBeenCalled();
  });
  it.each([
    { amount: 9999 },
    { currency: "usd" },
    { metadata: { orderId: "foreign-order" } },
  ])("rejects mismatched provider data %o", async (patch) => {
    fixture.retrieve.mockResolvedValue({
      id: "pi_qa",
      amount: 10000,
      currency: "egp",
      metadata: { orderId: "qa-order" },
      status: "requires_payment_method",
      ...patch,
    });
    await expect(
      stripeService.recoverExistingPayment("qa-order"),
    ).rejects.toThrow("does not match");
    expect(fixture.create).not.toHaveBeenCalled();
  });
  it.each(["succeeded", "canceled"])(
    "does not return bearer secret for terminal %s",
    async (status) => {
      fixture.retrieve.mockResolvedValue({
        id: "pi_qa",
        amount: 10000,
        amount_received: 10000,
        currency: "egp",
        metadata: { orderId: "qa-order" },
        status,
        client_secret: "synthetic-ephemeral-secret",
      });
      expect(
        await stripeService.recoverExistingPayment("qa-order"),
      ).not.toHaveProperty("clientSecret");
      expect(fixture.create).not.toHaveBeenCalled();
      expect(fixture.upsert).not.toHaveBeenCalled();
    },
  );
});

describe("explicit existing reference investigation", () => {
  it("reads explicit reference without local payment, secrets or provider mutation", async () => {
    fixture.payment = null;
    expect(
      await stripeService.inspectExistingReference("qa-order", "pi_qa"),
    ).toMatchObject({ providerRef: "pi_qa", amount: 100, currency: "EGP" });
    expect(
      await stripeService.inspectExistingReference("qa-order", "pi_qa"),
    ).not.toHaveProperty("clientSecret");
    expect(fixture.create).not.toHaveBeenCalled();
    expect(fixture.upsert).not.toHaveBeenCalled();
  });
  it.each([
    { amount: 9999 },
    { currency: "usd" },
    { metadata: { orderId: "foreign" } },
  ])("refuses mismatched reference %o", async (patch) => {
    fixture.retrieve.mockResolvedValue({
      id: "pi_qa",
      amount: 10000,
      currency: "egp",
      metadata: { orderId: "qa-order" },
      status: "requires_payment_method",
      ...patch,
    });
    await expect(
      stripeService.inspectExistingReference("qa-order", "pi_qa"),
    ).rejects.toThrow("does not match");
    expect(fixture.upsert).not.toHaveBeenCalled();
  });
  it("invalid reference and unknown currency cannot reach provider", async () => {
    await expect(
      stripeService.inspectExistingReference(
        "qa-order",
        "https://not-reference.invalid",
      ),
    ).rejects.toThrow();
    fixture.order.mockResolvedValue({
      id: "qa-order",
      total: 100,
      currency: null,
    });
    await expect(
      stripeService.inspectExistingReference("qa-order", "pi_qa"),
    ).rejects.toThrow();
    expect(fixture.retrieve).not.toHaveBeenCalled();
  });
  it("late provider response cannot overwrite a conflicting local payment reference", async () => {
    fixture.payment = null;
    fixture.create.mockResolvedValue({
      id: "pi_late",
      client_secret: "synthetic",
    });
    fixture.upsert.mockResolvedValue({
      stripePaymentIntentId: "pi_already",
      amount: 100,
      currency: "egp",
    });
    await expect(
      stripeService.createPaymentIntent({
        orderId: "qa-order",
        amount: 100,
        currency: "egp",
      }),
    ).rejects.toThrow("conflicts");
    expect(fixture.upsert.mock.calls.at(-1)?.[0].update).toEqual({});
  });
});

it("late matching provider response retains existing captured local status without update", async () => {
  fixture.payment = null;
  fixture.create.mockResolvedValue({ id: "pi_qa", client_secret: "synthetic" });
  fixture.upsert.mockResolvedValue({
    stripePaymentIntentId: "pi_qa",
    amount: 100,
    currency: "egp",
    status: "captured",
  });
  await expect(
    stripeService.createPaymentIntent({
      orderId: "qa-order",
      amount: 100,
      currency: "egp",
    }),
  ).resolves.toMatchObject({ id: "pi_qa" });
  expect(fixture.upsert.mock.calls.at(-1)?.[0].update).toEqual({});
});
describe("existing status projection after missing-row webhook", () => {
  it("missing local payment throws before provider retrieval, so webhook path remains retryable", async () => {
    fixture.payment = null;
    await expect(
      stripeService.confirmPayment("pi_qa", "evt_qa"),
    ).rejects.toThrow("Payment");
    expect(fixture.retrieve).not.toHaveBeenCalled();
    expect(fixture.create).not.toHaveBeenCalled();
  });
  it("verified succeeded status delegates existing captured transition without creating/capturing funds", async () => {
    fixture.payment = {
      id: "payment-qa",
      orderId: "qa-order",
      stripePaymentIntentId: "pi_qa",
      amount: 100,
      currency: "EGP",
      order: {
        id: "qa-order",
        total: 100,
        currency: "EGP",
        customer: { userId: "qa-user" },
      },
    };
    fixture.retrieve.mockResolvedValue({
      id: "pi_qa",
      amount: 10000,
      amount_received: 10000,
      currency: "egp",
      metadata: { orderId: "qa-order" },
      status: "succeeded",
    });
    const apply = vi
      .spyOn(stripeService as any, "applyCapturedTransition")
      .mockResolvedValue(undefined);
    try {
      await stripeService.confirmPayment("pi_qa");
      expect(apply).toHaveBeenCalledWith(fixture.payment, undefined);
      expect(fixture.create).not.toHaveBeenCalled();
      expect(fixture.upsert).not.toHaveBeenCalled();
    } finally {
      apply.mockRestore();
    }
  });
  it("processing observation cannot synthesize captured transition", async () => {
    fixture.payment = {
      id: "payment-qa",
      orderId: "qa-order",
      amount: 100,
      currency: "EGP",
      order: {
        id: "qa-order",
        total: 100,
        currency: "EGP",
        customer: { userId: "qa-user" },
      },
    };
    fixture.retrieve.mockResolvedValue({
      id: "pi_qa",
      amount: 10000,
      currency: "egp",
      metadata: { orderId: "qa-order" },
      status: "processing",
    });
    const apply = vi
      .spyOn(stripeService as any, "applyCapturedTransition")
      .mockResolvedValue(undefined);
    try {
      await stripeService.confirmPayment("pi_qa");
      expect(apply).not.toHaveBeenCalled();
    } finally {
      apply.mockRestore();
    }
  });
});
it("inspection response retains provider-origin facts rather than reconstructing mutable local order values", async () => {
  const service = stripeService as any;
  const original = service.assertPaymentMatches.bind(service);
  const check = vi
    .spyOn(service, "assertPaymentMatches")
    .mockImplementation((...args: any[]) => {
      original(...args);
      args[2].total = 999;
      args[2].currency = "USD";
    });
  try {
    expect(
      await stripeService.inspectExistingReference("qa-order", "pi_qa"),
    ).toMatchObject({ amount: 100, currency: "EGP" });
  } finally {
    check.mockRestore();
  }
});

it("classified provider-read failure proves no projector was invoked", async () => {
  fixture.payment = {
    id: "payment-qa",
    orderId: "qa-order",
    amount: 100,
    currency: "EGP",
    order: {
      id: "qa-order",
      total: 100,
      currency: "EGP",
      customer: { userId: "qa-user" },
    },
  };
  fixture.retrieve.mockRejectedValue(new Error("synthetic transient read"));
  const apply = vi
    .spyOn(stripeService as any, "applyCapturedTransition")
    .mockResolvedValue(undefined);
  try {
    await expect(
      stripeService.confirmPayment(
        "pi_qa",
        undefined,
        undefined,
        true,
        "qa-order",
      ),
    ).rejects.toMatchObject({ name: "PaymentStatusPreEffectError" });
    expect(apply).not.toHaveBeenCalled();
  } finally {
    apply.mockRestore();
  }
});
it("post-validation projector failure is never classified safe to retry", async () => {
  fixture.payment = {
    id: "payment-qa",
    orderId: "qa-order",
    amount: 100,
    currency: "EGP",
    order: {
      id: "qa-order",
      total: 100,
      currency: "EGP",
      customer: { userId: "qa-user" },
    },
  };
  fixture.retrieve.mockResolvedValue({
    id: "pi_qa",
    amount: 10000,
    amount_received: 10000,
    currency: "egp",
    metadata: { orderId: "qa-order" },
    status: "succeeded",
  });
  const apply = vi
    .spyOn(stripeService as any, "applyCapturedTransition")
    .mockRejectedValue(new Error("synthetic uncertain effects"));
  try {
    await expect(
      stripeService.confirmPayment(
        "pi_qa",
        undefined,
        undefined,
        true,
        "qa-order",
      ),
    ).rejects.not.toMatchObject({ name: "PaymentStatusPreEffectError" });
  } finally {
    apply.mockRestore();
  }
});
