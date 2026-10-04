import { apiGet, apiPost, apiPatch } from './client'

export interface VendorProfile {
  id: string
  companyName: string
  taxId?: string | null
  address: string
  city: string
  country: string
  postalCode?: string | null
  phone?: string | null
  email?: string | null
  isActive: boolean
  qualityRating?: number | null
  averageLeadTime?: number | null
  minOrderQuantity?: number | null
  createdAt?: string
}

export interface ProductionSample {
  id: string
  status: 'pending' | 'approved' | 'rejected'
  photoUrls: string[]
  notes?: string | null
  revisionNotes?: string | null
  updatedAt: string
}

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
    samples?: ProductionSample[]
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

  /**
   * Upload QA sample photos for a production (SPEC-029 Week 8).
   * Photos are sent base64-encoded in JSON; the backend stores them via the
   * file-upload service (S3 or local disk) and resets the sample to `pending`.
   */
  uploadSamples: (
    productionId: string,
    photos: { fileName: string; mimeType: string; dataBase64: string }[],
    notes?: string
  ) =>
    apiPost<{ id: string; status: string; photoUrls: string[]; notes?: string | null }>(
      `/production/${productionId}/samples`,
      { photos, notes }
    ),

  getVendorProfile: () =>
    apiGet<VendorProfile>('/vendors/me'),

  updateVendorProfile: (data: Partial<VendorProfile>) =>
    apiPatch<VendorProfile>('/vendors/me', data),

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
