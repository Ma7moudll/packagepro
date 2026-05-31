import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from '../modules/auth/auth.service';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { UserRole, AuthenticatedRequest } from '../types';

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
    const payload = authService.verifyAccessToken(token);

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
      const payload = authService.verifyAccessToken(token);
      (request as AuthenticatedRequest).user = payload;
    }
  } catch (error) {
    // Ignore errors for optional auth
  }
}
