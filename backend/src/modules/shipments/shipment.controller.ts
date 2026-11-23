import { FastifyRequest, FastifyReply } from 'fastify';
import { shipmentService } from './shipment.service';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { handleDHLWebhook } from '../../integrations/dhl/webhooks';

export class ShipmentController {
  async createShipment(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const orderId = (request.params as { id: string }).id;
    const shipment = await shipmentService.createShipment(orderId, (request as AuthenticatedRequest).user);

    return reply.status(201).send({
      success: true,
      data: shipment,
    });
  }

  async getTracking(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const shipmentId = (request.params as { id: string }).id;
    const tracking = await shipmentService.getTracking(shipmentId, (request as AuthenticatedRequest).user);

    return reply.send({
      success: true,
      data: tracking,
    });
  }

  async getShipmentByOrder(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const orderId = (request.params as { orderId: string }).orderId;
    const shipment = await shipmentService.getShipmentByOrder(orderId, (request as AuthenticatedRequest).user);

    return reply.send({
      success: true,
      data: shipment,
    });
  }

  async dhlWebhook(request: FastifyRequest, reply: FastifyReply) {
    return handleDHLWebhook(request, reply);
  }
}

export const shipmentController = new ShipmentController();
