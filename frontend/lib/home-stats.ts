// Homepage stat tiles. Values come from the real /api/stats response only.
//
// - Counts are shown exactly: no "+", no rounding up, a real zero shows "0".
// - A missing, failed or malformed value is null (the page shows "-"),
//   never a made-up number.
// - transactionVolume is intentionally NOT displayed. Order.total has no
//   currency column and the payment currency default differs between code
//   paths (EGP vs DEFAULT_CURRENCY=usd), so the unit of the sum is not
//   established. It stays in the raw API response for compatibility.

export type HomeStatCounts = {
  completedDeals: string | null
  registeredFactories: string | null
  activeTraders: string | null
}

export const UNAVAILABLE_STAT: HomeStatCounts = {
  completedDeals: null,
  registeredFactories: null,
  activeTraders: null,
}

export function formatExactCount(raw: unknown): string | null {
  if (typeof raw !== "number" || !Number.isSafeInteger(raw) || raw < 0) return null
  return raw.toLocaleString("en-US")
}

export function buildHomeStatCounts(payload: unknown): HomeStatCounts {
  const p = payload as { success?: unknown; stats?: Record<string, { raw?: unknown } | undefined> } | null
  if (!p || p.success !== true || !p.stats || typeof p.stats !== "object") {
    return { ...UNAVAILABLE_STAT }
  }
  return {
    completedDeals: formatExactCount(p.stats.completedDeals?.raw),
    registeredFactories: formatExactCount(p.stats.registeredFactories?.raw),
    activeTraders: formatExactCount(p.stats.activeTraders?.raw),
  }
}
