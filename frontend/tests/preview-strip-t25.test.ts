// Batch T25 — the strip previews (paper tape, plastic
// tape, water-activated tape, ribbon), behind their
// own flag (default off), independent of the other
// preview flags.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { stripPreviewEnabled, setStripPreviewForTests, setSleevePreviewForTests } from "../lib/editor/preview-flags.ts"

const STRIPS = ["paper_tape", "plastic_tape", "water_activated_tape", "ribbon"]

test("strip preview: the flag defaults off, and the env switches it", () => {
  setStripPreviewForTests(null)
  assert.equal(stripPreviewEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_STRIP_PREVIEW
  try {
    process.env.NEXT_PUBLIC_STRIP_PREVIEW = "1"
    assert.equal(stripPreviewEnabled(), true)
    process.env.NEXT_PUBLIC_STRIP_PREVIEW = "0"
    assert.equal(stripPreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_STRIP_PREVIEW
    else process.env.NEXT_PUBLIC_STRIP_PREVIEW = saved
    setStripPreviewForTests(null)
  }
})

test("strip preview: flag off keeps the pre-T25 coverage", () => {
  setStripPreviewForTests(false)
  for (const id of STRIPS) {
    const c = productPreviewCoverage(id)
    assert.equal(c.family, undefined, id)
    assert.equal(c.geometry, "unavailable", id)
  }
  setStripPreviewForTests(null)
})

test("strip preview: flag on routes all four strip products to the strip family", () => {
  setStripPreviewForTests(true)
  for (const id of STRIPS) {
    const c = productPreviewCoverage(id)
    assert.equal(c.family, "strip", id)
    assert.equal(c.geometry, "preview", id)
    // the family mixes paper and film products, so no
    // paper surface is claimed for the family
    assert.equal(c.paperSurface, false, id)
    assert.equal(c.twoSidedStock, false, id)
    assert.equal(c.productionApproved, false, id)
  }
  setStripPreviewForTests(null)
})

test("strip preview: other products are unchanged with the flag on", () => {
  setStripPreviewForTests(true)
  setSleevePreviewForTests(false)
  assert.equal(productPreviewCoverage("sleeve").family, undefined)
  assert.equal(productPreviewCoverage("mailer_box").family, "mailer")
  assert.equal(productPreviewCoverage("cotton_bag").family, undefined)
  setStripPreviewForTests(null)
  setSleevePreviewForTests(null)
})
