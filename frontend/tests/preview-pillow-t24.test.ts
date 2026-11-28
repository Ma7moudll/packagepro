// Batch T24 (T22 list) — the pillow box preview,
// behind its own flag (default off), independent of
// the sleeve, snap-lock and auto-bottom flags. Note:
// the pre-existing coverage test pins pillow_box to
// unavailable; that pin holds with the flag off, which
// is the default state it runs in.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { pillowPreviewEnabled, setPillowPreviewForTests, setSleevePreviewForTests, setSnaplockPreviewForTests, setAutobottomPreviewForTests } from "../lib/editor/preview-flags.ts"

test("pillow preview: the flag defaults off, and the env switches it", () => {
  setPillowPreviewForTests(null)
  assert.equal(pillowPreviewEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_PILLOW_PREVIEW
  try {
    process.env.NEXT_PUBLIC_PILLOW_PREVIEW = "1"
    assert.equal(pillowPreviewEnabled(), true)
    process.env.NEXT_PUBLIC_PILLOW_PREVIEW = "0"
    assert.equal(pillowPreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_PILLOW_PREVIEW
    else process.env.NEXT_PUBLIC_PILLOW_PREVIEW = saved
    setPillowPreviewForTests(null)
  }
})

test("pillow preview: flag off keeps the pre-T24 coverage", () => {
  setPillowPreviewForTests(false)
  const c = productPreviewCoverage("pillow_box")
  assert.equal(c.family, undefined)
  assert.equal(c.geometry, "unavailable")
  setPillowPreviewForTests(null)
})

test("pillow preview: flag on routes pillow_box to the pillow family", () => {
  setPillowPreviewForTests(true)
  const c = productPreviewCoverage("pillow_box")
  assert.equal(c.family, "pillow")
  assert.equal(c.geometry, "preview")
  assert.equal(c.paperSurface, true)
  // like the cup family, the board specification is
  // not applied to this curved form
  assert.equal(c.twoSidedStock, false)
  assert.equal(c.productionApproved, false)
  setPillowPreviewForTests(null)
})

test("pillow preview: the four flags are independent and other products are unchanged", () => {
  setPillowPreviewForTests(true)
  setSleevePreviewForTests(false)
  setSnaplockPreviewForTests(false)
  setAutobottomPreviewForTests(false)
  assert.equal(productPreviewCoverage("sleeve").family, undefined)
  assert.equal(productPreviewCoverage("snap_lock_box").family, undefined)
  assert.equal(productPreviewCoverage("auto_bottom_box").family, undefined)
  assert.equal(productPreviewCoverage("mailer_box").family, "mailer")
  setPillowPreviewForTests(null)
  setSleevePreviewForTests(null)
  setSnaplockPreviewForTests(null)
  setAutobottomPreviewForTests(null)
})
