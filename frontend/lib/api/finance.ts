import { apiGet, API_BASE, ApiClientError } from './client'

export interface CurrencyFinancialMetrics {
  currency: string | null;
  revenue: number;
  taxes: number;
  orderCount: number;
  averageOrderValue: number;
  vendorPayments: number | null;
  costs: number | null;
  profit: number | null;
  costStatus: "same-currency" | "unreconciled";
}
export interface FinancialReport {
  byCurrency?: CurrencyFinancialMetrics[];
  unclassifiedOrderCount?: number;
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

  /**
   * (Decision B) Real finance-backed invoice download. The backend streams a
   * PDF from GET /api/orders/:id/invoice behind an authenticated customer.
   */
  downloadInvoice: async (orderId: string): Promise<Blob> => {
    const accessToken =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    const res = await fetch(`${API_BASE}/orders/${orderId}/invoice`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    })
    if (!res.ok) {
      const json = await res.json().catch(() => null)
      throw new ApiClientError(
        res.status,
        json?.code || (res.status === 401 ? 'AUTHENTICATION_ERROR' : 'INVOICE_ERROR'),
        json?.error || json?.message || `Invoice download failed (${res.status})`,
      )
    }
    return res.blob()
  },

  /** Trigger a browser download of the invoice PDF for the given order. */
  saveInvoice: async (orderId: string, orderNumber?: string) => {
    const blob = await financeApi.downloadInvoice(orderId)
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${orderNumber || orderId}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },
}