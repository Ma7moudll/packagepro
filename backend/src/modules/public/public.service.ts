import { prisma } from '../../lib/prisma';

export class PublicStatsService {
  /**
   * Aggregate real marketplace metrics for public display.
   * All values are computed live from the database (no hardcoded numbers).
   */
  async getStats(): Promise<any> {
    const [completedDeals, registeredFactories, activeTraders, volume, categories] =
      await Promise.all([
        prisma.order.count({
          where: { status: { in: ['delivered', 'completed'] } },
        }),
        prisma.user.count({
          where: { role: 'VENDOR' },
        }),
        prisma.user.count({
          where: { role: 'CUSTOMER' },
        }),
        prisma.order.aggregate({
          where: { status: { not: 'cancelled' } },
          _sum: { total: true },
        }),
        prisma.template.groupBy({
          by: ['category'],
          _count: { id: true },
        }),
      ]);

    return {
      completedDeals: {
        value: completedDeals,
      },
      registeredFactories: {
        value: registeredFactories,
      },
      transactionVolume: {
        value: Number(volume._sum.total ?? 0),
      },
      activeTraders: {
        value: activeTraders,
      },
      categories: Object.fromEntries(
        categories.map((c) => [c.category, c._count.id])
      ),
    };
  }
}

export const publicStatsService = new PublicStatsService();