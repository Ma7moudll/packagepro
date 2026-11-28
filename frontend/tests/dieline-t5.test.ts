// Batch T5b — tests for the batch T5 measured-area restatements
// and the batch T5b arc pins, which shipped without a test file,
// plus one extra (smaller) size per type chosen so size-dependent
// min() caps flip branch (the T5 survivor classification called
// several mutants "equivalent" — at the tested sizes only; these
// configs widen the tested range).
//
// Every negative test tampers a generated dieline and asserts the
// SPECIFIC named failure (check name + broken dimension), so a
// different failure cannot satisfy it. Each tamper was verified
// against the T5b tree to produce exactly that named failure. On
// the pre-T5 tree (4277f80) every negative here fails, because the
// named failures do not exist there; the extra-size configs pass
// on both trees (they pin the generators, not the new checks).

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, type Dieline, type DielineType } from "../lib/dieline-gen/index.ts"

const panel = (d: Dieline, id: string) => d.panels.find((p) => p.id === id)!
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9
function expectFailure(d: Dieline, ...needles: string[]) {
  const failures = checkDieline(d).failures
  assert.ok(
    failures.some((f) => needles.every((n) => f.includes(n))),
    `expected a failure containing [${needles.join(" + ")}], got: ${failures.join(" | ") || "(none)"}`,
  )
}
const rot = (v: { x: number; y: number }, c: { x: number; y: number }, deg: number) => {
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a)
  const dx = v.x - c.x, dy = v.y - c.y
  return { x: c.x + dx * cos - dy * sin, y: c.y + dx * sin + dy * cos }
}

const ENV = { length: 220, width: 110, height: 40, thickness: 0.5 }
const SNAP = { length: 80, width: 55, height: 160, thickness: 0.5 }

// ---- extra sizes: one smaller config per type ----------------

const EXTRA: [DielineType, number, number, number, number][] = [
  ["mailer", 120, 90, 60, 0.5],
  ["rsc", 150, 100, 80, 0.5],
  ["pizza", 200, 200, 40, 0.5],
  ["tuck", 80, 50, 120, 0.5],
  ["snaplock", 100, 28, 80, 0.5],
  ["pillow", 120, 80, 30, 0.5],
  ["sleeve", 100, 60, 80, 0.5],
  ["envelope", 160, 40, 25, 0.5],
]
for (const [type, L, W, H, t] of EXTRA) {
  test(`extra size ${type} ${L}×${W}×${H} t${t}: checks pass`, () => {
    const d = generateDieline(type, { length: L, width: W, height: H, thickness: t })
    assert.deepEqual(checkDieline(d).failures, [])
  })
}

test("envelope extra size flips the glue cap branch: glue width = bodyH/3 = 13.5, not the 15 cap", () => {
  // bodyH = W + t = 40.5; min(15, 40.5/3) = 13.5 — at the three
  // T3 sizes the 15 cap binds instead (bodyH/3 = 36.8 / 76.5 /
  // 38.2), so this config exercises the other branch.
  const d = generateDieline("envelope", { length: 160, width: 40, height: 25, thickness: 0.5 })
  assert.ok(near(panel(d, "glue-l").width, 13.5))
})

test("snaplock extra size W=28: span-dependent caps take their small-size branches", () => {
  // The smallest tested snaplock width before this file was 40
  // (span 40.5). At W = 28 the span is 28.5, so span/2 = 14.25 —
  // below the 15 mm caps that bind at the larger sizes.
  const d = generateDieline("snaplock", { length: 100, width: 28, height: 80, thickness: 0.5 })
  assert.deepEqual(checkDieline(d).failures, [])
})

// ---- envelope negatives (batch T5 checks + T5b arc pins) -----

test("negative: a narrowed envelope glue flap fails the glue-area check", () => {
  const d = generateDieline("envelope", ENV)
  const g = panel(d, "glue-l")
  const m = Math.min(...g.polygon.map((v) => v.x))
  g.polygon = g.polygon.map((v) => (Math.abs(v.x - m) <= 1e-9 ? { x: v.x + 2, y: v.y } : v))
  expectFailure(d, "envelope: glue flap glue-l area", "≠ width × (body height − bevel)")
})

test("negative: a shortened envelope bottom flap fails the bottom-area check", () => {
  const d = generateDieline("envelope", ENV)
  const b = panel(d, "bottom-flap")
  const m = Math.max(...b.polygon.map((v) => v.y))
  b.polygon = b.polygon.map((v) => (Math.abs(v.y - m) <= 1e-9 ? { x: v.x, y: v.y - 2 } : v))
  expectFailure(d, "envelope: bottom flap area", "≠ depth × (width − taper)")
})

test("negative: an envelope seal arc vertex rotated along its circle fails the fan-area check", () => {
  const d = generateDieline("envelope", ENV)
  const top = panel(d, "top-flap")
  const r = 6
  const yTop = Math.min(...top.polygon.map((v) => v.y))
  const c = { x: Math.max(...top.polygon.map((v) => v.x)) - r, y: yTop + r }
  const vs = top.polygon
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - r) <= 0.01)
  const tgt = vs.sort(
    (a, b) =>
      Math.abs(Math.atan2(a.v.y - c.y, a.v.x - c.x) + Math.PI / 6) -
      Math.abs(Math.atan2(b.v.y - c.y, b.v.x - c.x) + Math.PI / 6),
  )[0]
  top.polygon[tgt.i] = rot(tgt.v, c, 12)
  expectFailure(d, "envelope: seal flap corner 2 arc fan area", "(r = 6, 3 × 30°)")
})

