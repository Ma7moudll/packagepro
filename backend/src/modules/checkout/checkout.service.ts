import { PaymentStatusPreEffectError } from "../../integrations/payments/payment-provider";
import { logger } from "../../utils/logger";
import { notificationService } from "../notifications/notifications.service";
import { createHash } from "crypto";
import { prisma } from "../../lib/prisma";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { orderService } from "../orders/order.service";
import { getPaymentProvider } from "../../integrations/payments/registry";

export interface CheckoutShippingAddress {
  name: string;
  phone: string;
  email?: string;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}
export interface CheckoutInput {
  customerId: string;
  shippingAddress: CheckoutShippingAddress;
  notes?: string;
  designSessionId?: string;
  requestKey?: string;
}
function canonical(v: any): string {
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (v instanceof Date) return JSON.stringify(v.toISOString());
  if (Array.isArray(v)) return "[" + v.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(v)
      .sort()
      .map((k) => JSON.stringify(k) + ":" + canonical(v[k]))
      .join(",") +
    "}"
  );
}
const hash = (v: any) =>
  createHash("sha256").update(canonical(v)).digest("hex");
const lineVersion = (line: any) => hash(line);
const normalizeIntent = (input: CheckoutInput) => ({
  shippingAddress: input.shippingAddress,
  notes: input.notes || null,
  designSessionId: input.designSessionId || null,
});

export class CheckoutService {
  async getSummary(customerId: string) {
    const { cartService } = await import("../cart/cart.service");
    return cartService.getCart(customerId);
  }
  private key(key?: string) {
    if (!key || !/^[A-Za-z0-9_.:-]{16,128}$/.test(key))
      throw new ValidationError(
        "A stable Idempotency-Key of 16 to 128 characters is required",
      );
    return key;
  }
  private response(attempt: any) {
    if (attempt.state === "completed" || attempt.state === "review_required")
      return attempt.result;
    return {
      attemptId: attempt.id,
      orderId: attempt.orderId,
      attemptState: attempt.state,
      recoveryRequired: true,
      provider: attempt.provider,
    };
  }
  private async recoverAttempt(attempt: any) {
    const currentOrder = await prisma.order.findUnique({
      where: { id: attempt.orderId },
      select: { status: true, payment: { select: { status: true } } },
    });
    const withStatus = (value: any) => ({
      ...value,
      orderState: currentOrder?.status,
      localPaymentState: currentOrder?.payment?.status ?? null,
    });
    // Provider selection must still match the stored attempt. Never reinterpret a
    // saved provider reference after operations change the active gateway.
    if (attempt.state === "reserved") return withStatus(this.response(attempt));
    const provider = getPaymentProvider();
    if (provider.key !== attempt.provider || !provider.recoverPayment)
      return withStatus(this.response(attempt));
    const recovered = await provider.recoverPayment(attempt.orderId);
    if (!recovered)
      return withStatus({ ...this.response(attempt), recoveryRequired: true });
    if (
      attempt.result?.providerRef &&
      attempt.result.providerRef !== recovered.providerRef
    )
      throw new ConflictError("Payment reference requires review");
    // A read cannot conclude that a still-running dispatcher is dead. It may be
    // between external creation and local persistence. Only durable completed
    // responses can offer payment resumption; unknowns remain fail-closed.
    return withStatus({
      ...this.response(attempt),
      paymentState: recovered.status,
      ...(attempt.state === "completed" || attempt.state === "review_required"
        ? {
            recoveryRequired: false,
            ...(recovered.clientSecret
              ? { clientSecret: recovered.clientSecret }
              : {}),
          }
        : { recoveryRequired: true }),
    });
  }
  async recover(customerId: string, requestKey: string) {
    const key = this.key(requestKey);
    const link = await prisma.checkoutRequestKey.findUnique({
      where: { customerId_key: { customerId, key } },
      include: { attempt: true },
    });
    if (!link) throw new NotFoundError("Checkout attempt");
    return this.recoverAttempt(link.attempt);
  }

