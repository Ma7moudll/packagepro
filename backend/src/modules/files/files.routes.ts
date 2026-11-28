import { FastifyPluginAsync } from 'fastify';
import { fileUploadService } from '../../services/file-upload/upload.service';
import { isFileSigningConfigured, verifyFileSignature } from './signed-url';

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
 * produced by fileUploadService.uploadFile, and must carry ?exp=&sig= from
 * createSignedFileUrl (see signed-url.ts).
 */
export const fileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/files/*', async (request, reply) => {
    const fileKey = (request.params as { '*': string })['*'];
    if (!fileKey) {
      return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
    }

    // Access needs a valid signed, expiring URL. Checked before any disk read.
    if (!isFileSigningConfigured()) {
      return reply.status(503).send({ success: false, error: 'FILE_SIGNING_NOT_CONFIGURED' });
    }
    const q = request.query as { exp?: unknown; sig?: unknown };
    if (!verifyFileSignature(fileKey, q.exp, q.sig)) {
      return reply.status(401).send({ success: false, error: 'UNAUTHORIZED' });
    }

    const file = await fileUploadService.readLocalFile(fileKey);
    if (!file) {
      return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
    }

    const extension = file.extension.toLowerCase();
    const mimeType = MIME_BY_EXTENSION[extension];
    if (!mimeType) {
      return reply.status(404).send({ success: false, error: 'NOT_FOUND' });
    }

    reply
      .header('Content-Type', mimeType)
      .header('X-Content-Type-Options', 'nosniff');

    // SEC: SVG can carry active script. Never render user-uploaded SVG inline
    // on our origin — force a download instead (stored-XSS guard).
    if (extension === 'svg') {
      reply.header('Content-Disposition', 'attachment');
    } else {
      reply.header('Cache-Control', 'private, max-age=60');
    }

    return reply.send(file.buffer);
  });
};
