import 'dotenv/config';
import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { connectRedis } from './lib/redis';
import { logger } from './utils/logger';
import { AppError } from './utils/errors';

import rawBody from 'fastify-raw-body';

const server = Fastify({
  logger: process.env.NODE_ENV === 'development',
  requestIdLogLabel: 'reqId',
  genReqId: () => crypto.randomUUID(),
});

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
  await server.register(cors, {
    origin: (origin, cb) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL || 'http://localhost:3001',
        'http://localhost:3001',
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error('Not allowed by CORS'), false);
      }
    },
    credentials: true,
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    keyGenerator: (_request) => {
      // Simple IP-based rate limiting (in production use Redis/user ID)
      return 'global'; // For dev
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
server.setErrorHandler(
  (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    logger.error('Request error', error, {
      method: request.method,
      url: request.url,
      statusCode: error.statusCode,
    });

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: error.code || 'ERROR',
        message: error.message,
        details: error.details,
      });
    }

    // Validation error from Fastify
    if (error.validation) {
      return reply.status(400).send({
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.validation,
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : error.message;

    return reply.status(statusCode).send({
      success: false,
      error: 'INTERNAL_ERROR',
      message,
    });
  }
);

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
    },
  };
});

// Health check endpoint
server.get('/health', async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
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

  logger.info('Routes registered');
}

// Start server
async function start() {
  try {
    // Connect to Redis (optional)
    try {
      await connectRedis();
      if (require('./lib/redis').isRedisEnabled()) {
        logger.info('Redis connected');
      } else {
        logger.info('Running without Redis (optional service)');
      }
    } catch (error) {
      logger.info('Running without Redis (optional service)');
    }

    // Register plugins
    await registerPlugins();

    // Register routes
    await registerRoutes();

    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    logger.info(`Server listening on http://${host}:${port}`);
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
