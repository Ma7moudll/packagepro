import { FastifyPluginAsync } from 'fastify';
import { handshakeService } from './handshake.service';
import { authenticate } from '../../middleware/auth.middleware';
import { z } from 'zod';

export const handshakeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/handshakes', async (request, reply) => {
    await authenticate(request, reply);
    const body = z.object({
      poId: z.string(),
      vendorId: z.string(),
    }).parse(request.body);

    const handshake = await handshakeService.createHandshake(body.poId, body.vendorId);

    return reply.send({
      success: true,
      data: handshake,
    });
  });

  fastify.get('/vendors/handshakes', async (request, reply) => {
    await authenticate(request, reply);
    // TODO: Use vendorId from query (request.query as { vendorId?: string }).vendorId
    return reply.send({ success: true, data: [] });
  });

  fastify.post('/handshakes/:id/accept', async (request, reply) => {
    await authenticate(request, reply);
    const handshakeId = (request.params as { id: string }).id;
    const handshake = await handshakeService.acceptHandshake(handshakeId);

    return reply.send({
      success: true,
      data: handshake,
    });
  });

  fastify.post('/handshakes/:id/reject', async (request, reply) => {
    await authenticate(request, reply);
    const handshakeId = (request.params as { id: string }).id;
    const body = z.object({
      reason: z.string().optional(),
    }).parse(request.body);

    const handshake = await handshakeService.rejectHandshake(handshakeId, body.reason);

    return reply.send({
      success: true,
      data: handshake,
    });
  });
};
