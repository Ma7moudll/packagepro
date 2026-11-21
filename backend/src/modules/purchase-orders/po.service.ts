import { prisma } from '../../lib/prisma';
import {
  AuthorizationError,
  ConflictError,
  NotFoundError,
  ValidationError,
} from '../../utils/errors';
import { UserRole } from '../../types';
import { logger } from '../../utils/logger';
import { settleVendorForDeliveredOrder } from '../settlements/settlement.service';
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
   *
   * SEC-04A — authorization + idempotency:
   * - ADMIN-only: the controller enforces `requireAdmin`; when `actorRole`
   *   is supplied the service refuses anything but ADMIN as defense in
   *   depth (direct service callers that omit it are trusted internal code).
   * - Idempotent: if POs already exist for the order AND every one is
   *   complete (document uploaded + handshake created), a repeat call is
   *   refused with 409 instead of creating a second set. The old code
   *   re-created a full set on every call because it reset the order to
   *   `ready_for_routing` — the very status the create guard checks.
   * - The order stays `ready_for_routing` after creation on purpose: no
   *   OrderStatus value fits "POs created, awaiting vendor confirmation"
   *   (`vendor_confirmed` is set later, when the vendor accepts the
   *   handshake / confirms the PO). Re-runs are closed by the existing-POs
   *   guard above, not by a status move.
   * - PO rows are created atomically in one `$transaction` (claim the order
   *   row with a no-op update to serialize concurrent creators, re-check
   *   the status and the existing-PO count inside the transaction).
   *   The per-PO side effects (PDF, upload, handshake, email) run AFTER
   *   the transaction commits: `poGenerator.generatePO` re-reads the PO
   *   through the default Prisma client and cannot see uncommitted rows,
   *   so a single transaction around the whole loop is not feasible.
   *   If the side-effect phase fails part-way, the POs are left `pending`
   *   and a repeat call RESUMES them (completes the missing documents /
   *   handshakes) instead of creating duplicates or 409-ing.
   */
  async createPO(orderId: string, actorRole?: UserRole): Promise<any> {
    if (actorRole !== undefined && actorRole !== 'ADMIN') {
      throw new AuthorizationError('Only admins can create purchase orders');
    }

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

    // Idempotency guard: POs already exist for this order. A repeat call is
    // a 409 when every existing PO is complete; incomplete POs (a previous
    // run failed during PDF/upload/handshake/email) are resumed below.
    const existing = await prisma.purchaseOrder.findMany({
      where: { orderId },
      include: {
        vendor: { include: { user: true } },
        order: true,
        handshake: true,
      },
    });
    const incomplete = existing.filter((po: any) => !po.poDocumentUrl || !po.handshake);
    if (existing.length > 0 && incomplete.length === 0) {
      throw new ConflictError('Purchase orders already exist for this order');
    }

    let created: any[];

    // Production files are shared across the POs of one order (there is a
    // single design at launch; per-group file split is a later piece).
    const printFile = order.design?.files.find((f) => f.fileType === 'print_file');
    const dielineFile = order.design?.files.find((f) => f.fileType === 'dieline');

    if (existing.length === 0) {
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

      // Atomic PO-row creation. The no-op order update takes the order row
      // lock, serializing concurrent creators; the second creator then sees
      // the first creator's committed POs in the count check and 409s.
      created = await prisma.$transaction(
        async (tx) => {
          const claimed = await tx.order.updateMany({
            where: { id: orderId, status: 'ready_for_routing' },
            data: { status: 'ready_for_routing' },
          });
          if (claimed.count === 0) {
            throw new ConflictError(
              'Order is not ready for routing (status changed concurrently)'
            );
          }
          const already = await tx.purchaseOrder.count({ where: { orderId } });
          if (already > 0) {
            throw new ConflictError(
              'Purchase orders already exist for this order'
            );
          }

          const rows: any[] = [];
          const year = new Date().getFullYear();
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

            rows.push(
              await tx.purchaseOrder.create({
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
                  vendor: { include: { user: true } },
                  order: true,
                },
              })
            );
          }
          return rows;
        },
        { maxWait: 10000, timeout: 30000 }
      );
    } else {
      // Resume path: finish POs left incomplete by a failed earlier run.
      created = existing;
    }

    // Side-effect phase (post-commit): document + handshake + email per PO.
    // A PO that is already complete is skipped, so a resumed run never
    // re-sends the vendor email.
    const completed: any[] = [];
    for (const po of created) {
      let current = po;
      if (!current.poDocumentUrl) {
        // Generate PO PDF
        const poPDF = await poGenerator.generatePO(current.id);

        // Upload PO PDF
        const poUpload = await fileUploadService.uploadFile(
          poPDF,
          `PO-${current.poNumber}.pdf`,
          'application/pdf',
          `purchase-orders/${current.id}`
        );

        // Update PO with document URL
        current = await prisma.purchaseOrder.update({
          where: { id: current.id },
          data: {
            poDocumentUrl: poUpload.fileUrl,
          },
          include: { vendor: { include: { user: true } }, order: true },
        });
      }

      let handshake = await prisma.handshake.findUnique({
        where: { poId: current.id },
      });
      if (!handshake) {
        // Create handshake
        handshake = await handshakeService.createHandshake(
          current.id,
          current.vendorId
        );

        // Send PO email to vendor
        await emailService.sendEmail({
          to: current.vendor.user.email,
          subject: `Purchase Order ${current.poNumber}`,
          template: 'po-notification',
          templateData: {
            po: current,
            handshake,
            vendor: current.vendor,
          },
        });
      }

      completed.push({
        ...current,
        handshake,
        poDocumentUrl: current.poDocumentUrl,
      });
    }

    // NOTE (SEC-04A): the order deliberately stays `ready_for_routing`
    // (the legacy code wrote the same value back here — a no-op). See the
    // class doc above for why no status move is made.
    return {
      purchaseOrders: completed,
      // Legacy singular shape for consumers that only read the first PO.
      purchaseOrder: completed[0] ?? null,
      count: completed.length,
    };
  }

  /**
   * Get PO by ID
   */
  async getPO(poId: string, actor: { userId: string; role: UserRole }): Promise<any> {
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

    if (actor.role !== 'ADMIN') {
      const vendor = actor.role === 'VENDOR' ? await prisma.vendor.findUnique({ where: { userId: actor.userId } }) : null;
      if (!vendor || vendor.id !== po.vendorId) throw new AuthorizationError('You do not own this purchase order');
    }
    return po;
  }

  /**
   * Confirm PO receipt by vendor.
   *
   * SEC-03a: transactional with the shared settlement helper — if the order
   * is already delivered, the vendor's settlement is ensured in the same
   * transaction (the helper's order-row gate is the serialization point that
   * closes the PO-confirmation race with the DHL webhook delivery path).
   *
   * SEC-04A — ownership + state gate:
   * - Only the vendor who owns the PO (`po.vendorId` matches the caller's
   *   Vendor profile) or ADMIN may confirm. Any other caller gets 403.
   *   `actor` is optional: direct service callers that omit it (trusted
   *   internal code, e.g. the DHL webhook tests) skip the ownership check.
   * - Only a `pending` PO can be confirmed; an already-`confirmed` (or
   *   otherwise moved) PO is refused with 409. This also closes the
   *   confirm-then-settle amplification: confirming a PO on a delivered
   *   order creates a real settlement, so the confirm path must be
   *   ownership-checked first.
   */
  async confirmPO(
    poId: string,
    actor?: { userId: string; role: UserRole }
  ): Promise<any> {
    return prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({
        where: { id: poId },
      });

      if (!po) {
        throw new NotFoundError('Purchase Order');
      }

      if (actor) {
        if (actor.role === 'ADMIN') {
          // Admin may confirm any PO.
        } else if (actor.role === 'VENDOR') {
          const vendor = await tx.vendor.findUnique({
            where: { userId: actor.userId },
          });
          if (!vendor || vendor.id !== po.vendorId) {
            throw new AuthorizationError(
              'You do not own this purchase order'
            );
          }
        } else {
          throw new AuthorizationError(
            'Only the owning vendor or an admin can confirm a purchase order'
          );
        }
      }

      if (po.status !== 'pending') {
        throw new ConflictError(
          `Purchase order cannot be confirmed from status '${po.status}'`
        );
      }

      const updated = await tx.purchaseOrder.update({
        where: { id: poId },
        data: {
          status: 'confirmed',
          confirmedAt: new Date(),
        },
      });

      await settleVendorForDeliveredOrder(
        tx,
        po.orderId,
        po.vendorId,
        'po-confirmed',
        logger
      );

      return updated;
    });
  }
}

export const poService = new POService();
