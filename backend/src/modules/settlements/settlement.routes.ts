import { FastifyPluginAsync } from 'fastify';
import { settlementService } from './settlement.service';
import { requireAdmin, requireRoles } from '../../middleware/rbac';
import { prisma } from '../../lib/prisma';
import { AuthorizationError } from '../../utils/errors';

/**
 * Vendor payment data is visible to the vendor itself and to admins —
 * not to any authenticated caller passing an arbitrary :id.
 */
async function assertVendorDataAccess(
  vendorId: string,
  user: { role: string; userId: string }
): Promise<void> {
  if (user.role === 'ADMIN') return;

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
  if (!vendor || vendor.id !== vendorId) {
    throw new AuthorizationError('You do not have access to this vendor data');
  }
}

export const settlementRoutes: FastifyPluginAsync = async (fastify) => {
  // Moving money is an ADMIN (finance) action — the settlement worker also
  // processes settlements automatically after the 72h verification window.
  fastify.post('/settlements/process/:id', async (request, reply) => {
    await requireAdmin(request, reply);
    const settlementId = (request.params as { id: string }).id;
    const settlement = await settlementService.processSettlement(settlementId);

    return reply.send({
      success: true,
      data: settlement,
    });
  });

  // SEC-03a — recover a settlement stuck in 'processing' (crashed processor).
  // The 24h age predicate is INSIDE the atomic updateMany, so a live claim
  // (whose updatedAt was just bumped by the claim itself) can never be
  // reverted. Age is a NECESSARY but not sufficient crash signal — before
  // invoking, the admin must verify from operations evidence that no
  // processor holds the row: (1) no processSettlement logs for this id after
  // the row's last update; (2) no open process route call or BullMQ job for
  // the id (the queue currently has no producers); (3) the row's age predates
  // the last backend restart; (4) no external transfer exists — trivially
  // true today, and with a real bank API this becomes the MANDATORY first
  // check (verify-then-resume, never an automatic rollback).
  fastify.post('/settlements/recover/:id', async (request, reply) => {
    const user = await requireAdmin(request, reply);
    const settlementId = (request.params as { id: string }).id;
    await settlementService.recoverStaleSettlement(settlementId, user.userId);
    return reply.send({ success: true });
  });

  fastify.get('/settlements/:id', async (request, reply) => {
    const user = await requireRoles(request, reply, 'VENDOR', 'ADMIN');
    const settlementId = (request.params as { id: string }).id;
    const settlement = await settlementService.getSettlement(settlementId);

    if (settlement && user.role !== 'ADMIN') {
      await assertVendorDataAccess(settlement.vendorId, user);
    }

    return reply.send({
      success: true,
      data: settlement,
    });
  });

  fastify.get('/vendors/:id/payments', async (request, reply) => {
    const user = await requireRoles(request, reply, 'VENDOR', 'ADMIN');
    const vendorId = (request.params as { id: string }).id;
    await assertVendorDataAccess(vendorId, user);

    const query = request.query as { page?: string; limit?: string };
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');

    const result = await settlementService.getVendorPayments(vendorId, page, limit);

    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  });
};
