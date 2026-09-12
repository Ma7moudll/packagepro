import { apiGet, apiPost } from './client'
import type { Shipment } from '@shared/types'

export const shipmentsApi = {
  create: (orderId: string) =>
    apiPost<Shipment>(`/shipments/create/${orderId}`),

  getTracking: (id: string) =>
    apiGet<Shipment>(`/shipments/${id}/tracking`),

  getByOrder: (orderId: string) =>
    apiGet<Shipment>(`/orders/${orderId}/shipment`),
}
