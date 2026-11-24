import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { fileUploadService } from '../../services/file-upload/upload.service';

export class SampleService {
  /**
   * Upload sample photos
   */
  async uploadSamples(
    productionId: string,
    files: Array<{ buffer: Buffer; fileName: string; mimeType: string }>,
    notes?: string
  ): Promise<any> {
    const production = await prisma.production.findUnique({
      where: { id: productionId },
    });

    if (!production) {
      throw new NotFoundError('Production');
    }

    // Upload files
    const uploadPromises = files.map((file) =>
      fileUploadService.uploadFile(
        file.buffer,
        file.fileName,
        file.mimeType,
        `samples/${productionId}`
      )
    );

    const uploads = await Promise.all(uploadPromises);
    const photoUrls = uploads.map((u) => u.fileUrl);

    // Find existing sample by productionId
    const existingSample = await prisma.sample.findFirst({
      where: { productionId },
    });

    // Create or update sample record
    let sample;
    if (existingSample) {
      sample = await prisma.sample.update({
        where: { id: existingSample.id },
        data: {
          photoUrls,
          status: 'pending',
          notes: notes ?? existingSample.notes,
          updatedAt: new Date(),
        },
      });
    } else {
      sample = await prisma.sample.create({
        data: {
          productionId,
          photoUrls,
          status: 'pending',
          notes,
        },
      });
    }

    // Update production status if needed
    if (production.status === 'in_progress') {
      await prisma.production.update({
        where: { id: productionId },
        data: {
          status: 'sample_production',
        },
      });
    }

    return sample;
  }

  /**
   * Approve sample
   */
  async approveSample(sampleId: string, reviewedBy: string): Promise<any> {
    const sample = await prisma.sample.findUnique({
      where: { id: sampleId },
      include: {
        production: {
          include: {
            purchaseOrder: {
              include: {
                order: true,
              },
            },
          },
        },
      },
    });

    if (!sample) {
      throw new NotFoundError('Sample');
    }

    // Update sample
    const updated = await prisma.sample.update({
      where: { id: sampleId },
      data: {
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date(),
      },
    });

    // Continue production
    await prisma.production.update({
      where: { id: sample.productionId },
      data: {
        status: 'in_progress',
      },
    });

    return updated;
  }

  /**
   * Reject sample
   */
  async rejectSample(
    sampleId: string,
    reviewedBy: string,
    revisionNotes: string
  ): Promise<any> {
    const sample = await prisma.sample.findUnique({
      where: { id: sampleId },
    });

    if (!sample) {
      throw new NotFoundError('Sample');
    }

    const updated = await prisma.sample.update({
      where: { id: sampleId },
      data: {
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        revisionNotes,
      },
    });

    return updated;
  }

  /**
   * Get sample by ID
   */
  async getSample(
    sampleId: string,
    actor: { userId: string; role: string },
  ): Promise<any> {
    if (!["ADMIN", "CUSTOMER", "VENDOR"].includes(actor.role)) throw new NotFoundError("Sample");
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
