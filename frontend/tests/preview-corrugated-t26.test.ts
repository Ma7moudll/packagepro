// Batch T26 addendum — the corrugated_envelope route
// removal, behind its own flag (default off). The
// product's preview routes to the envelope family
// while its dieline type is pocket; with the flag on,
// coverage treats it as unrouted. The construction
// decision itself is not made here.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { productConfiguration } from "../lib/editor/product-configuration.ts"
import { corrugatedEnvelopeUnrouted, setCorrugatedEnvelopeUnroutedForTests } from "../lib/editor/preview-flags.ts"

test("corrugated unroute: the flag defaults off, and the env switches it", () => {
  setCorrugatedEnvelopeUnroutedForTests(null)
  assert.equal(corrugatedEnvelopeUnrouted(), false)
  const saved = process.env.NEXT_PUBLIC_CORRUGATED_ENVELOPE_UNROUTED
  try {
    process.env.NEXT_PUBLIC_CORRUGATED_ENVELOPE_UNROUTED = "1"
    assert.equal(corrugatedEnvelopeUnrouted(), true)
    process.env.NEXT_PUBLIC_CORRUGATED_ENVELOPE_UNROUTED = "0"
    assert.equal(corrugatedEnvelopeUnrouted(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_CORRUGATED_ENVELOPE_UNROUTED
    else process.env.NEXT_PUBLIC_CORRUGATED_ENVELOPE_UNROUTED = saved
    setCorrugatedEnvelopeUnroutedForTests(null)
  }
})

test("corrugated unroute: flag off keeps the shipped envelope route", () => {
  setCorrugatedEnvelopeUnroutedForTests(false)
  const c = productPreviewCoverage("corrugated_envelope")
  assert.equal(c.family, "envelope")
  assert.equal(c.geometry, "preview")
  assert.equal(c.paperSurface, true)
  assert.equal(productConfiguration("corrugated_envelope").opening, true)
  setCorrugatedEnvelopeUnroutedForTests(null)
})

test("corrugated unroute: flag on makes the preview honestly unavailable and removes the opening control", () => {
  setCorrugatedEnvelopeUnroutedForTests(true)
  const c = productPreviewCoverage("corrugated_envelope")
  assert.equal(c.family, undefined)
  assert.equal(c.geometry, "unavailable")
  assert.equal(c.paperSurface, false)
  assert.equal(c.twoSidedStock, false)
  assert.equal(productConfiguration("corrugated_envelope").opening, false)
  setCorrugatedEnvelopeUnroutedForTests(null)
})

test("corrugated unroute: the envelope product itself is untouched in both states", () => {
  for (const on of [false, true]) {
    setCorrugatedEnvelopeUnroutedForTests(on)
    const c = productPreviewCoverage("envelope")
    assert.equal(c.family, "envelope")
    assert.equal(productConfiguration("envelope").opening, true)
    const m = productPreviewCoverage("mailer_envelope")
    assert.equal(m.family, "envelope")
  }
  setCorrugatedEnvelopeUnroutedForTests(null)
})
