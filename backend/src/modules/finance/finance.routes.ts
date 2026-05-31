import { FastifyPluginAsync } from 'fastify';
import { financeReportingService } from './reporting.service';
import { authenticate } from '../../middleware/auth.middleware';

export const financeRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/finance/reports', async (request, reply) => {
    await authenticate(request, reply);
    const query = request.query as { start?: string; end?: string };
    const startDate = query.start ? new Date(query.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.end ? new Date(query.end) : new Date();

    const report = await financeReportingService.generateReport(startDate, endDate);

    return reply.send({
      success: true,
      data: report,
    });
  });

  fastify.get('/orders/:id/financial-summary', async (request, reply) => {
    await authenticate(request, reply);
    const orderId = (request.params as { id: string }).id;
    const summary = await financeReportingService.getOrderFinancialSummary(orderId);

    return reply.send({
      success: true,
      data: summary,
    });
  });

  fastify.get('/vendors/:id/payment-summary', async (request, reply) => {
    await authenticate(request, reply);
    const vendorId = (request.params as { id: string }).id;
    const summary = await financeReportingService.getVendorPaymentSummary(vendorId);

    return reply.send({
      success: true,
      data: summary,
    });
  });
};
