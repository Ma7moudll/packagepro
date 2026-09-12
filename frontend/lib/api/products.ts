import { apiGet, apiPost, apiPatch, apiDelete } from './client'
import type { Product } from '@shared/types'

export interface VendorProduct {
  id: string
  name: string
  nameEn: string
  description: string
  descriptionEn: string
  price: number
  category: string
  material: string
  stock: number
  minQuantity: number
  customizable: boolean
  sustainableMaterial: boolean
  image: string
  images: string[]
  sales: number
  status: string
  createdAt: string
}

export const productsApi = {
  list: (params?: { category?: string; page?: number; limit?: number }) => {
    const query: Record<string, string> = {}
    if (params?.category) query.category = params.category
    if (params?.page) query.page = String(params.page)
    if (params?.limit) query.limit = String(params.limit)
    return apiGet<VendorProduct[]>('/products', query)
  },

  getById: (id: string) =>
    apiGet<VendorProduct>(`/products/${id}`),

  getByCategory: (category: string) =>
    apiGet<VendorProduct[]>(`/products`, { category }),

  create: (data: Partial<VendorProduct>) =>
    apiPost<VendorProduct>('/products', data),

  update: (id: string, data: Partial<VendorProduct>) =>
    apiPatch<VendorProduct>(`/products/${id}`, data),

  delete: (id: string) =>
    apiDelete<{ message: string }>(`/products/${id}`),

  getTemplates: () =>
    apiGet<unknown[]>('/templates'),

  getPopularTemplates: () =>
    apiGet<unknown[]>('/templates/popular'),
}
