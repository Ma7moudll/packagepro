import { apiGet, apiPost, apiPatch } from './client'
import type { AppNotification } from '@shared/types'

export interface NotificationListResponse {
  data: AppNotification[]
  total: number
  unread: number
}

export const notifApi = {
  list: (limit = 20) => apiGet<NotificationListResponse>(`/notifications?limit=${limit}`),

  unreadCount: () => apiGet<{ count: number }>('/notifications/unread-count'),

  markAsRead: (id: string) => apiPatch<{ unread: number }>(`/notifications/${id}/read`),

  markAllAsRead: () => apiPost<{ unread: number }>('/notifications/read-all'),
}