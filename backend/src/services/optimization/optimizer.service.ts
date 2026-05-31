import { prisma } from '../../lib/prisma';
import { analyticsService } from '../../modules/analytics/analytics.service';

export class OptimizationService {
  /**
   * Analyze and optimize pricing
   */
  async optimizePricing(): Promise<any> {
    // Get order data for analysis
    const orders = await prisma.order.findMany({
      where: {
        status: 'completed',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        items: true,
      },
    });

    // Analyze pricing patterns
    const productMetrics: Record<string, any> = {};

    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (!productMetrics[item.productType]) {
          productMetrics[item.productType] = {
            totalOrders: 0,
            totalRevenue: 0,
            averagePrice: 0,
          };
        }
        productMetrics[item.productType].totalOrders++;
        productMetrics[item.productType].totalRevenue += Number(item.totalPrice);
      });
    });

    // Calculate averages
    Object.keys(productMetrics).forEach((type) => {
      const metrics = productMetrics[type];
      metrics.averagePrice = metrics.totalRevenue / metrics.totalOrders;
    });

    return {
      productMetrics,
      recommendations: this.generatePricingRecommendations(productMetrics),
    };
  }

  /**
   * Generate pricing recommendations
   */
  private generatePricingRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];

    // Simple recommendations based on metrics
    Object.keys(metrics).forEach((type) => {
      if (metrics[type].totalOrders < 10) {
        recommendations.push(
          `Consider marketing ${type} more - low order volume`
        );
      }
    });

    return recommendations;
  }

  /**
   * Optimize vendor routing weights
   */
  async optimizeVendorRouting(): Promise<any> {
    // Analyze vendor performance
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true },
      include: {
        purchaseOrders: {
          include: {
            order: true,
          },
        },
      },
    });

    const vendorPerformance = await Promise.all(
      vendors.map((v) => analyticsService.getVendorPerformance(v.id))
    );

    // Generate recommendations for routing weights
    return {
      vendorPerformance,
      recommendations: this.generateRoutingRecommendations(vendorPerformance),
    };
  }

  /**
   * Generate routing recommendations
   */
  private generateRoutingRecommendations(performance: any[]): string[] {
    const recommendations: string[] = [];

    performance.forEach((vendor) => {
      if (vendor.completionRate < 80) {
        recommendations.push(
          `Vendor ${vendor.vendorId} has low completion rate - review routing priority`
        );
      }
    });

    return recommendations;
  }
}

export const optimizationService = new OptimizationService();
