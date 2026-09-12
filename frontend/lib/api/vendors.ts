import { apiGet, apiPost } from './client'

export interface VendorDashboard {
  vendor: {
    id: string
    companyName: string
    qualityRating: number | null
  }
  stats: {
    activeOrders: number
    pendingHandshakes: number
    totalPaid: number
    totalPending: number
  }
  pendingHandshakes: unknown[]
  activeOrders: unknown[]
}

export interface PurchaseOrder {
  id: string
  orderId: string
  poNumber: string
  vendorId: string
  status: string
  vendorCost: string | number
  currency: string
  requestedDeliveryDate: string | null
  confirmedAt: string | null
  createdAt: string
  handshake?: {
    id: string
    status: string
    expiresAt: string
    acceptedAt: string | null
    rejectedAt: string | null
    rejectionReason: string | null
  } | null
  production?: {
    id: string
    poId: string
    status: string
    progressPercent: number
    notes: string | null
    startedAt: string | null
    estimatedCompletionDate: string | null
  } | null
  order?: {
    id: string
    orderNumber: string
    status?: string
    shippingName?: string
    shippingPhone?: string
    shippingAddress?: {
      name?: string
      phone?: string
      email?: string
      street?: string
      city?: string
      state?: string
      postalCode?: string
      country?: string
    } | null
    items?: unknown[]
  } | null
}

export interface BackendOrderItem {
  id: string
  productType: string
  quantity: number
  dimensions: { length: number; width: number; height?: number | null; unit: string }
  material?: string | null
  color?: string | null
  finish?: string | null
  unitPrice: string | number
  totalPrice: string | number
}

export interface BackendOrder {
  id: string
  orderNumber: string
  status: string
  subtotal: string | number
  tax: string | number
  shippingCost: string | number
  total: string | number
  currency: string
  notes?: string | null
  shippingAddress?: {
    name?: string
    phone?: string
    email?: string
    street?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  } | null
  shippingName?: string
  shippingPhone?: string
  shippingEmail?: string | null
  createdAt: string
  updatedAt: string
  items?: BackendOrderItem[]
  purchaseOrder?: { id: string; poNumber: string; status: string; vendorId: string } | null
  customer?: {
    user?: { id: string; email?: string; firstName?: string | null; lastName?: string | null } | null
  } | null
  shipment?: unknown
  payment?: unknown
}

export const num = (v: string | number | null | undefined): number =>
  v === null || v === undefined || v === "" ? 0 : Number(v)

export const vendorsApi = {
  getDashboard: () =>
    apiGet<VendorDashboard>('/vendors/dashboard'),

  getOrders: (params?: { page?: number; limit?: number; status?: string }) => {
    const query: Record<string, string> = {}
    if (params?.page) query.page = String(params.page)
    if (params?.limit) query.limit = String(params.limit)
    if (params?.status) query.status = params.status
    return apiGet<PurchaseOrder[]>('/vendors/orders', query)
  },

  getHandshakes: () =>
    apiGet<unknown[]>('/vendors/handshakes'),

  acceptHandshake: (id: string) =>
    apiPost<unknown>(`/handshakes/${id}/accept`),

  rejectHandshake: (id: string, reason?: string) =>
    apiPost<unknown>(`/handshakes/${id}/reject`, { reason }),

  startProduction: (poId: string) =>
    apiPost<{ id: string; poId: string; status: string; progressPercent: number }>(`/production/start/${poId}`),

  updateProductionProgress: (productionId: string, progressPercent: number, notes?: string) =>
    apiPost<{ id: string; status: string; progressPercent: number }>(`/production/${productionId}/progress`, { progressPercent, notes }),

  getReviews: (vendorId: string) =>
    apiGet<unknown[]>(`/vendors/${vendorId}/reviews`),

  getPerformance: (vendorId: string) =>
    apiGet<unknown>(`/vendors/${vendorId}/performance`),

  getPaymentSummary: (vendorId: string) =>
    apiGet<unknown>(`/vendors/${vendorId}/payment-summary`),

  getPayments: (vendorId: string, params?: { page?: number; limit?: number }) => {
    const query: Record<string, string> = {}
    if (params?.page) query.page = String(params.page)
    if (params?.limit) query.limit = String(params.limit)
    return apiGet<unknown[]>(`/vendors/${vendorId}/payments`, query)
  },
}
