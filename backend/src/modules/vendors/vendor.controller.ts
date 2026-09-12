import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { NotFoundError } from '../../utils/errors';

export class VendorController {
  async getVendorDashboard(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: user.userId },
      include: {
        purchaseOrders: {
          where: {
            status: { in: ['pending', 'confirmed'] },
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
              },
            },
          },
        },
        handshakes: {
          where: {
            status: 'pending',
          },
          include: {
            purchaseOrder: {
              include: {
                order: {
                  select: {
                    orderNumber: true,
                  },
                },
              },
            },
          },
        },
        productions: {
          include: {
            purchaseOrder: {
              select: {
                id: true,
                poNumber: true,
              },
            },
          },
        },
      },
    });

    if (!vendor) {
      return reply.status(404).send({
        success: false,
        error: 'Vendor profile not found',
      });
    }

    // Get payment summary
    const settlements = await prisma.settlement.findMany({
      where: { vendorId: vendor.id },
      select: {
        status: true,
        amount: true,
      },
    });

    const totalPaid = settlements
      .filter((s) => s.status === 'completed')
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const totalPending = settlements
      .filter((s) => s.status === 'pending')
      .reduce((sum, s) => sum + Number(s.amount), 0);

    return reply.send({
      success: true,
      data: {
        vendor: {
          id: vendor.id,
          companyName: vendor.companyName,
          qualityRating: vendor.qualityRating,
        },
        stats: {
          activeOrders: vendor.purchaseOrders.length,
          pendingHandshakes: vendor.handshakes.length,
          totalPaid,
          totalPending,
        },
        pendingHandshakes: vendor.handshakes,
        activeOrders: vendor.purchaseOrders,
      },
    });
  }

  async getVendorOrders(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;

    const vendor = await prisma.vendor.findUnique({
      where: { userId: user.userId },
    });

    if (!vendor) {
      throw new NotFoundError('Vendor');
    }

    const query = request.query as { page?: string; limit?: string; status?: string };
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    const where: any = { vendorId: vendor.id };
    if (query.status) {
      where.status = query.status;
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              items: true,
            },
          },
          handshake: {
            select: {
              id: true,
              status: true,
              expiresAt: true,
              acceptedAt: true,
              rejectedAt: true,
              rejectionReason: true,
            },
          },
          production: true,
        },
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
}

export const vendorController = new VendorController();
