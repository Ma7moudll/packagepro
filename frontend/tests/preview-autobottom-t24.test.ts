// Batch T24 (T22 list, Part 3) — the auto-bottom box
// preview, behind its own flag (default off),
// independent of the sleeve and snap-lock flags.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { autobottomPreviewEnabled, setAutobottomPreviewForTests, setSleevePreviewForTests, setSnaplockPreviewForTests } from "../lib/editor/preview-flags.ts"

test("autobottom preview: the flag defaults off, and the env switches it", () => {
  setAutobottomPreviewForTests(null)
  assert.equal(autobottomPreviewEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_AUTOBOTTOM_PREVIEW
  try {
    process.env.NEXT_PUBLIC_AUTOBOTTOM_PREVIEW = "1"
    assert.equal(autobottomPreviewEnabled(), true)
    process.env.NEXT_PUBLIC_AUTOBOTTOM_PREVIEW = "0"
    assert.equal(autobottomPreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_AUTOBOTTOM_PREVIEW
    else process.env.NEXT_PUBLIC_AUTOBOTTOM_PREVIEW = saved
    setAutobottomPreviewForTests(null)
  }
})

test("autobottom preview: flag off keeps the pre-T24 coverage", () => {
  setAutobottomPreviewForTests(false)
  const c = productPreviewCoverage("auto_bottom_box")
  assert.equal(c.family, undefined)
  assert.equal(c.geometry, "unavailable")
  setAutobottomPreviewForTests(null)
})

test("autobottom preview: flag on routes auto_bottom_box to the autobottom family", () => {
  setAutobottomPreviewForTests(true)
  const c = productPreviewCoverage("auto_bottom_box")
  assert.equal(c.family, "autobottom")
  assert.equal(c.geometry, "preview")
  assert.equal(c.paperSurface, true)
  assert.equal(c.twoSidedStock, true)
  assert.equal(c.productionApproved, false)
  setAutobottomPreviewForTests(null)
})

test("autobottom preview: the three flags are independent and other products are unchanged", () => {
  setAutobottomPreviewForTests(true)
  setSleevePreviewForTests(false)
  setSnaplockPreviewForTests(false)
  assert.equal(productPreviewCoverage("sleeve").family, undefined)
  assert.equal(productPreviewCoverage("snap_lock_box").family, undefined)
  assert.equal(productPreviewCoverage("mailer_box").family, "mailer")
  assert.equal(productPreviewCoverage("pillow_box").family, undefined)
  setAutobottomPreviewForTests(null)
  setSleevePreviewForTests(null)
  setSnaplockPreviewForTests(null)
})
