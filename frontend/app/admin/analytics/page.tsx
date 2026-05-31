"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import { useLanguage } from "@/providers/language-provider"
import { AnalyticsDashboard } from "@/components/features/analytics-dashboard"

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { isRTL } = useLanguage()
  const router = useRouter()

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/login")
    }
  }, [user, router])

  if (!user || user.role !== "ADMIN") {
    return null
  }

  return (
    <div className={`container mx-auto px-4 py-8 ${isRTL ? "font-cairo" : ""}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{isRTL ? "تحليلات المبيعات" : "Sales Analytics"}</h1>
        <p className="text-slate-600">
          {isRTL ? "تحليل شامل لأداء المبيعات والعملاء" : "Comprehensive analysis of sales and customer performance"}
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  )
}
