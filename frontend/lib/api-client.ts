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

// Design API calls
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

export async function submitDesign(designId: string) {
  return apiFetch(`${API_BASE}/designs/${designId}/submit`, {
    method: "POST",
  })
}

export async function recallDesign(designId: string) {
  return apiFetch(`${API_BASE}/designs/${designId}/recall`, {
    method: "POST",
  })
}

export async function exportDesign(
  designId: string,
  format: "png" | "pdf" | "ai" | "eps",
  options?: {
    dpi?: number;
    colorMode?: "rgb" | "cmyk";
    bleedMargin?: number;
  }
) {
  return apiFetch(`${API_BASE}/designs/${designId}/export`, {
    method: "POST",
    body: JSON.stringify({
      format,
      options,
    }),
  })
}

export async function getExportJobStatus(jobId: string) {
  return apiFetch(`${API_BASE}/exports/${jobId}`, {
    method: "GET",
  })
}

// Review API calls
export async function getDesignForReview(designId: string) {
  return apiFetch(`${API_BASE}/designs/${designId}/review`, {
    method: "GET",
  })
}

export async function addCommentToDesign(
  designId: string,
  comment: {
    elementRef?: string;
    commentText: string;
    commentType?: "general" | "revision_request" | "approval_note";
  }
) {
  return apiFetch(`${API_BASE}/designs/${designId}/review/comment`, {
    method: "POST",
    body: JSON.stringify(comment),
  })
}

export async function approveDesign(designId: string, notes?: string) {
  return apiFetch(`${API_BASE}/designs/${designId}/review/approve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  })
}

export async function rejectDesign(designId: string, reason: string) {
  return apiFetch(`${API_BASE}/designs/${designId}/review/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  })
}

export async function requestChanges(designId: string, changes: string[]) {
  return apiFetch(`${API_BASE}/designs/${designId}/review/request-changes`, {
    method: "POST",
    body: JSON.stringify({ changes }),
  })
}

// Brand Kit API calls
export async function createBrandKit(data: {
  name: string;
  colors: Array<{ name: string; hex: string; usage: string }>;
  fonts: Array<{ family: string; variants: string[]; usage: string }>;
  logoAssetId?: string;
}) {
  return apiFetch(`${API_BASE}/brand-kits`, {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function getBrandKit(kitId: string) {
  return apiFetch(`${API_BASE}/brand-kits/${kitId}`, {
    method: "GET",
  })
}

export async function listBrandKits(customerId: string) {
  return apiFetch(`${API_BASE}/customers/${customerId}/brand-kits`, {
    method: "GET",
  })
}

export async function updateBrandKit(
  kitId: string,
  data: {
    name?: string;
    colors?: Array<{ name: string; hex: string; usage: string }>;
    fonts?: Array<{ family: string; variants: string[]; usage: string }>;
  }
) {
  return apiFetch(`${API_BASE}/brand-kits/${kitId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  })
}

export async function deleteBrandKit(kitId: string) {
  return apiFetch(`${API_BASE}/brand-kits/${kitId}`, {
    method: "DELETE",
  })
}

export async function applyBrandKit(designId: string, kitId: string) {
  return apiFetch(`${API_BASE}/designs/${designId}/brand-kit`, {
    method: "POST",
    body: JSON.stringify({ kitId }),
  })
}

