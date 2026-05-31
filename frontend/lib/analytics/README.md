# Analytics & Monitoring Services

This directory contains services for analytics, performance monitoring, A/B testing, and error tracking.

## Services

### 1. Analytics Service (`analytics-service.ts`)
- **Purpose**: Track user events and behavior
- **Features**:
  - Event tracking (editor_opened, design_saved, etc.)
  - Session management
  - User identification
  - Local storage for offline tracking
  - Batch event sending

### 2. Performance Monitor (`performance-monitor.ts`)
- **Purpose**: Monitor application performance
- **Features**:
  - Navigation timing metrics
  - Resource timing
  - Long task detection
  - First Contentful Paint (FCP)
  - Largest Contentful Paint (LCP)
  - Function execution time measurement

### 3. A/B Testing (`ab-testing.ts`)
- **Purpose**: Run A/B tests and feature flags
- **Features**:
  - Variant assignment based on weights
  - Consistent assignment (same user gets same variant)
  - Conversion tracking
  - Test registration and management

### 4. Error Tracking (`error-tracking.ts`)
- **Purpose**: Track and report errors
- **Features**:
  - Sentry integration
  - Global error handlers
  - Unhandled promise rejection tracking
  - User context setting
  - Breadcrumb tracking

## Usage

### Analytics

```typescript
import { analyticsService } from "@/lib/analytics/analytics-service"

// Track event
analyticsService.track("design_saved", {
  designId: "123",
  layerCount: 5,
})

// Track interaction
analyticsService.trackInteraction("click", "save_button")

// Track performance
analyticsService.trackPerformance("render_time", 150, "ms")
```

### Performance Monitoring

```typescript
import { performanceMonitor } from "@/lib/analytics/performance-monitor"

// Measure function execution
const result = await performanceMonitor.measureFunction("save_design", async () => {
  return await saveDesign()
})

// Record custom metric
performanceMonitor.recordMetric("custom_operation", 200, "ms")
```

### A/B Testing

```typescript
import { abTestingService } from "@/lib/analytics/ab-testing"

// Get variant
const variant = abTestingService.getVariant("button-color")
if (variant) {
  // Use variant.config.color
}

// Track conversion
abTestingService.trackConversion("button-color", "click", 1)
```

### Error Tracking

```typescript
import { errorTrackingService } from "@/lib/analytics/error-tracking"

// Capture exception
try {
  // ...
} catch (error) {
  errorTrackingService.captureException(error, {
    context: "design_save",
  })
}

// Set user context
errorTrackingService.setUser({
  id: "user123",
  email: "user@example.com",
})
```

## API Routes

### `/api/packagepro/analytics/track`
Track a single analytics event.

### `/api/packagepro/analytics/batch`
Track multiple events in batch.

### `/api/packagepro/analytics/dashboard`
Get dashboard data (overview, events, performance metrics).

## Dashboard

Access the analytics dashboard at `/analytics` to view:
- User metrics (total users, active users, sessions)
- Event counts
- Performance metrics
- User flow visualization

## Configuration

### Sentry

Set environment variable:
```env
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
```

### Analytics Backend

In production, replace mock API routes with actual analytics service integration:
- Google Analytics
- Mixpanel
- Amplitude
- Custom analytics backend

## Event Types

- `editor_opened`: Editor was opened
- `editor_closed`: Editor was closed
- `layer_added`: Layer was added
- `layer_updated`: Layer was updated
- `layer_deleted`: Layer was deleted
- `template_created`: Template was created
- `template_used`: Template was used
- `design_saved`: Design was saved
- `design_exported`: Design was exported
- `tool_selected`: Tool was selected
- `file_uploaded`: File was uploaded
- `error_occurred`: Error occurred
- `performance_metric`: Performance metric recorded

## Notes

- Analytics events are stored locally and sent to server
- Performance monitoring uses Performance Observer API
- A/B tests are stored in localStorage for consistency
- Error tracking requires Sentry DSN for full functionality
- Dashboard currently shows mock data (replace with real analytics service)

