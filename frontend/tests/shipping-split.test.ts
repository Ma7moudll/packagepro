import { test } from "node:test"
import assert from "node:assert/strict"
import { shippingSplitRows } from "../lib/ecommerce/shipping-split.ts"

// Step-4 Piece 4c — the checkout summary's per-vendor-group shipping rows.

const item = (productType: string, shipping: number, quantity = 1) =>
  ({
    id: `${productType}-${shipping}-${quantity}`,
    productType,
    quantity,
    dimensions: { length: 20, width: 15, height: 10, unit: "cm" },
    unitPrice: 1,
    totalPrice: 1,
    shipping,
    tax: 0,
  }) as import("@shared/types").CartItem

test("shippingSplitRows prefers the server-authoritative shippingByGroup", () => {
  const summary = {
    subtotal: 10,
    tax: 0,
    shipping: 12.25,
    total: 22.25,
    currency: "USD",
    itemsCount: 3,
    shippingByGroup: [
      { productType: "box", shipping: 7.25 },
      { productType: "bag", shipping: 5 },
    ],
  } as import("@shared/types").CartSummary

  assert.deepEqual(shippingSplitRows(summary, []), summary.shippingByGroup)
})

test("shippingSplitRows falls back to deriving from per-item shipping", () => {
  const rows = shippingSplitRows(undefined, [
    item("box", 5),
    item("bag", 7.5),
    item("box", 2.25),
  ])

  assert.deepEqual(rows, [
    { productType: "box", shipping: 7.25 },
    { productType: "bag", shipping: 7.5 },
  ])
})

test("shippingSplitRows sums per group and rounds to the cent", () => {
  const rows = shippingSplitRows(undefined, [item("box", 0.1), item("box", 0.2)])

  assert.deepEqual(rows, [{ productType: "box", shipping: 0.3 }])
})

test("shippingSplitRows is empty for an empty cart", () => {
  assert.deepEqual(shippingSplitRows(undefined, []), [])
})
