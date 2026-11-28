// Batch T12 — flat: the single-panel flat sheet / card /
// label construction. Covers the nine catalogue products
// whose construction is one flat rectangle with no folds
// (Step 1 coverage CSV in ~/workspace/packagepro-t12):
// tissue_paper, packing_paper, labels_sheet,
// rectangle_label, square_label, business_card,
// loyalty_card, thank_you_card, menu_card.
//
// Spec contract for this type (stated in the generator
// header): length x width are the sheet's plan
// dimensions; height is the nominal sheet thickness and
// must equal thickness — the catalogue writes these
// products as length x 1 x height, so a catalogue row
// maps as length = catalogue length, width = catalogue
// height, height = thickness = catalogue width.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, renderDielineSvg } from "../lib/dieline-gen/index.ts"

// catalogue id -> [length, width(=catalogue height), thickness(=catalogue width)]
const PRODUCTS: [string, number, number, number][] = [
  ["tissue_paper", 500, 750, 1],
  ["packing_paper", 500, 700, 1],
  ["labels_sheet", 297, 210, 1],
  ["rectangle_label", 100, 50, 1],
  ["square_label", 50, 50, 1],
  ["business_card", 85, 55, 1],
  ["loyalty_card", 85, 55, 1],
  ["thank_you_card", 100, 150, 1],
  ["menu_card", 210, 297, 1],
]

test("flat: all nine catalogue products generate and check clean as one panel, no folds", () => {
  for (const [id, L, W, t] of PRODUCTS) {
    const d = generateDieline("flat", { length: L, width: W, height: t, thickness: t })
    const r = checkDieline(d)
    assert.deepEqual(r.failures, [], id)
    assert.equal(d.panels.length, 1, id)
    assert.equal(d.folds.length, 0, id)
    assert.equal(d.features.length, 0, id)
    assert.equal(d.blankWidth, L, id)
    assert.equal(d.blankHeight, W, id)
    assert.deepEqual(
      { length: r.foldedInternal.length, width: r.foldedInternal.width, height: r.foldedInternal.height },
      { length: L, width: W, height: t },
      id,
    )
  }
})

test("flat: the sheet panel is exactly the plan rectangle", () => {
  const d = generateDieline("flat", { length: 85, width: 55, height: 1, thickness: 1 })
  const p = d.panels[0]
  assert.equal(p.width, 85)
  assert.equal(p.height, 55)
  assert.deepEqual(p.polygon, [
    { x: 0, y: 0 },
    { x: 85, y: 0 },
    { x: 85, y: 55 },
    { x: 0, y: 55 },
  ])
})

test("flat: the thickness contract is enforced — height must equal thickness, in range", () => {
  assert.throws(() => generateDieline("flat", { length: 85, width: 55, height: 2, thickness: 1 }), /must equal thickness/)
  assert.throws(() => generateDieline("flat", { length: 85, width: 55, height: 0.2, thickness: 0.2 }), /nominal sheet thickness/)
  // and the generic plan floors still bind
  assert.throws(() => generateDieline("flat", { length: 24, width: 55, height: 1, thickness: 1 }), /length must be between/)
})

test("flat: spec grid — generate + check clean, blank is exactly the plan size", () => {
  let n = 0
  for (const length of [50, 85, 100, 210, 297, 500])
    for (const width of [50, 55, 150, 210, 297, 750])
      for (const thickness of [0.3, 1, 2]) {
        const d = generateDieline("flat", { length, width, height: thickness, thickness })
        const r = checkDieline(d)
        assert.deepEqual(r.failures, [], `${length}x${width} t${thickness}`)
        assert.equal(d.blankWidth, length)
        assert.equal(d.blankHeight, width)
        n++
      }
  assert.equal(n, 108)
})

test("flat: svg renders, with and without bleed", () => {
  for (const opts of [undefined, { bleed: 5 }]) {
    const d = generateDieline("flat", { length: 85, width: 55, height: 1, thickness: 1 }, opts)
    assert.equal(checkDieline(d).ok, true)
    const svg = renderDielineSvg(d)
    assert.ok(svg.includes("<svg") && svg.length > 200)
  }
})
