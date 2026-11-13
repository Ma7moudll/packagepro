import { prisma } from '../../lib/prisma';
import { NotFoundError, ValidationError } from '../../utils/errors';

export interface CreateReviewData {
  orderId: string;
  customerId: string;
  rating: number; // 1-5
  qualityRating: number;
  speedRating: number;
  designRating: number;
  serviceRating: number;
  valueRating: number;
  comment?: string;
  photoUrls?: string[];
}

export class ReviewService {
  /**
   * Create review
   */
  async createReview(data: CreateReviewData): Promise<any> {
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        purchaseOrders: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (order.customerId !== data.customerId) {
      throw new ValidationError('Access denied');
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: { orderId: data.orderId },
    });

    if (existingReview) {
      throw new ValidationError('Review already exists for this order');
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        orderId: data.orderId,
        customerId: data.customerId,
        // 4a bridge: order reviews target the first (primary) PO's vendor;
        // 4b will review per-PO once orders spawn several.
        vendorId: order.purchaseOrders[0]!.vendorId,
        rating: data.rating,
        qualityRating: data.qualityRating,
        speedRating: data.speedRating,
        designRating: data.designRating,
        serviceRating: data.serviceRating,
        valueRating: data.valueRating,
        comment: data.comment,
        photoUrls: data.photoUrls || [],
      },
      include: {
        order: {
          select: {
            orderNumber: true,
          },
        },
        customer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Update vendor rating
    await this.updateVendorRating(order.purchaseOrders[0]!.vendorId);

    return review;
  }

  /**
   * Update vendor rating based on all reviews
   */
  private async updateVendorRating(vendorId: string): Promise<void> {
    const reviews = await prisma.review.findMany({
      where: { vendorId },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) {
      return;
    }

    const averageRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.vendor.update({
      where: { id: vendorId },
      data: {
        qualityRating: averageRating,
      },
    });
  }

  /**
   * Get review by order ID
   */
  async getReviewByOrder(orderId: string): Promise<any> {
    const review = await prisma.review.findUnique({
      where: { orderId },
      include: {
        customer: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return review;
  }

  /**
   * Get vendor reviews
   */
  async getVendorReviews(
    vendorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<any> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: {
          vendorId,
          isPublic: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
      }),
      prisma.review.count({
        where: {
          vendorId,
          isPublic: true,
        },
      }),
    ]);

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const reviewService = new ReviewService();
