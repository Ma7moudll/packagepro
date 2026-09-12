import { apiGet } from './client'

export interface FinancialReport {
  period: {
    start: string
    end: string
  }
  revenue: number
  costs: number
  profit: number
  orderCount: number
  averageOrderValue: number
  vendorPayments: number
  taxes: number
}

export const financeApi = {
  getReport: (params?: { start?: string; end?: string }) => {
    const query: Record<string, string> = {}
    if (params?.start) query.start = params.start
    if (params?.end) query.end = params.end
    return apiGet<FinancialReport>('/finance/reports', query)
  },
}