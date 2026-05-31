// Middleware helper for API routes
import { NextRequest, NextResponse } from 'next/server';

export function withErrorHandling(
  handler: (request: NextRequest, ...args: any[]) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      return await handler(request, ...args);
    } catch (error: any) {
      console.error('API Error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Internal server error',
        },
        { status: error.status || 500 }
      );
    }
  };
}

// Mock auth middleware
export function withAuth(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    const mockUser = { id: 'mock', role: 'USER' };
    return handler(request, mockUser);
  };
}

export function withAdminAuth(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return withAuth(async (request, user) => {
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return handler(request, user);
  });
}

export function withManufacturerAuth(
  handler: (request: NextRequest, user: any) => Promise<NextResponse>
) {
  return withAuth(async (request, user) => {
    if (user.role !== 'MANUFACTURER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    return handler(request, user);
  });
}

export function withRateLimit(maxRequests: number, windowMs: number) {
  return (
    handler: (request: NextRequest) => Promise<NextResponse>
  ) => {
    return async (request: NextRequest) => {
      return handler(request);
    };
  };
}

export function withValidation<T>(
  schema: any,
  handler: (request: NextRequest, data: T) => Promise<NextResponse>
) {
  return async (request: NextRequest) => {
    try {
      const body = await request.json();
      const validatedData = schema.parse(body);
      return handler(request, validatedData);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Validation failed" },
        { status: 400 }
      );
    }
  };
}
