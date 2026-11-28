// Batch AX — foldedOuter for type flat is the plan size and one
// thickness, not the box formula; the other types keep internal + 2t.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline } from "../lib/dieline-gen/index.ts"

test("flat 210x99 t0.4: foldedOuter is 210 x 99 x 0.4 (was 210.8 x 99.8 x 1.2)", () => {
  const r = checkDieline(generateDieline("flat", { length: 210, width: 99, height: 0.4, thickness: 0.4 }))
  assert.deepEqual(r.failures, [])
  assert.deepEqual(r.foldedOuter, { length: 210, width: 99, height: 0.4 })
  assert.deepEqual(r.foldedInternal, { length: 210, width: 99, height: 0.4 })
})

test("flat at several sizes and thicknesses: outer equals internal", () => {
  for (const [L, W, t] of [[25, 25, 0.3], [90, 54, 0.5], [1200, 800, 10], [297, 210, 2]]) {
    const r = checkDieline(generateDieline("flat", { length: L, width: W, height: t, thickness: t }))
    assert.deepEqual(r.foldedOuter, { length: L, width: W, height: t })
  }
})

test("other types keep foldedOuter = internal + 2t, for all 12", () => {
  const types = ["rsc", "mailer", "pizza", "tuck", "snaplock", "pillow", "sleeve", "envelope", "autobottom", "rigid", "rigid_magnetic", "magnethinge"] as const
  for (const ty of types) {
    const spec = { length: ty === "pizza" ? 200 : 120, width: ty === "pizza" ? 200 : 90, height: 100, thickness: 2 }
    const r = checkDieline(generateDieline(ty, spec))
    const fi = r.foldedInternal
    assert.deepEqual(r.foldedOuter, { length: fi.length + 4, width: fi.width + 4, height: fi.height + 4 }, ty)
  }
})
