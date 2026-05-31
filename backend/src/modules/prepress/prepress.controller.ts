import { FastifyRequest, FastifyReply } from 'fastify';
import { prePressCheckService } from '../../services/pre-press-checker/prepress.service';
import { authenticate } from '../../middleware/auth.middleware';

export class PrePressController {
  async checkOrder(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const orderId = (request.params as { id: string }).id;
    const result = await prePressCheckService.checkOrderDesign(orderId);

    return reply.send({
      success: true,
      data: result,
    });
  }

  async getResults(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const orderId = (request.params as { id: string }).id;
    const result = await prePressCheckService.getPrePressResults(orderId);

    if (!result) {
      return reply.status(404).send({
        success: false,
        error: 'Pre-press check not found',
      });
    }

    return reply.send({
      success: true,
      data: result,
    });
  }
}

export const prePressController = new PrePressController();
