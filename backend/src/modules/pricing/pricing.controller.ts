import { FastifyRequest, FastifyReply } from 'fastify';
import { pricingService } from '../../services/pricing-engine/pricing.service';
import { z } from 'zod';

const calculatePriceSchema = z.object({
  productType: z.enum(['box', 'bag', 'label']),
  quantity: z.number().int().positive(),
  dimensions: z.object({
    length: z.number().positive(),
    width: z.number().positive(),
    height: z.number().optional(),
    unit: z.enum(['cm', 'mm', 'inch']),
  }),
  materialCode: z.string().optional(),
  complexity: z.enum(['simple', 'medium', 'complex']).optional(),
  taxRate: z.number().min(0).max(1).optional(),
  weightPerUnit: z.number().positive().optional(),
});

export class PricingController {
  async calculatePrice(request: FastifyRequest, reply: FastifyReply) {
    const body = calculatePriceSchema.parse(request.body);
    const result = await pricingService.calculatePrice(body);

    return reply.send({
      success: true,
      data: result,
    });
  }

  async getMaterials(_request: FastifyRequest, reply: FastifyReply) {
    const materials = await pricingService.getMaterials();

    return reply.send({
      success: true,
      data: materials,
    });
  }

  async getQuantityPricing(request: FastifyRequest, reply: FastifyReply) {
    const body = calculatePriceSchema.omit({ quantity: true }).parse(request.body);
    const quantities = request.query as { quantities?: string };

    const qtyArray = quantities?.quantities
      ? quantities.quantities.split(',').map(Number)
      : undefined;

    const result = await pricingService.getQuantityPricing(body, qtyArray);

    return reply.send({
      success: true,
      data: result,
    });
  }
}

export const pricingController = new PricingController();
