import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { connectRedis, isRedisEnabled, getRedisClient } from './lib/redis';
import { logger } from './utils/logger';
import { httpErrorHandler } from './utils/http-error-handler';
import { startWorkers, getBackgroundWorkerStatus } from './workers';

import rawBody from 'fastify-raw-body';
import { registerReviewFileRedaction } from './modules/designs/artwork-review-response';

const server = Fastify({
  logger: process.env.NODE_ENV === 'development',
  requestIdLogLabel: 'reqId',
  genReqId: () => crypto.randomUUID(),
  // Only trust X-Forwarded-For when explicitly behind a reverse proxy.
  // Keeps request.ip equal to the socket address in direct deployments,
  // preventing header spoofing from bypassing per-IP rate limits.
  trustProxy: process.env.TRUST_PROXY === 'true',
});

// Strip private review metadata from every nested API file list.
registerReviewFileRedaction(server);

// Register plugins
async function registerPlugins() {
  // Raw body support (must be registered first)
  await server.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: false,
    runFirst: true,
  });

  // CORS
  // Production reflects only the configured frontend origin; the localhost
  // frontend origin is a development convenience and is never allowed in prod.
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    ...(isProduction ? [] : ['http://localhost:3001']),
  ].filter((origin): origin is string => Boolean(origin));

  if (isProduction && !process.env.FRONTEND_URL) {
    console.warn('⚠️  FRONTEND_URL is not set: all cross-origin browser requests will be rejected.');
  }

  await server.register(cors, {
    origin: (origin, cb) => {
      // Requests with no Origin header (server-to-server, webhooks, curl,
      // same-origin navigation) are not subject to CORS. In production we
      // still only allow them through un-reflected (no CORS headers granted).
      if (!origin) {
        cb(null, !isProduction);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  // Rate limiting — per-IP (per-user when authenticated), Redis-backed when available.
  // With Redis the bucket is shared across all server instances; without it the
  // in-memory store is used (graceful degradation).
  const redis = isRedisEnabled() ? getRedisClient() : null;
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis,
    keyGenerator: (request: FastifyRequest) => {
      // Normalize IPv4-mapped IPv6 (::ffff:127.0.0.1 -> 127.0.0.1)
      const ip = (request.ip || request.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');

      // Account-level throttling for authenticated requests so one shared-IP
      // user cannot drain the IP bucket (and vice versa).
      const auth = request.headers.authorization;
      if (auth?.startsWith('Bearer ')) {
        try {
          const payload = JSON.parse(
            Buffer.from(auth.slice(7).split('.')[1] ?? '', 'base64url').toString('utf8')
          );
          if (typeof payload.sub === 'string') {
            return `${ip}:${payload.sub}`;
          }
        } catch {
          // Malformed token — fall back to IP-only key
        }
      }

      return ip;
    },
  });
}

// Request logging middleware
server.addHook('onRequest', async (request: FastifyRequest) => {
  logger.info(`${request.method} ${request.url}`, {
    ip: request.ip,
    userAgent: request.headers['user-agent'],
  });
});

// Response logging middleware
server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
  logger.info(`${request.method} ${request.url} - ${reply.statusCode}`, {
    responseTime: reply.elapsedTime,
  });
});

// Error handler
server.setErrorHandler(httpErrorHandler);

// Root endpoint
server.get('/', async () => {
  return {
    success: true,
    message: 'Welcome to PackagePro API',
    version: '1.0.0',
    documentation: '/api',
    health: '/health',
    endpoints: {
      auth: '/api/auth',
      pricing: '/api/pricing',
      designs: '/api/designs',
      orders: '/api/orders',
      payments: '/api/payments',
      prepress: '/api/prepress',
      purchaseOrders: '/api/purchase-orders',
      production: '/api/production',
      samples: '/api/samples',
      shipments: '/api/shipments',
      reviews: '/api/reviews',
      settlements: '/api/settlements',
      finance: '/api/finance',
      handshakes: '/api/handshakes',
      vendors: '/api/vendors',
      analytics: '/api/analytics',
      templates: '/api/templates',
      notifications: '/api/notifications',
      cart: '/api/cart',
      checkout: '/api/checkout',
    },
  };
});

// Health check endpoint
server.get('/health', async () => {
  const redisReady = isRedisEnabled();
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    // Additive: Redis is optional for boot, but background work (email,
    // settlement, reminder, marketing and export queues) only runs with it.
    redis: redisReady ? 'ready' : 'unavailable',
    backgroundWorkers: getBackgroundWorkerStatus(),
  };
});

// API routes placeholder
server.get('/api', async () => {
  return {
    success: true,
    message: 'PackagePro API v1',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
      },
      pricing: {
        calculate: 'POST /api/pricing/calculate',
        materials: 'GET /api/pricing/materials',
      },
      orders: {
        create: 'POST /api/orders',
        list: 'GET /api/orders',
        get: 'GET /api/orders/:id',
        updateStatus: 'PATCH /api/orders/:id/status',
      },
      payments: {
        createIntent: 'POST /api/payments/create-intent',
        confirm: 'POST /api/payments/confirm',
      },
    },
  };
});

