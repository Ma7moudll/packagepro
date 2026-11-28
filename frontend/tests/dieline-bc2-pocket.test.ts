// Batch BC2: same fault as the bag fixed in BA. The pocket's flap strip sat on the
// flap centre, so the flap label overlapped it and checkLabels failed at the
// default layout. The strip (same size) now sits on the free half of the flap.
import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, layoutLabels, checkLabels } from "../lib/dieline-gen/index.ts"

test("pocket: checkDieline and checkLabels are clean at several sizes", () => {
  for (const [L, B, t] of [[250, 300, 0.5], [200, 250, 1], [330, 240, 0.5], [150, 200, 0.5], [120, 160, 0.5]] as const) {
    const d = generateDieline("pocket", { length: L, width: B, height: t, thickness: t })
    assert.deepEqual(checkDieline(d).failures, [], `${L}x${B}`)
    assert.deepEqual(checkLabels(d, layoutLabels(d).labels), [], `${L}x${B}`)
  }
})
test("pocket: flap strip ends at half the flap and the flap label sits below it", () => {
  const d = generateDieline("pocket", { length: 250, width: 300, height: 0.5, thickness: 0.5 })
  const strip = d.features.filter((f) => f.kind === "seal")[3]
  assert.equal(strip.at.y + strip.h / 2, 20)
  assert.equal(strip.h, 20)
  const flap = layoutLabels(d).labels.find((l) => l.panelId === "flap")!
  assert.ok(flap.cy - flap.boxH / 2 >= 20)
})
