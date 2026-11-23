import { apiGet, apiPost } from './client'
import type { DesignFile } from '@shared/types'

export interface DesignRecord {
  id: string
  sessionId?: string | null
  orderId?: string | null
  ownerId?: string | null
  name?: string | null
  description?: string | null
  status?: string
  lifecycleStatus?: string
  productId?: string | null
  variantId?: string | null
  sku?: string | null
  designConfig?: Record<string, unknown> | null
  files?: DesignFile[]
  order?: { id: string; orderNumber: string; status?: string } | null
  createdAt?: string
  updatedAt?: string
}

export interface ArtworkReviewArtifact {
  id: string
  fileName: string
  snapshotHash: string
  sha256: string
  pdfBase64: string
  productionReady: false
}

export const designsApi = {
  createArtworkReview: (id: string, data: {snapshotHash:string;pdfBase64:string}) =>
    apiPost<Omit<ArtworkReviewArtifact,'pdfBase64'>>(`/designs/${id}/artwork-reviews`, data),
  getArtworkReview: (id: string, fileId: string) =>
    apiGet<ArtworkReviewArtifact>(`/designs/${id}/artwork-reviews/${fileId}`),
  list: () =>
    apiGet<DesignRecord[]>('/designs'),

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
    apiGet<DesignRecord>(`/designs/${id}`),

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

  // M8-J: certified dieline delivery receipt (synchronous, corroborating record).
  exportCertifiedDieline: (id: string) =>
    apiPost<unknown>(`/designs/${id}/export`, {
      format: 'svg',
      options: { dieline: true },
    }),

  // M8-I/M8-J: persisted prepress certification result for the linked order.
  getPrePressResults: (orderId: string) =>
    apiGet<unknown>(`/orders/${orderId}/prepress-results`),
}