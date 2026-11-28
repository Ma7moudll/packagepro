// Batch T25 — the rigid-variant previews: five rigid
// products with no route today are routed to the
// existing rigid family behind their own flag
// (default off).

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { rigidVariantsPreviewEnabled, setRigidVariantsPreviewForTests } from "../lib/editor/preview-flags.ts"

const VARIANTS = ["rigid_jewellery_box", "rigid_cosmetic_box", "rigid_wine_box", "rigid_flower_box", "rigid_shirt_box"]

test("rigid variants: the flag defaults off, and the env switches it", () => {
  setRigidVariantsPreviewForTests(null)
  assert.equal(rigidVariantsPreviewEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_RIGID_VARIANTS_PREVIEW
  try {
    process.env.NEXT_PUBLIC_RIGID_VARIANTS_PREVIEW = "1"
    assert.equal(rigidVariantsPreviewEnabled(), true)
    process.env.NEXT_PUBLIC_RIGID_VARIANTS_PREVIEW = "0"
    assert.equal(rigidVariantsPreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_RIGID_VARIANTS_PREVIEW
    else process.env.NEXT_PUBLIC_RIGID_VARIANTS_PREVIEW = saved
    setRigidVariantsPreviewForTests(null)
  }
})

test("rigid variants: flag off keeps the pre-T25 coverage", () => {
  setRigidVariantsPreviewForTests(false)
  for (const id of VARIANTS) {
    const c = productPreviewCoverage(id)
    assert.equal(c.family, undefined, id)
    assert.equal(c.geometry, "unavailable", id)
  }
  setRigidVariantsPreviewForTests(null)
})

test("rigid variants: flag on routes all five to the rigid family with rigid_box's surface treatment", () => {
  setRigidVariantsPreviewForTests(true)
  const base = productPreviewCoverage("rigid_box")
  for (const id of VARIANTS) {
    const c = productPreviewCoverage(id)
    assert.equal(c.family, "rigid", id)
    assert.equal(c.geometry, "preview", id)
    assert.equal(c.paperSurface, base.paperSurface, id)
    assert.equal(c.twoSidedStock, base.twoSidedStock, id)
    assert.equal(c.productionApproved, false, id)
  }
  setRigidVariantsPreviewForTests(null)
})

test("rigid variants: other products are unchanged with the flag on", () => {
  setRigidVariantsPreviewForTests(true)
  assert.equal(productPreviewCoverage("rigid_box").family, "rigid")
  assert.equal(productPreviewCoverage("gift_box").family, "rigid")
  assert.equal(productPreviewCoverage("mailer_box").family, "mailer")
  assert.equal(productPreviewCoverage("rigid_magnetic_box").family, undefined)
  assert.equal(productPreviewCoverage("paper_tape").family, undefined)
  setRigidVariantsPreviewForTests(null)
})
