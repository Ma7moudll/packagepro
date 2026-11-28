// Batch T25 — the dimension-label relabels, behind
// their own flag (default off). Relabels only: no
// field is hidden, no value changes. Per-product pins
// from batch T24's size-field table.

import { test } from "node:test"
import assert from "node:assert/strict"
import { productConfiguration } from "../lib/editor/product-configuration.ts"
import { dimensionLabelRelabelEnabled, setDimensionLabelRelabelForTests } from "../lib/editor/dimension-label-flags.ts"

const labels = (id: string) => productConfiguration(id).dimensions.map((d) => `${d.key}:${d.en}`)
const DEFAULTS = ["length:Width", "width:Depth", "height:Height"]

test("dimension labels: the flag defaults off, and the env switches it", () => {
  setDimensionLabelRelabelForTests(null)
  assert.equal(dimensionLabelRelabelEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_DIMENSION_LABELS
  try {
    process.env.NEXT_PUBLIC_DIMENSION_LABELS = "1"
    assert.equal(dimensionLabelRelabelEnabled(), true)
    process.env.NEXT_PUBLIC_DIMENSION_LABELS = "0"
    assert.equal(dimensionLabelRelabelEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_DIMENSION_LABELS
    else process.env.NEXT_PUBLIC_DIMENSION_LABELS = saved
    setDimensionLabelRelabelForTests(null)
  }
})

test("dimension labels: flag off keeps the pre-T25 labels for every named product", () => {
  setDimensionLabelRelabelForTests(false)
  for (const id of ["paper_tape", "plastic_tape", "water_activated_tape", "ribbon", "envelope", "corrugated_envelope", "paper_mailer_bag", "poly_mailer_bag", "bio_poly_mailer_bag", "cotton_bag", "mesh_bag", "muslin_bag", "stamp_ink_pad", "mailer_box"]) {
    assert.deepEqual(labels(id), DEFAULTS, id)
  }
  setDimensionLabelRelabelForTests(null)
})

for (const id of ["paper_tape", "plastic_tape", "water_activated_tape", "ribbon"]) {
  test(`dimension labels: ${id} — the length field is the roll length, the width field is the strip width`, () => {
    setDimensionLabelRelabelForTests(true)
    assert.deepEqual(labels(id), ["length:Roll length", "width:Strip width", "height:Height (unused)"])
    const dims = productConfiguration(id).dimensions
    assert.equal(dims[0].ar, "طول اللفة")
    assert.equal(dims[1].ar, "عرض الشريط")
    setDimensionLabelRelabelForTests(null)
  })
}

for (const id of ["envelope", "corrugated_envelope", "paper_mailer_bag", "poly_mailer_bag", "bio_poly_mailer_bag", "cotton_bag", "mesh_bag", "muslin_bag"]) {
  test(`dimension labels: ${id} — the depth field is marked unused, the others keep their labels`, () => {
    setDimensionLabelRelabelForTests(true)
    assert.deepEqual(labels(id), ["length:Width", "width:Depth (unused)", "height:Height"])
    setDimensionLabelRelabelForTests(null)
  })
}

test("dimension labels: products outside the relabel sets are unchanged with the flag on", () => {
  setDimensionLabelRelabelForTests(true)
  // stamp_ink_pad stays as is by decision: its height
  // is recorded and range-validated, not unused
  assert.deepEqual(labels("stamp_ink_pad"), DEFAULTS)
  assert.deepEqual(labels("mailer_box"), DEFAULTS)
  // the ziplock bag shows no depth field at all, so
  // there is nothing to relabel
  assert.deepEqual(labels("frosted_ziplock_bag"), ["length:Width", "height:Height"])
  setDimensionLabelRelabelForTests(null)
})
