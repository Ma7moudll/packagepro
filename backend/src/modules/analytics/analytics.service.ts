import { prisma } from '../../lib/prisma';

export class AnalyticsService {
  /**
   * Track customer behavior
   */
  async trackEvent(
    userId: string,
    eventType: string,
    properties?: Record<string, any>
  ): Promise<void> {
    // In production, send to analytics service (Mixpanel, PostHog)
    console.log('Analytics Event:', {
      userId,
      eventType,
      properties,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Get conversion funnel data
   */
  async getConversionFunnel(startDate: Date, endDate: Date): Promise<any> {
    const [
      visitors,
      ordersCreated,
      ordersPaid,
      ordersApproved,
      ordersDelivered,
    ] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { not: 'cancelled' },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          payment: {
            status: 'captured',
          },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['ready_for_routing', 'vendor_confirmed', 'in_production'] },
        },
      }),
      prisma.order.count({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: { in: ['delivered', 'completed'] },
        },
      }),
    ]);

    return {
      visitors: visitors * 10, // Estimate
      ordersCreated,
      ordersPaid,
      ordersApproved,
      ordersDelivered,
      conversionRate: ordersDelivered / (visitors * 10),
    };
  }

  /**
   * Get product popularity
   */
  async getProductPopularity(): Promise<any> {
    const items = await prisma.orderItem.groupBy({
      by: ['productType'],
      _count: {
        id: true,
      },
      _sum: {
        quantity: true,
      },
    });

    return items.map((item) => ({
      productType: item.productType,
      orderCount: item._count.id,
      totalQuantity: item._sum.quantity,
    }));
  }

  /**
   * Get vendor performance metrics
   */
  async getVendorPerformance(vendorId: string): Promise<any> {
    const [orders, completed, _productionStats, averageRating] = await Promise.all([
      prisma.purchaseOrder.count({
        where: { vendorId },
      }),
      prisma.purchaseOrder.count({
        where: {
          vendorId,
          order: {
            status: 'completed',
          },
        },
      }),
      prisma.production.aggregate({
        where: {
          vendorId,
          completedAt: { not: null },
        },
      }),
      prisma.review.aggregate({
        where: { vendorId },
        _avg: {
          rating: true,
        },
      }),
    ]);

    return {
      vendorId,
      totalOrders: orders,
      completedOrders: completed,
      completionRate: orders > 0 ? (completed / orders) * 100 : 0,
      averageLeadTime: 0, // Not currently tracked in DB
      averageRating: averageRating._avg.rating || 0,
    };
  }
}

export const analyticsService = new AnalyticsService();
