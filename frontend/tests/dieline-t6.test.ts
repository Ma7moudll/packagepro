// Batch T6 — tests for the design-outline pins (mailer / tuck /
// snaplock flap outlines), the envelope seal-corner sampling-angle
// pin, and the tuck glue-area and dust-lead pins. These close the
// T5b survivor classes that this file pins: mailer and
// tuck tongue-notch and lead-arc placements, and the remaining
// envelope/snaplock arc survivors above tolerance.
//
// Every negative test tampers a generated dieline and asserts the
// SPECIFIC named failure, so a different failure cannot satisfy
// it. On the pre-T6 tree (c9902e3) every negative here fails,
// because the named failures do not exist there; the pass tests
// pin the generators at the mutation harness's sizes on both
// trees (they exercise cap branches the smaller suite sizes miss).

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, type Dieline, type DielineType } from "../lib/dieline-gen/index.ts"

const panel = (d: Dieline, id: string) => d.panels.find((p) => p.id === id)!
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

const MAILER = { length: 265, width: 195, height: 60, thickness: 1.5 }
const TUCK = { length: 90, width: 60, height: 140, thickness: 0.7 }
const SNAP = { length: 80, width: 55, height: 160, thickness: 0.5 }
const ENV = { length: 220, width: 110, height: 40, thickness: 0.5 }

// ---- pass: the mutation harness's sizes for the pinned types --

const SIZES: [DielineType, number, number, number, number][] = [
  ["mailer", 265, 195, 60, 1.5], ["mailer", 200, 150, 100, 1], ["mailer", 320, 220, 80, 2], ["mailer", 120, 90, 60, 0.5],
  ["tuck", 90, 60, 140, 0.7], ["tuck", 120, 80, 180, 1], ["tuck", 70, 45, 100, 0.5], ["tuck", 80, 50, 120, 0.5],
  ["snaplock", 60, 40, 120, 0.5], ["snaplock", 80, 55, 160, 0.5], ["snaplock", 100, 70, 200, 1], ["snaplock", 100, 28, 80, 0.5],
  ["envelope", 220, 110, 40, 0.5], ["envelope", 324, 229, 50, 0.5], ["envelope", 162, 114, 35, 0.5], ["envelope", 160, 40, 25, 0.5],
]
for (const [type, L, W, H, t] of SIZES) {
  test(`harness size ${type} ${L}×${W}×${H} t${t}: checks pass`, () => {
    const d = generateDieline(type, { length: L, width: W, height: H, thickness: t })
    assert.deepEqual(checkDieline(d).failures, [])
  })
  if (type === "tuck") {
    test(`harness size tuck ${L}×${W}×${H} t${t} reverse: checks pass`, () => {
      const d = generateDieline("tuck", { length: L, width: W, height: H, thickness: t }, { tuckStyle: "reverse" })
      assert.deepEqual(checkDieline(d).failures, [])
    })
  }
}

// ---- mailer negatives ------------------------------------------

test("negative: shifting the mailer notch arc sideways fails the outline pin", () => {
  // The generator-side version of this tamper is the notch centre
  // term (tuckW/2 + notchR): +3 moved it 94.8 mm in the T5b
  // survivor table with zero area change.
  const d = generateDieline("mailer", MAILER)
  const tuck = panel(d, "tuck")
  const notchR = Math.min(6, tuck.width / 6)
  tuck.polygon = tuck.polygon.map((v) => (v.y > 0.01 && v.y < notchR + 0.01 ? { x: v.x + 3, y: v.y } : v))
  expectFailure(d, "mailer tuck flap", "design vertex")
})

test("negative: dropping a mailer notch vertex fails the outline pin's count", () => {
  const d = generateDieline("mailer", MAILER)
  const tuck = panel(d, "tuck")
  const notchR = Math.min(6, tuck.width / 6)
  const i = tuck.polygon.findIndex((v) => v.y > 0.01 && v.y < notchR + 0.01)
  assert.ok(i > 0)
  tuck.polygon = tuck.polygon.filter((_, k) => k !== i)
  expectFailure(d, "mailer tuck flap", "vertices, the design carries")
})

test("negative: a deeper mailer dust taper fails the lead-extent check", () => {
  const d = generateDieline("mailer", MAILER)
  const dust = panel(d, "dust-back-l")
  const leadX = Math.min(...dust.polygon.map((v) => v.x))
  const lead = dust.polygon.filter((v) => Math.abs(v.x - leadX) <= 1e-9)
  const cy = (Math.max(...lead.map((v) => v.y)) + Math.min(...lead.map((v) => v.y))) / 2
  dust.polygon = dust.polygon.map((v) =>
    Math.abs(v.x - leadX) <= 1e-9 ? { x: v.x, y: v.y + (v.y > cy ? -3 : 3) } : v,
  )
  expectFailure(d, "mailer dust flap", "lead extent", "2 × taper")
})

// ---- tuck negatives --------------------------------------------

