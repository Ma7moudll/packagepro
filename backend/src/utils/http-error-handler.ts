import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from './errors';
import { logger } from './logger';

/** Public error envelope is environment-independent. Diagnostics stay server-side. */
export function httpErrorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  logger.error('Request error', error, { requestId: request.id, method: request.method, url: request.url, statusCode: error.statusCode });
  const status = Number.isInteger(error.statusCode) && error.statusCode! >= 400 && error.statusCode! <= 599 ? error.statusCode! : 500;
  if (status >= 500) {
    return reply.status(status).send({ success: false, error: 'INTERNAL_ERROR', message: 'Internal server error', requestId: request.id });
  }
  if (error.validation) {
    return reply.status(400).send({ success: false, error: 'VALIDATION_ERROR', message: 'Validation failed', requestId: request.id });
  }
  if (error instanceof AppError) {
    // Explicit application client errors are actionable; arbitrary details are not a public contract.
    return reply.status(status).send({ success: false, error: error.code || 'ERROR', message: error.message, requestId: request.id });
  }
  const messages: Record<number, string> = {400:'Invalid request',401:'Authentication required',403:'Access denied',404:'Not found',409:'Request conflict',413:'Request too large',415:'Unsupported media type',429:'Too many requests'};
  return reply.status(status).send({ success: false, error: 'REQUEST_ERROR', message: messages[status] || 'Request failed', requestId: request.id });
}
