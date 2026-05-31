import { FastifyRequest, FastifyReply } from 'fastify';
import { sampleService } from './sample.service';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { z } from 'zod';

// Note: approveSampleSchema was removed as it wasn't being used
const rejectSampleSchema = z.object({
  revisionNotes: z.string(),
});

export class SampleController {
  async uploadSamples(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    // productionId would be used in actual implementation
    // const productionId = (request.params as { productionId: string }).productionId;

    // In production, handle multipart file upload
    // For now, simplified version
    return reply.status(501).send({
      success: false,
      error: 'File upload endpoint needs multipart handling',
    });
  }

  async approveSample(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const sampleId = (request.params as { id: string }).id;

    const sample = await sampleService.approveSample(sampleId, user.userId);

    return reply.send({
      success: true,
      data: sample,
    });
  }

  async rejectSample(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const sampleId = (request.params as { id: string }).id;
    const body = rejectSampleSchema.parse(request.body);

    const sample = await sampleService.rejectSample(
      sampleId,
      user.userId,
      body.revisionNotes
    );

    return reply.send({
      success: true,
      data: sample,
    });
  }

  async getSample(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const sampleId = (request.params as { id: string }).id;
    const sample = await sampleService.getSample(sampleId);

    return reply.send({
      success: true,
      data: sample,
    });
  }
}

export const sampleController = new SampleController();
