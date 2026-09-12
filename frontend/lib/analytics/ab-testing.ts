"use client"

import { ABTest, ABTestVariant, ABTestAssignment } from "./types"
import { analyticsService, storageGet, storageSet } from "./analytics-service"
import { nanoid } from "nanoid"

class ABTestingService {
  private tests: Map<string, ABTest> = new Map()
  private assignments: Map<string, ABTestAssignment> = new Map()
  private userId?: string
  private sessionId: string

  constructor() {
    this.sessionId = this.getOrCreateSessionId()
    this.loadUserId()
    this.loadAssignments()
  }

  private getOrCreateSessionId(): string {
    if (typeof window === "undefined") return nanoid()

    const stored = storageGet("session", "ab_test_session_id")
    if (stored) return stored

    const newId = nanoid()
    storageSet("session", "ab_test_session_id", newId)
    return newId
  }

  private loadUserId(): void {
    if (typeof window === "undefined") return

    const stored = storageGet("local", "analytics_user_id")
    if (stored) {
      this.userId = stored
    }
  }

  private loadAssignments(): void {
    if (typeof window === "undefined") return

    const stored = storageGet("local", "ab_test_assignments")
    if (!stored) return

    try {
      const assignments: ABTestAssignment[] = JSON.parse(stored)
      assignments.forEach((assignment) => {
        this.assignments.set(assignment.testId, assignment)
      })
    } catch {
      // Corrupt assignments — start fresh
    }
  }

  private saveAssignments(): void {
    if (typeof window === "undefined") return

    const assignments = Array.from(this.assignments.values())
    storageSet("local", "ab_test_assignments", JSON.stringify(assignments))
  }

  /**
   * Register an AB test
   */
  registerTest(test: ABTest): void {
    this.tests.set(test.id, test)
  }

  /**
   * Get variant for a test (assigns if not already assigned)
   */
  getVariant(testId: string): ABTestVariant | null {
    const test = this.tests.get(testId)
    if (!test || !test.active) return null

    // Check if already assigned
    const existing = this.assignments.get(testId)
    if (existing) {
      return test.variants.find((v) => v.id === existing.variantId) || null
    }

    // Assign variant based on weights
    const variant = this.assignVariant(test)
    if (variant) {
      const assignment: ABTestAssignment = {
        testId,
        variantId: variant.id,
        userId: this.userId,
        sessionId: this.sessionId,
        assignedAt: Date.now(),
      }

      this.assignments.set(testId, assignment)
      this.saveAssignments()

      // Track assignment
      this.trackAssignment(testId, variant.id)
    }

    return variant
  }

  /**
   * Assign variant based on weights
   */
  private assignVariant(test: ABTest): ABTestVariant | null {
    if (test.variants.length === 0) return null

    // Use consistent hash based on userId or sessionId
    const hashInput = this.userId || this.sessionId
    const hash = this.simpleHash(hashInput)
    const random = hash % 100

    let cumulative = 0
    for (const variant of test.variants) {
      cumulative += variant.weight
      if (random < cumulative) {
        return variant
      }
    }

    // Fallback to first variant
    return test.variants[0]
  }

  /**
   * Simple hash function for consistent assignment
   */
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }

  /**
   * Track variant assignment
   */
  private trackAssignment(testId: string, variantId: string): void {
    if (typeof window === "undefined") return

    analyticsService.track("ab_test_assigned", {
      testId,
      variantId,
    })
  }

  /**
   * Track conversion for a test
   */
  trackConversion(testId: string, conversionName: string, value?: number): void {
    const assignment = this.assignments.get(testId)
    if (!assignment) return

    analyticsService.track("ab_test_conversion", {
      testId,
      variantId: assignment.variantId,
      conversionName,
      value,
    })
  }

  /**
   * Get current assignment for a test
   */
  getAssignment(testId: string): ABTestAssignment | null {
    return this.assignments.get(testId) || null
  }

  /**
   * Get all active tests
   */
  getActiveTests(): ABTest[] {
    return Array.from(this.tests.values()).filter((test) => test.active)
  }
}

// Singleton instance
export const abTestingService = new ABTestingService()

// Register default tests
if (typeof window !== "undefined") {
  // Example: Button color test
  abTestingService.registerTest({
    id: "button-color",
    name: "Button Color Test",
    variants: [
      { id: "green", name: "Green Button", weight: 50, config: { color: "#10b981" } },
      { id: "blue", name: "Blue Button", weight: 50, config: { color: "#3b82f6" } },
    ],
    startDate: Date.now(),
    active: true,
  })

  // Example: Feature flag test
  abTestingService.registerTest({
    id: "new-editor-ui",
    name: "New Editor UI",
    variants: [
      { id: "control", name: "Old UI", weight: 50, config: { enabled: false } },
      { id: "variant", name: "New UI", weight: 50, config: { enabled: true } },
    ],
    startDate: Date.now(),
    active: false, // Disabled by default
  })
}

