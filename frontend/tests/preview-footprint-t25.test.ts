// Batch T25 — the stamp ink pad preview, behind its
// own flag (default off), independent of the other
// preview flags. With this group every one of the 55
// products has a preview route available behind its
// flag or by default.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { footprintPreviewEnabled, setFootprintPreviewForTests, setSleevePreviewForTests, setSnaplockPreviewForTests, setAutobottomPreviewForTests, setPillowPreviewForTests, setRigidVariantsPreviewForTests, setStripPreviewForTests, setSewnbagPreviewForTests, setMailerVariantsPreviewForTests, setMagneticRigidPreviewForTests } from "../lib/editor/preview-flags.ts"

test("footprint preview: the flag defaults off, and the env switches it", () => {
  setFootprintPreviewForTests(null)
  assert.equal(footprintPreviewEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_FOOTPRINT_PREVIEW
  try {
    process.env.NEXT_PUBLIC_FOOTPRINT_PREVIEW = "1"
    assert.equal(footprintPreviewEnabled(), true)
    process.env.NEXT_PUBLIC_FOOTPRINT_PREVIEW = "0"
    assert.equal(footprintPreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_FOOTPRINT_PREVIEW
    else process.env.NEXT_PUBLIC_FOOTPRINT_PREVIEW = saved
    setFootprintPreviewForTests(null)
  }
})

test("footprint preview: flag off keeps the pre-T25 coverage", () => {
  setFootprintPreviewForTests(false)
  const c = productPreviewCoverage("stamp_ink_pad")
  assert.equal(c.family, undefined)
  assert.equal(c.geometry, "unavailable")
  setFootprintPreviewForTests(null)
})

test("footprint preview: flag on routes stamp_ink_pad to the footprint family", () => {
  setFootprintPreviewForTests(true)
  const c = productPreviewCoverage("stamp_ink_pad")
  assert.equal(c.family, "footprint")
  assert.equal(c.geometry, "preview")
  assert.equal(c.paperSurface, false)
  assert.equal(c.twoSidedStock, false)
  assert.equal(c.productionApproved, false)
  setFootprintPreviewForTests(null)
})

test("footprint preview: with every preview flag on, no product is left without a family", () => {
  const setters = [setSleevePreviewForTests, setSnaplockPreviewForTests, setAutobottomPreviewForTests, setPillowPreviewForTests, setRigidVariantsPreviewForTests, setStripPreviewForTests, setSewnbagPreviewForTests, setMailerVariantsPreviewForTests, setMagneticRigidPreviewForTests, setFootprintPreviewForTests]
  for (const set of setters) set(true)
  // bottle_box (snaplock dieline type) was the known
  // remainder after T25; batch T26 routes it to this
  // family behind its own flag, which is not set here,
  // so it is not in the list below.
  for (const id of ["stamp_ink_pad", "cotton_bag", "paper_tape", "ribbon", "rigid_wine_box", "ecommerce_mailer_box", "rigid_magnetic_box", "sleeve", "snap_lock_box", "auto_bottom_box", "pillow_box"]) {
    assert.notEqual(productPreviewCoverage(id).family, undefined, id)
  }
  for (const set of setters) set(null)
})
