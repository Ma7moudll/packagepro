import PDFDocument from 'pdfkit';
import { prisma } from '../../lib/prisma';
import { AuthorizationError, NotFoundError } from '../../utils/errors';

function toMoney(value: unknown): string {
  return Number(value ?? 0).toFixed(2);
}

type ItemWithMoney = {
  productType: string;
  sku?: string | null;
  quantity: number;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string } | null;
  material?: string | null;
  unitPrice?: unknown;
  totalPrice?: unknown;
};

export class InvoiceService {
  /**
   * Load an order for a customer-facing invoice, enforcing ownership.
   * ADMIN or the order's own customer may download the invoice.
   */
  async getOrderForCustomer(orderId: string, userId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        customer: { include: { user: true } },
        payment: true,
        design: {
          include: {
            files: {
              where: { fileType: 'preview' },
              take: 1,
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customer: true, vendor: true },
    });

    if (user?.role !== 'ADMIN' && order.customer.user.id !== userId) {
      throw new AuthorizationError('Access denied');
    }

    return order;
  }

  /**
   * Generate an A4 PDF invoice for a customer order.
   */
  async generateInvoice(order: any): Promise<Buffer> {
    const currency = order.currency || order.payment?.currency || 'EGP';

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Invoice #: ${order.orderNumber}`, { align: 'center' });
      doc.fontSize(10).text(
        `Date: ${new Date(order.createdAt).toLocaleDateString()}`,
        { align: 'center' }
      );
      doc.moveDown(2);

      // Customer
      doc.fontSize(12).text('Billed To:', { underline: true });
      const customerUser = order.customer?.user;
      if (customerUser) {
        doc.fontSize(10);
        doc.text(`Name: ${customerUser.name || customerUser.email}`);
        doc.text(`Email: ${customerUser.email}`);
      }
      doc.text(`Order Status: ${String(order.status || '').replace(/_/g, ' ')}`);
      if (order.shippingName) {
        doc.text(`Shipping: ${order.shippingName}${order.shippingPhone ? ` - ${order.shippingPhone}` : ''}`);
      }
      doc.moveDown(2);

      // Items
      doc.fontSize(12).text('Items:', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);
      const items: ItemWithMoney[] = order.items || [];
      items.forEach((item) => {
        const dims = item.dimensions || {};
        const dimsText = dims.length
          ? `${dims.length}×${dims.width}${dims.height ? `×${dims.height}` : ''}${dims.unit || ''}`
          : '';
        const material = item.material ? ` / ${item.material}` : '';
        const sku = item.sku ? ` (SKU ${item.sku})` : '';
        doc.text(
          `- ${item.productType}${sku} x${item.quantity} ${dimsText}${material} — ${currency} ${toMoney(item.totalPrice)}`
        );
        doc.moveDown(0.25);
      });

      // Totals
      doc.moveDown(1);
      doc.fontSize(11);
      doc.text(`Subtotal: ${currency} ${toMoney(order.subtotal)}`);
      doc.text(`Tax: ${currency} ${toMoney(order.tax)}`);
      doc.text(`Shipping: ${currency} ${toMoney(order.shippingCost)}`);
      doc.moveDown(0.25);
      doc.fontSize(13).text(`Total: ${currency} ${toMoney(order.total)}`, { continued: false });

      if (order.payment) {
        doc.moveDown(1);
        doc.fontSize(10).text(
          `Payment: ${String(order.payment.status || '').replace(/_/g, ' ')}`
        );
      }

      doc.end();
    });
  }
}

export const invoiceService = new InvoiceService();