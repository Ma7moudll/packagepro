import { prisma } from "../../lib/prisma";
import {
  ConflictError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { notificationHub } from "../notifications/notification-hub";
import { logger } from "../../utils/logger";
import { notificationService } from "../notifications/notifications.service";

const context = {
  purchaseOrder: { include: { order: true } },
  vendor: true,
} as const;

export class ProductionService {
  /** A retry observes the existing run; it never restarts or erases its progress. */
  async startProduction(poId: string, actor: { userId: string; role: string }) {
    const result = await prisma.$transaction(async (tx) => {
      const lookup = await tx.purchaseOrder.findUnique({
        where: { id: poId },
        select: { orderId: true },
      });
      if (!lookup) throw new NotFoundError("Purchase Order");
      // Start requests lock order then PO. Other workflow writers are not
      // coordinated here; this is not a whole-lifecycle aggregate-state protocol.
      await tx.$queryRaw`SELECT id FROM orders WHERE id=${lookup.orderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id=${poId} FOR UPDATE`;
      const po = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: poId },
        include: { order: true },
      });
      // Recheck the authenticated actor against the locked PO, not only the
      // controller's earlier observation. Direct DB/operator reassignment is possible.
      if (actor.role !== "ADMIN") {
        if (actor.role !== "VENDOR")
          throw new AuthorizationError(
            "Only the assigned vendor or admin may start production",
          );
        const vendor = await tx.vendor.findUnique({
          where: { userId: actor.userId },
          select: { id: true },
        });
        if (!vendor || vendor.id !== po.vendorId)
          throw new AuthorizationError(
            "You do not have access to this purchase order",
          );
      }
      const existing = await tx.production.findUnique({
        where: { poId },
        include: context,
      });
      if (existing && existing.vendorId !== po.vendorId)
        throw new ConflictError(
          "Production vendor differs from purchase order; manual investigation required",
        );
      if (existing && existing.status !== "not_started")
        return { production: existing, started: false };
      if (po.status !== "confirmed")
        throw new ValidationError(
          "PO must be confirmed before starting production",
        );
      if (!["vendor_confirmed", "in_production"].includes(po.order.status))
        throw new ConflictError("Order is not eligible to start production");
      const production = existing
        ? await tx.production.update({
            where: { id: existing.id },
            data: {
              status: "in_progress",
              startedAt: new Date(),
              progressPercent: 0,
            },
            include: context,
          })
        : await tx.production.create({
            data: {
              poId,
              vendorId: po.vendorId,
              status: "in_progress",
              startedAt: new Date(),
              progressPercent: 0,
            },
            include: context,
          });
      if (po.order.status === "vendor_confirmed")
        await tx.order.update({
          where: { id: po.orderId },
          data: { status: "in_production" },
        });
      const orderCustomer = await tx.order.findUnique({
        where: { id: po.orderId },
        select: { orderNumber: true, customer: { select: { userId: true } } },
      });
      let published: { userId: string; notification: any } | undefined;
      if (orderCustomer?.customer?.userId) {
        const notice = await notificationService.createIfUnseenInTx(
          tx,
          orderCustomer.customer.userId,
          { entityType: "order", entityId: po.orderId },
          {
            type: "production_started",
            title: `Production started for ${orderCustomer.orderNumber}`,
            message: `Your order ${orderCustomer.orderNumber} is now in production.`,
            link: `/orders/${po.orderId}`,
          },
        );
        if (notice.status === "created" && notice.notification)
          published = {
            userId: orderCustomer.customer.userId,
            notification: notice.notification,
          };
      }
      return { production, started: true, published };
    });
    if ("published" in result && result.published) {
      try {
        notificationHub.publish(
          result.published.userId,
          result.published.notification,
        );
      } catch (error) {
        logger.warn(
          "Production-start notice persisted but realtime publish failed",
          error,
        );
      }
    }
    // Reload the relation after its atomic order transition rather than returning stale order state.
    return prisma.production.findUniqueOrThrow({
      where: { id: result.production.id },
      include: context,
    });
  }

  /**
   * Update production progress
   */
  async updateProgress(
    productionId: string,
    progressPercent: number,
    notes: string | undefined,
    actor: { userId: string; role: string },
  ): Promise<any> {
    if (
      !Number.isInteger(progressPercent) ||
      progressPercent < 0 ||
      progressPercent > 100
    ) {
      throw new ValidationError("Progress must be between 0 and 100");
    }

    return this.writeProgress(productionId, progressPercent, notes, actor);
  }

  /** Complete the current run without rewriting an already closed run. */
  async completeProduction(
    productionId: string,
    actor: { userId: string; role: string },
  ): Promise<any> {
    return this.writeProgress(productionId, 100, undefined, actor, true);
  }

  private async writeProgress(
    productionId: string,
    progressPercent: number,
    notes: string | undefined,
    actor: { userId: string; role: string },
    explicitCompletion = false,
  ) {
    return prisma.$transaction(async (tx) => {
      const lookup = await tx.production.findUnique({
        where: { id: productionId },
        select: { poId: true },
      });
      if (!lookup) throw new NotFoundError("Production");
      const poLookup = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id: lookup.poId },
        select: { orderId: true },
      });
      await tx.$queryRaw`SELECT id FROM orders WHERE id=${poLookup.orderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id=${lookup.poId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM productions WHERE id=${productionId} FOR UPDATE`;
      const production = await tx.production.findUniqueOrThrow({
        where: { id: productionId },
        include: { purchaseOrder: { include: { order: true } } },
      });
      if (actor.role !== "ADMIN") {
        if (actor.role !== "VENDOR")
          throw new AuthorizationError(
            "Only the assigned vendor or admin may change production",
          );
        const vendor = await tx.vendor.findUnique({
          where: { userId: actor.userId },
          select: { id: true },
        });
        if (
          !vendor ||
          vendor.id !== production.vendorId ||
          vendor.id !== production.purchaseOrder.vendorId
        )
          throw new AuthorizationError(
            "You do not have access to this production",
          );
      }
      if (production.vendorId !== production.purchaseOrder.vendorId)
        throw new ConflictError(
          "Production vendor differs from purchase order; manual investigation required",
        );
      if (["quality_review", "completed"].includes(production.status))
        throw new ConflictError(
          "Production run is closed for progress changes",
        );
      const completing =
        explicitCompletion ||
        (progressPercent === 100 && production.status === "in_progress");
      if (
        ["cancelled", "shipped", "delivered", "completed"].includes(
          production.purchaseOrder.order.status,
        )
      )
        throw new ConflictError("Order is closed for production changes");
      await tx.production.update({
        where: { id: productionId },
        data: {
          progressPercent,
          ...(notes === undefined ? {} : { notes }),
          ...(completing
            ? { status: "quality_review", completedAt: new Date() }
            : {}),
        },
      });
      // Preserve the existing single-run parent effect here, NOT a multi-PO projection.
      // Aggregate completion/QA/fulfillment policy remains explicitly unresolved.
      if (completing)
        await tx.order.update({
          where: { id: production.purchaseOrder.orderId },
          data: { status: "quality_check" },
        });
      return tx.production.findUniqueOrThrow({
        where: { id: productionId },
        include: { purchaseOrder: { include: { order: true } } },
      });
    });
  }

  /**
   * Get production by ID
   */
  async getProduction(productionId: string): Promise<any> {
    const production = await prisma.production.findUnique({
      where: { id: productionId },
      include: {
        purchaseOrder: {
          include: {
            order: {
              include: {
                items: true,
                design: {
                  include: {
                    files: true,
                  },
                },
              },
            },
          },
        },
        vendor: true,
        samples: true,
      },
    });

    if (!production) {
      throw new NotFoundError("Production");
    }

    return production;
  }
}

export const productionService = new ProductionService();
