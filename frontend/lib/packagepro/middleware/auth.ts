/**
 * Authentication Middleware for PackagePro APIs - Mock Implementation
 * Note: Frontend should proxy to backend API
 */

import { NextRequest, NextResponse } from "next/server"
import { logger } from "../utils/logger"

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  [key: string]: any
}

/**
 * Middleware to authenticate requests - Mock implementation
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const authHeader = request.headers.get("authorization")

      if (!authHeader?.startsWith("Bearer ")) {
        // For development, allow requests without auth
        const mockUser: AuthenticatedUser = {
          id: "mock_user",
          email: "user@example.com",
          role: "USER",
        }
        return handler(request, mockUser, ...args)
      }

      // In production, verify token with backend
      const mockUser: AuthenticatedUser = {
        id: "mock_user",
        email: "user@example.com",
        role: "USER",
      }

      return handler(request, mockUser, ...args)
    } catch (error) {
      logger.error("Auth error", { error })
      return NextResponse.json(
        { error: "Authentication failed" },
        { status: 401 },
      )
    }
  }
}

export function withRole(role: string | string[]) {
  return <T extends any[]>(
    handler: (request: NextRequest, user: AuthenticatedUser, ...args: T) => Promise<NextResponse>,
  ) => {
    return withAuth(async (request: NextRequest, user: AuthenticatedUser, ...args: T) => {
      const allowedRoles = Array.isArray(role) ? role : [role]

      if (!allowedRoles.includes(user.role) && user.role !== "ADMIN") {
        return NextResponse.json(
          { error: `Access denied. ${allowedRoles.join(" or ")} role required.` },
          { status: 403 },
        )
      }
      return handler(request, user, ...args)
    })
  }
}
