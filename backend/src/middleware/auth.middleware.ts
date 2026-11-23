import { FastifyRequest, FastifyReply } from 'fastify';
import { jwtService } from '../modules/auth/services/jwt.service';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { UserRole, AuthenticatedRequest } from '../types';
import { prisma } from '../lib/prisma';

export { AuthenticatedRequest };

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const payload = jwtService.verifyAccessToken(token);

    // Attach user to request
    (request as AuthenticatedRequest).user = payload;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }
    throw new AuthenticationError('Invalid token');
  }
}

export function authorize(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    await authenticate(request, reply);

    const user = (request as AuthenticatedRequest).user;

    if (!allowedRoles.includes(user.role)) {
      throw new AuthorizationError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`
      );
    }
  };
}

export function optionalAuth(request: FastifyRequest): void {
  try {
    const authHeader = request.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = jwtService.verifyAccessToken(token);
      (request as AuthenticatedRequest).user = payload;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
}

/**
 * Helper: Check if the authenticated user is the owner of a design
 * Used for read/write access control during design lifecycle
 */
export async function isDesignOwner(
  userId: string,
  designId: string
): Promise<boolean> {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    select: {
      ownerId: true,
      order: { select: { customer: { select: { userId: true } } } },
    },
  });

  if (!design) {
    return false;
  }
  return designOwnerMatches(design.ownerId, design.order?.customer?.userId ?? null, userId);
}

/**
 * Ownership identity: Design.ownerId is a User.id. Order.customerId points at
 * Customer.id, so the order's user is order.customer.userId (never compare
 * Order.customerId to a User.id).
 * - ownerId only (editor draft, no order): owner is ownerId.
 * - order only (legacy rows without ownerId): owner is the order's customer user.
 * - both: they must agree. A conflict fails closed for everyone.
 * - neither: nobody owns it.
 */
export function designOwnerMatches(
  ownerId: string | null | undefined,
  orderUserId: string | null | undefined,
  userId: string
): boolean {
  if (!userId) return false;
  if (ownerId && orderUserId) return ownerId === orderUserId && ownerId === userId;
  if (ownerId) return ownerId === userId;
  if (orderUserId) return orderUserId === userId;
  return false;
}

/**
 * Helper: Check if user can view a design based on role and lifecycle
 * - Customers: Can view their own designs
 * - Designers/Admins: Can view all designs (for review workflow)
 */
export function canViewDesign(userRole: UserRole): boolean {
  return ['CUSTOMER', 'ADMIN', 'DESIGNER'].includes(userRole);
}

/**
 * Helper: Check if user can edit a design
 * - Only design owners in DRAFT status can edit
 */
export function canEditDesign(userRole: UserRole, isOwner: boolean, designLifecycleStatus: string): boolean {
  // Only customers (owners) in DRAFT status can edit
  return userRole === 'CUSTOMER' && isOwner && designLifecycleStatus === 'DRAFT';
}

/**
 * Helper: Check if user can review a design
 * - Only designers and admins can review designs not in DRAFT status
 */
export function canReviewDesign(userRole: UserRole, designLifecycleStatus: string): boolean {
  return ['DESIGNER', 'ADMIN'].includes(userRole) && designLifecycleStatus !== 'DRAFT';
}
