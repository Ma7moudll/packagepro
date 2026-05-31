import { FastifyRequest, FastifyReply } from 'fastify';
import { productionService } from './production.service';
import { authenticate } from '../../middleware/auth.middleware';
import { z } from 'zod';

const updateProgressSchema = z.object({
  progressPercent: z.number().min(0).max(100),
  notes: z.string().optional(),
});

export class ProductionController {
  async startProduction(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const poId = (request.params as { poId: string }).poId;
    const production = await productionService.startProduction(poId);

    return reply.send({
      success: true,
      data: production,
    });
  }

  async updateProgress(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const productionId = (request.params as { id: string }).id;
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
    await authenticate(request, reply);
    const productionId = (request.params as { id: string }).id;
    const production = await productionService.getProduction(productionId);

    return reply.send({
      success: true,
      data: production,
    });
  }
}

export const productionController = new ProductionController();
