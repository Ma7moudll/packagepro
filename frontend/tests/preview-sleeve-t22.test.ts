// Batch T22 — the sleeve band preview, behind its own
// flag (default off). Flag off: sleeve coverage is
// exactly the pre-T22 behaviour. Flag on: coverage
// reports the sleeve family and nothing else changes.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { sleevePreviewEnabled, setSleevePreviewForTests } from "../lib/editor/preview-flags.ts"

test("sleeve preview: the flag defaults off", () => {
  setSleevePreviewForTests(null)
  assert.equal(sleevePreviewEnabled(), false)
})

test("sleeve preview: the build-time env switches the flag when no override is set", () => {
  setSleevePreviewForTests(null)
  const saved = process.env.NEXT_PUBLIC_SLEEVE_PREVIEW
  try {
    delete process.env.NEXT_PUBLIC_SLEEVE_PREVIEW
    assert.equal(sleevePreviewEnabled(), false)
    process.env.NEXT_PUBLIC_SLEEVE_PREVIEW = "1"
    assert.equal(sleevePreviewEnabled(), true)
    assert.equal(productPreviewCoverage("sleeve").family, "sleeve")
    process.env.NEXT_PUBLIC_SLEEVE_PREVIEW = "0"
    assert.equal(sleevePreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_SLEEVE_PREVIEW
    else process.env.NEXT_PUBLIC_SLEEVE_PREVIEW = saved
    setSleevePreviewForTests(null)
  }
})

test("sleeve preview: flag off keeps the pre-T22 coverage", () => {
  setSleevePreviewForTests(false)
  const c = productPreviewCoverage("sleeve")
  assert.equal(c.family, undefined)
  assert.equal(c.geometry, "unavailable")
  assert.equal(c.paperSurface, false)
  setSleevePreviewForTests(null)
})

test("sleeve preview: flag on routes sleeve to the sleeve family", () => {
  setSleevePreviewForTests(true)
  const c = productPreviewCoverage("sleeve")
  assert.equal(c.family, "sleeve")
  assert.equal(c.geometry, "preview")
  assert.equal(c.paperSurface, true)
  // a band's inner surface is not an artwork stock
  // surface in this model
  assert.equal(c.twoSidedStock, false)
  assert.equal(c.productionApproved, false)
  setSleevePreviewForTests(null)
})

test("sleeve preview: flag on changes no other product", () => {
  setSleevePreviewForTests(true)
  assert.equal(productPreviewCoverage("mailer_box").family, "mailer")
  assert.equal(productPreviewCoverage("snap_lock_box").family, undefined)
  assert.equal(productPreviewCoverage("auto_bottom_box").family, undefined)
  assert.equal(productPreviewCoverage("pillow_box").family, undefined)
  assert.equal(productPreviewCoverage("envelope").family, "envelope")
  setSleevePreviewForTests(null)
})
