import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { notificationService } from '../notifications/notifications.service';
import axios from 'axios';

export class SettlementService {
  /**
   * Process settlement after verification period
   */
  async processSettlement(settlementId: string): Promise<any> {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        order: {
          include: {
            purchaseOrders: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundError('Settlement');
    }

    if (settlement.status !== 'pending') {
      throw new ValidationError('Settlement is not in pending status');
    }

    // Check if verification period has passed
    if (new Date() < settlement.verificationPeriodEndsAt) {
      throw new ValidationError('Verification period has not ended yet');
    }

    // Update status to processing
    await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'processing',
      },
    });

    // Convert currency if needed (USD to EGP example)
    let convertedAmount = Number(settlement.amount);
    let exchangeRate = 1;

    if (settlement.currency === 'USD') {
      // Get exchange rate (simplified - use actual API)
      try {
        const rateResponse = await axios.get(
          `${process.env.EXCHANGE_RATE_API_URL}/latest/USD`,
          {
            params: {
              base: 'USD',
              symbols: 'EGP',
            },
          }
        );
        exchangeRate = rateResponse.data.rates?.EGP || 30; // Fallback
        convertedAmount = Number(settlement.amount) * exchangeRate;
      } catch (error) {
        // Use fallback rate
        exchangeRate = 30;
        convertedAmount = Number(settlement.amount) * exchangeRate;
      }
    }

    // In production, integrate with bank API for actual transfer
    // For now, simulate processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate receipt PDF (simplified)
    const receiptUrl = await this.generateReceipt(settlement);

    // Update settlement
    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        status: 'completed',
        processedAt: new Date(),
        convertedAmount,
        exchangeRate,
        receiptUrl,
      },
    });

    // Send notification email to vendor
    await this.sendSettlementNotification(settlement);

    return updated;
  }

  /**
   * Get settlement by ID
   */
  async getSettlement(settlementId: string): Promise<any> {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
      include: {
        order: {
          include: {
            purchaseOrders: {
              include: {
                vendor: true,
              },
            },
          },
        },
      },
    });

    if (!settlement) {
      throw new NotFoundError('Settlement');
    }

    return settlement;
  }

  /**
   * Get vendor payments
   */
  async getVendorPayments(
    vendorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where: { vendorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.settlement.count({ where: { vendorId } }),
    ]);

    return {
      data: settlements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Generate receipt PDF (simplified)
   */
  private async generateReceipt(settlement: any): Promise<string> {
    // In production, use PDF generator
    return `https://receipts.packagepro.com/${settlement.id}.pdf`;
  }

  /**
   * Send settlement notification
   */
  private async sendSettlementNotification(settlement: any): Promise<void> {
    const { emailService } = await import('../../services/email/email.service');
    // 4a bridge: first PO vendor until orders spawn per-vendor settlements.
    const primaryPO = settlement.order.purchaseOrders[0];
    const vendorUserId = primaryPO?.vendor.user?.id;

    await emailService.sendEmail({
      to: primaryPO?.vendor.user?.email || '',
      subject: `Payment Received - ${settlement.order.orderNumber}`,
      template: 'settlement-notification',
      templateData: { settlement },
    });

    if (vendorUserId) {
      await notificationService.createIfUnseen(
        vendorUserId,
        { entityType: 'settlement', entityId: settlement.id },
        {
          type: 'settlement_completed',
          title: `Settlement completed for ${settlement.order.orderNumber}`,
          message: `Your settlement for ${settlement.order.orderNumber} has been completed.`,
        }
      );
    }
  }
}

export const settlementService = new SettlementService();
