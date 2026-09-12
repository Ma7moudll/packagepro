import { apiGet, apiPost, apiPatch, apiDelete } from './client'
import type { Cart, AddCartItemRequest } from '@shared/types'

export const cartApi = {
  get: () =>
    apiGet<Cart>('/cart'),

  addItem: (data: AddCartItemRequest) =>
    apiPost<Cart>('/cart/items', data),

  updateItem: (id: string, data: { quantity?: number; dimensions?: unknown; materialCode?: string; color?: string; finish?: string }) =>
    apiPatch<Cart>(`/cart/items/${id}`, data),

  removeItem: (id: string) =>
    apiDelete<Cart>(`/cart/items/${id}`),

  clear: () =>
    apiDelete<Cart>('/cart'),
}