"use client"

import { PerformanceMetric } from "./types"
import { analyticsService } from "./analytics-service"

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = []
  private observers: PerformanceObserver[] = []
  private initialLoadMeasured = false

  constructor() {
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      this.setupObservers()
      this.measureInitialLoad()
    }
  }

  /**
   * Setup Performance Observers
   */
  private setupObservers(): void {
    // Long Task Observer
    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            // Tasks longer than 50ms
            this.recordMetric("long_task", entry.duration, "ms", {
              name: entry.name,
            })
          }
        }
      })
      longTaskObserver.observe({ entryTypes: ["longtask"] })
      this.observers.push(longTaskObserver)
    } catch (e) {
      // Long Task API not supported
    }

    // Navigation Timing
    try {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming
            this.recordNavigationMetrics(navEntry)
          }
        }
      })
      navObserver.observe({ entryTypes: ["navigation"] })
      this.observers.push(navObserver)
    } catch (e) {
      // Fallback to legacy API
      this.measureNavigationLegacy()
    }

    // Resource Timing
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === "resource") {
            const resourceEntry = entry as PerformanceResourceTiming
            if (resourceEntry.duration > 1000) {
              // Resources taking longer than 1s
              this.recordMetric("slow_resource", resourceEntry.duration, "ms", {
                name: resourceEntry.name,
                type: resourceEntry.initiatorType,
              })
            }
          }
        }
      })
      resourceObserver.observe({ entryTypes: ["resource"] })
      this.observers.push(resourceObserver)
    } catch (e) {
      // Resource Timing not supported
    }
  }

  /**
   * Measure initial page load
   */
  public measureInitialLoad(): void {
    if (typeof window === "undefined" || this.initialLoadMeasured) return
    this.initialLoadMeasured = true

    window.addEventListener("load", () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming
        if (perfData) {
          this.recordNavigationMetrics(perfData)
        }
      }, 0)
    })
  }

  /**
   * Record navigation metrics
   */
  private recordNavigationMetrics(navEntry: PerformanceNavigationTiming): void {
    // DNS
    this.recordMetric("dns_time", navEntry.domainLookupEnd - navEntry.domainLookupStart, "ms")
    // TCP
    this.recordMetric("tcp_time", navEntry.connectEnd - navEntry.connectStart, "ms")
    // Request
    this.recordMetric("request_time", navEntry.responseStart - navEntry.requestStart, "ms")
    // Response
    this.recordMetric("response_time", navEntry.responseEnd - navEntry.responseStart, "ms")
    // DOM Processing
    this.recordMetric("dom_processing", navEntry.domComplete - navEntry.domInteractive, "ms")
    // Load Complete
    this.recordMetric("load_complete", navEntry.loadEventEnd - navEntry.fetchStart, "ms")
    // First Contentful Paint
    const fcp = performance.getEntriesByName("first-contentful-paint")[0] as PerformancePaintTiming
    if (fcp) {
      this.recordMetric("first_contentful_paint", fcp.startTime, "ms")
    }
    // Largest Contentful Paint
    const lcp = performance.getEntriesByType("largest-contentful-paint")[0] as PerformanceEntry
    if (lcp) {
      this.recordMetric("largest_contentful_paint", lcp.startTime, "ms")
    }
  }

  /**
   * Legacy navigation timing (fallback)
   */
  private measureNavigationLegacy(): void {
    if (typeof window === "undefined" || !performance.timing) return

    window.addEventListener("load", () => {
      setTimeout(() => {
        const timing = performance.timing
        if (timing) {
          this.recordMetric("load_complete", timing.loadEventEnd - timing.navigationStart, "ms")
        }
      }, 0)
    })
  }

  /**
   * Record a performance metric
   */
  recordMetric(
    name: string,
    value: number,
    unit: "ms" | "bytes" | "count" = "ms",
    tags?: Record<string, string>
  ): void {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      tags,
    }

    this.metrics.push(metric)
    analyticsService.trackPerformance(name, value, unit)

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000)
    }
  }

  /**
   * Measure function execution time
   */
  async measureFunction<T>(
    name: string,
    fn: () => T | Promise<T>
  ): Promise<T> {
    const start = performance.now()
    try {
      const result = await fn()
      const duration = performance.now() - start
      this.recordMetric(name, duration, "ms")
      return result
    } catch (error) {
      const duration = performance.now() - start
      this.recordMetric(`${name}_error`, duration, "ms")
      throw error
    }
  }

  /**
   * Get all metrics
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics]
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter((m) => m.name === name)
  }

  /**
   * Get average metric value
   */
  getAverageMetric(name: string): number {
    const metrics = this.getMetricsByName(name)
    if (metrics.length === 0) return 0
    const sum = metrics.reduce((acc, m) => acc + m.value, 0)
    return sum / metrics.length
  }

  /**
   * Cleanup observers
   */
  disconnect(): void {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers = []
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor()

