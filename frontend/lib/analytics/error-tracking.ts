"use client"

import { analyticsService } from "./analytics-service"

class ErrorTrackingService {
  private initialized = false
  private listenersAttached = false

  /**
   * Initialize error tracking (Sentry)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Dynamic import to avoid bundling Sentry in development
      if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
        const Sentry = await import("@sentry/nextjs")
        Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
          environment: process.env.NODE_ENV,
          tracesSampleRate: 1.0,
          beforeSend(event, hint) {
            // Filter out development errors
            if (process.env.NODE_ENV === "development") {
              console.log("Sentry event (dev):", event)
              return null
            }
            return event
          },
        })
        this.initialized = true
      }
    } catch {
      // Sentry unavailable — analytics tracking still works without it
    }

    this.attachGlobalListeners()
  }

  private attachGlobalListeners(): void {
    if (this.listenersAttached || typeof window === "undefined") return
    this.listenersAttached = true

    // Global error handler
    window.addEventListener("error", (event) => {
      this.captureException(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      this.captureException(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
        type: "unhandled_promise_rejection",
      })
    })
  }

  /**
   * Capture exception
   */
  captureException(error: unknown, context?: Record<string, any>): void {
    const normalized = error instanceof Error ? error : new Error(String(error ?? "Unknown error"))

    // Track in analytics
    analyticsService.trackError(normalized, context)

    // Send to Sentry if initialized
    if (this.initialized) {
      import("@sentry/nextjs").then((Sentry) => {
        Sentry.captureException(normalized, {
          contexts: {
            custom: context || {},
          },
        })
      })
    }
  }

  /**
   * Capture message
   */
  captureMessage(message: string, level: "info" | "warning" | "error" = "info"): void {
    if (this.initialized) {
      import("@sentry/nextjs").then((Sentry) => {
        Sentry.captureMessage(message, level)
      })
    }
  }

  /**
   * Set user context
   */
  setUser(user: { id?: string; email?: string; username?: string }): void {
    if (this.initialized) {
      import("@sentry/nextjs").then((Sentry) => {
        Sentry.setUser(user)
      })
    }
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(message: string, category: string, level: "info" | "warning" | "error" = "info"): void {
    if (this.initialized) {
      import("@sentry/nextjs").then((Sentry) => {
        Sentry.addBreadcrumb({
          message,
          category,
          level,
        })
      })
    }
  }
}

// Singleton instance
export const errorTrackingService = new ErrorTrackingService()

// Initialize on client side
if (typeof window !== "undefined") {
  errorTrackingService.initialize()
}

