"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface SecurityContextType {
  isSecure: boolean
  enable2FA: () => Promise<boolean>
  disable2FA: () => Promise<boolean>
  is2FAEnabled: boolean
  sessionTimeout: number
  lastActivity: Date
  checkSecurity: () => boolean
  encryptData: (data: string) => string
  decryptData: (encryptedData: string) => string
  twoFactorEnabled: boolean
  securityLevel: "low" | "medium" | "high"
  toggleTwoFactor: () => void
  updateActivity: () => void
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined)

export function SecurityProvider({ children }: { children: ReactNode }) {
  const [isSecure] = useState(true)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [lastActivity, setLastActivity] = useState(new Date())
  const [sessionTimeout] = useState(30 * 60 * 1000) // 30 minutes
  const [securityLevel, setSecurityLevel] = useState<"low" | "medium" | "high">("medium")

  // تتبع النشاط
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(new Date())
    }

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"]
    events.forEach((event) => {
      document.addEventListener(event, updateActivity, true)
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, updateActivity, true)
      })
    }
  }, [])

  // فحص انتهاء الجلسة
  useEffect(() => {
    const checkSession = () => {
      const now = new Date()
      const timeDiff = now.getTime() - lastActivity.getTime()

      if (timeDiff > sessionTimeout) {
        // يمكن إضافة logout هنا
        console.log("Session expired")
      }
    }

    const interval = setInterval(checkSession, 60000) // فحص كل دقيقة
    return () => clearInterval(interval)
  }, [lastActivity, sessionTimeout])

  const enable2FA = async (): Promise<boolean> => {
    try {
      // محاكاة تفعيل المصادقة الثنائية
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIs2FAEnabled(true)
      setSecurityLevel("high")
      return true
    } catch {
      return false
    }
  }

  const disable2FA = async (): Promise<boolean> => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      setIs2FAEnabled(false)
      setSecurityLevel("medium")
      return true
    } catch {
      return false
    }
  }

  const toggleTwoFactor = () => {
    setIs2FAEnabled(!is2FAEnabled)
    setSecurityLevel(is2FAEnabled ? "medium" : "high")
  }

  const updateActivity = () => {
    setLastActivity(new Date())
  }

  const checkSecurity = (): boolean => {
    // فحص الأمان العام
    const isHTTPS = typeof window !== "undefined" ? window.location.protocol === "https:" : true
    const hasValidSession = new Date().getTime() - lastActivity.getTime() < sessionTimeout

    return isHTTPS && hasValidSession && is2FAEnabled
  }

  // تشفير بسيط (في التطبيق الحقيقي استخدم مكتبة تشفير قوية)
  const encryptData = (data: string): string => {
    if (typeof window !== "undefined") {
      return btoa(data) // تشفير Base64 بسيط
    }
    return data
  }

  const decryptData = (encryptedData: string): string => {
    try {
      if (typeof window !== "undefined") {
        return atob(encryptedData)
      }
      return encryptedData
    } catch {
      return ""
    }
  }

  return (
    <SecurityContext.Provider
      value={{
        isSecure,
        enable2FA,
        disable2FA,
        is2FAEnabled,
        sessionTimeout,
        lastActivity,
        checkSecurity,
        encryptData,
        decryptData,
        twoFactorEnabled: is2FAEnabled,
        securityLevel,
        toggleTwoFactor,
        updateActivity,
      }}
    >
      {children}
    </SecurityContext.Provider>
  )
}

export function useSecurity() {
  const context = useContext(SecurityContext)
  if (context === undefined) {
    throw new Error("useSecurity must be used within a SecurityProvider")
  }
  return context
}
