import { FastifyRequest, FastifyReply } from 'fastify';
import { templateService } from './template.service';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string(),
  thumbnail: z.string().optional(),
  designData: z.unknown(), // Required field
  productType: z.string().optional(),
  boxType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

const listTemplatesSchema = z.object({
  category: z.string().optional(),
  productType: z.string().optional(),
  search: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

export class TemplateController {
  async createTemplate(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const body = createTemplateSchema.parse(request.body);
    const user = (request as AuthenticatedRequest).user;

    const template = await templateService.createTemplate({
      name: body.name,
      description: body.description,
      category: body.category,
      thumbnail: body.thumbnail,
      designData: body.designData ?? {}, // Ensure designData is always provided
      productType: body.productType,
      boxType: body.boxType,
      tags: body.tags,
      isPublic: body.isPublic,
      createdBy: user?.userId,
    });

    return reply.send({
      success: true,
      data: template,
    });
  }

  async getTemplate(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const template = await templateService.getTemplate(id);

    return reply.send({
      success: true,
      data: template,
    });
  }

  async listTemplates(request: FastifyRequest, reply: FastifyReply) {
    const query = listTemplatesSchema.parse(request.query);
    const templates = await templateService.listTemplates(query);

    return reply.send({
      success: true,
      data: templates,
    });
  }

  async updateTemplate(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const { id } = request.params as { id: string };
    const body = createTemplateSchema.partial().parse(request.body);

    const template = await templateService.updateTemplate(id, body);

    return reply.send({
      success: true,
      data: template,
    });
  }

  async deleteTemplate(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const { id } = request.params as { id: string };

    await templateService.deleteTemplate(id);

    return reply.send({
      success: true,
      message: 'Template deleted successfully',
    });
  }

  async getPopular(request: FastifyRequest, reply: FastifyReply) {
    const { limit } = request.query as { limit?: string };
    const templates = await templateService.getPopularTemplates(
      limit ? parseInt(limit) : 10
    );

    return reply.send({
      success: true,
      data: templates,
    });
  }
}

export const templateController = new TemplateController();

