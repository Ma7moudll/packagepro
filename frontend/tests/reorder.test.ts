import { test } from "node:test"
import assert from "node:assert/strict"
import { buildReorderLines } from "../lib/api/reorder.ts"
import { makeItem, makeOrder } from "./fixtures.ts"

// P9 — one-click reorder maps an order back to AddCartItemRequest lines.
// Single-design orders keep the design sessionId for editor traceability;
// multi-line orders push catalog identity (productId/variantId/sku) so
// distinct lines never merge under an equal session.

test("single-design order carries the design sessionId for traceability", () => {
  const line = buildReorderLines(
    makeOrder({ design: { id: "d-1", sessionId: "sess-abc" } as never }),
  )[0]
  assert.equal(line.sessionId, "sess-abc")
  // Trace-target: one line, sessionId set → catalog identity omitted.
  assert.equal(line.productId, undefined)
  assert.equal(line.sku, undefined)
})

test("multi-line order drops sessionId and preserves catalog identity", () => {
  const lines = buildReorderLines(
    makeOrder({
      items: [
        makeItem({ productId: "p-1", variantId: "v-1", sku: "box--x", quantity: 50 }),
        makeItem({ productType: "label", productId: "p-2", variantId: "v-2", sku: "label--x", quantity: 200 }),
      ],
      design: { id: "d-1", sessionId: "sess-abc" } as never,
    }),
  )
  assert.equal(lines.length, 2)
  assert.equal(lines[0].sessionId, undefined)
  assert.equal(lines[0].productId, "p-1")
  assert.equal(lines[0].variantId, "v-1")
  assert.equal(lines[0].sku, "box--x")
  assert.equal(lines[1].productId, "p-2")
  assert.equal(lines[1].sku, "label--x")
})

test("specs and quantity pass through line-for-line", () => {
  const item = makeItem({
    dimensions: { length: 300, width: 200, height: 100, unit: "cm" },
    materialCode: "cardboard",
    material: "corrugated",
    color: "white",
    finish: "gloss",
    quantity: 25,
  })
  const line = buildReorderLines(makeOrder({ items: [item] }))[0]
  assert.equal(line.quantity, 25)
  assert.deepEqual(line.dimensions, { length: 300, width: 200, height: 100, unit: "cm" })
  assert.equal(line.materialCode, "corrugated")
  assert.equal(line.color, "white")
  assert.equal(line.finish, "gloss")
})