// Batch T26 — the bottle box preview: bottle_box has
// the snaplock dieline construction, so it is routed
// to the existing snaplock family behind its OWN
// flag (default off), separate from the T22
// snap-lock flag that covers snap_lock_box itself.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { bottleboxPreviewEnabled, setBottleboxPreviewForTests, setSnaplockPreviewForTests } from "../lib/editor/preview-flags.ts"

test("bottlebox preview: the flag defaults off, and the env switches it", () => {
  setBottleboxPreviewForTests(null)
  assert.equal(bottleboxPreviewEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_BOTTLEBOX_PREVIEW
  try {
    process.env.NEXT_PUBLIC_BOTTLEBOX_PREVIEW = "1"
    assert.equal(bottleboxPreviewEnabled(), true)
    process.env.NEXT_PUBLIC_BOTTLEBOX_PREVIEW = "0"
    assert.equal(bottleboxPreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_BOTTLEBOX_PREVIEW
    else process.env.NEXT_PUBLIC_BOTTLEBOX_PREVIEW = saved
    setBottleboxPreviewForTests(null)
  }
})

test("bottlebox preview: flag off keeps the pre-T26 coverage", () => {
  setBottleboxPreviewForTests(false)
  const c = productPreviewCoverage("bottle_box")
  assert.equal(c.family, undefined)
  assert.equal(c.geometry, "unavailable")
  setBottleboxPreviewForTests(null)
})

test("bottlebox preview: flag on routes bottle_box to the snaplock family with snap_lock_box's surface treatment", () => {
  setBottleboxPreviewForTests(true)
  setSnaplockPreviewForTests(true)
  const c = productPreviewCoverage("bottle_box")
  const base = productPreviewCoverage("snap_lock_box")
  assert.equal(c.family, "snaplock")
  assert.equal(c.geometry, "preview")
  assert.equal(c.paperSurface, base.paperSurface)
  assert.equal(c.twoSidedStock, base.twoSidedStock)
  assert.equal(c.productionApproved, false)
  setBottleboxPreviewForTests(null)
  setSnaplockPreviewForTests(null)
})

test("bottlebox preview: the bottle flag and the snap-lock flag are independent", () => {
  setBottleboxPreviewForTests(true)
  setSnaplockPreviewForTests(false)
  assert.equal(productPreviewCoverage("bottle_box").family, "snaplock")
  assert.equal(productPreviewCoverage("snap_lock_box").family, undefined)
  setBottleboxPreviewForTests(false)
  setSnaplockPreviewForTests(true)
  assert.equal(productPreviewCoverage("bottle_box").family, undefined)
  assert.equal(productPreviewCoverage("snap_lock_box").family, "snaplock")
  setBottleboxPreviewForTests(null)
  setSnaplockPreviewForTests(null)
})
