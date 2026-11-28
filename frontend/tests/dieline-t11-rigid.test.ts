// Batch T11R — rigid two-piece box (base tray + loose lid), board
// panels only. Wrap, corner closure, hinge, magnet are not drawn
// and no test here claims them.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, layoutLabels, checkLabels, renderDielineSvg, type Dieline } from "../lib/dieline-gen/index.ts"
import { rigidLidDepth } from "../lib/dieline-gen/rigid.ts"

const panel = (d: Dieline, id: string) => d.panels.find((p) => p.id === id)!
function expectFailure(d: Dieline, ...needles: string[]) {
  const failures = checkDieline(d).failures
  assert.ok(failures.some((f) => needles.every((n) => f.includes(n))), `expected [${needles.join(" + ")}], got: ${failures.join(" | ") || "(none)"}`)
}
function clean(spec: Parameters<typeof generateDieline>[1], options?: Parameters<typeof generateDieline>[2]) {
  const d = generateDieline("rigid", spec, options)
  assert.deepEqual(checkDieline(d).failures, [])
  const { labels } = layoutLabels(d)
  assert.deepEqual(checkLabels(d, labels), [])
  return d
}
const base = { length: 120, width: 90, height: 60, thickness: 2 }

test("rigid: 10 panels, 8 folds, no features, stated sizes", () => {
  const d = clean(base)
  assert.equal(d.panels.length, 10)
  assert.equal(d.folds.length, 8)
  assert.equal(d.features.length, 0)
  assert.equal(panel(d, "base-bottom").width, 122)
  assert.equal(panel(d, "base-front").height, 62)
  assert.equal(panel(d, "lid-top").width, 128) // L+2t+2+t
  assert.equal(rigidLidDepth(60), 18)
  assert.equal(panel(d, "lid-front").height, 20)
})

test("rigid: lid depth clamps (12 floor, 30 cap, 0.3H between)", () => {
  assert.equal(rigidLidDepth(25), 12)
  assert.equal(rigidLidDepth(60), 18)
  assert.equal(rigidLidDepth(200), 30)
  clean({ length: 80, width: 60, height: 25, thickness: 1 })
  clean({ length: 80, width: 60, height: 200, thickness: 1 })
})

test("rigid: grid over L x W x H x t is clean", () => {
  let n = 0
  for (const L of [25, 90, 300, 1200]) for (const W of [25, 70, 250]) for (const H of [25, 60, 100, 250]) for (const t of [0.5, 2, 3]) {
    clean({ length: L, width: W, height: H, thickness: t })
    n++
  }
  assert.equal(n, 144)
})

test("rigid: the two pieces do not overlap and sit 10 mm apart", () => {
  const d = clean(base)
  assert.equal(checkDieline(d).overlaps.length, 0)
  const bx = Math.max(...panel(d, "base-right").polygon.map((v) => v.x))
  const lx = Math.min(...panel(d, "lid-left").polygon.map((v) => v.x))
  assert.equal(lx - bx, 10)
})

test("rigid: SVG renders, with one bleed outline per piece", () => {
  const svg = renderDielineSvg(clean(base))
  assert.ok(svg.includes("<svg"))
  const g = svg.match(/<g id="bleed"[^>]*>([\s\S]*?)<\/g>/)![1]
  assert.equal((g.match(/<path /g) ?? []).length, 2)
  // the cut outline also covers both pieces (a single-loop cut would leave the lid uncut)
  const cut = svg.match(/<g id="cut"[^>]*>([\s\S]*?)<\/g>/)![1]
  assert.equal((cut.match(/<path /g) ?? []).length, 2)
  // other types keep a single bleed outline
  const one = renderDielineSvg(generateDieline("autobottom", base))
  assert.equal((one.match(/<g id="bleed"[^>]*>([\s\S]*?)<\/g>/)![1].match(/<path /g) ?? []).length, 1)
})

test("rigid: lid inner = base OUTER (L+2t, W+2t) + 1 mm per side; top span = inner + t", () => {
  const d = clean(base) // L120 W90 t2: outer 124 x 94, inner 126 x 96, span 128 x 98
  assert.equal(panel(d, "base-bottom").width + 2, 124)
  assert.equal(panel(d, "base-bottom").height + 2, 94)
  assert.equal(panel(d, "lid-top").width, 128)
  assert.equal(panel(d, "lid-top").height, 98)
})

test("rigid: validation still applies", () => {
  assert.throws(() => generateDieline("rigid", { ...base, length: 10 }), RangeError)
})

// ---- fail-before: mutants of the output must be caught ----------

test("mutant: lid clearance changed is caught", () => {
  const d = clean(base)
  const lid = panel(d, "lid-top")
  for (const v of lid.polygon) if (v.x > lid.polygon[0].x + 1) v.x += 1
  lid.width += 1
  expectFailure(d, "lid-top")
})
test("mutant: base wall too short is caught", () => {
  const d = clean(base)
  const w = panel(d, "base-front")
  for (const v of w.polygon) if (v.y > w.polygon[0].y + 1) v.y -= 3
  w.height -= 3
  expectFailure(d, "base-front")
})
test("mutant: dropped fold is caught", () => {
  const d = clean(base)
  d.folds.pop()
  const f = checkDieline(d).failures
  assert.ok(f.length > 0)
})
test("mutant: dropped lid panel is caught", () => {
  const d = clean(base)
  d.panels = d.panels.filter((p) => p.id !== "lid-back")
  expectFailure(d, "lid-back")
})
test("mutant: a feature added (magnet claim) is caught", () => {
  const d = clean(base)
  d.features.push({ kind: "hole", id: "m", name: "m", polygon: [], cx: 0, cy: 0 } as never)
  expectFailure(d, "features")
})
test("mutant: pieces moved together is caught", () => {
  const d = clean(base)
  for (const p of d.panels) if (p.id.startsWith("lid-")) { for (const v of p.polygon) v.x -= 4 }
  const f = checkDieline(d).failures
  assert.ok(f.some((x) => x.includes("apart") || x.includes("fold")))
})

test("mutant: lid moved down on the sheet (base/lid y-alignment) is caught", () => {
  const d = clean(base)
  for (const p of d.panels) if (p.id.startsWith("lid-")) for (const v of p.polygon) v.y += 5
  expectFailure(d, "top-aligned")
})
test("mutant: base moved down on the sheet is caught", () => {
  const d = clean(base)
  for (const p of d.panels) if (p.id.startsWith("base-")) for (const v of p.polygon) v.y += 5
  expectFailure(d, "top-aligned")
})
test("rigid: both pieces start at the sheet top (y = 0) and the left edge (x = 0)", () => {
  const d = clean(base)
  assert.equal(Math.min(...d.panels.flatMap((p) => p.polygon.map((v) => v.y))), 0)
  assert.equal(Math.min(...d.panels.flatMap((p) => p.polygon.map((v) => v.x))), 0)
  assert.equal(Math.min(...panel(d, "lid-back").polygon.map((v) => v.y)), 0)
  assert.equal(Math.min(...panel(d, "base-back").polygon.map((v) => v.y)), 0)
})
