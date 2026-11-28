import { NotFoundError, AuthorizationError } from '../../utils/errors';
import { isDesignOwner } from '../../middleware/auth.middleware';
import { prisma } from '../../lib/prisma';

export interface DesignActor {
  userId?: string;
  role?: string;
}

/**
 * Who may read a design by id (GET /designs/:id, /files, /review, review comment):
 *  - ADMIN: any design;
 *  - CUSTOMER: only a design they own (isDesignOwner: ownerId, or the order's customer user; a conflict fails closed);
 *  - everyone else (vendor, other customers, no user): no access.
 * A design that is missing and a design that is not yours give the identical 404, raised before any
 * design data is read, so the response carries nothing about the design and does not say which case it was.
 */
export async function assertCanReadDesign(actor: DesignActor | undefined, designId: string): Promise<void> {
  const role = await trustedRole(actor);
  if (role === 'ADMIN') return;
  if (role === 'CUSTOMER' && actor?.userId && designId && (await isDesignOwner(actor.userId, designId))) return;
  throw new NotFoundError('Design');
}

/**
 * Read by session id (GET /designs/session/:sessionId): same rule as a read by design id, applied to the
 * design that owns the session. An unknown session id and a session that is not yours give the identical 404.
 * An ownerless design (legacy rows) has no recoverable creator, so only an admin passes.
 */
export async function assertCanReadSession(actor: DesignActor | undefined, sessionId: string): Promise<void> {
  const row = sessionId ? await prisma.design.findUnique({ where: { sessionId }, select: { id: true } }) : null;
  if (!row) throw new NotFoundError('Design');
  await assertCanReadDesign(actor, row.id);
}

/**
 * The caller's role from the database, keyed by the authenticated user id. The role claim inside the
 * token is not used for the decision. A missing user, or a lookup failure, gives no role (fail closed).
 */
export async function trustedRole(actor: DesignActor | undefined): Promise<string | undefined> {
  if (!actor?.userId) return undefined;
  try {
    const row = await prisma.user.findUnique({ where: { id: actor.userId }, select: { role: true } });
    return row?.role;
  } catch {
    return undefined;
  }
}

/**
 * Reviewer-only actions (approve, reject, request changes). Runs first, reads no design, changes nothing.
 * Returns the verified admin id so the caller can record the real actor.
 */
export async function assertAdmin(actor: DesignActor | undefined): Promise<string> {
  if ((await trustedRole(actor)) !== 'ADMIN') throw new AuthorizationError('Admin access required');
  return actor!.userId as string;
}
