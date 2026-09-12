import { type NextRequest } from "next/server"

/**
 * Server-side session helper for local API routes.
 *
 * The frontend uses the real backend JWT auth system (access/refresh tokens
 * stored client-side and sent as `Authorization: Bearer <token>`). Local
 * proxy/mock routes read the bearer token directly and decode the payload to
 * recover the current user, so the app does not run a second auth system.
 */

export interface ServerSessionUser {
  id: string
  email: string
  name: string
  role: string
}

interface BackendJWTPayload {
  userId?: string
  email?: string
  role?: string
  [key: string]: unknown
}

export async function getSessionUser(
  request: NextRequest
): Promise<ServerSessionUser | null> {
  const authHeader = request.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : ""
  if (!token) return null

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8")
    ) as BackendJWTPayload

    if (!payload.userId) return null

    return {
      id: payload.userId,
      email: payload.email || "",
      role: payload.role || "CUSTOMER",
      name:
        (payload.email || "").split("@")[0].charAt(0).toUpperCase() +
        (payload.email || "").split("@")[0].slice(1),
    }
  } catch {
    return null
  }
}