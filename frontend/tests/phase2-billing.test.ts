import { test } from "node:test"
import assert from "node:assert/strict"
import { billingStats } from "../lib/orders/projections.ts"
import { makeOrder } from "./fixtures.ts"

// P7 — billing projection against the payment-history endpoint.
// Guardrails codified here:
//   - cancelled orders NEVER count toward spend or appear in the roster,
//     even when their adjusted totals were zeroed out (status filter, not a
//     subtotal heuristic).
//   - only captured payments (succeeded/processing) contribute to totalSpent.
//   - 0.00 orders (free shipping) still show as invoices.
//   - rows are most-recent-first.

const status = (o: ReturnType<typeof makeOrder>, s: string) =>
  ({ ...o, status: s }) as ReturnType<typeof makeOrder>

test("cancelled orders are excluded from billing regardless of amount", () => {
  const cancelledBig = makeOrder({ status: "cancelled", total: 9999, paymentStatus: "succeeded" })
  const stats = billingStats([cancelledBig])
  assert.equal(stats.bills.length, 0)
  assert.equal(stats.paidOrders.length, 0)
  assert.equal(stats.totalSpent, 0)
})

test("cancelled-with-zeroed-adjusted-totals is still excluded (status, not subtotal)", () => {
  // A cancelled order whose subtotal/fees were adjusted to 0.00 must NOT be
  // recorded as "spend" by a naive >0 filter.
  const sneaky = makeOrder({ status: "cancelled", subtotal: 0, tax: 0, shipping: 0, total: 0 as never, paymentStatus: "succeeded" })
  const ok = makeOrder({ status: "completed", total: 100, paymentStatus: "succeeded" })
  const stats = billingStats([sneaky, ok])
  assert.deepEqual(stats.bills.map((o) => o.id), [ok.id])
  assert.equal(stats.totalSpent, 100)
})

test("totalSpent only counts captured payments", () => {
  const paid = makeOrder({ status: "completed", total: "200.00" as never, paymentStatus: "succeeded" })
  const pending = makeOrder({ status: "shipped", total: "50.00" as never, paymentStatus: "pending" })
  const failed = makeOrder({ status: "shipped", total: "80.00" as never, paymentStatus: "failed" })
  const stats = billingStats([paid, pending, failed])
  assert.equal(stats.totalSpent, 200)
  assert.equal(stats.paidOrders.length, 1)
  assert.equal(stats.bills.length, 3) // pending/failed still listed as invoices
})

test("free-shipping zero-total orders still appear on the billing roster", () => {
  const free = makeOrder({ status: "delivered", total: 0, paymentStatus: "succeeded" })
  const stats = billingStats([free])
  assert.equal(stats.bills.length, 1)
  assert.equal(stats.paidOrders.length, 1)
  assert.equal(stats.totalSpent, 0)
})

test("rows are most-recent-first and currency follows the first paid order", () => {
  const newer = makeOrder({ createdAt: "2026-02-01T00:00:00.000Z", paymentStatus: "succeeded", currency: "EGP", payment: { currency: "EGP" } })
  const older = makeOrder({ createdAt: "2026-01-01T00:00:00.000Z", paymentStatus: "succeeded", currency: "USD" })
  const stats = billingStats([older, newer])
  assert.deepEqual(stats.bills.map((o) => o.id), [newer.id, older.id])
  assert.equal(stats.currency, "EGP")
})