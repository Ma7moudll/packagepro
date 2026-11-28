// Batch AU — rigid_magnetic (loose magnetic lid) and gift_box at its
// catalogue size. Stated-parameter prototype: board panels plus 4 magnet
// pocket MARKS. No hinged-flap variant (not built here), no holding
// force, no pole orientation, no wrap or closure drawing.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, layoutLabels, checkLabels, renderDielineSvg, type Dieline } from "../lib/dieline-gen/index.ts"
import { rigidLidDepth, MAGNET_DIAMETER } from "../lib/dieline-gen/rigid.ts"
import { CATALOGUE_PRODUCTS } from "../../shared/catalog/products.ts"

const panel = (d: Dieline, id: string) => d.panels.find((p) => p.id === id)!
function expectFailure(d: Dieline, ...needles: string[]) {
  const failures = checkDieline(d).failures
  assert.ok(failures.some((f) => needles.every((n) => f.includes(n))), `expected [${needles.join(" + ")}], got: ${failures.join(" | ") || "(none)"}`)
}
function clean(spec: Parameters<typeof generateDieline>[1]) {
  const d = generateDieline("rigid_magnetic", spec)
  assert.deepEqual(checkDieline(d).failures, [])
  assert.deepEqual(checkLabels(d, layoutLabels(d).labels), [])
  return d
}
const base = { length: 120, width: 90, height: 60, thickness: 2 }

test("rigid_magnetic: same 10 panels and 8 folds as rigid, plus exactly 4 magnet marks", () => {
  const m = clean(base)
  const r = generateDieline("rigid", base)
  assert.equal(m.panels.length, 10)
  assert.equal(m.folds.length, 8)
  assert.equal(m.features.length, 4)
  assert.ok(m.features.every((f) => f.kind === "magnet" && f.r === MAGNET_DIAMETER / 2 + 0.1))
  assert.deepEqual(m.panels.map((p) => [p.id, p.width, p.height]), r.panels.map((p) => [p.id, p.width, p.height]))
  assert.equal(r.features.length, 0, "plain rigid still draws no magnet")
})

test("rigid_magnetic: pockets face each other (same offsets from wall centres, lidDepth/2 from free edge or fold)", () => {
  const d = clean(base)
  const bf = panel(d, "base-front")
  const lf = panel(d, "lid-front")
  const baseY = Math.max(...bf.polygon.map((v) => v.y)) - rigidLidDepth(60) / 2
  const lidY = Math.min(...lf.polygon.map((v) => v.y)) + rigidLidDepth(60) / 2
  assert.equal(d.features.filter((f) => f.at.y === baseY).length, 2)
  assert.equal(d.features.filter((f) => f.at.y === lidY).length, 2)
})

test("rigid_magnetic: grid over L x W x H x t is clean (pockets stay inside their walls)", () => {
  let n = 0
  for (const L of [40, 60, 300, 1200]) for (const W of [25, 70, 250]) for (const H of [25, 60, 100, 250]) for (const t of [0.5, 2, 3]) {
    clean({ length: L, width: W, height: H, thickness: t })
    n++
  }
  assert.equal(n, 144)
})

test("rigid_magnetic: SVG has 2 cut paths, 2 bleed paths and a magnet layer with 4 circles; plain rigid has none", () => {
  const svg = renderDielineSvg(clean(base))
  const grab = (id: string) => svg.match(new RegExp(`<g id="${id}"[^>]*>([\\s\\S]*?)</g>`))![1]
  assert.equal((grab("cut").match(/<path /g) ?? []).length, 2)
  assert.equal((grab("bleed").match(/<path /g) ?? []).length, 2)
  assert.equal((grab("magnet").match(/<circle /g) ?? []).length, 4)
  assert.ok(!renderDielineSvg(generateDieline("rigid", base)).includes('id="magnet"'))
  assert.ok(!svg.includes("<circle") || !grab("cut").includes("<circle"), "magnet marks are not in the cut layer")
})

test("gift_box at its catalogue size 250x200x100: rigid generator is clean, lid depth at the 30 mm cap", () => {
  const g = CATALOGUE_PRODUCTS.find((p) => p.id === "gift_box")!
  assert.deepEqual(g.defaultDimensions, { length: 250, width: 200, height: 100 })
  for (const t of [1, 2, 3]) {
    const d = generateDieline("rigid", { ...g.defaultDimensions!, thickness: t })
    assert.deepEqual(checkDieline(d).failures, [])
    assert.equal(panel(d, "lid-front").height, 30 + t)
    assert.equal(rigidLidDepth(100), 30)
  }
  assert.equal(g.readiness.dieline, "deferred", "no status change")
})

test("rigid_magnetic_box catalogue default: generator is clean; catalogue status unchanged", () => {
  const p = CATALOGUE_PRODUCTS.find((q) => q.id === "rigid_magnetic_box")!
  assert.equal(p.readiness.dieline, "deferred")
  if (p.defaultDimensions) for (const t of [1, 2, 3]) clean({ ...p.defaultDimensions, thickness: t })
})

test("rigid_magnetic: length below 40 mm is refused (pockets and label do not fit); plain rigid still accepts 25", () => {
  assert.throws(() => generateDieline("rigid_magnetic", { ...base, length: 39 }), RangeError)
  generateDieline("rigid_magnetic", { ...base, length: 40 })
  generateDieline("rigid", { ...base, length: 25 })
})

// ---- fail-before: output mutants ---------------------------------

test("mutant: a pocket removed is caught", () => {
  const d = clean(base)
  d.features.pop()
  expectFailure(d, "rigid_magnetic")
})
test("mutant: lid pocket shifted off the base pocket is caught", () => {
  const d = clean(base)
  const f = d.features.find((x) => x.at.y === Math.min(...panel(d, "lid-front").polygon.map((v) => v.y)) + rigidLidDepth(60) / 2)!
  f.at = { x: f.at.x + 3, y: f.at.y }
  expectFailure(d, "rigid_magnetic")
})
test("mutant: pocket pushed past the wall edge is caught", () => {
  const d = clean(base)
  const lf = panel(d, "lid-front")
  const f = d.features.find((x) => Math.abs(x.at.y - (Math.min(...lf.polygon.map((v) => v.y)) + rigidLidDepth(60) / 2)) < 0.01)!
  f.at = { x: f.at.x, y: f.at.y - 4 }
  expectFailure(d, "rigid_magnetic")
})
test("mutant: magnet pocket radius changed is caught", () => {
  const d = clean(base)
  d.features[0].r = 6
  expectFailure(d, "radius")
})
test("mutant: a non-magnet feature added is caught", () => {
  const d = clean(base)
  d.features.push({ kind: "vent", at: { x: 1, y: 1 }, w: 2, h: 2, r: 1 })
  expectFailure(d, "rigid_magnetic")
})
test("mutant: plain rigid with a magnet mark is caught", () => {
  const d = generateDieline("rigid", base)
  d.features.push({ kind: "magnet", at: { x: 1, y: 1 }, w: 2, h: 2, r: 1 })
  expectFailure(d, "features")
})
