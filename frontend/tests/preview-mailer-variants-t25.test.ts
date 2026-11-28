// Batch T25 — the mailer-variant previews
// (ecommerce_mailer_box, christmas_gift_box), routed
// to the existing mailer family behind their own
// flag (default off).

import { test } from "node:test"
import assert from "node:assert/strict"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { mailerVariantsPreviewEnabled, setMailerVariantsPreviewForTests } from "../lib/editor/preview-flags.ts"

const VARIANTS = ["ecommerce_mailer_box", "christmas_gift_box"]

test("mailer variants: the flag defaults off, and the env switches it", () => {
  setMailerVariantsPreviewForTests(null)
  assert.equal(mailerVariantsPreviewEnabled(), false)
  const saved = process.env.NEXT_PUBLIC_MAILER_VARIANTS_PREVIEW
  try {
    process.env.NEXT_PUBLIC_MAILER_VARIANTS_PREVIEW = "1"
    assert.equal(mailerVariantsPreviewEnabled(), true)
    process.env.NEXT_PUBLIC_MAILER_VARIANTS_PREVIEW = "0"
    assert.equal(mailerVariantsPreviewEnabled(), false)
  } finally {
    if (saved === undefined) delete process.env.NEXT_PUBLIC_MAILER_VARIANTS_PREVIEW
    else process.env.NEXT_PUBLIC_MAILER_VARIANTS_PREVIEW = saved
    setMailerVariantsPreviewForTests(null)
  }
})

test("mailer variants: flag off keeps the pre-T25 coverage", () => {
  setMailerVariantsPreviewForTests(false)
  for (const id of VARIANTS) {
    const c = productPreviewCoverage(id)
    assert.equal(c.family, undefined, id)
    assert.equal(c.geometry, "unavailable", id)
  }
  setMailerVariantsPreviewForTests(null)
})

test("mailer variants: flag on routes both to the mailer family with mailer_box's surface treatment", () => {
  setMailerVariantsPreviewForTests(true)
  const base = productPreviewCoverage("mailer_box")
  for (const id of VARIANTS) {
    const c = productPreviewCoverage(id)
    assert.equal(c.family, "mailer", id)
    assert.equal(c.geometry, "preview", id)
    assert.equal(c.paperSurface, base.paperSurface, id)
    assert.equal(c.twoSidedStock, base.twoSidedStock, id)
    assert.equal(c.productionApproved, false, id)
  }
  setMailerVariantsPreviewForTests(null)
})

test("mailer variants: other products are unchanged with the flag on", () => {
  setMailerVariantsPreviewForTests(true)
  assert.equal(productPreviewCoverage("mailer_box").family, "mailer")
  assert.equal(productPreviewCoverage("shipping_box").family, "shipping")
  assert.equal(productPreviewCoverage("rigid_magnetic_box").family, undefined)
  setMailerVariantsPreviewForTests(null)
})
