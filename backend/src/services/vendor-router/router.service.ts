import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';

export interface VendorScore {
  vendor: any;
  scores: {
    cost: number;
    location: number;
    moq: number;
    quality: number;
    speed: number;
    capacity: number;
  };
  totalScore: number;
}

export interface RoutingRequest {
  orderId: string;
  requirements: {
    material?: string;
    minQuantity?: number;
    maxQuantity?: number;
    deadline?: Date;
  };
}

export class VendorRouterService {
  /**
   * Score vendors based on multiple criteria
   */
  private scoreVendor(
    vendor: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    _requirements: RoutingRequest['requirements'], // eslint-disable-line @typescript-eslint/no-unused-vars
    orderQuantity: number
  ): VendorScore {
    // Cost score (0-30 points) - lower is better
    const costScore = Math.max(0, 30 - (vendor.qualityRating || 0) * 5); // Simplified

    // Location score (0-25 points) - closer is better
    const locationScore = vendor.latitude && vendor.longitude ? 25 : 15; // Simplified

    // MOQ compatibility (0-15 points)
    const moqScore =
      !vendor.minOrderQuantity || vendor.minOrderQuantity <= orderQuantity
        ? 15
        : 0;

    // Quality rating (0-15 points)
    const qualityScore = (vendor.qualityRating || 0) * 3;

    // Speed/Lead time (0-10 points) - faster is better
    const speedScore = vendor.averageLeadTime
      ? Math.max(0, 10 - vendor.averageLeadTime / 2)
      : 5;

    // Capacity (0-5 points) - always available
    const capacityScore = vendor.isActive ? 5 : 0;

    const totalScore =
      costScore + locationScore + moqScore + qualityScore + speedScore + capacityScore;

    return {
      vendor,
      scores: {
        cost: costScore,
        location: locationScore,
        moq: moqScore,
        quality: qualityScore,
        speed: speedScore,
        capacity: capacityScore,
      },
      totalScore,
    };
  }

  /**
   * Route order to best vendor
   */
  async routeOrder(request: RoutingRequest): Promise<{
    selectedVendor: any;
    scores: VendorScore[];
  }> {
    // Get order
    const order = await prisma.order.findUnique({
      where: { id: request.orderId },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

    // Get active vendors
    const vendors = await prisma.vendor.findMany({
      where: {
        isActive: true,
        ...(request.requirements.material && {
          // Filter by material capability if needed
        }),
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (vendors.length === 0) {
      throw new NotFoundError('No active vendors available');
    }

    // Score each vendor
    const scoredVendors = vendors
      .map((vendor) =>
        this.scoreVendor(vendor, request.requirements, totalQuantity)
      )
      .sort((a, b) => b.totalScore - a.totalScore); // Sort by score descending

    // Select top vendor
    const selectedVendor = scoredVendors[0];

    return {
      selectedVendor: selectedVendor.vendor,
      scores: scoredVendors,
    };
  }
}

export const vendorRouterService = new VendorRouterService();
