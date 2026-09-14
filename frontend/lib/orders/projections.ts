import type { Order } from "@shared/types"

/**
 * Shared Order → UI projections for the customer portal. The backend
 * serializes Prisma Decimals as strings, so numeric fields must be coerced
 * before display math (toFixed, comparisons).
 */

export function currencyOf(order: Order): string {
  return order.currency || order.payment?.currency || "USD"
}

export function money(order: Order, value: unknown): number {
  const n = Number(value ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function orderTotal(order: Order): number {
  return money(order, order.total)
}

export function subtotalOf(order: Order): number {
  return money(order, order.subtotal)
}

export function taxOf(order: Order): number {
  return money(order, order.tax)
}

/** BE authoritative field is `shippingCost`; `shipping` is the legacy alias. */
export function shippingOf(order: Order): number {
  return money(order, order.shippingCost ?? order.shipping)
}

/** A customer can download an invoice once payment has been captured. */
export function isPaid(order: Order): boolean {
  return order.paymentStatus === "succeeded" || order.paymentStatus === "processing"
}

/** DHL number lives on the shipment projection, not on the order row. */
export function trackingNumber(order: Order): string | null {
  if (order.shipment?.dhlTrackingNumber) return order.shipment.dhlTrackingNumber
  if (order.shipment?.trackingNumber) return order.shipment.trackingNumber
  return order.trackingNumber ?? null
}

export function estimatedDelivery(order: Order): string | null {
  return order.shipment?.estimatedDeliveryDate ?? order.shipment?.estimatedDelivery ?? null
}

/** Whole days until the ETA, or null when no ETA is set. 0 = due today. */
export function daysUntilEta(order: Order): number | null {
  const eta = estimatedDelivery(order)
  if (!eta) return null
  const diff = new Date(eta).getTime() - Date.now()
  return diff <= 0 ? 0 : Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function isPayingStatus(s?: string): boolean {
  return s === "succeeded" || s === "processing"
}

export function isFailedStatus(s?: string): boolean {
  return s === "failed" || s === "refunded"
}

export interface BillingStats {
  bills: Order[]
  paidOrders: Order[]
  totalSpent: number
  currency: string
}

/**
 * Customer billing projection (P7). Ordered by recency. Cancelled orders
 * are excluded from billing records entirely — never count them, even when
 * their subtotal/fees were adjusted to zero. Total spend only counts
 * captured payments; 0.00 orders (free shipping) still appear as bills.
 */
export function billingStats(orders: Order[]): BillingStats {
  const normalize = (s?: string) => (s || "").toLowerCase()
  const bills = orders
    .filter((o) => !normalize(o.status).includes("cancel"))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const paidOrders = bills.filter(isPaid)
  const totalSpent = paidOrders.reduce((sum, o) => sum + orderTotal(o), 0)
  const currency = paidOrders[0] ? currencyOf(paidOrders[0]) : "USD"
  return { bills, paidOrders, totalSpent, currency }
}