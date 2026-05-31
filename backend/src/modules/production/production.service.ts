import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';

export class ProductionService {
  /**
   * Start production
   */
  async startProduction(poId: string): Promise<any> {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        order: true,
      },
    });

    if (!po) {
      throw new NotFoundError('Purchase Order');
    }

    if (po.status !== 'confirmed') {
      throw new ValidationError('PO must be confirmed before starting production');
    }

    // Create or update production record
    const production = await prisma.production.upsert({
      where: { poId },
      update: {
        status: 'in_progress',
        startedAt: new Date(),
        progressPercent: 0,
      },
      create: {
        poId,
        vendorId: po.vendorId,
        status: 'in_progress',
        startedAt: new Date(),
        progressPercent: 0,
      },
      include: {
        purchaseOrder: {
          include: {
            order: true,
          },
        },
        vendor: true,
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: po.orderId },
      data: {
        status: 'in_production',
      },
    });

    return production;
  }

  /**
   * Update production progress
   */
  async updateProgress(
    productionId: string,
    progressPercent: number,
    notes?: string
  ): Promise<any> {
    if (progressPercent < 0 || progressPercent > 100) {
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
