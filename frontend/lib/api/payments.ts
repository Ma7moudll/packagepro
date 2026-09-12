import { apiPost } from './client'
import type { PaymentIntentRequest, PaymentIntentResponse } from '@shared/types'

export const paymentsApi = {
  createIntent: (data: PaymentIntentRequest) =>
    apiPost<PaymentIntentResponse>('/payments/create-intent', data),

  confirm: (paymentIntentId: string) =>
    apiPost<{ message: string }>('/payments/confirm', { paymentIntentId }),
}
