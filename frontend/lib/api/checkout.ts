import { apiGet, apiPost } from './client'
import type { Cart, CheckoutRequest, CheckoutResponse } from '@shared/types'

export const checkoutApi = {
  summary: () =>
    apiGet<Cart>('/checkout/summary'),

  checkout: (data: CheckoutRequest) =>
    apiPost<CheckoutResponse>('/checkout', data),
}