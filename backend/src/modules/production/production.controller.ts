import { FastifyRequest, FastifyReply } from 'fastify';
import { productionService } from './production.service';
import {
  assertProductionOwnership,
  requireVendorProfile,
} from '../../middleware/rbac';
import { AuthorizationError } from '../../utils/errors';
import { prisma } from '../../lib/prisma';
import { z } from 'zod';

const updateProgressSchema = z.object({
  progressPercent: z.number().min(0).max(100),
  notes: z.string().max(2000).optional(),
});

export class ProductionController {
  async startProduction(request: FastifyRequest, reply: FastifyReply) {
    // Only the vendor assigned to the PO (or ADMIN) may start production.
    const { user, vendor } = await requireVendorProfile(request, reply);
    const poId = (request.params as { poId: string }).poId;

    if (user.role !== 'ADMIN') {
      const po = await prisma.purchaseOrder.findUnique({
        where: { id: poId },
        select: { vendorId: true },
      });
      if (po && po.vendorId !== vendor.id) {
        throw new AuthorizationError('You do not have access to this purchase order');
      }
    }

    const production = await productionService.startProduction(poId);

    return reply.send({
      success: true,
      data: production,
    });
  }

  async updateProgress(request: FastifyRequest, reply: FastifyReply) {
    const productionId = (request.params as { id: string }).id;
    await assertProductionOwnership(request, reply, productionId);
    const body = updateProgressSchema.parse(request.body);
    const production = await productionService.updateProgress(
      productionId,
      body.progressPercent,
      body.notes
    );

    return reply.send({
      success: true,
      data: production,
    });
  }

  async getProduction(request: FastifyRequest, reply: FastifyReply) {
    const productionId = (request.params as { id: string }).id;
    await assertProductionOwnership(request, reply, productionId);
    const production = await productionService.getProduction(productionId);

    return reply.send({
      success: true,
      data: production,
    });
  }
}

export const productionController = new ProductionController();
