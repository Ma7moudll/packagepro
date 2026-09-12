import { apiGet } from './client'

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