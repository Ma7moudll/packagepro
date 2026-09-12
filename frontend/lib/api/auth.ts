import { apiGet, apiPatch, apiPost } from './client'
import type { ApiResponse } from '@shared/types'

export interface UserProfile {
  id: string
  email: string
  name: string
  firstName?: string
  lastName?: string
  phone?: string
  company?: string
  role: string
  createdAt: string
}

export const authApi = {
  getProfile: () =>
    apiGet<UserProfile>('/auth/me'),

  updateProfile: (data: Partial<Pick<UserProfile, 'name' | 'phone' | 'company'>>) =>
    apiPatch<UserProfile>('/auth/me', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiPost<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
}
