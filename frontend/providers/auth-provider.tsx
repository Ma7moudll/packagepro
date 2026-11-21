"use client"
import { getLoginCaptchaToken } from "@/lib/login-captcha"
import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  email: string
  name: string
  role: "TRADER" | "MANUFACTURER" | "ADMIN"
  company?: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<{ ok: boolean; reason?: string }>
  register: (userData: RegisterData) => Promise<boolean>
  logout: () => void
  isLoading: boolean
}

interface RegisterData {
  email: string
  password: string
  name: string
  role: "TRADER" | "MANUFACTURER"
  company?: string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for stored user session
    const storedUser = localStorage.getItem("user")

    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        // Ensure name exists and is properly formatted
        if (!userData.name || userData.name.trim() === "" || userData.name === "Manufacturer User") {
          const emailName = userData.email?.split("@")[0] || "User"
          userData.name = emailName.charAt(0).toUpperCase() + emailName.slice(1)
        } else {
          // Capitalize first letter if needed
          userData.name = userData.name.charAt(0).toUpperCase() + userData.name.slice(1)
        }
        // Update localStorage with corrected name
        localStorage.setItem("user", JSON.stringify(userData))
        setUser(userData)
      } catch (error) {
        console.error("Error parsing stored user:", error)
        localStorage.removeItem("user")
        localStorage.removeItem("token")
      }
    }
    setIsLoading(false)
  }, [])

  // SEC-02: returns the backend error code as `reason` so the login page can
  // distinguish "unverified email" from "wrong credentials" (only caller:
  // app/(auth)/login/page.tsx).
  const login = async (
    email: string,
    password: string
  ): Promise<{ ok: boolean; reason?: string }> => {
    try {
      const submit = (captchaToken?: string) => fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, ...(captchaToken ? { captchaToken } : {}) }),
      })
      let res = await submit()
      let data = await res.json()
      if (!res.ok && data?.error === "CAPTCHA_REQUIRED") {
        try {
          const token = await getLoginCaptchaToken()
          res = await submit(token)
          data = await res.json()
        } catch {
          return { ok: false, reason: "CAPTCHA_UNAVAILABLE" }
        }
      }

      if (!res.ok || !data.success) {
        return {
          ok: false,
          reason: typeof data?.error === "string" ? data.error : undefined,
        }
      }

      if (data.token) {
        localStorage.setItem("token", data.token)
      }
      if (data.tokens?.accessToken) {
        localStorage.setItem("accessToken", data.tokens.accessToken)
      }
      if (data.tokens?.refreshToken) {
        localStorage.setItem("refreshToken", data.tokens.refreshToken)
      }

      // Ensure name is properly formatted
      let displayName = data.user?.name || ""
      if (!displayName || displayName.trim() === "") {
        const emailName = data.user?.email?.split("@")[0] || "User"
        displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1)
      } else {
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1)
      }

      const userData: User = {
        id: String(data.user?.id || ""),
        email: data.user?.email || email,
        name: displayName,
        role: data.user?.role || "TRADER",
        company: data.user?.company,
      }

      setUser(userData)
      localStorage.setItem("user", JSON.stringify(userData))
      return { ok: true }
    } catch (error) {
      console.error("Login failed:", error)
      return { ok: false }
    }
  }

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role,
        }),
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        return false
      }

      return true
    } catch (error) {
      console.error("Registration failed:", error)
      return false
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("user")
    localStorage.removeItem("token")
    localStorage.removeItem("accessToken")
    localStorage.removeItem("refreshToken")

    try {
      fetch("/api/auth/logout", { method: "POST" }).catch(() => {
        // Best-effort: clears the httpOnly session cookie server-side
      })
    } catch {
      // Swallow: local logout must still succeed
    }
  }

  return <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
