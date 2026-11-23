import { prisma } from "../../lib/prisma";
import {
  ConflictError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors";
import { notificationService } from "../notifications/notifications.service";

const context = {
  purchaseOrder: { include: { order: true } },
  vendor: true,
} as const;

export class ProductionService {
  /** A retry observes the existing run; it never restarts or erases its progress. */
  async startProduction(poId: string, actor: {userId:string;role:string}) {
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
      if(actor.role !== 'ADMIN') {
        if(actor.role !== 'VENDOR') throw new AuthorizationError('Only the assigned vendor or admin may start production');
        const vendor = await tx.vendor.findUnique({where:{userId:actor.userId},select:{id:true}});
        if(!vendor || vendor.id!==po.vendorId) throw new AuthorizationError('You do not have access to this purchase order');
      }
      const existing = await tx.production.findUnique({
        where: { poId },
        include: context,
      });
      if(existing && existing.vendorId!==po.vendorId) throw new ConflictError('Production vendor differs from purchase order; manual investigation required');
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
      return { production, started: true };
    });
    if (result.started) {
      const orderCustomer = await prisma.order.findUnique({
        where: { id: result.production.purchaseOrder.orderId },
        select: { orderNumber: true, customer: { select: { userId: true } } },
      });
      if (orderCustomer?.customer?.userId)
        await notificationService.createIfUnseen(
          orderCustomer.customer.userId,
          {
            entityType: "order",
            entityId: result.production.purchaseOrder.orderId,
          },
          {
            type: "production_started",
            title: `Production started for ${orderCustomer.orderNumber}`,
            message: `Your order ${orderCustomer.orderNumber} is now in production.`,
            link: `/orders/${result.production.purchaseOrder.orderId}`,
          },
        );
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
    notes?: string
  ): Promise<any> {
    if (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100) {
      throw new ValidationError('Progress must be between 0 and 100');
    }

    const production = await prisma.production.findUnique({
      where: { id: productionId },
    });

    if (!production) {
      throw new NotFoundError('Production');
    }

    const updated = await prisma.production.update({
      where: { id: productionId },
      data: {
        progressPercent,
        notes,
        updatedAt: new Date(),
      },
      include: {
        purchaseOrder: {
          include: {
            order: true,
          },
        },
      },
    });

    // If 100% complete, move to quality check
    if (progressPercent === 100 && production.status === 'in_progress') {
      await this.completeProduction(productionId);
    }

    return updated;
  }

  /**
   * Complete production
   */
  async completeProduction(productionId: string): Promise<any> {
    const production = await prisma.production.findUnique({
      where: { id: productionId },
      include: {
        purchaseOrder: true,
      },
    });

    if (!production) {
      throw new NotFoundError('Production');
    }

    const updated = await prisma.production.update({
      where: { id: productionId },
      data: {
        status: 'quality_review',
        completedAt: new Date(),
        progressPercent: 100,
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: production.purchaseOrder.orderId },
      data: {
        status: 'quality_check',
      },
    });

    return updated;
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
      throw new NotFoundError('Production');
    }

    return production;
  }
}

export const productionService = new ProductionService();
