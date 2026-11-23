import { FastifyRequest, FastifyReply } from 'fastify';
import { prePressCheckService } from '../../services/pre-press-checker/prepress.service';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { orderService } from '../orders/order.service';

export class PrePressController {
  /**
   * Access rule (same as GET /orders/:id): the owning customer, a vendor with
   * a PO on the order, or an ADMIN. Previously any authenticated user could
   * run a check against, or read the results of, ANY order — an IDOR that
   * also let strangers trigger expensive file processing on other people's
   * orders. orderService.getOrder enforces the rule and throws for everyone
   * else.
   */
  private async authorizeOrderAccess(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<string> {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const orderId = (request.params as { id: string }).id;
    await orderService.getOrder(orderId, user.userId);
    return orderId;
  }

  async checkOrder(request: FastifyRequest, reply: FastifyReply) {
    const orderId = await this.authorizeOrderAccess(request, reply);
    const result = await prePressCheckService.checkOrderDesign(orderId);

    return reply.send({
      success: true,
      data: result,
    });
  }

  async getResults(request: FastifyRequest, reply: FastifyReply) {
    const orderId = await this.authorizeOrderAccess(request, reply);
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
