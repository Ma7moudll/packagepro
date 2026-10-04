import { FastifyRequest, FastifyReply } from 'fastify';
import { authenticate, AuthenticatedRequest } from './auth.middleware';
import { prisma } from '../lib/prisma';
import { AuthorizationError, NotFoundError } from '../utils/errors';
import { UserRole } from '../types';
import { Vendor } from '@prisma/client';

/**
 * Role-based access control helpers.
 *
 * `authorize()` in auth.middleware.ts is the generic preHandler; these helpers
 * are for controllers that need the resolved user/vendor object (ownership
 * checks) rather than a bare role gate.
 */

export async function requireRoles(
  request: FastifyRequest,
  reply: FastifyReply,
  ...roles: UserRole[]
): Promise<AuthenticatedRequest['user']> {
  await authenticate(request, reply);
  const user = (request as AuthenticatedRequest).user;
  if (!roles.includes(user.role)) {
    throw new AuthorizationError(
      `Access denied. Required roles: ${roles.join(', ')}`
    );
  }
  return user;
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<AuthenticatedRequest['user']> {
  return requireRoles(request, reply, 'ADMIN');
}

/**
 * Resolve the Vendor profile of the authenticated user.
 * Vendors have a 1:1 User ↔ Vendor relation; ADMIN callers may act on any
 * vendor by passing ?vendorId= (used by admin tooling/QA scripts).
 */
export async function requireVendorProfile(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<{ user: AuthenticatedRequest['user']; vendor: Vendor }> {
  const user = await requireRoles(request, reply, 'VENDOR', 'ADMIN');
  const queryVendorId = (request.query as { vendorId?: string }).vendorId;

  if (user.role === 'ADMIN' && queryVendorId) {
    const vendor = await prisma.vendor.findUnique({ where: { id: queryVendorId } });
    if (!vendor) throw new NotFoundError('Vendor');
    return { user, vendor };
  }

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
  if (!vendor) throw new NotFoundError('Vendor');
  return { user, vendor };
}

/** Assert the vendor owns the given production record (or caller is ADMIN). */
export async function assertProductionOwnership(
  request: FastifyRequest,
  reply: FastifyReply,
  productionId: string
): Promise<AuthenticatedRequest['user']> {
  const user = await requireRoles(request, reply, 'VENDOR', 'ADMIN');
  if (user.role === 'ADMIN') return user;

  const vendor = await prisma.vendor.findUnique({ where: { userId: user.userId } });
  if (!vendor) throw new NotFoundError('Vendor');

  const production = await prisma.production.findUnique({
    where: { id: productionId },
    select: { vendorId: true },
  });
  if (!production) throw new NotFoundError('Production');
  if (production.vendorId !== vendor.id) {
    throw new AuthorizationError('You do not have access to this production');
  }
  return user;
}