  private async finalize(
    attempt: any,
    order: any,
    payment: any,
    expectedState: string,
    reconciliation?: any,
  ) {
    const customerId = attempt.customerId;
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${customerId}, 6102))`;
      let cartChanged = false;
      const snapshot = attempt.cartSnapshot as any[];
      for (const original of snapshot) {
        const rows = await tx.$queryRaw<
          Array<{ id: string }>
        >`SELECT id FROM cart_items WHERE id=${original.id} FOR UPDATE`;
        const current = rows.length
          ? await tx.cartItem.findUnique({ where: { id: original.id } })
          : null;
        if (
          current &&
          lineVersion(JSON.parse(JSON.stringify(current))) ===
            lineVersion(original)
        )
          await tx.cartItem.delete({ where: { id: original.id } });
        else cartChanged = true;
      }
      const remaining = await tx.cartItem.count({
        where: { cart: { customerId } },
      });
      if (remaining) cartChanged = true;
      const finalState = cartChanged ? "review_required" : "completed";
      const result = {
        attemptId: attempt.id,
        attemptState: finalState,
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: Number(order.total),
        currency: order.currency,
        status: order.status,
        provider: attempt.provider,
        providerRef: payment.providerRef,
        paymentIntentId: payment.providerRef,
        paymentState: payment.status || "pending",
        cartChanged,
      };
      const updated = await tx.checkoutAttempt.updateMany({
        where: { id: attempt.id, state: expectedState },
        data: {
          state: finalState,
          result,
          ...(reconciliation ? { reconciliation } : {}),
        },
      });
      if (updated.count !== 1)
        throw new ConflictError("Checkout changed during reconciliation");
      return {
        ...result,
        ...(payment.clientSecret ? { clientSecret: payment.clientSecret } : {}),
      };
    });
  }
  async inspectAttempt(attemptId: string) {
    const attempt = await prisma.checkoutAttempt.findUnique({
      where: { id: attemptId },
      include: {
        order: { include: { payment: true } },
        statusOperations: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!attempt) throw new NotFoundError("Checkout attempt");
    const { cartSnapshot, result, ...safe } = attempt;
    return {
      ...safe,
      originalCartSnapshot: cartSnapshot,
      order: {
        ...safe.order,
        payment: safe.order.payment
          ? {
              id: safe.order.payment.id,
              stripePaymentIntentId: safe.order.payment.stripePaymentIntentId,
              amount: safe.order.payment.amount,
              currency: safe.order.payment.currency,
              status: safe.order.payment.status,
            }
          : null,
      },
      result: result
        ? Object.fromEntries(
            Object.entries(result as any).filter(([k]) => k !== "clientSecret"),
          )
        : null,
      cart: await prisma.cart.findUnique({
        where: { customerId: attempt.customerId },
        include: { items: true },
      }),
    };
  }
  private operatorMutationsEnabled() {
    if (process.env.CHECKOUT_OPERATOR_RECOVERY_ENABLED !== "true")
      throw new ConflictError(
        "Operator recovery mutations are disabled pending a supported investigation protocol",
      );
  }
  async investigateStatusOperation(operationId: string) {
    const operation = await prisma.checkoutStatusOperation.findUnique({
      where: { id: operationId },
      include: {
        attempt: { include: { order: { include: { payment: true } } } },
      },
    });
    if (!operation) throw new NotFoundError("Status operation");
    const provider = getPaymentProvider();
    let providerObservation: {
      available: boolean;
      providerRef?: string;
      status?: string;
      referenceMatches?: boolean;
    } = { available: false };
    if (
      provider.key === operation.attempt.provider &&
      provider.recoverPayment
    ) {
      try {
        const observed = await provider.recoverPayment(
          operation.attempt.orderId,
        );
        if (observed)
          providerObservation = {
            available: true,
            providerRef: observed.providerRef,
            status: observed.status,
            referenceMatches: observed.providerRef === operation.providerRef,
          };
      } catch {
        providerObservation = { available: false };
      }
    }
    const payment = operation.attempt.order.payment;
    return {
      operation: {
        id: operation.id,
        attemptId: operation.attemptId,
        actorId: operation.actorId,
        reason: operation.reason,
        state: operation.state,
        createdAt: operation.createdAt,
        updatedAt: operation.updatedAt,
        providerRef: operation.providerRef,
        preProjectionProviderStatus: operation.observedProviderStatus,
        recordedOutcome: operation.outcome,
      },
      currentLocal: {
        attemptState: operation.attempt.state,
        orderState: operation.attempt.order.status,
        paymentState: payment?.status ?? null,
        paymentReference: payment?.stripePaymentIntentId ?? null,
      },
      providerObservation,
      warning:
        "Read-only point-in-time investigation. Current states do not prove which operation caused them or whether a notification was sent. STARTED is not closed and no projection is retried.",
    };
  }
  async investigateReferences(attemptId: string, references: string[]) {
    const attempt = await prisma.checkoutAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundError("Checkout attempt");
    const provider = getPaymentProvider();
    if (provider.key !== attempt.provider || !provider.inspectPaymentReference)
      throw new ConflictError(
        "Original provider reference inspection unavailable",
      );
    const observations = [];
    for (const reference of references) {
      try {
        const fact = await provider.inspectPaymentReference(
          attempt.orderId,
          reference,
        );
        observations.push({
          reference,
          verified: true,
          amount: fact.amount,
          currency: fact.currency,
          status: fact.status,
        });
      } catch {
        observations.push({ reference, verified: false });
      }
    }
    return {
      attemptId,
      observations,
      competingVerifiedReferences:
        observations.filter((o) => o.verified).length > 1,
      selectionMade: false,
      uniquenessEstablished: false,
      warning:
        "Only supplied merchant-found references were checked. This is not a provider-wide search and cannot establish uniqueness. No reference was selected, attached, canceled, charged or refunded.",
    };
  }
  async reconcileStatus(attemptId: string, actorId: string, reason: string) {
    this.operatorMutationsEnabled();
    const attempt = await prisma.checkoutAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundError("Checkout attempt");
    if (attempt.state === "dispatching" || attempt.state === "reserved")
      throw new ConflictError(
        "Isolate active local dispatch before status reconciliation",
      );
    const provider = getPaymentProvider();
    if (
      provider.key !== attempt.provider ||
      !provider.reconcileExistingStatus ||
      !provider.recoverPayment
    )
      throw new ConflictError(
        "Original provider status reconciliation unavailable",
      );
    const payment = await provider.recoverPayment(attempt.orderId);
    if (!payment) throw new ConflictError("Existing reference required");
    if (
      (attempt.result as any)?.providerRef &&
      (attempt.result as any).providerRef !== payment.providerRef
    )
      throw new ConflictError("Reference mismatch requires investigation");
    if (
      (attempt.attachment as any)?.providerRef &&
      (attempt.attachment as any).providerRef !== payment.providerRef
    )
      throw new ConflictError(
        "Attachment reference mismatch requires investigation",
      );
    const operation = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM checkout_attempts WHERE id=${attemptId} FOR UPDATE`;
      if (
        await tx.checkoutStatusOperation.count({
          where: { attemptId, state: "started" },
        })
      )
        throw new ConflictError(
          "A prior status operation has an uncertain outcome. Inspect local/provider facts before retrying.",
        );
      const current = await tx.checkoutAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      if (current.state === "dispatching" || current.state === "reserved")
        throw new ConflictError("Active dispatch requires isolation");
      return tx.checkoutStatusOperation.create({
        data: {
          attemptId,
          actorId,
          reason,
          providerRef: payment.providerRef,
          observedProviderStatus: payment.status,
        },
      });
    });
    // Durable intent precedes local progression/possible customer notification.
    // If projection or outcome write fails, STARTED remains and blocks blind replay.
    try {
      await provider.reconcileExistingStatus(
        attempt.orderId,
        payment.providerRef,
      );
    } catch (error) {
      if (error instanceof PaymentStatusPreEffectError) {
        await prisma.checkoutStatusOperation.update({
          where: { id: operation.id },
          data: {
            state: "failed_before_effects",
            outcome: {
              projectionInvoked: false,
              retryRequiresFreshProviderRead: true,
            },
          },
        });
      }
      throw error;
    }
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: attempt.orderId },
      include: { payment: true },
    });
    const outcome = {
      orderState: order.status,
      localPaymentState: order.payment?.status ?? null,
    };
    await prisma.checkoutStatusOperation.update({
      where: { id: operation.id },
      data: { state: "observed", outcome },
    });
    return {
      attemptId,
      operationId: operation.id,
      attemptState: attempt.state,
      ...outcome,
      preProjectionProviderStatus: payment.status,
      warning:
        "Local payment/order progression and customer notification may have occurred. Provider status shown is the pre-projection snapshot, not a post-effect provider observation. No new charge, capture or refund was requested.",
    };
  }

  async attachReference(
    attemptId: string,
    reference: string,
    actorId: string,
    reason: string,
  ) {
    this.operatorMutationsEnabled();
    const attempt = await prisma.checkoutAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundError("Checkout attempt");
    if (attempt.state !== "unknown")
      throw new ConflictError("Reference attachment requires UNKNOWN");
    const provider = getPaymentProvider();
    if (provider.key !== attempt.provider || !provider.inspectPaymentReference)
      throw new ConflictError(
        "Original provider reference inspection unavailable",
      );
    const verified = await provider.inspectPaymentReference(
      attempt.orderId,
      reference,
    );
    if (
      verified.localReference.stripePaymentIntentId !== verified.providerRef ||
      verified.providerRef !== reference ||
      !Number.isFinite(verified.amount) ||
      verified.amount <= 0
    )
      throw new ConflictError("Reference facts invalid");
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM checkout_attempts WHERE id=${attemptId} FOR UPDATE`;
      const current = await tx.checkoutAttempt.findUniqueOrThrow({
        where: { id: attemptId },
      });
      const order = await tx.order.findUniqueOrThrow({
        where: { id: current.orderId },
      });
      if (
        current.state !== "unknown" ||
        current.attachment ||
        current.provider !== provider.key ||
        !order.currency ||
        verified.currency.toUpperCase() !== order.currency.toUpperCase() ||
        verified.amount !== Number(order.total)
      )
        throw new ConflictError(
          "Attempt or reference changed during verification",
        );
      const payment = await tx.payment.upsert({
        where: { orderId: order.id },
        update: {},
        create: {
          orderId: order.id,
          ...verified.localReference,
          amount: verified.amount,
          currency: verified.currency.toLowerCase(),
          status: "pending",
        },
      });
      if (
        payment.stripePaymentIntentId !==
          verified.localReference.stripePaymentIntentId ||
        Number(payment.amount) !== verified.amount ||
        payment.currency.toLowerCase() !== verified.currency.toLowerCase()
      )
        throw new ConflictError(
          "Existing local payment conflicts; do not overwrite",
        );
      await tx.checkoutAttempt.update({
        where: { id: attemptId },
        data: {
          attachment: {
            actorId,
            reason,
            at: new Date().toISOString(),
            providerRef: verified.providerRef,
            providerStatus: verified.status,
            action: "existing-reference-attached",
          },
        },
      });
      // Pending is a local review state, not an assertion that external money is unpaid.
      // No order transition, cart consumption, capture/refund or new provider request.
      return {
        attemptId,
        attemptState: "unknown",
        recoveryRequired: true,
        providerRef: verified.providerRef,
        providerStatus: verified.status,
        localPaymentState: payment.status,
        statusReconciliationRequired:
          verified.status === "succeeded" && payment.status !== "captured",
        warning:
          verified.status === "succeeded" && payment.status !== "captured"
            ? "Provider reports funds captured but local payment/order progression is not reconciled. Do not charge again. Existing provider-verified status reconciliation is required."
            : null,
      };
    });
  }
  async inspectReference(attemptId: string, reference: string) {
    const attempt = await prisma.checkoutAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundError("Checkout attempt");
    if (attempt.state !== "unknown")
      throw new ConflictError(
        "Reference investigation requires UNKNOWN; isolate active local completion first",
      );
    const provider = getPaymentProvider();
    if (provider.key !== attempt.provider || !provider.inspectPaymentReference)
      throw new ConflictError(
        "Original provider reference inspection unavailable",
      );
    const verified = await provider.inspectPaymentReference(
      attempt.orderId,
      reference,
    );
    return {
      attemptId,
      orderId: attempt.orderId,
      provider: attempt.provider,
      providerRef: verified.providerRef,
      amount: verified.amount,
      currency: verified.currency,
      providerStatus: verified.status,
      externalOutcome: "existing-reference-verified",
      localAttachment: false,
    };
  }
  async isolateDispatch(attemptId: string, actorId: string, reason: string) {
    this.operatorMutationsEnabled();
    // Monotonic local fence only. It neither stops nor cancels an issued external
    // request, and never authorizes another provider create. Late local completion
    // cannot pass finalize's DISPATCHING compare-and-set after this transition.
    const isolated = await prisma.checkoutAttempt.updateMany({
      where: { id: attemptId, state: "dispatching" },
      data: {
        state: "unknown",
        isolation: {
          actorId,
          reason,
          at: new Date().toISOString(),
          action: "dispatch-isolated",
          externalOutcome: "unknown",
        },
      },
    });
    if (isolated.count !== 1)
      throw new ConflictError(
        "Only active dispatch can be isolated. Inspect the current attempt.",
      );
    return {
      attemptId,
      attemptState: "unknown",
      recoveryRequired: true,
      externalOutcome: "unknown",
      message:
        "Local completion is fenced. An external request may still finish. Investigate existing provider references; do not create another payment.",
    };
  }
  async reconcileExisting(attemptId: string, actorId: string, reason: string) {
    this.operatorMutationsEnabled();
    const attempt = await prisma.checkoutAttempt.findUnique({
      where: { id: attemptId },
    });
    if (!attempt) throw new NotFoundError("Checkout attempt");
    if (attempt.state !== "unknown")
      throw new ConflictError(
        "Only an unknown attempt can be reconciled. Active dispatch requires investigation; no timeout is assumed.",
      );
    const provider = getPaymentProvider();
    if (provider.key !== attempt.provider || !provider.recoverPayment)
      throw new ConflictError(
        "Original provider read-only recovery unavailable",
      );
    const payment = await provider.recoverPayment(attempt.orderId);
    if (!payment)
      throw new ConflictError(
        "No local payment reference. Investigate provider records; do not create another payment.",
      );
    if (
      (attempt.result as any)?.providerRef &&
      (attempt.result as any).providerRef !== payment.providerRef
    )
      throw new ConflictError(
        "Existing reference mismatch requires investigation",
      );
    if (payment.status === "canceled")
      throw new ConflictError(
        "Canceled payment requires a separate reviewed resolution",
      );
    const order = await prisma.order.findUniqueOrThrow({
      where: { id: attempt.orderId },
    });
    // Read-only provider validation authorizes no capture/refund/new payment.
    const resolved = await this.finalize(attempt, order, payment, "unknown", {
      actorId,
      reason,
      at: new Date().toISOString(),
      providerRef: payment.providerRef,
      providerStatus: payment.status,
      action: "existing-payment-reconciled",
    });
    const { clientSecret, ...safe } = resolved;
    return safe;
  }
  async checkout(customerId: string, input: CheckoutInput) {
    const key = this.key(input.requestKey),
      intentHash = hash(normalizeIntent(input));
    // Stored key lookup MUST precede both current-cart comparison and capability checks.
    // A provider configuration change or already-consumed cart must not hide an attempt.
    const existing = await prisma.checkoutRequestKey.findUnique({
      where: { customerId_key: { customerId, key } },
      include: { attempt: true },
    });
    if (existing) {
      if (existing.attempt.intentHash !== intentHash)
        throw new ConflictError(
          "Checkout key belongs to different shipping or design intent",
        );
      if (existing.attempt.state !== "reserved")
        return this.recoverAttempt(existing.attempt);
    }
    const provider = getPaymentProvider();
    provider.assertCheckoutAvailable();
    const attempt = await prisma.$transaction(
      async (tx) => {
        // Database-backed, cross-process lock. All reservation paths use this order.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${customerId}, 6102))`;
        const replay = await tx.checkoutRequestKey.findUnique({
          where: { customerId_key: { customerId, key } },
          include: { attempt: true },
        });
        if (replay) {
          if (replay.attempt.intentHash !== intentHash)
            throw new ConflictError(
              "Checkout key belongs to different shipping or design intent",
            );
          return replay.attempt;
        }
        const cart = await tx.cart.findUnique({
          where: { customerId },
          include: { items: { orderBy: { id: "asc" } } },
        });
        if (!cart || !cart.items.length) {
          const unresolved = await tx.checkoutAttempt.findFirst({
            where: {
              customerId,
              state: {
                in: ["reserved", "dispatching", "unknown", "review_required"],
              },
            },
          });
          if (unresolved)
            throw new ConflictError(
              "An existing checkout needs recovery or cart review before another checkout",
            );
          throw new ValidationError("Cart is empty");
        }
        const snapshotHash = hash({ cartId: cart.id, items: cart.items });
        const other = await tx.checkoutAttempt.findUnique({
          where: { customerId_snapshotHash: { customerId, snapshotHash } },
        });
        if (other) {
          if (
            other.intentHash !== intentHash ||
            other.provider !== provider.key
          )
            throw new ConflictError(
              "This cart already has a checkout attempt with different intent",
            );
          await tx.checkoutRequestKey.create({
            data: { customerId, key, attemptId: other.id },
          });
          return other;
        }
        const blocked = await tx.checkoutAttempt.findFirst({
          where: {
            customerId,
            state: {
              in: ["reserved", "dispatching", "unknown", "review_required"],
            },
          },
        });
        if (blocked)
          throw new ConflictError(
            "An existing checkout needs recovery or cart review before another checkout",
          );
        const order = await orderService.createOrder(
          {
            customerId,
            items: cart.items.map((i) => ({
              productType: i.productType as "box" | "bag" | "label",
              quantity: i.quantity,
              dimensions: i.dimensions as any,
              materialCode: i.materialCode || undefined,
              color: i.color || undefined,
              finish: i.finish || undefined,
              productId: i.productId || undefined,
              variantId: i.variantId || undefined,
              sku: i.sku || undefined,
              config: i.config as any,
              designId: i.designId || undefined,
              templateId: i.templateId || undefined,
              sessionId: i.sessionId || undefined,
            })),
            shippingAddress: input.shippingAddress,
            notes: input.notes,
            designSessionId: input.designSessionId,
          },
          { db: tx, notify: false },
        );
        return tx.checkoutAttempt.create({
          data: {
            customerId,
            snapshotHash,
            intentHash,
            provider: provider.key,
            orderId: order.id,
            cartSnapshot: JSON.parse(JSON.stringify(cart.items)),
            keys: { create: { customerId, key } },
          },
        });
      },
      { timeout: 30000 },
    );
    // Claim dispatch durably. No DB transaction is held while contacting a provider.
    const claimed = await prisma.checkoutAttempt.updateMany({
      where: { id: attempt.id, state: "reserved" },
      data: { state: "dispatching" },
    });
    if (!claimed.count) {
      const current = await prisma.checkoutAttempt.findUniqueOrThrow({
        where: { id: attempt.id },
      });
      return this.response(current);
    }
    try {
      const order = await prisma.order.findUniqueOrThrow({
        where: { id: attempt.orderId },
        include: { customer: { include: { user: true } } },
      });
      if (!order.currency)
        throw new Error("Checkout order currency is unavailable");
      try {
        await notificationService.createIfUnseen(
          order.customer.user.id,
          { entityType: "order", entityId: order.id },
          {
            type: "order_created",
            title: `Order ${order.orderNumber} created`,
            message: `Your order ${order.orderNumber} was received and is pending review.`,
            link: `/orders/${order.id}`,
          },
        );
      } catch {
        logger.warn("Checkout notification could not be stored", {
          attemptId: attempt.id,
          orderId: order.id,
          code: "checkout_notification_failed",
        });
      }
      const payment = await provider.createPayment({
        orderId: order.id,
        amount: Number(order.total),
        currency: order.currency.toLowerCase(),
        customerEmail: order.customer.user.email,
      });
      if (!payment.providerRef)
        throw new Error("Provider returned no durable reference");
      // Consumption and recoverable response commit together. Any error after dispatch
      // is ambiguous: retain cart and attempt, never automatically call provider again.
      return await this.finalize(attempt, order, payment, "dispatching");
    } catch {
      logger.warn("Checkout dispatch did not produce a durable local result", {
        attemptId: attempt.id,
        orderId: attempt.orderId,
        provider: attempt.provider,
        code: "checkout_outcome_unknown",
      });
      await prisma.checkoutAttempt.updateMany({
        where: { id: attempt.id, state: "dispatching" },
        data: { state: "unknown" },
      });
      throw new ConflictError(
        "Checkout outcome is unknown. Recover the existing attempt; do not start another payment",
      );
    }
  }
}
export const checkoutService = new CheckoutService();
