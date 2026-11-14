import { FastifyPluginAsync } from 'fastify';
import { shipmentController } from './shipment.controller';

export const shipmentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/shipments/create/:id', async (request, reply) => {
    return shipmentController.createShipment(request, reply);
  });

  fastify.get('/shipments/:id/tracking', async (request, reply) => {
    return shipmentController.getTracking(request, reply);
  });

  fastify.get('/orders/:orderId/shipment', async (request, reply) => {
    return shipmentController.getShipmentByOrder(request, reply);
  });

  // SEC-03a: the DHL webhook is unauthenticated by nature (carrier push).
  // Throttle it hard — forged floods must not drive DB or DHL Track API load.
  fastify.post(
    '/webhooks/dhl',
    {
      config: {
        rateLimit: { max: 30, timeWindow: '1 minute' },
      },
    },
    async (request, reply) => {
      return shipmentController.dhlWebhook(request, reply);
    }
  );
};
