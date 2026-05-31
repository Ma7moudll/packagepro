import { type NextRequest, NextResponse } from "next/server"
import { AuthService } from "./auth"
import { MonitoringService } from "./monitoring"

export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: any, ...args: T) => Promise<NextResponse>,
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const authHeader = request.headers.get("authorization")

      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json({ error: "Authorization header required" }, { status: 401 })
      }

      const token = authHeader.substring(7)
      const user = await AuthService.getCurrentUser(token)

      return handler(request, user, ...args)
    } catch (error) {
      MonitoringService.captureException(error as Error, {
        context: "auth_middleware",
      })
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }
  }
}

export function withManufacturerAuth<T extends any[]>(
  handler: (request: NextRequest, user: any, ...args: T) => Promise<NextResponse>,
) {
  return withAuth(async (request: NextRequest, user: any, ...args: T) => {
    if (user.role !== "MANUFACTURER" && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Manufacturer access required" }, { status: 403 })
    }
    return handler(request, user, ...args)
  })
}

export function withAdminAuth<T extends any[]>(
  handler: (request: NextRequest, user: any, ...args: T) => Promise<NextResponse>,
) {
  return withAuth(async (request: NextRequest, user: any, ...args: T) => {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }
    return handler(request, user, ...args)
  })
}

