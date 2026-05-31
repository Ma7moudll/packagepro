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

  fastify.post('/webhooks/dhl', async (request, reply) => {
    return shipmentController.dhlWebhook(request, reply);
  });
};
