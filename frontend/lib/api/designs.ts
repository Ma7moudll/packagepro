import { apiGet, apiPost } from './client'

export const designsApi = {
  list: () =>
    apiGet<unknown[]>('/designs'),

  createSession: (data?: { orderId?: string; name?: string; description?: string }) =>
    apiPost<unknown>('/designs/session', data),

  getSession: (sessionId: string) =>
    apiGet<unknown>(`/designs/session/${sessionId}`),

  save: (data: {
    sessionId: string
    designData: unknown
    files?: unknown[]
    productId?: string
    variantId?: string
    sku?: string
    designConfig?: unknown
  }) => apiPost<unknown>('/designs/save', data),

  getById: (id: string) =>
    apiGet<unknown>(`/designs/${id}`),

  getFiles: (id: string) =>
    apiGet<unknown[]>(`/designs/${id}/files`),

  submit: (id: string) =>
    apiPost<unknown>(`/designs/${id}/submit`),

  recall: (id: string) =>
    apiPost<unknown>(`/designs/${id}/recall`),

  review: (id: string) =>
    apiGet<unknown>(`/designs/${id}/review`),

  approve: (id: string, notes?: string) =>
    apiPost<unknown>(`/designs/${id}/review/approve`, { notes }),

  reject: (id: string, reason: string) =>
    apiPost<unknown>(`/designs/${id}/review/reject`, { reason }),

  requestChanges: (id: string, changes: string[]) =>
    apiPost<unknown>(`/designs/${id}/review/request-changes`, { changes }),

  addComment: (id: string, comment: { elementRef?: string; commentText: string; commentType?: string }) =>
    apiPost<unknown>(`/designs/${id}/review/comment`, comment),
}
