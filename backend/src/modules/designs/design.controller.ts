import { FastifyRequest, FastifyReply } from 'fastify';
import { designService } from './design.service';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth.middleware';

const createSessionSchema = z.object({
  orderId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
});

const saveDesignSchema = z.object({
  sessionId: z.string(),
  designData: z.unknown(),
  files: z
    .array(
      z.object({
        fileType: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileSize: z.number().optional(),
        mimeType: z.string().optional(),
        metadata: z.unknown().optional(),
      })
    )
    .optional(),
});

export class DesignController {
  async createSession(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const body = createSessionSchema.parse(request.body);
    const result = await designService.createSession(body);

    return reply.send({
      success: true,
      data: result,
    });
  }

  async getSession(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const sessionId = (request.params as { sessionId: string }).sessionId;
    const session = await designService.getSession(sessionId);

    return reply.send({
      success: true,
      data: session,
    });
  }

  async saveDesign(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const body = saveDesignSchema.parse(request.body);
    const design = await designService.saveDesign(body);

    return reply.send({
      success: true,
      data: design,
    });
  }

  async getDesign(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const designId = (request.params as { id: string }).id;
    const design = await designService.getDesign(designId);

    return reply.send({
      success: true,
      data: design,
    });
  }

  async getDesignFiles(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const designId = (request.params as { id: string }).id;
    const files = await designService.getDesignFiles(designId);

    return reply.send({
      success: true,
      data: files,
    });
  }
}

export const designController = new DesignController();
