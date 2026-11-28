// Batch T8b — auto-bottom diagonal corrections, following an
// audit of the T8 generator. Two findings, both reproduced on
// the T8 head before the fix:
//   1. On a main flap narrower than twice its depth, the two
//      diagonal scores (each run at the full flap depth) crossed
//      inside the flap and the two corner glue triangles
//      overlapped. Example: 300×400 t0.3 — flap 297.3 wide,
//      204.15 deep, the diagonals met 148.65 mm deep and the
//      triangles overlapped by 111 mm. The fix shortens the run
//      to min(flap depth, flap width / 2): the diagonals meet at
//      the lead edge's centre instead of crossing, and the
//      triangles share only that point.
//   2. The T8 validation rule was written against the default
//      3 mm slot gap, so with slotGap 10/20/30 the lead point
//      could fall off the flap: generateDieline accepted the
//      spec while checkDieline flagged the crease as outside
//      the panel. With the run capped at half the flap width
//      the lead point lands on the lead edge for every slotGap,
//      so the two agree by construction; the stale rule is
//      removed.
// On the T8 head the crossing and slotGap tests below fail; the
// wide-flap test passes on both heads (the 45° branch is
// unchanged).

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, type Dieline } from "../lib/dieline-gen/index.ts"

const panel = (d: Dieline, id: string) => d.panels.find((p) => p.id === id)!
function diagonals(d: Dieline, flapId: string) {
  return d.folds
    .filter((f) => f.internal && f.between[0] === flapId)
    .sort((a, b) => a.from.x - b.from.x)
}
// Positive when the two diagonals cross inside the flap (the
// left diagonal's lead point lands right of the right one's).
function overlapWidth(d: Dieline, flapId: string) {
  const [l, r] = diagonals(d, flapId)
  return l.to.x - r.to.x
}

test("autobottom 300×400 t0.3 (the audit example): diagonals meet at the lead centre, no crossing, checks clean", () => {
  const d = generateDieline("autobottom", { length: 300, width: 400, height: 100, thickness: 0.3 })
  for (const flapId of ["bottom-main-front", "bottom-main-back"]) {
    assert.ok(overlapWidth(d, flapId) <= 1e-9, `${flapId}: diagonals cross`)
    const f = panel(d, flapId)
    const [l, r] = diagonals(d, flapId)
    assert.ok(Math.abs(l.to.x - (l.from.x + f.width / 2)) < 1e-9, `${flapId}: left diagonal ends at the lead centre`)
    assert.ok(Math.abs(r.to.x - l.to.x) < 1e-9, `${flapId}: both diagonals share the centre point`)
  }
  assert.deepEqual(checkDieline(d).failures, [])
})

test("autobottom: on a grid of valid specs no main flap's diagonals cross", () => {
  for (const L of [40, 80, 120, 160, 200, 240, 280]) {
    for (const W of [40, 80, 120, 160, 200, 240, 280]) {
      const d = generateDieline("autobottom", { length: L, width: W, height: 100, thickness: 0.5 })
      for (const flapId of ["bottom-main-front", "bottom-main-back"]) {
        assert.ok(overlapWidth(d, flapId) <= 1e-9, `${L}×${W}: ${flapId} diagonals cross`)
      }
      assert.deepEqual(checkDieline(d).failures, [], `${L}×${W}: checks not clean`)
    }
  }
})

test("autobottom 300×200 t0.5: a wide flap keeps the 45° diagonals (run = rise = depth)", () => {
  const d = generateDieline("autobottom", { length: 300, width: 200, height: 100, thickness: 0.5 })
  const depth = (200 + 0.5) / 2 + 4
  for (const f of diagonals(d, "bottom-main-front")) {
    assert.ok(Math.abs(Math.abs(f.to.x - f.from.x) - depth) < 1e-9, "run = flap depth")
    assert.ok(Math.abs(Math.abs(f.to.y - f.from.y) - depth) < 1e-9, "rise = flap depth")
  }
})

test("autobottom: large slotGaps — generateDieline and checkDieline agree", () => {
  for (const slotGap of [10, 20, 30]) {
    const d = generateDieline("autobottom", { length: 100, width: 180, height: 120, thickness: 0.5 }, { slotGap })
    assert.deepEqual(checkDieline(d).failures, [], `slotGap ${slotGap}: checks flag a generated pattern`)
    assert.ok(overlapWidth(d, "bottom-main-front") <= 1e-9, `slotGap ${slotGap}: diagonals cross`)
  }
})
