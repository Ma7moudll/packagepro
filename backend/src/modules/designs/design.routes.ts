import { FastifyPluginAsync } from 'fastify';
import { designController } from './design.controller';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { artworkReviewService } from './artwork-review.service';
import { z } from 'zod';
import { AppError } from '../../utils/errors';

export const designRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/designs/:id/artwork-reviews', { bodyLimit: 15_000_000 }, async (request, reply) => {
    await authenticate(request, reply);
    const { id } = request.params as { id: string };
    const body = z.object({snapshotHash:z.string().length(64),pdfBase64:z.string().max(14_000_000)}).strict().parse(request.body);
    let result;
    try { result = await artworkReviewService.create(id, (request as AuthenticatedRequest).user.userId, body); }
    catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).header('Cache-Control','private, no-store').send({success:false,error:error.message,code:'ARTWORK_REVIEW_ERROR'});
      throw error;
    }
    return reply.header('Cache-Control','private, no-store').send({success:true,data:result});
  });
  fastify.get('/designs/:id/artwork-reviews/:fileId', async (request, reply) => {
    await authenticate(request, reply);
    const { id, fileId } = request.params as { id: string; fileId: string };
    let result;
    try { result = await artworkReviewService.get(id, fileId, (request as AuthenticatedRequest).user.userId); }
    catch (error) {
      if (error instanceof AppError) return reply.code(error.statusCode).header('Cache-Control','private, no-store').send({success:false,error:error.message,code:'ARTWORK_REVIEW_ERROR'});
      throw error;
    }
    return reply.header('Cache-Control','private, no-store').send({success:true,data:result});
  });
  fastify.get('/designs', async (request, reply) => {
    return designController.listDesigns(request, reply);
  });

  fastify.post('/designs/session', async (request, reply) => {
    return designController.createSession(request, reply);
  });

  fastify.get('/designs/session/:sessionId', async (request, reply) => {
    return designController.getSession(request, reply);
  });

  fastify.post('/designs/save', async (request, reply) => {
    return designController.saveDesign(request, reply);
  });

  fastify.get('/designs/:id', async (request, reply) => {
    return designController.getDesign(request, reply);
  });

  fastify.get('/designs/:id/files', async (request, reply) => {
    return designController.getDesignFiles(request, reply);
  });

  // Lifecycle endpoints
  fastify.post('/designs/:id/submit', async (request, reply) => {
    return designController.submitDesign(request, reply);
  });

  fastify.post('/designs/:id/recall', async (request, reply) => {
    return designController.recallDesign(request, reply);
  });

  // Export endpoints
  fastify.post('/designs/:id/export', async (request, reply) => {
    return designController.exportDesign(request, reply);
  });

  // Review endpoints
  fastify.get('/designs/:id/review', async (request, reply) => {
    return designController.getDesignForReview(request, reply);
  });

  fastify.post('/designs/:id/review/comment', async (request, reply) => {
    return designController.addComment(request, reply);
  });

  fastify.post('/designs/:id/review/approve', async (request, reply) => {
    return designController.approveDesign(request, reply);
  });

  fastify.post('/designs/:id/review/reject', async (request, reply) => {
    return designController.rejectDesign(request, reply);
  });

  fastify.post('/designs/:id/review/request-changes', async (request, reply) => {
    return designController.requestChanges(request, reply);
  });
};
