/** Local stored files are served by the backend, not Next's historical mock API. */
export function approvalProofUrl(value: string, apiBase: string, frontendOrigin?: string): string | null {
  try {
    const base = new URL(apiBase, frontendOrigin)
    const url = value.startsWith('/api/files/') ? new URL(value, base.origin) : new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.href
  } catch { return null }
}
