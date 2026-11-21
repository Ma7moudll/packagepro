import { NextRequest, NextResponse } from 'next/server';

/**
 * Gate for the legacy in-frontend API layer (frontend/app/api/*).
 *
 * Those routes are backed by a mock stack: `frontend/lib/middleware.ts`
 * `withAuth` injects a hardcoded mock user with no token verification, and
 * `frontend/lib/database.ts` is an in-memory mock store. They exist for local
 * UI development only and must never be reachable in a deployed environment.
 * The real API is the Fastify backend (NEXT_PUBLIC_API_URL).
 *
 * Behaviour:
 *  - production: every /api/* request gets 410 Gone (same retirement style as
 *    SEC-03d) unless ENABLE_FRONTEND_MOCK_API=true is set explicitly.
 *  - development: requests pass through so the mock layer keeps working.
 */
export function middleware(request: NextRequest) {
  const mockApiEnabled = process.env.ENABLE_FRONTEND_MOCK_API === 'true';

  if (process.env.NODE_ENV === 'production' && !mockApiEnabled) {
    return NextResponse.json(
      {
        success: false,
        error:
          'This endpoint has been retired. Use the PackagePro API (NEXT_PUBLIC_API_URL) instead.',
      },
      { status: 410 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
