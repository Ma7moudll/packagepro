import { FastifyRequest, FastifyReply } from 'fastify';
import { approvalService } from './approval.service';
import { requireAdmin } from '../../middleware/rbac';
import { z } from 'zod';

const approveOrderSchema = z.object({
  token: z.string(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export class ApprovalController {
  async requestApproval(request: FastifyRequest, reply: FastifyReply) {
    const actor = await requireAdmin(request, reply);
    const orderId = (request.params as { id: string }).id;
    await approvalService.requestApproval(orderId, actor);

    return reply.send({
      success: true,
      message: 'Approval request sent',
    });
  }

  async approveOrder(request: FastifyRequest, reply: FastifyReply) {
    const orderId = (request.params as { id: string }).id;
    const body = approveOrderSchema.parse(request.body);
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    await approvalService.approveOrder(
      orderId,
      body.token,
      ipAddress,
      userAgent
    );

    return reply.send({
      success: true,
      message: 'Order approved successfully',
    });
  }
}

export const approvalController = new ApprovalController();
