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
  async reopenApproval(request:FastifyRequest,reply:FastifyReply){
    const actor=await requireAdmin(request,reply);
    const {reason}=z.object({reason:z.string().trim().min(10).max(2000)}).strict().parse(request.body);
    await approvalService.reopenApproval((request.params as {id:string}).id,actor,reason);
    return reply.send({success:true,message:'Order reopened for fresh review. No email has been sent.'});
  }

  async requestApproval(request: FastifyRequest, reply: FastifyReply) {
    const actor = await requireAdmin(request, reply);
    const orderId = (request.params as { id: string }).id;
    const selection = z.object({printFileId:z.string().min(1),dielineFileId:z.string().min(1).nullable(),renew:z.boolean().optional()}).strict().parse(request.body);
    const result = await approvalService.requestApproval(orderId, actor, selection);

    return reply.send({
      success: true,
      message: result.deliveryState === 'sent' ? 'Approval request sent' : 'Approval request stored; inspect delivery state before any renewal',
      data: result,
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
