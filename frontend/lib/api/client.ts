import type { ApiResponse } from '@shared/types'

function normalizeApiBase(base: string): string {
  const trimmed = base.replace(/\/+$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

const API_BASE = normalizeApiBase(
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api',
)

export { API_BASE }

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

function getTokens() {
  if (typeof window === 'undefined') return { accessToken: null, refreshToken: null }
  return {
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
  }
}

function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  localStorage.removeItem('token')
}

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken: rt } = getTokens()
  if (!rt) return null

  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    })

    if (!res.ok) {
      clearTokens()
      return null
    }

    const json: ApiResponse<{ accessToken: string; refreshToken: string }> = await res.json()
    if (!json.success || !json.data) {
      clearTokens()
      return null
    }

    setTokens(json.data.accessToken, json.data.refreshToken)
    return json.data.accessToken
  } catch {
    clearTokens()
    return null
  }
}

export async function apiClient<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {},
): Promise<ApiResponse<T>> {
  const { accessToken } = getTokens()

  let url = `${API_BASE}${path}`

  if (options.params) {
    const searchParams = new URLSearchParams(options.params)
    url += `?${searchParams.toString()}`
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  }

  delete (fetchOptions as any).params

  let res = await fetch(url, fetchOptions)

  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`
      res = await fetch(url, { ...fetchOptions, headers })
    } else {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new ApiClientError(401, 'AUTHENTICATION_ERROR', 'Session expired. Please log in again.')
    }
  }

  const json = await res.json()

  if (!res.ok) {
    const code = json.code || 'UNKNOWN_ERROR'
    throw new ApiClientError(res.status, code, json.error || json.message || `Request failed with status ${res.status}`)
  }

  return json as ApiResponse<T>
}

export async function apiGet<T>(path: string, params?: Record<string, string>) {
  return apiClient<T>(path, { method: 'GET', params })
}

export async function apiPost<T>(path: string, body?: unknown) {
  return apiClient<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function apiPatch<T>(path: string, body?: unknown) {
  return apiClient<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  })
}

export async function apiDelete<T>(path: string) {
  return apiClient<T>(path, { method: 'DELETE' })
}

export function apiMutation<TBody, TResponse>(
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
) {
  return async (body: TBody) => {
    const res = await apiClient<TResponse>(path, {
      method,
      body: body ? JSON.stringify(body) : undefined,
    })
    return res.data
  }
}
