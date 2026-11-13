import { apiGet } from './client'
import { parseSSE } from '../notifications/stream'

export interface ConversionFunnel {
  visitors: number
  ordersCreated: number
  ordersPaid: number
  ordersApproved: number
  ordersDelivered: number
  conversionRate: number
}

export interface ProductPopularity {
  productType: string
  orderCount: number
  totalQuantity: number
}

export interface DashboardSummary {
  revenue: number
  revenueChange: number
  orders: number
  ordersChange: number
  users: number
  products: number
  productsChange: number
}

interface PublicStats {
  completedDeals: { value: number }
  registeredFactories: { value: number }
  transactionVolume: { value: number }
  activeTraders: { value: number }
  categories: Record<string, number>
}

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export const analyticsApi = {
  getFunnel: (params: { start: string; end: string }) =>
    apiGet<ConversionFunnel>('/analytics/funnel', params),

  getProductPopularity: () =>
    apiGet<ProductPopularity[]>('/analytics/products'),

  getDashboardSummary: async (): Promise<DashboardSummary> => {
    const now = new Date().toISOString()
    const [statsRes, funnelRes] = await Promise.all([
      apiGet<PublicStats>('/public/stats'),
      apiGet<ConversionFunnel>('/analytics/funnel', {
        start: '2000-01-01T00:00:00.000Z',
        end: now,
      }),
    ])

    const stats = statsRes.data
    const funnel = funnelRes.data

    return {
      revenue: stats?.transactionVolume?.value ?? 0,
      revenueChange: 0,
      orders: funnel?.ordersCreated ?? 0,
      ordersChange: 0,
      users: stats?.activeTraders?.value ?? 0,
      products: Object.keys(stats?.categories ?? {}).length,
      productsChange: 0,
    }
  },
}

export const funnelWindow = { start: isoDaysAgo(30), end: new Date().toISOString() }

export interface AnalyticsStreamHandlers {
  onSummary: (summary: DashboardSummary) => void
  onStatusChange?: (status: 'connected' | 'reconnecting' | 'disconnected') => void
}

// Live ADMIN KPIs over SSE (backend GET /analytics/stream, ADMIN-gated).
// Same fetch-based pattern as subscribeToNotifications: EventSource cannot
// attach the Bearer token header. Returns an unsubscribe function.
export function subscribeToAdminAnalytics(
  baseUrl: string,
  handlers: AnalyticsStreamHandlers,
): () => void {
  let closed = false
  let controller: AbortController | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0

  const connect = async () => {
    if (closed) return

    const token = localStorage.getItem('accessToken')
    if (!token) {
      handlers.onStatusChange?.('disconnected')
      return
    }

    controller = new AbortController()

    try {
      const res = await fetch(`${baseUrl}/analytics/stream`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      })

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          handlers.onStatusChange?.('disconnected')
          return
        }
        throw new Error(String(res.status))
      }

      if (!res.body) throw new Error('Response body unavailable')

      attempt = 0
      handlers.onStatusChange?.('connected')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        let idx: number
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const event = parseSSE(raw)

          if (event.type === 'summary' && event.data) {
            try {
              handlers.onSummary(JSON.parse(event.data) as DashboardSummary)
            } catch {
              // ignore malformed payloads
            }
          }
        }
      }
    } catch (error) {
      if (closed) return
      if (error instanceof DOMException && error.name === 'AbortError') return
    }

    if (closed) return

    attempt += 1
    const delay = Math.min(1000 * 2 ** Math.min(attempt - 1, 5), 30000)
    handlers.onStatusChange?.('reconnecting')
    retryTimer = setTimeout(connect, delay)
  }

  connect()

  return () => {
    closed = true
    if (retryTimer) clearTimeout(retryTimer)
    controller?.abort()
  }
}