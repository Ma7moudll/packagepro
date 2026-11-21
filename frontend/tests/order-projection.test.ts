import { test } from "node:test"
import assert from "node:assert/strict"
import {
  billingStats,
  currencyOf,
  daysUntilEta,
  isFailedStatus,
  isPaid,
  isPayingStatus,
  money,
  orderTotal,
  shippingOf,
  trackingNumber,
} from "../lib/orders/projections.ts"
import { makeOrder } from "./fixtures.ts"

// P4/P5/P7 — shared Order → UI projections.
// The backend serializes Prisma Decimals as strings, so every numeric helper
// must coerce before display math; the shipment/design projections come from
// relations (dhlTrackingNumber), not order columns.

test("money coerces serialized decimal strings and junk to safe numbers", () => {
  assert.equal(money(makeOrder(), "127.20"), 127.2)
  assert.equal(money(makeOrder(), 127.2), 127.2)
  assert.equal(money(makeOrder(), undefined), 0)
  assert.equal(money(makeOrder(), "not-a-number"), 0)
  assert.equal(money(makeOrder(), null), 0)
})

test("orderTotal/subtotal helpers resolve through the same coercion", () => {
  // Backend JSON-serializes Prisma Decimals as strings; the projection must
  // coerce them before display math.
  const order = makeOrder({ total: "127.20" as never, subtotal: "120.00" as never, tax: "7.20" as never })
  assert.equal(orderTotal(order), 127.2)
  assert.equal(shippingOf(order), 0)
})

test("currencyOf prefers the payment currency when the order row lacks it", () => {
  assert.equal(currencyOf(makeOrder({ currency: "EGP" })), "EGP")
  assert.equal(currencyOf(makeOrder({ currency: "USD" })), "USD")
  assert.equal(
    currencyOf(makeOrder({ currency: undefined as never, payment: { currency: "GBP" } })),
    "GBP",
  )
  assert.equal(currencyOf(makeOrder({ currency: undefined as never })), "EGP")
})

test("shippingOf prefers the authoritative shippingCost over legacy shipping", () => {
  assert.equal(shippingOf(makeOrder({ shippingCost: 15, shipping: 99 })), 15)
  assert.equal(shippingOf(makeOrder({ shipping: 8 })), 8)
  assert.equal(shippingOf(makeOrder({ shippingCost: "0.00" as never, shipping: 99 })), 0)
})

test("isPaid gates invoice download on captured payments only", () => {
  assert.equal(isPaid(makeOrder({ paymentStatus: "succeeded" })), true)
  assert.equal(isPaid(makeOrder({ paymentStatus: "processing" })), true)
  for (const s of ["pending", "failed", "refunded", undefined] as const) {
    assert.equal(isPaid(makeOrder({ paymentStatus: s as never })), false)
  }
  assert.equal(isPayingStatus("succeeded"), true)
  assert.equal(isPayingStatus("processing"), true)
  assert.equal(isFailedStatus("failed"), true)
  assert.equal(isFailedStatus("refunded"), true)
})

test("trackingNumber reads the shipment projection, falling back to the legacy column", () => {
  assert.equal(
    trackingNumber(makeOrder({ shipment: { status: "shipped", dhlTrackingNumber: "JD0001" } as never })),
    "JD0001",
  )
  assert.equal(
    trackingNumber(makeOrder({ shipment: { status: "shipped", trackingNumber: "JD0002" } as never })),
    "JD0002",
  )
  assert.equal(trackingNumber(makeOrder({ trackingNumber: "LEGACY-1" })), "LEGACY-1")
  assert.equal(trackingNumber(makeOrder()), null)
})

test("daysUntilEta returns null without an ETA and 0 for past/due dates", () => {
  assert.equal(daysUntilEta(makeOrder()), null)
  const past = new Date(Date.now() - 86400000 * 5).toISOString()
  assert.equal(daysUntilEta(makeOrder({ shipment: { estimatedDeliveryDate: past } as never })), 0)
  const future = new Date(Date.now() + 86400000 * 5).toISOString()
  assert.equal(daysUntilEta(makeOrder({ shipment: { estimatedDeliveryDate: future } as never })), 5)
})