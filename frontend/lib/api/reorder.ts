import type { AddCartItemRequest, Order } from "@shared/types"

/**
 * Map an Order back into AddCartItemRequest lines for one-click reorder.
 * Pure function — the API wrapper (ordersApi.reorder) just executes these.
 *
 * - A single-design order carries the design session so the editor linkage is
 *   preserved through Cart → Order traceability (M7-E).
 * - Multi-line orders push catalog identity (product/variant/sku) so distinct
 *   lines are NOT silently merged by an equal design session.
 */
export function buildReorderLines(order: Order): AddCartItemRequest[] {
  const useSession = order.items.length === 1 && !!order.design?.sessionId
  return order.items.map((item) => ({
    productType: item.productType,
    quantity: item.quantity,
    dimensions: item.dimensions,
    materialCode: item.material ?? item.materialCode,
    color: item.color,
    finish: item.finish,
    productId: item.productId ?? undefined,
    variantId: item.variantId ?? undefined,
    sku: item.sku ?? undefined,
    config: item.config as Record<string, string> | undefined,
    sessionId: useSession ? order.design!.sessionId! : undefined,
  }))
}