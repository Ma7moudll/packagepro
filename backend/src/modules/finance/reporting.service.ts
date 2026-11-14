import { prisma } from '../../lib/prisma';

/**
 * SEC-03a — aggregate the order-level settlement status across per-vendor
 * settlements: completed only when ALL are completed; any failure dominates;
 * then processing; otherwise pending.
 */
function aggregateSettlementStatus(
  settlements: Array<{ status: string }>
): string | null {
  if (settlements.length === 0) return null;
  if (settlements.every((s) => s.status === 'completed')) return 'completed';
  if (settlements.some((s) => s.status === 'failed')) return 'failed';
  if (settlements.some((s) => s.status === 'processing')) return 'processing';
  return 'pending';
}

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
        purchaseOrders: true,
        settlements: true,
      },
    });

    // Calculate metrics
    const revenue = orders.reduce(
      (sum, order) => sum + Number(order.total),
      0
    );

    // SEC-03a: an order settles every vendor — sum ALL of its settlements.
    const vendorPayments = orders.reduce(
      (sum, order) =>
        sum + order.settlements.reduce((s, x) => s + Number(x.amount), 0),
      0
    );

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
        purchaseOrders: true,
        settlements: true,
      },
    });

    if (!order) {
      return null;
    }

    const revenue = Number(order.total);
    // 4a bridge: vendor cost aggregates over all POs once splitting lands;
    // today there is at most one PO per order.
    const vendorCost = order.purchaseOrders.reduce(
      (sum: number, po: any) => sum + Number(po.vendorCost ?? 0),
      0
    );
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
      // SEC-03a: aggregate across the order's per-vendor settlements.
      settlementStatus: aggregateSettlementStatus(order.settlements),
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
