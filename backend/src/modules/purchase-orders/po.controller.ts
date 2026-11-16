import { FastifyRequest, FastifyReply } from 'fastify';
import { poService } from './po.service';
import {
  authenticate,
  AuthenticatedRequest,
} from '../../middleware/auth.middleware';
import { requireAdmin } from '../../middleware/rbac';
import { AuthorizationError } from '../../utils/errors';

export class POController {
  /**
   * SEC-04A: ADMIN-only. Previously any authenticated user could trigger
   * routing and create purchase orders.
   */
  async createPO(request: FastifyRequest, reply: FastifyReply) {
    const user = await requireAdmin(request, reply);
    const orderId = (request.params as { id: string }).id;
    const po = await poService.createPO(orderId, user.role);

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

  /**
   * SEC-04A: only the vendor who owns the PO or ADMIN. The service
   * enforces ownership (vendorId match) and the pending-only state gate;
   * CUSTOMER (and any other non-vendor, non-admin role) is refused here.
   */
  async confirmPO(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    if (user.role !== 'ADMIN' && user.role !== 'VENDOR') {
      throw new AuthorizationError(
        'Only the owning vendor or an admin can confirm a purchase order'
      );
    }
    const poId = (request.params as { id: string }).id;
    const po = await poService.confirmPO(poId, {
      userId: user.userId,
      role: user.role,
    });

    return reply.send({
      success: true,
      data: po,
    });
  }
}

export const poController = new POController();
