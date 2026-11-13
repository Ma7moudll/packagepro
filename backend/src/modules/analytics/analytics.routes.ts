import { FastifyPluginAsync } from 'fastify';
import type { ServerResponse } from 'http';
import { analyticsService } from './analytics.service';
import { requireAdmin, requireRoles } from '../../middleware/rbac';
import { prisma } from '../../lib/prisma';

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // Platform-wide funnel metrics — ADMIN console data.
  fastify.get('/analytics/funnel', async (request, reply) => {
    await requireAdmin(request, reply);
    const query = request.query as { start?: string; end?: string };
    const startDate = query.start ? new Date(query.start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.end ? new Date(query.end) : new Date();

    const funnel = await analyticsService.getConversionFunnel(startDate, endDate);

    return reply.send({
      success: true,
      data: funnel,
    });
  });

  fastify.get('/analytics/products', async (request, reply) => {
    await requireAdmin(request, reply);
    const popularity = await analyticsService.getProductPopularity();

    return reply.send({
      success: true,
      data: popularity,
    });
  });

  // Dashboard summary for the ADMIN console. Same shape the frontend composes
  // client-side; served as REST so the console keeps working when the live
  // stream is unavailable.
  fastify.get('/analytics/summary', async (request, reply) => {
    await requireAdmin(request, reply);

    const summary = await analyticsService.getDashboardSummary();

    return reply.send({
      success: true,
      data: summary,
    });
  });

  // Live ADMIN analytics over SSE — mirrors notifications.controller.stream():
  // hijack the reply, `event: summary` snapshots recomputed every 30s, `: ping`
  // heartbeat every 25s (timers unref'd), cleanup on connection close. Auth
  // runs BEFORE the hijack so unauthorized callers get a normal error reply
  // instead of being stuck on a hijacked response.
  fastify.get('/analytics/stream', async (request, reply) => {
    await requireAdmin(request, reply);

    reply.hijack();
    const raw = reply.raw as ServerResponse;

    const origin = request.headers.origin || '*';
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Headers': 'Cache-Control',
      Vary: 'Origin',
    });

    let closed = false;

    const push = async () => {
      if (closed) return;
      try {
        const summary = await analyticsService.getDashboardSummary();
        if (!closed && !raw.writableEnded) {
          raw.write(`event: summary\ndata: ${JSON.stringify(summary)}\n\n`);
        }
      } catch {
        // Transient DB failure — keep the stream open; the interval retries.
      }
    };

    void push();

    const recompute = setInterval(() => {
      void push();
    }, 30000);
    const heartbeat = setInterval(() => {
      if (!closed && !raw.writableEnded) raw.write(': ping\n\n');
    }, 25000);
    recompute.unref();
    heartbeat.unref();

    request.raw.on('close', () => {
      closed = true;
      clearInterval(recompute);
      clearInterval(heartbeat);
    });
  });

  // Vendor performance is visible to the vendor itself and to admins.
  fastify.get('/vendors/:id/performance', async (request, reply) => {
    const user = await requireRoles(request, reply, 'VENDOR', 'ADMIN');
    const vendorId = (request.params as { id: string }).id;

    if (user.role !== 'ADMIN') {
      const vendor = await requireOwnVendorId(user.userId);
      if (vendor !== vendorId) {
        return reply.status(403).send({
          success: false,
          error: 'FORBIDDEN',
          message: 'You do not have access to this vendor performance data',
        });
      }
    }

    const performance = await analyticsService.getVendorPerformance(vendorId);

    return reply.send({
      success: true,
      data: performance,
    });
  });
};

async function requireOwnVendorId(userId: string): Promise<string> {
  const vendor = await prisma.vendor.findUnique({ where: { userId } });
  return vendor?.id ?? '';
}
