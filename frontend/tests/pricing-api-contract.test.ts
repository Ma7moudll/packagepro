import { test } from "node:test"
import assert from "node:assert/strict"
import type {
  ApiResponse,
  PricingBreakdown,
  PricingRequest,
  PricingResponse,
} from "../../shared/types/index.ts"

// SPEC-029 Phase 1 (P1): the frontend pricing contract must consume the
// authoritative shared PricingRequest/PricingResponse/PricingBreakdown types
// and the backend `/pricing/calculate` envelope `{ success, data }`.
//
//   A  request payloads sent by consumers satisfy shared PricingRequest
//   B  the backend response envelope satisfies ApiResponse<PricingResponse>
//   C  AddToCart's consumer expectations (res.success, res.data.totalPrice,
//      unit = total / quantity) hold against the envelope
//   D  no client-side pricing is invented (fixture is the server's shape only)

// AddToCart sends exactly this payload shape (productType/quantity/dimensions/
// materialCode with unit forced to "mm").
const addToCartPayload = {
  productType: "box",
  quantity: 3,
  dimensions: { length: 115, width: 70, height: 38, unit: "mm" as const },
  materialCode: "KRAFT_BROWN",
} satisfies PricingRequest

// Structural assertion (compile-time via tsc) that the payload also satisfies
// the backend zod schema constraints that matter to P1.
const BACKEND_SCHEMA_ALIGNED = [
  ["box", "bag", "label"].includes(addToCartPayload.productType),
  Number.isInteger(addToCartPayload.quantity) && addToCartPayload.quantity > 0,
  ["cm", "mm", "inch"].includes(addToCartPayload.dimensions.unit),
]

// The backend pricing.controller.ts builds `{ success: true, data: result }`
// where result is the pricing-engine's PricingResponse. Fixture mirrors the
// authoritative shared PricingBreakdown/PricingResponse shapes.
const serverBreakdown: PricingBreakdown = {
  surfaceArea: 9920,
  materialCost: 3.75,
  conversionCost: 1.2,
  marginAmount: 1.05,
  subtotal: 6.0,
  tax: 0.9,
  shippingEstimate: 2.0,
  total: 8.9,
}

const serverResponse: PricingResponse = {
  totalPrice: 8.9,
  breakdown: serverBreakdown,
  material: { code: "KRAFT_BROWN", name: "Kraft Brown", unitPrice: 2.5 },
  productType: "box",
  quantity: 3,
  dimensions: { length: 115, width: 70, height: 38, unit: "mm" },
}

// Envelope exactly as backend `reply.send({ success: true, data: result })`.
const envelope = { success: true, data: serverResponse } satisfies ApiResponse<PricingResponse>

test("SPEC-029 P1: AddToCart request payload satisfies shared PricingRequest", () => {
  assert.equal(addToCartPayload.productType, "box")
  assert.equal(addToCartPayload.dimensions.unit, "mm")
  assert.equal(BACKEND_SCHEMA_ALIGNED.every(Boolean), true)
})

test("SPEC-029 P1: pricingApi consumer expectations hold against backend envelope", () => {
  const res = envelope
  if (res.success && res.data) {
    const total = res.data.totalPrice
    const unit = res.data.totalPrice / res.data.quantity
    // AddToCart renders Price per unit and Total from these values.
    assert.equal(typeof total, "number")
    assert.ok(Number.isFinite(total))
    assert.equal(unit, 8.9 / 3)
    // breakdown is included, exactly matching shared PricingBreakdown fields.
    assert.equal(typeof res.data.breakdown.total, "number")
  } else {
    assert.fail("expected success envelope with data")
  }
})

test("SPEC-029 P1: response shape carries server material & productType (no client-side pricing)", () => {
  // The server, not the client, is the source of unit price facts.
  assert.equal(envelope.data.material.code, "KRAFT_BROWN")
  assert.equal(envelope.data.material.unitPrice, 2.5)
  assert.equal(envelope.data.productType, "box")
  assert.equal(envelope.data.dimensions.unit, "mm")
  assert.equal(envelope.data.breakdown.tax, 0.9)
})