// Register route modules
async function registerRoutes() {
  const { authRoutes } = await import('./modules/auth/auth.routes');
  const { pricingRoutes } = await import('./modules/pricing/pricing.routes');
  const { designRoutes } = await import('./modules/designs/design.routes');
  const { orderRoutes } = await import('./modules/orders/order.routes');
  const { paymentRoutes } = await import('./modules/payments/payment.routes');
  const { prePressRoutes } = await import('./modules/prepress/prepress.routes');
  const { approvalRoutes } = await import('./modules/orders/order.routes');
  const { poRoutes } = await import('./modules/purchase-orders/po.routes');
  const { productionRoutes } = await import('./modules/production/production.routes');
  const { sampleRoutes } = await import('./modules/samples/sample.routes');
  const { shipmentRoutes } = await import('./modules/shipments/shipment.routes');
  const { reviewRoutes } = await import('./modules/reviews/review.routes');
  const { settlementRoutes } = await import('./modules/settlements/settlement.routes');
  const { financeRoutes } = await import('./modules/finance/finance.routes');
  const { handshakeRoutes } = await import('./modules/handshakes/handshake.routes');
  const { vendorRoutes } = await import('./modules/vendors/vendor.routes');
  const { analyticsRoutes } = await import('./modules/analytics/analytics.routes');
  const { templateRoutes } = await import('./modules/templates/template.routes');
  const { notificationRoutes } = await import('./modules/notifications/notifications.routes');
  const { cartRoutes } = await import('./modules/cart/cart.routes');
  const { catalogRoutes } = await import('./modules/catalog/catalog.routes');
  const { checkoutRoutes } = await import('./modules/checkout/checkout.routes');
  const { publicRoutes } = await import('./modules/public/public.routes');
  const { fileRoutes } = await import('./modules/files/files.routes');
  const { adminRoutes } = await import('./modules/admin/admin.routes');

  await server.register(authRoutes, { prefix: '/api' });
  await server.register(pricingRoutes, { prefix: '/api' });
  await server.register(designRoutes, { prefix: '/api' });
  await server.register(orderRoutes, { prefix: '/api' });
  await server.register(paymentRoutes, { prefix: '/api' });
  await server.register(prePressRoutes, { prefix: '/api' });
  await server.register(approvalRoutes, { prefix: '/api' });
  await server.register(poRoutes, { prefix: '/api' });
  await server.register(productionRoutes, { prefix: '/api' });
  await server.register(sampleRoutes, { prefix: '/api' });
  await server.register(shipmentRoutes, { prefix: '/api' });
  await server.register(reviewRoutes, { prefix: '/api' });
  await server.register(settlementRoutes, { prefix: '/api' });
  await server.register(financeRoutes, { prefix: '/api' });
  await server.register(handshakeRoutes, { prefix: '/api' });
  await server.register(vendorRoutes, { prefix: '/api' });
  await server.register(analyticsRoutes, { prefix: '/api' });
  await server.register(templateRoutes, { prefix: '/api' });
  await server.register(notificationRoutes, { prefix: '/api' });
  await server.register(cartRoutes, { prefix: '/api' });
  await server.register(catalogRoutes, { prefix: '/api' });
  await server.register(checkoutRoutes, { prefix: '/api' });
  await server.register(publicRoutes, { prefix: '/api' });
  await server.register(fileRoutes, { prefix: '/api' });
  await server.register(adminRoutes, { prefix: '/api' });

  logger.info('Routes registered');
}

// Redis is optional for boot, but without it the BullMQ workers never start.
// Say so loudly in production instead of at info level.
function warnRedisUnavailable(): void {
  if (process.env.NODE_ENV === 'production') {
    logger.warn(
      'Redis is not available: background workers (email, settlement, reminder, marketing, export) are disabled and queued work will not run. /health reports redis=unavailable.',
    );
  } else {
    logger.info('Running without Redis (optional service)');
  }
}

// Start server
async function start() {
  try {
    // Connect to Redis (optional) BEFORE registering plugins so the rate
    // limiter and export queues get a live client when available.
    try {
      await connectRedis();
      if (isRedisEnabled()) {
        logger.info('Redis connected');
      } else {
        warnRedisUnavailable();
      }
    } catch (error) {
      warnRedisUnavailable();
    }

    // Register plugins
    await registerPlugins();

    // Register routes
    await registerRoutes();

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    logger.info(`Server listening on http://${host}:${port}`);

    // Start background workers after the HTTP surface is up.
    await startWorkers();
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down server...');
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down server...');
  await server.close();
  process.exit(0);
});

start();
