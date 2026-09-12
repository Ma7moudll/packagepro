// Mock Auth Service - Frontend should call backend API
// This is a placeholder to prevent build errors

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

// Map backend roles to frontend role model
const ROLE_MAP: Record<string, string> = {
  CUSTOMER: "TRADER",
  VENDOR: "MANUFACTURER",
  ADMIN: "ADMIN",
}

export interface User {
  id: number | string
  email: string
  name: string
  role: "TRADER" | "MANUFACTURER" | "ADMIN"
  companyName?: string
  phone?: string
  isVerified: boolean
  isActive: boolean
  trustScore: number
  subscriptionType: "FREE" | "PREMIUM" | "ENTERPRISE"
}

export interface AuthResult {
  user: User
  token: string
}

export class AuthService {
  static async login(email: string, password: string): Promise<AuthResult> {
    // This should call backend API
    throw new Error("Auth should be handled by backend API")
  }

  static async register(data: any): Promise<AuthResult> {
    // This should call backend API
    throw new Error("Auth should be handled by backend API")
  }

  static async getCurrentUser(token: string): Promise<User | null> {
    if (!token) return null

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })

      if (!res.ok) return null

      const data = await res.json()
      if (!data.success || !data.data) return null

      const u = data.data
      const email = u.email || ""
      const name = u.name || u.firstName || email.split("@")[0] || "User"

      return {
        id: u.userId || u.id,
        email,
        name,
        role: (ROLE_MAP[u.role] as User["role"]) || (u.role as User["role"]) || "TRADER",
        companyName: u.companyName,
        phone: u.phone,
        isVerified: true,
        isActive: true,
        trustScore: 0,
        subscriptionType: "FREE",
      }
    } catch (error) {
      console.error("AuthService.getCurrentUser error:", error)
      return null
    }
  }
}
