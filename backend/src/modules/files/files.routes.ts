import { FastifyPluginAsync } from 'fastify';
import { fileUploadService } from '../../services/file-upload/upload.service';

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
};

/**
 * Serves files uploaded in local-storage mode (S3 not configured).
 * URLs look like /api/files/samples/<productionId>/<uuid>.jpg and are
 * produced by fileUploadService.uploadFile.
 */
export const fileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/files/*', async (request, reply) => {
    const fileKey = (request.params as { '*': string })['*'];
    if (!fileKey) {
      return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
    }

    const file = await fileUploadService.readLocalFile(fileKey);
    if (!file) {
      return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
    }

    const mimeType = MIME_BY_EXTENSION[file.extension.toLowerCase()];
    if (!mimeType) {
      return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
    }

    return reply
      .header('Content-Type', mimeType)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .send(file.buffer);
  });
};
