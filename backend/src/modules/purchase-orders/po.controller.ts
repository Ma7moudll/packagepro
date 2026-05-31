import { FastifyRequest, FastifyReply } from 'fastify';
import { poService } from './po.service';
import { authenticate } from '../../middleware/auth.middleware';

export class POController {
  async createPO(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const orderId = (request.params as { id: string }).id;
    const po = await poService.createPO(orderId);

    return reply.status(201).send({
      success: true,
      data: po,
    });
  }

  async getPO(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const poId = (request.params as { id: string }).id;
    const po = await poService.getPO(poId);

    return reply.send({
      success: true,
      data: po,
    });
  }

  async confirmPO(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const poId = (request.params as { id: string }).id;
    const po = await poService.confirmPO(poId);

    return reply.send({
      success: true,
      data: po,
    });
  }
}

export const poController = new POController();
