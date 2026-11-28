// Batch T22 Part 2 — the snap-lock box preview, behind
// its own flag (default off), independent of the
// sleeve flag. Flag off: snap_lock_box coverage is the
// pre-T22 behaviour. Flag on: the snaplock family.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { snaplockPreviewEnabled, setSnaplockPreviewForTests, setSleevePreviewForTests } from "../lib/editor/preview-flags.ts"

test("snaplock preview: the flag defaults off, and the env switches it", () => {
  setSnaplockPreviewForTests(null)
  assert.equal(snaplockPreviewEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_SNAPLOCK_PREVIEW
  try {
    process.env.NEXT_PUBLIC_SNAPLOCK_PREVIEW = "1"
    assert.equal(snaplockPreviewEnabled(), true)
    process.env.NEXT_PUBLIC_SNAPLOCK_PREVIEW = "0"
    assert.equal(snaplockPreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_SNAPLOCK_PREVIEW
    else process.env.NEXT_PUBLIC_SNAPLOCK_PREVIEW = saved
    setSnaplockPreviewForTests(null)
  }
})

test("snaplock preview: flag off keeps the pre-T22 coverage", () => {
  setSnaplockPreviewForTests(false)
  const c = productPreviewCoverage("snap_lock_box")
  assert.equal(c.family, undefined)
  assert.equal(c.geometry, "unavailable")
  setSnaplockPreviewForTests(null)
})

test("snaplock preview: flag on routes snap_lock_box to the snaplock family", () => {
  setSnaplockPreviewForTests(true)
  const c = productPreviewCoverage("snap_lock_box")
  assert.equal(c.family, "snaplock")
  assert.equal(c.geometry, "preview")
  assert.equal(c.paperSurface, true)
  // carton-family stock behaviour, like the carton family
  assert.equal(c.twoSidedStock, true)
  assert.equal(c.productionApproved, false)
  setSnaplockPreviewForTests(null)
})

test("snaplock preview: the two flags are independent and other products are unchanged", () => {
  setSnaplockPreviewForTests(true)
  setSleevePreviewForTests(false)
  assert.equal(productPreviewCoverage("sleeve").family, undefined)
  assert.equal(productPreviewCoverage("mailer_box").family, "mailer")
  assert.equal(productPreviewCoverage("auto_bottom_box").family, undefined)
  assert.equal(productPreviewCoverage("pillow_box").family, undefined)
  setSnaplockPreviewForTests(null)
  setSleevePreviewForTests(null)
})
