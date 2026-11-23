import { FastifyPluginAsync } from 'fastify';
import { financeReportingService } from './reporting.service';
import { invoiceService } from './invoice.service';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireAdmin, requireRoles } from '../../middleware/rbac';
import { prisma } from '../../lib/prisma';
import { AuthorizationError, NotFoundError } from '../../utils/errors';

/**
 * Vendor financial summaries are visible to the vendor itself and to admins.
 */
async function assertVendorDataAccess(
  vendorId: string,
  user: { role: string; userId: string }
): Promise<void> {
  if (user.role === 'ADMIN') return;

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
  if (!vendor || vendor.id !== vendorId) {
    throw new AuthorizationError('You do not have access to this vendor data');
  }
}

export const financeRoutes: FastifyPluginAsync = async (fastify) => {
  // Customer-facing invoice download (Decision B): replaces the always-404
  // frontend mock with a real finance-backed PDF stream.
  fastify.get('/orders/:id/invoice', async (request, reply) => {
    await authenticate(request, reply);
    const orderId = (request.params as { id: string }).id;
    const user = (request as AuthenticatedRequest).user;

    const order = await invoiceService.getOrderForCustomer(orderId, user.userId);
    const pdf = await invoiceService.generateInvoice(order);

    reply
      .header('Content-Type', 'application/pdf')
      .header(
        'Content-Disposition',
        `attachment; filename="invoice-${order.orderNumber}.pdf"`
      )
      .send(pdf);
  });
  // Platform P&L reporting — ADMIN console data.
  fastify.get('/finance/reports', async (request, reply) => {
    await requireAdmin(request, reply);
    const query = request.query as { start?: string; end?: string };
    const startDate = query.start ? new Date(query.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.end ? new Date(query.end) : new Date();

    const report = await financeReportingService.generateReport(startDate, endDate);

    return reply.send({
      success: true,
      data: report,
    });
  });

  // Internal platform economics. Owning an order or supplying a PO does not
  // grant access to supplier costs or platform margins.
  fastify.get('/orders/:id/financial-summary', async (request, reply) => {
    await requireAdmin(request, reply);
    const orderId = (request.params as { id: string }).id;
    const summary = await financeReportingService.getOrderFinancialSummary(orderId);
    if (!summary) throw new NotFoundError('Order');

    return reply.send({
      success: true,
      data: summary,
    });
  });

  fastify.get('/vendors/:id/payment-summary', async (request, reply) => {
    const user = await requireRoles(request, reply, 'VENDOR', 'ADMIN');
    const vendorId = (request.params as { id: string }).id;
    await assertVendorDataAccess(vendorId, user);
    const summary = await financeReportingService.getVendorPaymentSummary(vendorId);

    return reply.send({
      success: true,
      data: summary,
    });
  });
};
