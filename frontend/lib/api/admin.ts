import type { MoneyGroup } from "@/components/admin/money";
import { apiGet, apiPatch } from './client'

/**
 * Platform operations console API (SPEC-029 Phase 4).
 * All routes are ADMIN-gated server-side; a 403 means the session role
 * is wrong, not the UI.
 */

export interface AdminOverview {
  ordersToday: number
  totalOrders: number
  totalRevenue: number
  unclassifiedOrderCount?: number
  unclassifiedTodayOrderCount?: number
  revenueByCurrency?: MoneyGroup[];
  revenueTodayByCurrency?: MoneyGroup[];
  revenueToday: number
  activeVendors: number
  totalCustomers: number
  pendingHandshakes: number
  pendingSettlements: number
  ordersByStatus: { status: string; count: number }[]
}

export interface AdminOrder {
  id: string
  orderNumber: string
  status: string
  subtotal: string | number
  tax: string | number
  shippingCost: string | number
  total: string | number
  currency: string | null;
  createdAt: string
  customer?: {
    user?: { email?: string; firstName?: string | null; lastName?: string | null } | null
  } | null
  items?: { id: string; productType: string; quantity: number; totalPrice: string | number }[]
  payment?: { id: string; status: string; amount: string | number } | null
  purchaseOrder?: { id: string; poNumber: string; status: string } | null
  shipment?: { id: string; status: string; dhlTrackingNumber?: string | null } | null
}

export interface AdminVendor {
  id: string
  companyName: string
  city: string
  country: string
  isActive: boolean
  qualityRating: number
  createdAt: string
  user?: { email?: string; firstName?: string | null; lastName?: string | null; lastLoginAt?: string | null } | null
  _count?: { purchaseOrders: number; handshakes: number; productions: number; reviews: number }
}

export interface AdminCustomer {
  id: string
  email?: string | null
  firstName?: string | null
  lastName?: string | null
  memberSince?: string | null
  ordersCount: number
  unclassifiedOrderCount?: number
  lifetimeValueByCurrency?: MoneyGroup[];
  lifetimeValue: number
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export const adminApi = {
  getOverview: () => apiGet<AdminOverview>('/admin/overview'),

  getOrders: (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    const query: Record<string, string> = {}
    if (params?.page) query.page = String(params.page)
    if (params?.limit) query.limit = String(params.limit)
    if (params?.status) query.status = params.status
    if (params?.search) query.search = params.search
    return apiGet<AdminOrder[]>('/admin/orders', query)
  },

  getVendors: (params?: { page?: number; limit?: number; active?: 'true' | 'false' }) => {
    const query: Record<string, string> = {}
    if (params?.page) query.page = String(params.page)
    if (params?.limit) query.limit = String(params.limit)
    if (params?.active) query.active = params.active
    return apiGet<AdminVendor[]>('/admin/vendors', query)
  },

  updateVendor: (id: string, data: { isActive?: boolean; qualityRating?: number }) =>
    apiPatch<AdminVendor>(`/admin/vendors/${id}`, data),

  getCustomers: (params?: { page?: number; limit?: number; search?: string }) => {
    const query: Record<string, string> = {}
    if (params?.page) query.page = String(params.page)
    if (params?.limit) query.limit = String(params.limit)
    if (params?.search) query.search = params.search
    return apiGet<AdminCustomer[]>('/admin/customers', query)
  },

  getSamples: (params?: { status?: string; page?: number; limit?: number }) => {
    const query: Record<string, string> = {}
    if (params?.status) query.status = params.status
    if (params?.page) query.page = String(params.page)
    if (params?.limit) query.limit = String(params.limit)
    return apiGet<AdminSample[]>('/admin/samples', query)
  },
}

export interface AdminSample {
  id: string
  status: string
  photoUrls: string[]
  notes?: string | null
  revisionNotes?: string | null
  reviewedAt?: string | null
  updatedAt: string
  production: {
    id: string
    status: string
    progressPercent: number
    purchaseOrder?: {
      poNumber: string
      order?: { id: string; orderNumber: string; status: string } | null
    } | null
    vendor?: { id: string; companyName: string } | null
  }
}
