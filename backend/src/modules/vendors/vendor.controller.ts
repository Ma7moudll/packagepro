import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import {
  requireVendorProfile,
} from '../../middleware/rbac';
import { NotFoundError } from '../../utils/errors';
import { z } from 'zod';

export const updateVendorProfileSchema = z.object({
  companyName: z.string().min(2).max(200).optional(),
  phone: z.string().max(30).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
});

export class VendorController {
  async getVendorDashboard(request: FastifyRequest, reply: FastifyReply) {
    const { user } = await requireVendorProfile(request, reply);

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
    const { vendor } = await requireVendorProfile(request, reply);

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
          production: {
            include: {
              samples: {
                orderBy: { updatedAt: 'desc' },
                take: 1,
              },
            },
          },
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

  async getVendorProfile(request: FastifyRequest, reply: FastifyReply) {
    const { vendor } = await requireVendorProfile(request, reply);

    return reply.send({
      success: true,
      data: {
        id: vendor.id,
        companyName: vendor.companyName,
        taxId: vendor.taxId,
        address: vendor.address,
        city: vendor.city,
        country: vendor.country,
        postalCode: vendor.postalCode,
        phone: vendor.phone,
        email: vendor.email,
        isActive: vendor.isActive,
        qualityRating: vendor.qualityRating,
        averageLeadTime: vendor.averageLeadTime,
        minOrderQuantity: vendor.minOrderQuantity,
        createdAt: vendor.createdAt,
      },
    });
  }

  async updateVendorProfile(request: FastifyRequest, reply: FastifyReply) {
    const { vendor } = await requireVendorProfile(request, reply);
    const body = updateVendorProfileSchema.parse(request.body);

    const updated = await prisma.vendor.update({
      where: { id: vendor.id },
      data: body,
    });

    return reply.send({
      success: true,
      data: updated,
    });
  }
}

export const vendorController = new VendorController();
