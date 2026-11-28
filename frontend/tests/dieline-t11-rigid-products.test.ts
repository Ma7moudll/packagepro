// Batch AT — the "rigid" two-piece generator against the catalogue's
// own rigid-family default dimensions (gift_box and the other products
// whose previewFamily is rigid). Read-only use of the catalogue: no
// status, readiness flag or mapping is changed, and no product is wired
// to the generator. This only shows the generator is clean at those
// sizes; it does not say any product can be manufactured.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, layoutLabels, checkLabels } from "../lib/dieline-gen/index.ts"
import { CATALOGUE_PRODUCTS } from "../../shared/catalog/products.ts"

const rigidFamily = CATALOGUE_PRODUCTS.filter((p) => p.previewFamily === "rigid")

test("catalogue: gift_box and rigid_box are in the rigid preview family", () => {
  const ids = rigidFamily.map((p) => p.id)
  assert.ok(ids.includes("gift_box"))
  assert.ok(ids.includes("rigid_box"))
})

test("rigid generator is clean at every rigid-family default size, at t 1, 2 and 3", () => {
  assert.ok(rigidFamily.length >= 2)
  for (const p of rigidFamily) {
    const dim = p.defaultDimensions
    if (!dim) continue
    for (const t of [1, 2, 3]) {
      const d = generateDieline("rigid", { ...dim, thickness: t })
      assert.deepEqual(checkDieline(d).failures, [], `${p.id} t${t}`)
      assert.deepEqual(checkLabels(d, layoutLabels(d).labels), [], `${p.id} t${t} labels`)
      assert.equal(d.panels.length, 10)
    }
  }
})

test("the catalogue still marks gift_box dieline deferred (this batch changes no status)", () => {
  const g = CATALOGUE_PRODUCTS.find((p) => p.id === "gift_box")!
  assert.equal(g.readiness.dieline, "deferred")
})
