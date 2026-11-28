import { FastifyRequest, FastifyReply } from 'fastify';
import { designService } from './design.service';
import { z } from 'zod';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { assertAdmin, assertCanReadDesign, assertCanReadSession, trustedRole } from './design-access';

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
  // M7-E: product identity retained on the Design for traceability
  productId: z.string().optional(),
  variantId: z.string().optional(),
  sku: z.string().optional(),
  designConfig: z.unknown().optional(),
});

const exportDesignSchema = z.object({
  format: z.enum(['png', 'pdf', 'ai', 'eps', 'svg']),
  options: z.object({
    dpi: z.number().optional(),
    colorMode: z.enum(['rgb', 'cmyk']).optional(),
    bleedMargin: z.number().optional(),
    // M8-J: marks a certified dieline delivery (svg) instead of a raster job.
    dieline: z.boolean().optional(),
  }).optional(),
});

const addCommentSchema = z.object({
  elementRef: z.string().optional(),
  commentText: z.string(),
  commentType: z.enum(['general', 'revision_request', 'approval_note']).optional(),
});

const approveDesignSchema = z.object({
  notes: z.string().optional(),
});

const rejectDesignSchema = z.object({
  reason: z.string(),
});

const requestChangesSchema = z.object({
  changes: z.array(z.string()),
});

export class DesignController {
  async createSession(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const body = createSessionSchema.parse(request.body);
    const user = (request as AuthenticatedRequest).user;
    const result = await designService.createSession(body, user.userId);

    return reply.send({
      success: true,
      data: result,
    });
  }

  async getSession(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const sessionId = (request.params as { sessionId: string }).sessionId;
    await assertCanReadSession((request as AuthenticatedRequest).user, sessionId);
    const session = await designService.getSession(sessionId);

    return reply.send({
      success: true,
      data: session,
    });
  }

  async listDesigns(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const designs = await designService.listDesigns(user.userId);

    return reply.send({
      success: true,
      data: designs,
    });
  }

  async saveDesign(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const body = saveDesignSchema.parse(request.body);
    const user = (request as AuthenticatedRequest).user;
    // A saved design may only reference local files the user is entitled to.
    {
      const { assertLocalFileUrlsAllowed, prismaRefLoader } = await import('../files/file-access');
      const { prisma } = await import('../../lib/prisma');
      await assertLocalFileUrlsAllowed(
        user,
        (body.files ?? []).map((f) => f.fileUrl),
        prismaRefLoader(prisma as any),
        'POST saveDesign'
      );
    }
    const design = await designService.saveDesign(body, user.userId, { strictSession: true });

    return reply.send({
      success: true,
      data: design,
    });
  }

  async getDesign(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const designId = (request.params as { id: string }).id;
    await assertCanReadDesign((request as AuthenticatedRequest).user, designId);
    const design = await designService.getDesign(designId);

    return reply.send({
      success: true,
      data: design,
    });
  }

  async getDesignFiles(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const designId = (request.params as { id: string }).id;
    await assertCanReadDesign((request as AuthenticatedRequest).user, designId);
    const files = await designService.getDesignFiles(designId);

    return reply.send({
      success: true,
      data: files,
    });
  }

  async submitDesign(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const designId = (request.params as { id: string }).id;
    await assertCanReadDesign(user, designId);

    const design = await designService.submitDesign(designId, user.userId);

    return reply.code(200).send({
      success: true,
      data: design,
    });
  }

  async recallDesign(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const designId = (request.params as { id: string }).id;
    await assertCanReadDesign(user, designId);

    const design = await designService.recallDesign(designId, user.userId);

    return reply.code(200).send({
      success: true,
      data: design,
    });
  }

  async exportDesign(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const designId = (request.params as { id: string }).id;
    await assertCanReadDesign(user, designId);
    const body = exportDesignSchema.parse(request.body);
    
    const result = await designService.exportDesign(designId, user.userId, body);

    // M8-J: certified dieline deliveries are synchronous receipts (200); raster
    // formats return an accepted-job (202).
    if (body.format === 'svg') {
      return reply.code(200).send({
        success: true,
        data: result,
      });
    }

    return reply.code(202).send({
      success: true,
      data: result,
    });
  }

  async getDesignForReview(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const designId = (request.params as { id: string }).id;
    await assertCanReadDesign(user, designId);

    // Viewing is allowed for the owner and admins; only an admin reviewer moves SUBMITTED to IN_REVIEW.
    const design = await designService.getDesignForReview(designId, { startReview: (await trustedRole(user)) === 'ADMIN' });

    return reply.code(200).send({
      success: true,
      data: design,
    });
  }

  async addComment(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const designId = (request.params as { id: string }).id;
    const body = addCommentSchema.parse(request.body);
    await assertCanReadDesign(user, designId);
    
    const comment = await designService.addCommentToDesign(designId, user.userId, body);

    return reply.code(201).send({
      success: true,
      data: comment,
    });
  }

  async approveDesign(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const designId = (request.params as { id: string }).id;
    const adminId = await assertAdmin(user);
    const body = approveDesignSchema.parse(request.body);
    
    const design = await designService.approveDesign(designId, adminId, body.notes);

    return reply.code(200).send({
      success: true,
      data: design,
    });
  }

  async rejectDesign(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const designId = (request.params as { id: string }).id;
    const adminId = await assertAdmin(user);
    const body = rejectDesignSchema.parse(request.body);
    
    const design = await designService.rejectDesign(designId, adminId, body.reason);

    return reply.code(200).send({
      success: true,
      data: design,
    });
  }

  async requestChanges(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const designId = (request.params as { id: string }).id;
    const adminId = await assertAdmin(user);
    const body = requestChangesSchema.parse(request.body);
    
    const result = await designService.requestChanges(designId, adminId, body.changes);

    return reply.code(200).send({
      success: true,
      data: result,
    });
  }
}

export const designController = new DesignController();
