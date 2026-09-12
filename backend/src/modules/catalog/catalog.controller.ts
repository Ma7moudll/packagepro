import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { catalogService } from './catalog.service';

const listQuerySchema = z.object({
  category: z.string().optional(),
  subcategory: z.string().optional(),
});

const quoteSchema = z.object({
  variantId: z.string().optional(),
  quantity: z.number().int().min(1),
  dimensions: z
    .object({
      length: z.number().positive(),
      width: z.number().positive(),
      height: z.number().optional(),
      unit: z.enum(['cm', 'mm', 'inch']),
    })
    .optional(),
  config: z.record(z.string()).optional(),
  complexity: z.enum(['simple', 'medium', 'complex']).optional(),
  taxRate: z.number().min(0).max(1).optional(),
});

export class CatalogController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    const query = listQuerySchema.parse(request.query ?? {});
    const data = await catalogService.listCategories(query);
    return reply.send({ success: true, data });
  }

  async getBySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const data = await catalogService.getProductBySlug(slug);
    return reply.send({ success: true, data });
  }

  async quote(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const body = quoteSchema.parse(request.body);
    const data = await catalogService.quote({
      slug,
      variantId: body.variantId,
      quantity: body.quantity,
      dimensions: body.dimensions,
      config: body.config,
      complexity: body.complexity,
      taxRate: body.taxRate,
    });
    return reply.send({ success: true, data });
  }

  async editorConfig(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string };
    const query = z.object({ quantity: z.coerce.number().int().min(1) }).parse(request.query ?? {});
    const data = await catalogService.getEditorConfig(slug, query.quantity);
    return reply.send({ success: true, data });
  }
}

export const catalogController = new CatalogController();