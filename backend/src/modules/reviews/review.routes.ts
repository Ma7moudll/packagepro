import { FastifyPluginAsync } from 'fastify';
import { reviewController } from './review.controller';

export const reviewRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/reviews', async (request, reply) => {
    return reviewController.createReview(request, reply);
  });

  fastify.get('/reviews/order/:orderId', async (request, reply) => {
    return reviewController.getReviewByOrder(request, reply);
  });

  fastify.get('/vendors/:id/reviews', async (request, reply) => {
    return reviewController.getVendorReviews(request, reply);
  });
};
