import type { FastifyInstance } from 'fastify';

// Generic design/order/production responses may list a review but must never
// publish its storage locator, owner binding or revision/checksum metadata.
export function redactReviewFileMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactReviewFileMetadata);
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) return value;
  const record=value as Record<string,unknown>;
  if (record.fileType === 'artwork_review') {
    return {
      id:record.id, designId:record.designId, fileType:record.fileType,
      fileName:record.fileName, fileSize:record.fileSize, mimeType:record.mimeType,
      createdAt:record.createdAt, metadata:{productionReady:false},
      // No generic link. Only the owner-authorized review endpoint returns bytes.
      fileUrl:null,
    };
  }
  return Object.fromEntries(Object.entries(record).map(([key,child])=>[key,redactReviewFileMetadata(child)]));
}

export function registerReviewFileRedaction(server: FastifyInstance): void {
  server.addHook('preSerialization', async (_request,_reply,payload)=>redactReviewFileMetadata(payload));
}
