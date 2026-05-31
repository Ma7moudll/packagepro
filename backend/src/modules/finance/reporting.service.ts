import { prisma } from '../../lib/prisma';

export interface FinancialReport {
  period: {
    start: Date;
    end: Date;
  };
  revenue: number;
  costs: number;
  profit: number;
  orderCount: number;
  averageOrderValue: number;
  vendorPayments: number;
  taxes: number;
}

export class FinanceReportingService {
  /**
   * Generate financial report for a period
   */
  async generateReport(startDate: Date, endDate: Date): Promise<FinancialReport> {
    // Get all completed orders in period
    const orders = await prisma.order.findMany({
      where: {
        status: 'completed',
        completedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        payment: true,
        purchaseOrder: true,
        settlement: true,
      },
    });

    // Calculate metrics
    const revenue = orders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );

    const vendorPayments = orders.reduce((sum, order) => {
      if (order.settlement) {
        return sum + Number(order.settlement.amount);
      }
      return sum;
    }, 0);

    const costs = vendorPayments; // Add other costs if needed
    const profit = revenue - costs;
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;
    const taxes = orders.reduce((sum, order) => sum + Number(order.tax), 0);

    return {
      period: {
        start: startDate,
        end: endDate,
      },
      revenue,
      costs,
      profit,
      orderCount,
      averageOrderValue,
      vendorPayments,
      taxes,
    };
  }

  /**
   * Get order financial summary
   */
  async getOrderFinancialSummary(orderId: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        purchaseOrder: true,
        settlement: true,
      },
    });

    if (!order) {
      return null;
    }

    const revenue = Number(order.total);
    const vendorCost = order.purchaseOrder
      ? Number(order.purchaseOrder.vendorCost)
      : 0;
    const profit = revenue - vendorCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      orderNumber: order.orderNumber,
      revenue,
      vendorCost,
      profit,
      profitMargin,
      tax: Number(order.tax),
      shipping: Number(order.shippingCost),
      paymentStatus: order.payment?.status,
      settlementStatus: order.settlement?.status,
    };
  }

  /**
   * Get vendor payment summary
   */
  async getVendorPaymentSummary(vendorId: string): Promise<any> {
    const settlements = await prisma.settlement.findMany({
      where: {
        vendorId,
        status: 'completed',
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    const totalPaid = settlements.reduce(
      (sum, s) => sum + Number(s.convertedAmount || s.amount),
      0
    );

    const pending = await prisma.settlement.findMany({
      where: {
        vendorId,
        status: { in: ['pending', 'processing'] },
      },
    });

    const totalPending = pending.reduce(
      (sum, s) => sum + Number(s.amount),
      0
    );

    return {
      vendorId,
      totalPaid,
      totalPending,
      completedCount: settlements.length,
      pendingCount: pending.length,
      settlements: settlements.slice(0, 10), // Latest 10
    };
  }
}

export const financeReportingService = new FinanceReportingService();