test("negative: a moved envelope seal top-edge endpoint fails the arc-endpoint check", () => {
  const d = generateDieline("envelope", ENV)
  const top = panel(d, "top-flap")
  const r = 6
  const yTop = Math.min(...top.polygon.map((v) => v.y))
  const fx = Math.min(...top.polygon.map((v) => v.x))
  top.polygon = top.polygon.map((v) =>
    Math.abs(v.x - (fx + r)) <= 1e-9 && Math.abs(v.y - yTop) <= 1e-9 ? { x: v.x + 2, y: v.y } : v,
  )
  expectFailure(d, "envelope: seal flap corner 1 arc endpoint", "is missing from the outline")
})

// ---- snaplock negatives (batch T5 checks + T5b arc pins) -----

test("negative: a narrowed snaplock glue flap fails the glue-area check", () => {
  const d = generateDieline("snaplock", SNAP)
  const g = d.panels.find((p) => p.kind === "glue")!
  const m = Math.min(...g.polygon.map((v) => v.x))
  g.polygon = g.polygon.map((v) => (Math.abs(v.x - m) <= 1e-9 ? { x: v.x + 2, y: v.y } : v))
  expectFailure(d, "snaplock: glue flap area", "≠ width × tube height − bevel²")
})

test("negative: a horizontally shrunk snaplock main flap fails the lead-width check", () => {
  const d = generateDieline("snaplock", SNAP)
  const m = panel(d, "main-front")
  const cx = m.labelAt.x
  m.polygon = m.polygon.map((v) => ({ x: cx + (v.x - cx) * 0.98, y: v.y }))
  expectFailure(d, "snaplock: main flap main-front lead width", "≠ panel width − slotGap − 2 × taper")
})

test("negative: a moved snaplock tab tip vertex fails the tab-tip-width check", () => {
  const d = generateDieline("snaplock", SNAP)
  const t = panel(d, "tabflap-side-r")
  const ey = Math.max(...t.polygon.map((v) => v.y))
  const rx = Math.max(...t.polygon.filter((v) => v.y === ey).map((v) => v.x))
  t.polygon = t.polygon.map((v) => (v.y === ey && v.x === rx ? { x: v.x - 1.5, y: v.y } : v))
  expectFailure(d, "snaplock: tab tip width on tabflap-side-r", "≠ tab width 16 − 2 × chamfer")
})

test("negative: a stretched snaplock tab feature fails the feature-height check", () => {
  const d = generateDieline("snaplock", SNAP)
  const f = d.features.find((x) => x.kind === "tab")!
  f.h += 2
  expectFailure(d, "snaplock: tab feature height", "≠ the polygon's protrusion")
})

test("negative: a snaplock notch vertex rotated along its circle fails the notch fan-area check", () => {
  const d = generateDieline("snaplock", SNAP)
  const t = panel(d, "tuck-top")
  const minY = Math.min(...t.polygon.map((v) => v.y))
  const c = { x: t.labelAt.x, y: minY }
  const bite = t.polygon
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - 5) <= 0.01 && v.y > minY)
  const deep = bite.sort((a, b) => b.v.y - a.v.y)[0]
  t.polygon[deep.i] = rot(deep.v, c, 12)
  expectFailure(d, "snaplock tuck flap tuck-top: notch arc fan area", "(r = 5, 6 × 30°)")
})

test("negative: a snaplock lead-corner vertex rotated along its circle fails the fan-area check", () => {
  const d = generateDieline("snaplock", SNAP)
  const t = panel(d, "tuck-top")
  const minY = Math.min(...t.polygon.map((v) => v.y))
  const leadRow = t.polygon.filter((v) => v.y === minY)
  const tongueRight = Math.max(...leadRow.map((v) => v.x)) + 2.5
  const c = { x: tongueRight - 2.5, y: minY + 2.5 }
  const vs = t.polygon
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - 2.5) <= 0.01)
  const mid = vs[Math.floor(vs.length / 2)]
  t.polygon[mid.i] = rot(mid.v, c, 15)
  expectFailure(d, "snaplock tuck flap tuck-top: lead corner 2 arc fan area", "(r = 2.5, 3 × 30°)")
})

test("negative: a shallowed snaplock notch fails the notch-depth check", () => {
  const d = generateDieline("snaplock", SNAP)
  const t = panel(d, "tuck-top")
  const minY = Math.min(...t.polygon.map((v) => v.y))
  const c = { x: t.labelAt.x, y: minY }
  const bite = t.polygon
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - 5) <= 0.01 && v.y > minY)
  const deep = bite.sort((a, b) => b.v.y - a.v.y)[0]
  t.polygon[deep.i] = { x: deep.v.x, y: deep.v.y - 1 }
  expectFailure(d, "snaplock tuck flap tuck-top: notch bites", "deep ≠ its radius")
})
