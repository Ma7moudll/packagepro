"use client"

import { AnalyticsEvent, EventType, UserBehavior } from "./types"
import { nanoid } from "nanoid"

function getStorageArea(area: "local" | "session"): Storage | null {
  if (typeof window === "undefined") return null
  try {
    return area === "local" ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export function storageGet(area: "local" | "session", key: string): string | null {
  const storage = getStorageArea(area)
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

export function storageSet(area: "local" | "session", key: string, value: string): void {
  const storage = getStorageArea(area)
  if (!storage) return
  try {
    storage.setItem(key, value)
  } catch {
    // Storage unavailable (private browsing, blocked cookies) — degrade silently
  }
}

export function storageRemove(area: "local" | "session", key: string): void {
  const storage = getStorageArea(area)
  if (!storage) return
  try {
    storage.removeItem(key)
  } catch {
    // Storage unavailable — nothing to clean up
  }
}

class AnalyticsService {
  private sessionId: string
  private userId?: string
  private events: AnalyticsEvent[] = []
  private sessionStart: number

  constructor() {
    this.sessionId = this.getOrCreateSessionId()
    this.sessionStart = Date.now()
    this.loadUserId()
    this.trackPageView()
  }

  private getOrCreateSessionId(): string {
    if (typeof window === "undefined") return nanoid()

    const stored = storageGet("session", "analytics_session_id")
    if (stored) return stored

    const newId = nanoid()
    storageSet("session", "analytics_session_id", newId)
    return newId
  }

  private loadUserId(): void {
    if (typeof window === "undefined") return

    const stored = storageGet("local", "analytics_user_id")
    if (stored) {
      this.userId = stored
    } else {
      const newId = nanoid()
      storageSet("local", "analytics_user_id", newId)
      this.userId = newId
    }
  }

  /**
   * Track an event
   */
  track(eventType: EventType, properties: Record<string, any> = {}): void {
    const event: AnalyticsEvent = {
      id: nanoid(),
      type: eventType,
      userId: this.userId,
      sessionId: this.sessionId,
      timestamp: Date.now(),
      properties,
      metadata: {
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
      },
    }

    this.events.push(event)

    // Send to server
    this.sendEvent(event)

    // Store locally
    this.storeEvent(event)
  }

  /**
   * Track page view
   */
  trackPageView(path?: string): void {
    this.track("editor_opened", {
      path: path || (typeof window !== "undefined" ? window.location.pathname : ""),
    })
  }

  /**
   * Track user interaction
   */
  trackInteraction(action: string, target: string, properties: Record<string, any> = {}): void {
    this.track("tool_selected", {
      action,
      target,
      ...properties,
    })
  }

  /**
   * Track performance metric
   */
  trackPerformance(name: string, value: number, unit: "ms" | "bytes" | "count" = "ms"): void {
    this.track("performance_metric", {
      metricName: name,
      value,
      unit,
    })
  }

  /**
   * Track error
   */
  trackError(error: Error, context?: Record<string, any>): void {
    this.track("error_occurred", {
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      ...context,
    })
  }

  /**
   * Get user behavior data
   */
  getUserBehavior(): UserBehavior {
    return {
      userId: this.userId,
      sessionId: this.sessionId,
      events: this.events,
      sessionStart: this.sessionStart,
      pageViews: this.events.filter((e) => e.type === "editor_opened").length,
      interactions: this.events.filter((e) => e.type === "tool_selected").length,
    }
  }

  /**
   * Get events for current session
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events]
  }

  /**
   * Clear events (for testing)
   */
  clearEvents(): void {
    this.events = []
  }

  /**
   * Send event to server
   */
  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    if (typeof window === "undefined") return
    try {
      await fetch("/api/packagepro/analytics/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
        keepalive: true, // Send even if page is unloading
      })
    } catch {
      // Event is stored locally, will be retried later
    }
  }

  /**
   * Store event locally (IndexedDB or localStorage)
   */
  private storeEvent(event: AnalyticsEvent): void {
    if (typeof window === "undefined") return

    let events: AnalyticsEvent[] = []
    const stored = storageGet("local", "analytics_events")
    if (stored) {
      try {
        events = JSON.parse(stored)
      } catch {
        events = []
      }
    }
    events.push(event)

    // Keep only last 100 events
    const recentEvents = events.slice(-100)
    storageSet("local", "analytics_events", JSON.stringify(recentEvents))
  }

  /**
   * Flush stored events to server
   */
  async flushEvents(): Promise<void> {
    if (typeof window === "undefined") return

    const stored = storageGet("local", "analytics_events")
    if (!stored) return

    let events: AnalyticsEvent[] = []
    try {
      events = JSON.parse(stored)
    } catch {
      return
    }
    if (events.length === 0) return

    try {
      await fetch("/api/packagepro/analytics/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ events }),
      })

      storageRemove("local", "analytics_events")
    } catch {
      // Silently fail
    }
  }
}

// Singleton instance
export const analyticsService = new AnalyticsService()

// Auto-flush on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    analyticsService.flushEvents()
  })
}

