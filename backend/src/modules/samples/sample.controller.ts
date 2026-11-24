import { FastifyRequest, FastifyReply } from 'fastify';
import { sampleService } from './sample.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRoles, assertProductionOwnership } from '../../middleware/rbac';
import { ValidationError } from '../../utils/errors';
import { z } from 'zod';

const rejectSampleSchema = z.object({
  revisionNotes: z.string().min(1),
});

// Photos arrive base64-encoded in JSON (no multipart dependency needed).
// Local-storage mode keeps the buffers on disk; S3 mode forwards them as-is.
const uploadSamplesSchema = z.object({
  photos: z
    .array(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
        dataBase64: z.string().min(1),
      })
    )
    .min(1)
    .max(5),
  notes: z.string().max(2000).optional(),
});

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10MB per photo

export class SampleController {
  async uploadSamples(request: FastifyRequest, reply: FastifyReply) {
    // Vendor (owner of the production) or ADMIN uploads sample photos for QA.
    const productionId = (request.params as { productionId: string }).productionId;
    await assertProductionOwnership(request, reply, productionId);

    const body = uploadSamplesSchema.parse(request.body);
    const files = body.photos.map((photo) => {
      const buffer = Buffer.from(photo.dataBase64, 'base64');
      if (buffer.length === 0) {
        throw new ValidationError(`Photo ${photo.fileName} has empty content`);
      }
      if (buffer.length > MAX_PHOTO_BYTES) {
        throw new ValidationError(
          `Photo ${photo.fileName} exceeds the ${MAX_PHOTO_BYTES} byte limit`
        );
      }
      return { buffer, fileName: photo.fileName, mimeType: photo.mimeType };
    });

    const sample = await sampleService.uploadSamples(productionId, files, body.notes);

    return reply.send({
      success: true,
      data: sample,
    });
  }

  async approveSample(request: FastifyRequest, reply: FastifyReply) {
    // QA review is an ADMIN action — sample approval gates full production.
    const user = await requireRoles(request, reply, 'ADMIN');
    const sampleId = (request.params as { id: string }).id;

    const sample = await sampleService.approveSample(sampleId, user.userId);

    return reply.send({
      success: true,
      data: sample,
    });
  }

  async rejectSample(request: FastifyRequest, reply: FastifyReply) {
    const user = await requireRoles(request, reply, 'ADMIN');
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
    const user = await requireRoles(
      request,
      reply,
      "CUSTOMER",
      "VENDOR",
      "ADMIN",
    );
    const sampleId = (request.params as { id: string }).id;
    const sample = await sampleService.getSample(sampleId, {
      userId: user.userId,
      role: user.role,
    });

    return reply.send({
      success: true,
      data: sample,
    });
  }
}

export type { AuthenticatedRequest };
export const sampleController = new SampleController();
