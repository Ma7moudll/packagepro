import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { poGenerator } from './po-generator';
import { fileUploadService } from '../../services/file-upload/upload.service';
import { emailService } from '../../services/email/email.service';
import { vendorRouterService } from '../../services/vendor-router/router.service';
import { handshakeService } from '../handshakes/handshake.service';
import { randomUUID } from 'crypto';

/** Minimal shape of an order line needed for grouping and routing. */
export interface RoutedItem {
  productType: string;
  quantity: number;
  totalPrice: any; // Prisma Decimal
  material?: string | null;
}

export interface ItemGroup {
  productType: string;
  items: RoutedItem[];
  /** Sum of quantities in the group (drives router MOQ scoring). */
  quantity: number;
  /** Sum of line totals (drives the per-PO vendor cost). */
  subtotal: number;
}

/**
 * Pure grouping: one item-group per productType, in first-seen order.
 * A mixed-vendor cart becomes several purchase orders — exactly one PO per
 * group (Step-4 Piece 4b).
 */
export function groupOrderItemsByProductType(items: RoutedItem[]): ItemGroup[] {
  const groups = new Map<string, ItemGroup>();

  for (const item of items) {
    let group = groups.get(item.productType);
    if (!group) {
      group = { productType: item.productType, items: [], quantity: 0, subtotal: 0 };
      groups.set(item.productType, group);
    }
    group.items.push(item);
    group.quantity += item.quantity;
    group.subtotal += Number(item.totalPrice ?? 0);
  }

  return Array.from(groups.values());
}

export class POService {
  /**
   * Create Purchase Order(s) for an order.
   *
   * Multi-vendor (Step-4 Piece 4b): items are grouped by productType and each
   * group is routed independently, producing ONE PO per group. A single-type
   * order behaves exactly like the legacy single-PO flow (one PO, plain
   * poNumber without suffix). Groups are routed BEFORE any write, so an
   * unroutable group fails the whole operation without partial PO state.
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

    if (order.items.length === 0) {
      throw new ValidationError('Order has no items to route');
    }

    const groups = groupOrderItemsByProductType(order.items);

    // Pre-flight: route every group first — a missing vendor for any group
    // aborts before a single PO is written (no partial multi-PO state).
    const routings = await Promise.all(
      groups.map((group) =>
        vendorRouterService.routeOrder({
          orderId,
          requirements: { material: group.items[0]?.material ?? undefined },
          quantity: group.quantity,
        })
      )
    );

    // Production files are shared across the POs of one order (there is a
    // single design at launch; per-group file split is a later piece).
    const printFile = order.design?.files.find((f) => f.fileType === 'print_file');
    const dielineFile = order.design?.files.find((f) => f.fileType === 'dieline');

    const year = new Date().getFullYear();
    const created: any[] = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      const routing = routings[i];
      const vendor = routing.selectedVendor;

      // Same simplified cost rule as the legacy flow (60% of the group
      // subtotal), rounded to the cent; per-PO costs sum to 60% of the order.
      const vendorCost = Math.round(group.subtotal * 60) / 100;

      // The suffix keeps poNumbers unique and readable when an order splits.
      const suffix = groups.length > 1 ? `-${group.productType.toUpperCase()}-${i + 1}` : '';
      const poNumber = `PO-${year}-${randomUUID().substring(0, 8).toUpperCase()}${suffix}`;

      const po = await prisma.purchaseOrder.create({
        data: {
          orderId,
          vendorId: vendor.id,
          poNumber,
          productType: group.productType,
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

      created.push({
        ...po,
        handshake,
        poDocumentUrl: poUpload.fileUrl,
      });
    }

    // Update order status (same transition as the legacy single-PO flow).
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'ready_for_routing',
      },
    });

    return {
      purchaseOrders: created,
      // Legacy singular shape for consumers that only read the first PO.
      purchaseOrder: created[0] ?? null,
      count: created.length,
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
