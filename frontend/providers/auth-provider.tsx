"use client"
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
  login: (email: string, password: string) => Promise<boolean>
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

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Import API client dynamically to avoid SSR issues
      const { api } = await import("@/lib/api");
      
      const result = await api.login({ email, password });

      if (result.user) {
        // Ensure name is properly formatted
        let displayName = result.user.name || result.user.firstName || "";
        if (!displayName || displayName.trim() === "") {
          const emailName = result.user.email?.split("@")[0] || "User";
          displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        } else {
          // Capitalize first letter if needed
          displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        }

        const userData: User = {
          id: String(result.user.id),
          email: result.user.email,
          name: displayName,
          role: result.user.role || "TRADER",
          company: result.user.company,
        };

        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    }
  }

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      // Import API client dynamically to avoid SSR issues
      const { api } = await import("@/lib/api");
      
      // Map frontend role to backend role
      const backendRole = userData.role === "MANUFACTURER" ? "VENDOR" : "CUSTOMER";
      
      const [firstName, ...lastNameParts] = userData.name.split(" ");
      const lastName = lastNameParts.join(" ") || "";
      
      const result = await api.register({
        email: userData.email,
        password: userData.password,
        firstName: firstName || userData.name,
        lastName: lastName,
        role: backendRole,
      });

      if (result.user) {
        // Ensure name is properly formatted
        let displayName = result.user.name || result.user.firstName || "";
        if (!displayName || displayName.trim() === "") {
          const emailName = result.user.email?.split("@")[0] || "User";
          displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        } else {
          // Capitalize first letter if needed
          displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        }

        const newUser: User = {
          id: String(result.user.id),
          email: result.user.email,
          name: displayName,
          role: result.user.role === "VENDOR" ? "MANUFACTURER" : "TRADER",
          company: result.user.company || userData.company,
        };

        setUser(newUser);
        localStorage.setItem("user", JSON.stringify(newUser));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Registration failed:", error);
      return false;
    }
  }

  const logout = async () => {
    try {
      const { api } = await import("@/lib/api");
      api.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
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
