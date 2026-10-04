import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { z } from 'zod';

const updateVendorSchema = z.object({
  isActive: z.boolean().optional(),
  qualityRating: z.number().min(0).max(5).optional(),
});

export class AdminController {
  /**
   * Live KPIs for the admin landing page: today's orders/revenue, active
   * vendors, pending handshakes and settlements, plus order status spread.
   */
  async getOverview(_request: FastifyRequest, reply: FastifyReply) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      ordersToday,
      revenueAgg,
      revenueTodayAgg,
      activeVendors,
      totalCustomers,
      pendingHandshakes,
      pendingSettlements,
      ordersByStatus,
    ] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.order.aggregate({ where: { status: { not: 'cancelled' } }, _sum: { total: true }, _count: true }),
      prisma.order.aggregate({
        where: { createdAt: { gte: startOfToday }, status: { not: 'cancelled' } },
        _sum: { total: true },
      }),
      prisma.vendor.count({ where: { isActive: true } }),
      prisma.customer.count(),
      prisma.handshake.count({ where: { status: 'pending' } }),
      prisma.settlement.count({ where: { status: { in: ['pending', 'processing'] } } }),
      prisma.order.groupBy({ by: ['status'], _count: true }),
    ]);

    return reply.send({
      success: true,
      data: {
        ordersToday,
        totalOrders: revenueAgg._count,
        totalRevenue: Number(revenueAgg._sum.total ?? 0),
        revenueToday: Number(revenueTodayAgg._sum.total ?? 0),
        activeVendors,
        totalCustomers,
        pendingHandshakes,
        pendingSettlements,
        ordersByStatus: ordersByStatus.map((row) => ({
          status: row.status,
          count: row._count,
        })),
      },
    });
  }

  /** All platform orders with search (number/email), status filter, pagination. */
  async getOrders(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      search?: string;
    };
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20')));

    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.search) {
      const search = query.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { user: { email: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { include: { user: { select: { email: true, firstName: true, lastName: true } } } },
          items: true,
          payment: { select: { id: true, status: true, amount: true } },
          purchaseOrder: { select: { id: true, poNumber: true, status: true } },
          shipment: { select: { id: true, status: true, dhlTrackingNumber: true } },
        },
      }),
      prisma.order.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** Vendor directory with live operational stats for management actions. */
  async getVendors(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { page?: string; limit?: string; active?: string };
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20')));

    const where: Record<string, unknown> = {};
    if (query.active === 'true') where.isActive = true;
    if (query.active === 'false') where.isActive = false;

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true, lastLoginAt: true } },
          _count: { select: { purchaseOrders: true, handshakes: true, productions: true, reviews: true } },
        },
      }),
      prisma.vendor.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: vendors,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** Activate/deactivate a vendor or adjust their quality rating. */
  async updateVendor(request: FastifyRequest, reply: FastifyReply) {
    const vendorId = (request.params as { id: string }).id;
    const body = updateVendorSchema.parse(request.body);

    const existing = await prisma.vendor.findUnique({ where: { id: vendorId } });
    if (!existing) throw new NotFoundError('Vendor');
    if (Object.keys(body).length === 0) {
      throw new ValidationError('No updatable fields provided');
    }

    const vendor = await prisma.vendor.update({
      where: { id: vendorId },
      data: body,
    });

    return reply.send({ success: true, data: vendor });
  }

  /** QA sample review queue with order/production context, newest first. */
  async getSamples(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { status?: string; page?: string; limit?: string };
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20')));

    const where: Record<string, unknown> = {};
    if (query.status) {
      where.status = query.status;
    }

    const [samples, total] = await Promise.all([
      prisma.sample.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ status: 'desc' }, { updatedAt: 'desc' }],
        include: {
          production: {
            include: {
              purchaseOrder: {
                select: {
                  poNumber: true,
                  order: { select: { id: true, orderNumber: true, status: true } },
                },
              },
              vendor: { select: { id: true, companyName: true } },
            },
          },
        },
      }),
      prisma.sample.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: samples,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }

  /** Customer list with lifetime order count and spend (LTV proxy). */  async getCustomers(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as { page?: string; limit?: string; search?: string };
    const page = Math.max(1, parseInt(query.page || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20')));

    const where: Record<string, unknown> = {};
    if (query.search) {
      const search = query.search.trim();
      where.user = {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true, firstName: true, lastName: true, createdAt: true } },
          orders: { select: { total: true, status: true, createdAt: true } },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: customers.map((customer) => {
        const paidOrders = customer.orders.filter((o) => o.status !== 'cancelled');
        return {
          id: customer.id,
          email: customer.user?.email,
          firstName: customer.user?.firstName,
          lastName: customer.user?.lastName,
          memberSince: customer.user?.createdAt ?? customer.createdAt,
          ordersCount: paidOrders.length,
          lifetimeValue: paidOrders.reduce((sum, o) => sum + Number(o.total), 0),
        };
      }),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }
}

export const adminController = new AdminController();
