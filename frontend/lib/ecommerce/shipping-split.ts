import type { CartItem, CartSummary, ShippingGroup } from "@shared/types"

/**
 * Per-vendor-group shipping rows for the checkout summary (Step-4 Piece 4c).
 * Prefers the server-authoritative `summary.shippingByGroup`; falls back to
 * deriving from the cart's per-item shipping when the summary predates the
 * field (cached carts / older backend payload). Pure and display-order
 * stable (first-seen productType order).
 */
export function shippingSplitRows(
  summary: CartSummary | undefined,
  items: CartItem[],
): ShippingGroup[] {
  if (summary?.shippingByGroup?.length) {
    return summary.shippingByGroup
  }

  const groups = new Map<string, number>()
  for (const item of items) {
    groups.set(item.productType, (groups.get(item.productType) ?? 0) + item.shipping)
  }

  return Array.from(groups.entries()).map(([productType, shipping]) => ({
    productType,
    shipping: Math.round(shipping * 100) / 100,
  }))
}
