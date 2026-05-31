import PDFDocument from 'pdfkit';
// Note: Readable is not needed, PDFDocument handles streaming internally
import { prisma } from '../../lib/prisma';

export class POGenerator {
  /**
   * Generate Purchase Order PDF
   */
  async generatePO(poId: string): Promise<Buffer> {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: {
        order: {
          include: {
            items: true,
            design: {
              include: {
                files: true,
              },
            },
          },
        },
        vendor: true,
      },
    });

    if (!po) {
      throw new Error('Purchase Order not found');
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc.fontSize(20).text('PURCHASE ORDER', { align: 'center' });
      doc.moveDown();
      doc.fontSize(14).text(`PO Number: ${po.poNumber}`, { align: 'center' });
      doc.moveDown(2);

      // Vendor Info
      doc.fontSize(12).text('Vendor Information:', { underline: true });
      doc.text(`Company: ${po.vendor.companyName}`);
      doc.text(`Address: ${po.vendor.address}`);
      doc.text(`City: ${po.vendor.city}, ${po.vendor.country}`);
      if (po.vendor.postalCode) {
        doc.text(`Postal Code: ${po.vendor.postalCode}`);
      }
      doc.moveDown();

      // Order Details
      doc.text('Order Details:', { underline: true });
      doc.text(`Customer Order: ${po.order.orderNumber}`);
      if (po.requestedDeliveryDate) {
        doc.text(`Requested Delivery: ${po.requestedDeliveryDate.toLocaleDateString()}`);
      }
      doc.moveDown();

      // Items
      doc.text('Items:', { underline: true });
      doc.moveDown(0.5);

      po.order.items.forEach((item, index) => {
        doc.fontSize(10);
        doc.text(`${index + 1}. ${item.productType.toUpperCase()}`, { continued: true });
        doc.text(`Qty: ${item.quantity}`, { align: 'right' });
        doc.text(`Dimensions: ${JSON.stringify(item.dimensions)}`);
        if (item.material) doc.text(`Material: ${item.material}`);
        if (item.color) doc.text(`Color: ${item.color}`);
        if (item.finish) doc.text(`Finish: ${item.finish}`);
        doc.moveDown(0.5);
      });

      doc.moveDown();

      // Pricing
      doc.text('Pricing:', { underline: true });
      doc.text(`Vendor Cost: ${po.currency} ${Number(po.vendorCost).toFixed(2)}`);
      doc.moveDown();

      // Files
      doc.text('Production Files:', { underline: true });
      if (po.printFileUrl) doc.text(`- Print File: ${po.printFileUrl}`);
      if (po.dielineFileUrl) doc.text(`- Dieline: ${po.dielineFileUrl}`);
      if (po.specsFileUrl) doc.text(`- Specifications: ${po.specsFileUrl}`);
      doc.moveDown();

      // Terms
      doc.fontSize(9).fillColor('gray').text(
        'Terms and Conditions:\n' +
        '1. Quality must meet specifications\n' +
        '2. Delivery must be on time\n' +
        '3. Samples required before full production\n' +
        '4. Payment terms: Net 30 days'
      );

      doc.end();
    });
  }
}

export const poGenerator = new POGenerator();