function tuckCornerCentre(d: Dieline, spec: typeof TUCK) {
  // Restate the top flap's right lead-corner centre in blank
  // coordinates from the design terms (the test's own arithmetic,
  // as elsewhere in this suite).
  const { length: L, width: W, thickness: t } = spec
  const sg = d.options.slotGap
  const span = W + t
  const td = Math.min(25, Math.max(10, W / 2))
  const g = Math.min(d.options.glueWidth, span / 2)
  const widths = [L + t, W + t, L + t, W + t]
  const backX = g + widths[0] + widths[1]
  const closureW = widths[2] - sg
  const tongueW = Math.min(L - 2 * t - 1, closureW - 1)
  const tx0 = backX + (widths[2] - tongueW) / 2
  const leadR = Math.min(2.5, td / 3)
  const tubeTop = span + td
  return { c: { x: tx0 + tongueW - leadR, y: tubeTop - (span + td - leadR) }, leadR, tx0, tongueW, span, td }
}

test("negative: rotating the tuck lead-corner samples fails the outline pin", () => {
  // The generator-side version is a start/end-angle change on the
  // corner arc: the fan area barely moves, the vertices do.
  const d = generateDieline("tuck", TUCK)
  const flap = panel(d, "tuck-top")
  const { c, leadR } = tuckCornerCentre(d, TUCK)
  flap.polygon = flap.polygon.map((v) => (Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - leadR) <= 0.05 ? rot(v, c, 3) : v))
  expectFailure(d, "tuck flap tuck-top", "design vertex")
})

test("negative: shifting the tuck notch bite fails the outline pin", () => {
  const d = generateDieline("tuck", TUCK)
  const flap = panel(d, "tuck-top")
  const { tx0, tongueW, span, td } = tuckCornerCentre(d, TUCK)
  const midX = tx0 + tongueW / 2
  const notchR = Math.min(5, tongueW / 6)
  const leadDepth = span + td
  flap.polygon = flap.polygon.map((v) => {
    const depth = Math.min(...flap.polygon.map((w) => w.y)) + leadDepth - v.y // depth below the flap's top row
    return Math.abs(v.x - midX) <= notchR + 0.01 && depth > leadDepth - notchR - 0.01 && v.y > Math.min(...flap.polygon.map((w) => w.y)) + 0.01
      ? { x: v.x + 2, y: v.y }
      : v
  })
  expectFailure(d, "tuck flap tuck-top", "design vertex")
})

test("negative: moving the tuck glue flap's outer vertices fails the glue-area check", () => {
  const d = generateDieline("tuck", TUCK)
  const glue = panel(d, "glue")
  const m = Math.min(...glue.polygon.map((v) => v.x))
  glue.polygon = glue.polygon.map((v) => (Math.abs(v.x - m) <= 1e-9 ? { x: v.x + 3, y: v.y } : v))
  expectFailure(d, "tuck: glue flap area", "bevel²")
})

test("negative: a deeper tuck dust taper fails the lead-width check", () => {
  const d = generateDieline("tuck", TUCK)
  const dust = panel(d, "dust-top-side-r")
  const hingeY = Math.max(...dust.polygon.map((v) => v.y))
  const leadY = Math.min(...dust.polygon.map((v) => v.y))
  dust.polygon = dust.polygon.map((v) => {
    if (Math.abs(v.y - leadY) > 1e-9) return v
    const cx = (Math.max(...dust.polygon.map((w) => w.x)) + Math.min(...dust.polygon.map((w) => w.x))) / 2
    return { x: v.x + (v.x > cx ? -2 : 2), y: v.y }
  })
  assert.ok(hingeY > leadY)
  expectFailure(d, "tuck dust flap", "lead width", "2 × taper")
})

// ---- snaplock negative ------------------------------------------

test("negative: rotating the snaplock lead-corner samples fails the outline pin", () => {
  // This is the exact T5b survivor class (snaplock.ts:104/110):
  // the T5b fan pin reports nothing for it, the outline pin does.
  const d = generateDieline("snaplock", SNAP)
  const flap = panel(d, "tuck-top")
  const { c, leadR } = tuckCornerCentre(d, { ...SNAP, thickness: SNAP.thickness })
  flap.polygon = flap.polygon.map((v) => (Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - leadR) <= 0.05 ? rot(v, c, 3) : v))
  expectFailure(d, "snaplock tuck flap tuck-top", "design vertex")
})

// ---- envelope negative ------------------------------------------

test("negative: rotating the envelope seal corner samples fails the sampling-angle pin", () => {
  // The generator-side version is a +3 change to the arc's start
  // angle (envelope.ts:86): fan change ≈0.03 mm², area change
  // 0.008 mm², vertex shift 0.21 mm — only the angle pin sees it.
  const d = generateDieline("envelope", ENV)
  const top = panel(d, "top-flap")
  const r = Math.min(6, ENV.height / 3)
  const yTop = Math.min(...top.polygon.map((v) => v.y))
  const fx = Math.min(...top.polygon.map((v) => v.x))
  const c = { x: fx + top.width - r, y: yTop + r }
  top.polygon = top.polygon.map((v) => (Math.abs(Math.hypot(v.x - c.x, v.y - c.y) - r) <= 0.05 ? rot(v, c, 3) : v))
  expectFailure(d, "envelope: seal flap corner 2", "design sampling")
})
