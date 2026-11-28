// Batch T25 — the sewn-bag previews (cotton, mesh and
// muslin bags), behind their own flag (default off),
// independent of the other preview flags.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { sewnbagPreviewEnabled, setSewnbagPreviewForTests, setStripPreviewForTests } from "../lib/editor/preview-flags.ts"

const BAGS = ["cotton_bag", "mesh_bag", "muslin_bag"]

test("sewnbag preview: the flag defaults off, and the env switches it", () => {
  setSewnbagPreviewForTests(null)
  assert.equal(sewnbagPreviewEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_SEWNBAG_PREVIEW
  try {
    process.env.NEXT_PUBLIC_SEWNBAG_PREVIEW = "1"
    assert.equal(sewnbagPreviewEnabled(), true)
    process.env.NEXT_PUBLIC_SEWNBAG_PREVIEW = "0"
    assert.equal(sewnbagPreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_SEWNBAG_PREVIEW
    else process.env.NEXT_PUBLIC_SEWNBAG_PREVIEW = saved
    setSewnbagPreviewForTests(null)
  }
})

test("sewnbag preview: flag off keeps the pre-T25 coverage", () => {
  setSewnbagPreviewForTests(false)
  for (const id of BAGS) {
    const c = productPreviewCoverage(id)
    assert.equal(c.family, undefined, id)
    assert.equal(c.geometry, "unavailable", id)
  }
  setSewnbagPreviewForTests(null)
})

test("sewnbag preview: flag on routes all three sewn bags to the sewnbag family", () => {
  setSewnbagPreviewForTests(true)
  for (const id of BAGS) {
    const c = productPreviewCoverage(id)
    assert.equal(c.family, "sewnbag", id)
    assert.equal(c.geometry, "preview", id)
    // textile products: no paper surface is claimed
    assert.equal(c.paperSurface, false, id)
    assert.equal(c.twoSidedStock, false, id)
    assert.equal(c.productionApproved, false, id)
  }
  setSewnbagPreviewForTests(null)
})

test("sewnbag preview: other products are unchanged with the flag on", () => {
  setSewnbagPreviewForTests(true)
  setStripPreviewForTests(false)
  assert.equal(productPreviewCoverage("paper_tape").family, undefined)
  assert.equal(productPreviewCoverage("paper_bag").family, "bag")
  assert.equal(productPreviewCoverage("mailer_box").family, "mailer")
  setSewnbagPreviewForTests(null)
  setStripPreviewForTests(null)
})
