import { FastifyPluginAsync } from 'fastify';
import { handshakeService } from './handshake.service';
import { requireRoles, requireVendorProfile } from '../../middleware/rbac';
import { prisma } from '../../lib/prisma';
import { AuthorizationError } from '../../utils/errors';
import { z } from 'zod';

/**
 * Assert the authenticated VENDOR owns the handshake before acting on it.
 * ADMIN bypasses (platform operations).
 */
async function assertHandshakeOwnership(
  handshakeId: string,
  user: { role: string; userId: string }
): Promise<void> {
  if (user.role === 'ADMIN') return;

  const handshake = await prisma.handshake.findUnique({
    where: { id: handshakeId },
    select: { vendorId: true },
  });
  if (!handshake) {
    // Let the service layer raise the canonical NotFoundError.
    return;
  }

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
  if (!vendor || vendor.id !== handshake.vendorId) {
    throw new AuthorizationError('You do not have access to this handshake');
  }
}

export const handshakeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/handshakes', async (request, reply) => {
    await requireRoles(request, reply, 'ADMIN');
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

  // Handshakes for the signed-in vendor's portal (pending first, then recent).
  fastify.get('/vendors/handshakes', async (request, reply) => {
    const { vendor } = await requireVendorProfile(request, reply);

    const handshakes = await prisma.handshake.findMany({
      where: { vendorId: vendor.id },
      orderBy: [{ status: 'asc' }, { expiresAt: 'asc' }],
      take: 100,
      include: {
        purchaseOrder: {
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                items: true,
              },
            },
          },
        },
      },
    });

    return reply.send({
      success: true,
      data: handshakes,
    });
  });

  fastify.post('/handshakes/:id/accept', async (request, reply) => {
    const user = await requireRoles(request, reply, 'VENDOR', 'ADMIN');
    const handshakeId = (request.params as { id: string }).id;
    await assertHandshakeOwnership(handshakeId, user);

    const handshake = await handshakeService.acceptHandshake(handshakeId);

    return reply.send({
      success: true,
      data: handshake,
    });
  });

  fastify.post('/handshakes/:id/reject', async (request, reply) => {
    const user = await requireRoles(request, reply, 'VENDOR', 'ADMIN');
    const handshakeId = (request.params as { id: string }).id;
    await assertHandshakeOwnership(handshakeId, user);

    const body = z.object({
      reason: z.string().max(1000).optional(),
    }).parse(request.body);

    const handshake = await handshakeService.rejectHandshake(handshakeId, body.reason);

    return reply.send({
      success: true,
      data: handshake,
    });
  });
};
