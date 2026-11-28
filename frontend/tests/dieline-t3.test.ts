// Batch T3 — the four generators added on the catalogue audit:
// snaplock (snap_lock_box), pillow (pillow_box), sleeve (sleeve),
// envelope (envelope). Every config must pass the geometric checks
// and the label checks; key dimensions are pinned as literals whose
// derivations are stated in comments (independent of the generator
// code paths that produce them).

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, layoutLabels, checkLabels, type Dieline, type DielineType } from "../lib/dieline-gen/index.ts"

const CONFIGS: [DielineType, number, number, number, number][] = [
  ["snaplock", 60, 40, 120, 0.5],
  ["snaplock", 80, 55, 160, 0.5],
  ["snaplock", 100, 70, 200, 1],
  ["pillow", 150, 100, 40, 0.5],
  ["pillow", 200, 140, 50, 0.5],
  ["pillow", 260, 180, 60, 1],
  ["sleeve", 300, 80, 100, 1.5],
  ["sleeve", 200, 60, 80, 1.5],
  ["sleeve", 400, 100, 120, 3],
  ["envelope", 220, 110, 40, 0.5],
  ["envelope", 324, 229, 50, 0.5],
  ["envelope", 162, 114, 35, 0.5],
]

for (const [type, L, W, H, t] of CONFIGS) {
  test(`${type} ${L}×${W}×${H} t${t}: checks and labels pass`, () => {
    const d = generateDieline(type, { length: L, width: W, height: H, thickness: t })
    const rep = checkDieline(d)
    assert.deepEqual(rep.failures, [], rep.failures.join("; "))
    const { labels } = layoutLabels(d)
    assert.deepEqual(checkLabels(d, labels), [])
  })
}

function panel(d: Dieline, id: string) {
  const p = d.panels.find((p) => p.id === id)
  assert.ok(p, `panel ${id} exists`)
  return p
}
const near = (a: number, b: number) => Math.abs(a - b) <= 0.05

test("snaplock pins (80×55×160, t 0.5)", () => {
  const d = generateDieline("snaplock", { length: 80, width: 55, height: 160, thickness: 0.5 })
  // span = 55 + 0.5 = 55.5; main flap depth = span − t − 2 = 53
  assert.ok(near(panel(d, "main-front").height, 53))
  // tab flap total depth = body span/2 + 6 = 33.75 plus the 10 mm tab = 43.75
  assert.ok(near(panel(d, "tabflap-side-r").height, 43.75))
  // tab centre reach = 33.75 + 5 = 38.75 from the hinge; the slit on
  // the main flap sits the same 38.75 from the flap's left edge
  const tab = d.features.find((f) => f.kind === "tab")!
  const main = panel(d, "main-front")
  const slotF = d.features.filter((f) => f.kind === "slot")[0]
  assert.ok(near(tab.at.y - Math.min(...panel(d, "tabflap-side-r").polygon.map((v) => v.y)), 38.75))
  assert.ok(near(slotF.at.x - Math.min(...main.polygon.map((v) => v.x)), 38.75))
  // slit = tab 16 + 4 clearance = 20 wide, 3.5 high
  const slot = d.features.find((f) => f.kind === "slot")!
  assert.ok(near(slot.w, 20) && near(slot.h, 3.5))
  // top dust flaps = span/2 − 1 = 26.75; top tuck flap = span + 25 = 80.5
  assert.ok(near(panel(d, "dust-top-side-r").height, 26.75))
  assert.ok(near(panel(d, "tuck-top").height, 80.5))
  // glue = min(15, span/2) = 15; blank = 15 + 2×80.5 + 2×55.5 wide,
  // 80.5 + 160.5 + 53 high
  assert.ok(near(panel(d, "glue").width, 15))
  assert.ok(near(d.blankWidth, 287) && near(d.blankHeight, 294))
})

