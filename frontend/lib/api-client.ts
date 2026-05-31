// Helper functions for API calls with authentication
export function getAuthHeaders(): HeadersInit {
  if (typeof window === "undefined") {
    return {}
  }

  const token = localStorage.getItem("token")
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  return headers
}

export async function apiFetch(url: string, options: RequestInit = {}) {
  const headers = {
    ...getAuthHeaders(),
    ...(options.headers || {}),
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}


