// Batch T25 — the magnetic rigid previews
// (rigid_magnetic_box, rigid_magnetic_cosmetic_box,
// rigid_magnetic_wine_box), routed to the existing
// rigid family behind their own flag (default off).
// The preview is the rigid box form; the magnetic
// closure is internal and is not modelled.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { magneticRigidPreviewEnabled, setMagneticRigidPreviewForTests, setRigidVariantsPreviewForTests } from "../lib/editor/preview-flags.ts"

const MAGNETIC = ["rigid_magnetic_box", "rigid_magnetic_cosmetic_box", "rigid_magnetic_wine_box"]

test("magnetic rigid: the flag defaults off, and the env switches it", () => {
  setMagneticRigidPreviewForTests(null)
  assert.equal(magneticRigidPreviewEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_MAGNETIC_RIGID_PREVIEW
  try {
    process.env.NEXT_PUBLIC_MAGNETIC_RIGID_PREVIEW = "1"
    assert.equal(magneticRigidPreviewEnabled(), true)
    process.env.NEXT_PUBLIC_MAGNETIC_RIGID_PREVIEW = "0"
    assert.equal(magneticRigidPreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_MAGNETIC_RIGID_PREVIEW
    else process.env.NEXT_PUBLIC_MAGNETIC_RIGID_PREVIEW = saved
    setMagneticRigidPreviewForTests(null)
  }
})

test("magnetic rigid: flag off keeps the pre-T25 coverage", () => {
  setMagneticRigidPreviewForTests(false)
  for (const id of MAGNETIC) {
    const c = productPreviewCoverage(id)
    assert.equal(c.family, undefined, id)
    assert.equal(c.geometry, "unavailable", id)
  }
  setMagneticRigidPreviewForTests(null)
})

test("magnetic rigid: flag on routes all three to the rigid family with rigid_box's surface treatment", () => {
  setMagneticRigidPreviewForTests(true)
  const base = productPreviewCoverage("rigid_box")
  for (const id of MAGNETIC) {
    const c = productPreviewCoverage(id)
    assert.equal(c.family, "rigid", id)
    assert.equal(c.geometry, "preview", id)
    assert.equal(c.paperSurface, base.paperSurface, id)
    assert.equal(c.twoSidedStock, base.twoSidedStock, id)
    assert.equal(c.productionApproved, false, id)
  }
  setMagneticRigidPreviewForTests(null)
})

test("magnetic rigid: independent of the rigid-variants flag, other products unchanged", () => {
  setMagneticRigidPreviewForTests(true)
  setRigidVariantsPreviewForTests(false)
  assert.equal(productPreviewCoverage("rigid_wine_box").family, undefined)
  assert.equal(productPreviewCoverage("rigid_box").family, "rigid")
  assert.equal(productPreviewCoverage("mailer_box").family, "mailer")
  setMagneticRigidPreviewForTests(null)
  setRigidVariantsPreviewForTests(null)
})
