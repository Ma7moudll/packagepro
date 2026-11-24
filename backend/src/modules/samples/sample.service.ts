import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma";
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
} from "../../utils/errors";
import { fileUploadService } from "../../services/file-upload/upload.service";

export class SampleService {
  /**
   * Upload sample photos
   */
  async uploadSamples(
    productionId: string,
    files: Array<{ buffer: Buffer; fileName: string; mimeType: string }>,
    notes: string | undefined,
    actor: { userId: string; role: string },
  ): Promise<any> {
    const observed = await prisma.production.findUnique({
      where: { id: productionId },
      include: { samples: true, purchaseOrder: { include: { order: true } } },
    });
    if (!observed) throw new NotFoundError("Production");
    const existing = observed.samples;
    if (existing.length > 1)
      throw new ConflictError("Multiple sample records require investigation");
    const previous = existing[0];
    if (actor.role !== "ADMIN") {
      const vendor =
        actor.role === "VENDOR"
          ? await prisma.vendor.findUnique({ where: { userId: actor.userId } })
          : null;
      if (
        !vendor ||
        vendor.id !== observed.vendorId ||
        vendor.id !== observed.purchaseOrder.vendorId
      )
        throw new AuthorizationError(
          "You do not have access to this production",
        );
    }
    if (
      ["quality_review", "completed"].includes(observed.status) ||
      ["cancelled", "shipped", "delivered", "completed"].includes(
        observed.purchaseOrder.order.status,
      )
    )
      throw new ConflictError("Production is closed for sample upload");

    const uploads = await Promise.all(
      files.map((file) =>
        fileUploadService.uploadFile(
          file.buffer,
          file.fileName,
          file.mimeType,
          `samples/${productionId}`,
        ),
      ),
    );
    // New file objects are staged outside the transaction. A conflict may leave
    // unreferenced objects; no old/reviewed file is deleted or overwritten here.
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id=${observed.purchaseOrder.orderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id=${observed.poId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM productions WHERE id=${productionId} FOR UPDATE`;
      const current = await tx.production.findUniqueOrThrow({
        where: { id: productionId },
        include: { samples: true, purchaseOrder: { include: { order: true } } },
      });
      if (actor.role !== "ADMIN") {
        const vendor =
          actor.role === "VENDOR"
            ? await tx.vendor.findUnique({ where: { userId: actor.userId } })
            : null;
        if (
          !vendor ||
          vendor.id !== current.vendorId ||
          vendor.id !== current.purchaseOrder.vendorId
        )
          throw new AuthorizationError(
            "You do not have access to this production",
          );
      }
      if (current.vendorId !== current.purchaseOrder.vendorId)
        throw new ConflictError(
          "Production vendor differs from purchase order",
        );
      if (current.samples.length > 1)
        throw new ConflictError(
          "Multiple sample records require investigation",
        );
      const latest = current.samples[0];
      if (
        latest?.id !== previous?.id ||
        latest?.submissionId !== previous?.submissionId ||
        latest?.status !== previous?.status ||
        current.status !== observed.status
      )
        throw new ConflictError(
          "Sample changed during upload; reload before retrying",
        );
      if (
        ["quality_review", "completed"].includes(current.status) ||
        ["cancelled", "shipped", "delivered", "completed"].includes(
          current.purchaseOrder.order.status,
        )
      )
        throw new ConflictError("Production is closed for sample upload");
      const data = {
        photoUrls: uploads.map((u) => u.fileUrl),
        submissionId: randomUUID(),
        status: "pending" as const,
        notes: notes ?? latest?.notes,
        reviewedAt: null,
        reviewedBy: null,
        revisionNotes: null,
      };
      const sample = latest
        ? await tx.sample.update({ where: { id: latest.id }, data })
        : await tx.sample.create({ data: { ...data, productionId } });
      if (current.status === "in_progress")
        await tx.production.update({
          where: { id: productionId },
          data: { status: "sample_production" },
        });
      return sample;
    });
  }

  /**
   * Approve sample
   */
  async approveSample(
    sampleId: string,
    reviewedBy: string,
    submissionId: string,
  ): Promise<any> {
    return this.reviewSample(sampleId, reviewedBy, "approved", submissionId);
  }

  async rejectSample(
    sampleId: string,
    reviewedBy: string,
    revisionNotes: string,
    submissionId: string,
  ): Promise<any> {
    return this.reviewSample(
      sampleId,
      reviewedBy,
      "rejected",
      submissionId,
      revisionNotes,
    );
  }

  private async reviewSample(
    sampleId: string,
    reviewedBy: string,
    decision: "approved" | "rejected",
    submissionId: string,
    revisionNotes?: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const lookup = await tx.sample.findUnique({
        where: { id: sampleId },
        select: {
          production: {
            select: {
              id: true,
              poId: true,
              purchaseOrder: { select: { orderId: true } },
            },
          },
        },
      });
      if (!lookup) throw new NotFoundError("Sample");
      await tx.$queryRaw`SELECT id FROM orders WHERE id=${lookup.production.purchaseOrder.orderId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM purchase_orders WHERE id=${lookup.production.poId} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM productions WHERE id=${lookup.production.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM samples WHERE id=${sampleId} FOR UPDATE`;
      const sample = await tx.sample.findUniqueOrThrow({
        where: { id: sampleId },
        include: {
          production: {
            include: { purchaseOrder: { include: { order: true } } },
          },
        },
      });
      if (sample.submissionId !== submissionId)
        throw new ConflictError(
          "Sample submission changed; reload before reviewing",
        );
      if (sample.status === decision) {
        // Same decision retry observes persisted metadata; it must not resume an old run.
        const { production, ...result } = sample;
        return result;
      }
      if (sample.status !== "pending")
        throw new ConflictError("Sample was already reviewed");
      if (["quality_review", "completed"].includes(sample.production.status))
        throw new ConflictError("Production run is closed for sample review");
      if (
        ["cancelled", "shipped", "delivered", "completed"].includes(
          sample.production.purchaseOrder.order.status,
        )
      )
        throw new ConflictError("Order is closed for sample review");
      const updated = await tx.sample.update({
        where: { id: sampleId },
        data: {
          status: decision,
          reviewedBy,
          reviewedAt: new Date(),
          ...(decision === "rejected" ? { revisionNotes } : {}),
        },
      });
      if (decision === "approved")
        await tx.production.update({
          where: { id: sample.productionId },
          data: { status: "in_progress" },
        });
      return updated;
    });
  }

  /**
   * Get sample by ID
   */
  async getSample(
    sampleId: string,
    actor: { userId: string; role: string },
  ): Promise<any> {
    if (!["ADMIN", "CUSTOMER", "VENDOR"].includes(actor.role))
      throw new NotFoundError("Sample");
    const sample = await prisma.sample.findFirst({
      where: {
        id: sampleId,
        ...(actor.role === "ADMIN"
          ? {}
          : actor.role === "CUSTOMER"
            ? {
                production: {
                  purchaseOrder: {
                    order: { customer: { userId: actor.userId } },
                  },
                },
              }
            : actor.role === "VENDOR"
              ? {
                  production: {
                    vendor: { userId: actor.userId },
                    purchaseOrder: { vendor: { userId: actor.userId } },
                  },
                }
              : { id: sampleId }),
      },
      include: {
        production: {
          include: {
            purchaseOrder: {
              include: {
                order: {
                  include: {
                    design: {
                      include: {
                        files: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!sample) {
      throw new NotFoundError("Sample");
    }

    return sample;
  }
}

export const sampleService = new SampleService();
