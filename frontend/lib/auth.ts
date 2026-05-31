// Mock Auth Service - Frontend should call backend API
// This is a placeholder to prevent build errors

export interface User {
  id: number
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
    // This should call backend API
    return null
  }
}
