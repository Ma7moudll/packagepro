"use client"

import { useEffect, ReactNode } from "react"
import { analyticsService } from "@/lib/analytics/analytics-service"
import { performanceMonitor } from "@/lib/analytics/performance-monitor"
import { errorTrackingService } from "@/lib/analytics/error-tracking"

interface AnalyticsProviderProps {
  children: ReactNode
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    // Initialize analytics
    analyticsService.trackPageView()

    // Initialize performance monitoring
    performanceMonitor.measureInitialLoad()

    // Initialize error tracking
    errorTrackingService.initialize()

    // Track page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        analyticsService.track("editor_opened", {
          source: "visibility_change",
        })
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      performanceMonitor.disconnect()
    }
  }, [])

  return <>{children}</>
}

