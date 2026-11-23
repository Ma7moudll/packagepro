import { apiGet, apiPost, apiPatch } from './client'
import { cartApi } from './cart'
import { buildReorderLines } from './reorder'
import type { Order, CreateOrderRequest, CreateOrderResponse } from '@shared/types'

export const ordersApi = {
  create: (data: CreateOrderRequest) =>
    apiPost<CreateOrderResponse>('/orders', data),

  getById: (id: string) =>
    apiGet<Order>(`/orders/${id}`),

  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const query: Record<string, string> = {}
    if (params?.page) query.page = String(params.page)
    if (params?.limit) query.limit = String(params.limit)
    if (params?.status) query.status = params.status
    return apiGet<Order[]>('/orders', query)
  },

  updateStatus: (id: string, status: string) =>
    apiPatch<Order>(`/orders/${id}/status`, { status }),

  reopenApproval:(id:string,reason:string)=>apiPost<{message:string}>(`/orders/${id}/reopen-approval`,{reason}),

  requestApproval: (id: string, selection: {printFileId:string;dielineFileId:string|null;renew?:boolean}) =>
    apiPost<{ requestId:string;deliveryState:string;reused:boolean }>(`/orders/${id}/request-approval`, selection),

  approve: (id: string, token: string) =>
    apiPost<{ message: string }>(`/orders/${id}/approve`, { token }),

  getPrepressCheck: (id: string) =>
    apiPost<unknown>(`/orders/${id}/prepress-check`),

  getPrepressResults: (id: string) =>
    apiGet<unknown>(`/orders/${id}/prepress-results`),

  createPO: (id: string) =>
    apiPost<unknown>(`/orders/${id}/create-po`),

  getFinancialSummary: (id: string) =>
    apiGet<unknown>(`/orders/${id}/financial-summary`),

  /**
   * One-click reorder (P9): rebuild cart lines from a past order using the
   * real AddCartItemRequest contract.
   */
  reorder: async (order: Order) => {
    for (const line of buildReorderLines(order)) {
      await cartApi.addItem(line)
    }
    return true
  },
}
