import { cookies } from "next/headers"

/**
 * Server-side session accessor for local API routes.
 *
 * PackagePro has a single authentication system: the real backend JWT flow.
 * The browser stores the backend access token in localStorage and (as a
 * convenience for local API routes) an httpOnly `pp_access_token` cookie is
 * set at login. This module decodes that cookie so server routes can recover
 * the current user without running a second auth provider.
 */

const TOKEN_COOKIE = "pp_access_token"

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

export interface SessionResponse {
  user: ServerSessionUser
  accessToken: string
}

export async function auth(): Promise<SessionResponse | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_COOKIE)?.value
  if (!token) return null

  try {
    const payload = JSON.parse(
      Buffer.from(token.split(".")[1] || "", "base64url").toString("utf8")
    ) as BackendJWTPayload

    if (!payload.userId) return null

    const name =
      (payload.email || "").split("@")[0].charAt(0).toUpperCase() +
      (payload.email || "").split("@")[0].slice(1)

    return {
      accessToken: token,
      user: {
        id: payload.userId,
        email: payload.email || "",
        name,
        role: payload.role || "CUSTOMER",
      },
    }
  } catch {
    return null
  }
}