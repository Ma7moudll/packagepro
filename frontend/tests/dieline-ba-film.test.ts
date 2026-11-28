// Batch BA: (1) the bag's default layout must pass its own label
// check, at several sizes and on all three closure layouts; the old
// flap strip sat on the flap centre and left no room for the flap label.
// (2) pouch foldedOuter equals foldedInternal. A pouch is film: its
// panel sizes are the stated plan sizes with no walls, so adding two
// material thicknesses (the box formula) would invent a dimension.
import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, layoutLabels, checkLabels } from "../lib/dieline-gen/index.ts"

const sizes: [number, number, number][] = [[250, 350, 0.5], [150, 200, 0.5], [200, 300, 1], [300, 400, 2], [120, 160, 0.5]]
const layouts = [{}, { flapHeight: 25 }, { flapHeight: 0 }, { flapHeight: 0, zipHeight: 15 }]

test("bag: checkDieline and checkLabels are clean at several sizes and layouts", () => {
  for (const [L, B, t] of sizes) {
    for (const o of layouts) {
      const d = generateDieline("bag", { length: L, width: B, height: t, thickness: t }, o)
      const id = `${L}x${B} t${t} ${JSON.stringify(o)}`
      assert.deepEqual(checkDieline(d).failures, [], id)
      assert.deepEqual(checkLabels(d, layoutLabels(d).labels), [], id)
    }
  }
})
test("bag: flap strip and flap label no longer share the flap centre", () => {
  const d = generateDieline("bag", { length: 250, width: 350, height: 0.5, thickness: 0.5 })
  const strip = d.features.filter((f) => f.kind === "seal")[2]
  assert.equal(strip.at.y + strip.h / 2, 20) // strip ends at half the flap
  const flap = layoutLabels(d).labels.find((l) => l.panelId === "flap")!
  assert.ok(flap.cy - flap.boxH / 2 >= 20, "flap label sits below the strip")
})
test("pouch: foldedOuter equals foldedInternal for several thicknesses", () => {
  for (const t of [0.3, 0.5, 1]) {
    const r = checkDieline(generateDieline("pouch", { length: 130, width: 70, height: 200, thickness: t }))
    assert.deepEqual(r.foldedOuter, r.foldedInternal, `t ${t}`)
    assert.deepEqual(r.foldedOuter, { length: 130, width: 70, height: 200 }, `t ${t}`)
  }
})