test("pillow pins (200×140×50, t 0.5)", () => {
  const d = generateDieline("pillow", { length: 200, width: 140, height: 50, thickness: 0.5 })
  // end flap = 50.5; blank length = 200 + 2 × 50.5 = 301
  assert.ok(near(panel(d, "face-a").height, 301))
  assert.ok(near(panel(d, "face-a").width, 140.5))
  assert.ok(near(panel(d, "side-a").width, 50.5))
  // glue = min(15, 50.5/2) = 15; blank = 15 + 2×140.5 + 2×50.5 = 397 wide
  assert.ok(near(panel(d, "glue").width, 15))
  assert.ok(near(d.blankWidth, 397) && near(d.blankHeight, 301))
})

test("sleeve pins (300×80×100, t 1.5)", () => {
  const d = generateDieline("sleeve", { length: 300, width: 80, height: 100, thickness: 1.5 })
  assert.ok(near(panel(d, "front").width, 301.5))
  assert.ok(near(panel(d, "side-a").width, 101.5))
  for (const p of d.panels) assert.ok(near(p.height, 80), `${p.id} height is the band width`)
  // blank = 15 + 2×101.5 + 2×301.5 = 821 wide, 80 high
  assert.ok(near(d.blankWidth, 821) && near(d.blankHeight, 80))
})

test("envelope pins (220×110×40, t 0.5)", () => {
  const d = generateDieline("envelope", { length: 220, width: 110, height: 40, thickness: 0.5 })
  const body = panel(d, "body")
  assert.ok(near(body.width, 220.5) && near(body.height, 110.5))
  // bottom flap depth = 110.5/2 − 2 = 53.25; top flap = H deep, body − slotGap wide
  assert.ok(near(panel(d, "bottom-flap").height, 53.25))
  assert.ok(near(panel(d, "top-flap").height, 40))
  assert.ok(near(panel(d, "top-flap").width, 217.5))
  // glue = min(15, 110.5/3) = 15; blank = 250.5 × (40 + 110.5 + 53.25)
  assert.ok(near(panel(d, "glue-l").width, 15))
  assert.ok(near(d.blankWidth, 250.5) && near(d.blankHeight, 203.75))
})

test("snaplock validation: a length too short for the depth throws", () => {
  assert.throws(() => generateDieline("snaplock", { length: 40, width: 55, height: 100, thickness: 0.5 }), RangeError)
})

// Batch T5b: the negative tests assert the SPECIFIC named failure
// (check name + broken dimension), not merely that something
// fails — a different failure cannot satisfy them.
test("negative: a displaced snap-lock main flap fails the slit-position check", () => {
  const d = generateDieline("snaplock", { length: 80, width: 55, height: 160, thickness: 0.5 })
  const flap = panel(d, "main-front")
  flap.polygon = flap.polygon.map((p) => ({ x: p.x, y: p.y + 5 }))
  const failures = checkDieline(d).failures
  assert.ok(
    failures.some((f) => f.includes("snaplock: slit on main-front sits") && f.includes("≠ mid span")),
    `expected the slit-position failure, got: ${failures.join(" | ")}`,
  )
})

test("negative: a pillow end curve pushed outside its panel fails the curve-depth check", () => {
  const d = generateDieline("pillow", { length: 200, width: 140, height: 50, thickness: 0.5 })
  const f = d.folds.find((x) => x.internal && x.between[0] === "face-a")!
  f.from = { x: f.from.x, y: -10 }
  const failures = checkDieline(d).failures
  assert.ok(
    failures.some((f) => f.includes("pillow: face-a top curve sits -10.00 mm at the segment boundary") && f.includes("(H + t)/2")),
    `expected the curve-depth failure, got: ${failures.join(" | ")}`,
  )
})

test("negative: a displaced envelope bottom flap fails the fold-completeness check", () => {
  const d = generateDieline("envelope", { length: 220, width: 110, height: 40, thickness: 0.5 })
  const flap = panel(d, "bottom-flap")
  flap.polygon = flap.polygon.map((p) => ({ x: p.x + 6, y: p.y }))
  const failures = checkDieline(d).failures
  assert.ok(
    failures.some((f) => f.includes("panels body and bottom-flap share a") && f.includes("boundary with no fold between them")),
    `expected the fold-completeness failure, got: ${failures.join(" | ")}`,
  )
})
