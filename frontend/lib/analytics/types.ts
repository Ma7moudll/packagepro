"use client"

export type EventType =
  | "editor_opened"
  | "editor_closed"
  | "layer_added"
  | "layer_updated"
  | "layer_deleted"
  | "template_created"
  | "template_used"
  | "design_saved"
  | "design_exported"
  | "tool_selected"
  | "file_uploaded"
  | "error_occurred"
  | "performance_metric"
  | "ab_test_assigned"
  | "ab_test_conversion"

export interface AnalyticsEvent {
  id: string
  type: EventType
  userId?: string
  sessionId: string
  timestamp: number
  properties: Record<string, any>
  metadata?: {
    userAgent?: string
    url?: string
    referrer?: string
  }
}

export interface UserBehavior {
  userId?: string
  sessionId: string
  events: AnalyticsEvent[]
  sessionStart: number
  sessionEnd?: number
  pageViews: number
  interactions: number
}

export interface PerformanceMetric {
  name: string
  value: number
  unit: "ms" | "bytes" | "count"
  timestamp: number
  tags?: Record<string, string>
}

export interface ABTestVariant {
  id: string
  name: string
  weight: number // 0-100
  config: Record<string, any>
}

export interface ABTest {
  id: string
  name: string
  variants: ABTestVariant[]
  startDate: number
  endDate?: number
  active: boolean
}

export interface ABTestAssignment {
  testId: string
  variantId: string
  userId?: string
  sessionId: string
  assignedAt: number
}

