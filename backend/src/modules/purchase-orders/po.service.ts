import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { poGenerator } from './po-generator';
import { fileUploadService } from '../../services/file-upload/upload.service';
import { emailService } from '../../services/email/email.service';
import { vendorRouterService } from '../../services/vendor-router/router.service';
import { handshakeService } from '../handshakes/handshake.service';
import { randomUUID } from 'crypto';

export class POService {
  /**
   * Create Purchase Order for an order
   */
  async createPO(orderId: string): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        design: {
          include: {
            files: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.status !== 'ready_for_routing') {
      throw new ValidationError('Order is not ready for routing');
    }

    // Route order to vendor
    const routing = await vendorRouterService.routeOrder({
      orderId,
      requirements: {},
    });

    const vendor = routing.selectedVendor;

    // Calculate vendor cost (simplified - in production use actual vendor pricing)
    const vendorCost = Number(order.total) * 0.6; // 60% of total (example)

    // Generate PO number
    const poNumber = `PO-${new Date().getFullYear()}-${randomUUID().substring(0, 8).toUpperCase()}`;

    // Get production files
    const printFile = order.design?.files.find((f) => f.fileType === 'print_file');
    const dielineFile = order.design?.files.find((f) => f.fileType === 'dieline');

    // Create PO
    const po = await prisma.purchaseOrder.create({
      data: {
        orderId,
        vendorId: vendor.id,
        poNumber,
        vendorCost,
        printFileUrl: printFile?.fileUrl,
        dielineFileUrl: dielineFile?.fileUrl,
        status: 'pending',
      },
      include: {
        vendor: true,
        order: true,
      },
    });

    // Generate PO PDF
    const poPDF = await poGenerator.generatePO(po.id);

    // Upload PO PDF
    const poUpload = await fileUploadService.uploadFile(
      poPDF,
      `PO-${poNumber}.pdf`,
      'application/pdf',
      `purchase-orders/${po.id}`
    );

    // Update PO with document URL
    await prisma.purchaseOrder.update({
      where: { id: po.id },
      data: {
        poDocumentUrl: poUpload.fileUrl,
      },
    });

    // Create handshake
    const handshake = await handshakeService.createHandshake(po.id, vendor.id);

    // Send PO email to vendor
    await emailService.sendEmail({
      to: vendor.user.email,
      subject: `Purchase Order ${poNumber}`,
      template: 'po-notification',
      templateData: {
        po,
        handshake,
        vendor,
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'ready_for_routing',
      },
    });

    return {
      ...po,
      handshake,
      poDocumentUrl: poUpload.fileUrl,
    };
  }

  /**
   * Get PO by ID
   */
  async getPO(poId: string): Promise<any> {
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
        handshake: true,
        production: true,
      },
    });

    if (!po) {
      throw new NotFoundError('Purchase Order');
    }

    return po;
  }

  /**
   * Confirm PO receipt by vendor
   */
  async confirmPO(poId: string): Promise<any> {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
    });

    if (!po) {
      throw new NotFoundError('Purchase Order');
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: 'confirmed',
        confirmedAt: new Date(),
      },
    });

    return updated;
  }
}

export const poService = new POService();
