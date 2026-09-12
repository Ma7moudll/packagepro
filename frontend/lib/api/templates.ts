import { apiGet } from './client'
import type { Template } from '@shared/types'

export const templatesApi = {
  list: (params?: { category?: string; productType?: string; search?: string }) => {
    const query: Record<string, string> = {}
    if (params?.category) query.category = params.category
    if (params?.productType) query.productType = params.productType
    if (params?.search) query.search = params.search
    return apiGet<Template[]>('/templates', query)
  },

  getById: (id: string) =>
    apiGet<Template>(`/templates/${id}`),

  popular: (limit?: number) =>
    apiGet<Template[]>('/templates/popular', limit ? { limit: String(limit) } : undefined),
}