import { FastifyPluginAsync } from "fastify";
import { requireAdmin } from "../../middleware/rbac";
import { checkoutService } from "./checkout.service";
import { z } from "zod";
import { checkoutController } from "./checkout.controller";

// Fixed per-IP buckets avoid trusting caller-controlled token claims for provider read budgets.
// At most six requests/minute per endpoint; candidate lists are also capped at ten.
const investigationLimit = {
  config: {
    rateLimit: {
      max: 6,
      timeWindow: "1 minute",
      keyGenerator: (request: { ip: string }) => request.ip,
    },
  },
};

export const checkoutRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/admin/checkout-attempts/:id", async (request, reply) => {
    await requireAdmin(request, reply);
    return {
      success: true,
      data: await checkoutService.inspectAttempt(
        (request.params as { id: string }).id,
      ),
    };
  });
  fastify.get(
    "/admin/checkout-status-operations/:id/investigate",
    investigationLimit,
    async (request, reply) => {
      await requireAdmin(request, reply);
      return {
        success: true,
        data: await checkoutService.investigateStatusOperation(
          (request.params as { id: string }).id,
        ),
      };
    },
  );
  fastify.post(
    "/admin/checkout-attempts/:id/investigate-references",
    investigationLimit,
    async (request, reply) => {
      await requireAdmin(request, reply);
      const { references } = z
        .object({
          references: z.array(z.string().trim().min(3).max(200)).min(1).max(10),
        })
        .parse(request.body);
      return {
        success: true,
        data: await checkoutService.investigateReferences(
          (request.params as { id: string }).id,
          [...new Set(references)],
        ),
      };
    },
  );
  fastify.post(
    "/admin/checkout-attempts/:id/reconcile-status",
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      const { reason } = z
        .object({ reason: z.string().trim().min(10).max(1000) })
        .parse(request.body);
      return {
        success: true,
        data: await checkoutService.reconcileStatus(
          (request.params as { id: string }).id,
          admin.userId,
          reason,
        ),
      };
    },
  );
  fastify.post(
    "/admin/checkout-attempts/:id/attach-reference",
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      const { reference, reason } = z
        .object({
          reference: z.string().trim().min(3).max(200),
          reason: z.string().trim().min(10).max(1000),
        })
        .parse(request.body);
      return {
        success: true,
        data: await checkoutService.attachReference(
          (request.params as { id: string }).id,
          reference,
          admin.userId,
          reason,
        ),
      };
    },
  );
  fastify.post(
    "/admin/checkout-attempts/:id/inspect-reference",
    investigationLimit,
    async (request, reply) => {
      await requireAdmin(request, reply);
      const { reference } = z
        .object({ reference: z.string().trim().min(3).max(200) })
        .parse(request.body);
      return {
        success: true,
        data: await checkoutService.inspectReference(
          (request.params as { id: string }).id,
          reference,
        ),
      };
    },
  );
  fastify.post(
    "/admin/checkout-attempts/:id/isolate-dispatch",
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      const { reason } = z
        .object({ reason: z.string().trim().min(10).max(1000) })
        .parse(request.body);
      return {
        success: true,
        data: await checkoutService.isolateDispatch(
          (request.params as { id: string }).id,
          admin.userId,
          reason,
        ),
      };
    },
  );
  fastify.post(
    "/admin/checkout-attempts/:id/reconcile-existing",
    async (request, reply) => {
      const admin = await requireAdmin(request, reply);
      const { reason } = z
        .object({ reason: z.string().trim().min(10).max(1000) })
        .parse(request.body);
      return {
        success: true,
        data: await checkoutService.reconcileExisting(
          (request.params as { id: string }).id,
          admin.userId,
          reason,
        ),
      };
    },
  );
  fastify.get("/checkout/summary", async (request, reply) => {
    return checkoutController.summary(request, reply);
  });

  fastify.get("/checkout/attempt", async (request, reply) =>
    checkoutController.recover(request, reply),
  );

  fastify.post("/checkout", async (request, reply) => {
    return checkoutController.checkout(request, reply);
  });
};
