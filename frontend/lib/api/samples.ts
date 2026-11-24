import { apiGet, apiPost } from './client'

/**
 * QA sample review API (SPEC-029 Phase 3/5).
 * Sample photo upload lives in vendorsApi.uploadSamples (vendor action);
 * approve/reject are ADMIN (QA) actions on the backend.
 */

export interface Sample {
  submissionId: string
  id: string
  productionId: string
  status: 'pending' | 'approved' | 'rejected'
  photoUrls: string[]
  notes?: string | null
  revisionNotes?: string | null
  reviewedBy?: string | null
  reviewedAt?: string | null
  updatedAt: string
  production?: {
    id: string
    status: string
    progressPercent: number
    purchaseOrder?: {
      poNumber: string
      order?: { id: string; orderNumber: string } | null
    } | null
    vendor?: { id: string; companyName: string } | null
  } | null
}

export const samplesApi = {
  get: (id: string) => apiGet<Sample>(`/samples/${id}`),

  /** ADMIN: approve a production sample → production resumes full run. */
  approve: (id: string, submissionId: string) => apiPost<Sample>(`/samples/${id}/approve`, { submissionId }),

  /** ADMIN: reject with revision notes → vendor fixes and re-uploads. */
  reject: (id: string, revisionNotes: string, submissionId: string) =>
    apiPost<Sample>(`/samples/${id}/reject`, { revisionNotes, submissionId }),
}
