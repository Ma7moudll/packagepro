import { FastifyRequest, FastifyReply } from 'fastify';
import { reviewService } from './review.service';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { z } from 'zod';

const createReviewSchema = z.object({
  orderId: z.string(),
  rating: z.number().min(1).max(5),
  qualityRating: z.number().min(1).max(5),
  speedRating: z.number().min(1).max(5),
  designRating: z.number().min(1).max(5),
  serviceRating: z.number().min(1).max(5),
  valueRating: z.number().min(1).max(5),
  comment: z.string().optional(),
  photoUrls: z.array(z.string()).optional(),
});

export class ReviewController {
  async createReview(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const user = (request as AuthenticatedRequest).user;
    const body = createReviewSchema.parse(request.body);

    // Get customer ID
    const { prisma } = require('../../lib/prisma');
    const customer = await prisma.customer.findUnique({
      where: { userId: user.userId },
    });

    if (!customer) {
      return reply.status(404).send({
        success: false,
        error: 'Customer profile not found',
      });
    }

    const review = await reviewService.createReview({
      ...body,
      customerId: customer.id,
    });

    return reply.status(201).send({
      success: true,
      data: review,
    });
  }

  async getReviewByOrder(request: FastifyRequest, reply: FastifyReply) {
    await authenticate(request, reply);
    const orderId = (request.params as { orderId: string }).orderId;
    const review = await reviewService.getReviewByOrder(orderId);

    if (!review) {
      return reply.status(404).send({
        success: false,
        error: 'Review not found',
      });
    }

    return reply.send({
      success: true,
      data: review,
    });
  }

  async getVendorReviews(request: FastifyRequest, reply: FastifyReply) {
    const vendorId = (request.params as { id: string }).id;
    const query = request.query as { page?: string; limit?: string };

    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');

    const result = await reviewService.getVendorReviews(vendorId, page, limit);

    return reply.send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  }
}

export const reviewController = new ReviewController();
