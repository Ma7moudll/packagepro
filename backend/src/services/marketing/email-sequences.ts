import { getMarketingQueue } from '../../lib/queues';
// Email service would be used by worker processing the marketing queue

export class MarketingEmailService {
  /**
   * Send post-purchase email sequence
   */
  async sendPostPurchaseSequence(orderId: string): Promise<void> {
    const marketingQueue = getMarketingQueue();
    if (!marketingQueue) return;

    try {
      // Thank you email (immediate)
      await marketingQueue.add('marketing-email', {
        type: 'post-purchase-thank-you',
        orderId,
        delay: 0,
      });

      // Review request (24 hours after delivery)
      await marketingQueue.add('marketing-email', {
        type: 'review-request',
        orderId,
        delay: 24 * 60 * 60 * 1000,
      });
    } catch (error) {
      // Queue not available
    }
  }

  /**
   * Send retention emails
   */
  async sendRetentionSequence(customerId: string, orderDate: Date): Promise<void> {
    const twoWeeksLater = new Date(orderDate);
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);

    const thirtyDaysLater = new Date(orderDate);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    const marketingQueue = getMarketingQueue();
    if (!marketingQueue) return;

    try {
      // 2 weeks email
      await marketingQueue.add('marketing-email', {
        type: 'retention-2weeks',
        customerId,
        delay: twoWeeksLater.getTime() - Date.now(),
      });

      // 30 days email
      await marketingQueue.add('marketing-email', {
        type: 'retention-30days',
        customerId,
        delay: thirtyDaysLater.getTime() - Date.now(),
      });
    } catch (error) {
      // Queue not available
    }
  }

  /**
   * Send abandoned cart email
   */
  async sendAbandonedCartEmail(customerId: string, cartId: string): Promise<void> {
    const marketingQueue = getMarketingQueue();
    if (!marketingQueue) return;

    try {
      await marketingQueue.add('marketing-email', {
        type: 'abandoned-cart',
        customerId,
        cartId,
        delay: 2 * 60 * 60 * 1000, // 2 hours
      });
    } catch (error) {
      // Queue not available
    }
  }
}

export const marketingEmailService = new MarketingEmailService();
