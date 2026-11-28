import { FastifyRequest, FastifyReply } from 'fastify';
import { prePressCheckService } from '../../services/pre-press-checker/prepress.service';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { orderService } from '../orders/order.service';
import { trustedRole } from '../designs/design-access';
import { ValidationError } from '../../utils/errors';

export class PrePressController {
  /**
   * Access rule: the owning customer or an ADMIN (a vendor with a PO on the order
   * can read the order but not run or read pre-press). Previously any authenticated user could
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
    const order = await orderService.getOrder(orderId, user.userId);
    // Pre-press reads the customer's design files and writes the design's check row, so it is limited to the
    // order's customer and admins. A vendor with a PO on the order passes getOrder but not this.
    const isCustomer = order?.customer?.user?.id === user.userId;
    if (!isCustomer && (await trustedRole(user)) !== 'ADMIN') throw new ValidationError('Access denied');
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
