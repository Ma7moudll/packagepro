import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { checkDieline, generateDieline, type Dieline } from "../lib/dieline-gen/index.ts"

// Batch S2 addendum — literal pins and tightened checks.
//
// The batch R checks restated some generator formulae by calling the
// generator's own helpers (tuckDepthFor) and compared dimensions at
// 0.51–0.6 mm, so real mutants survived: tuck depth +3 mm, tube height
// H + 2t at t = 0.5, an unchecked tongue width, an unchecked pizza
// slot width. These tests pin LITERAL expected numbers (hand-derived
// in the comments, not recomputed from the generator's formulae) for
// one size per type, and assert the strengthened checkDieline agrees.

const EPS = 0.05

function panel(d: Dieline, id: string) {
  const p = d.panels.find((p) => p.id === id)
  assert.ok(p, `panel ${id} exists`)
  return p
}

/** Tongue width measured from the flap polygon beyond its crease. */
function tongueWidth(d: Dieline, flapId: string): number {
  const flap = panel(d, flapId)
  const crease = d.folds.find((f) => f.internal && f.between[0] === flapId)!
  const hingeFold = d.folds.find((f) => !f.internal && f.between[1] === flapId)!
  const away = Math.sign(crease.from.y - hingeFold.from.y)
  const beyond = flap.polygon.filter((v) => (v.y - crease.from.y) * away > 0.01)
  return Math.max(...beyond.map((v) => v.x)) - Math.min(...beyond.map((v) => v.x))
}

describe("literal pins — one size per type", () => {
  it("mailer 320×240×80 t1.5: tuck flap is H − t − 2 = 76.5 mm, folded dims exact", () => {
    const d = generateDieline("mailer", { length: 320, width: 240, height: 80, thickness: 1.5 })
    assert.ok(Math.abs(panel(d, "tuck").height - 76.5) < EPS)
    const report = checkDieline(d)
    assert.deepEqual(report.failures, [])
    assert.ok(Math.abs(report.foldedInternal.length - 320) < EPS)
    assert.ok(Math.abs(report.foldedInternal.width - 240) < EPS)
    assert.ok(Math.abs(report.foldedInternal.height - 80) < EPS)
  })

  it("RSC 400×300×300 t3: flap length is W/2 + t/2 − meetGap/2 = 150.5 mm, folded dims exact", () => {
    const d = generateDieline("rsc", { length: 400, width: 300, height: 300, thickness: 3 })
    assert.ok(Math.abs(panel(d, "panel-l1-flap-top").height - 150.5) < EPS)
    const report = checkDieline(d)
    assert.deepEqual(report.failures, [])
    assert.ok(Math.abs(report.foldedInternal.length - 400) < EPS)
    assert.ok(Math.abs(report.foldedInternal.width - 300) < EPS)
    assert.ok(Math.abs(report.foldedInternal.height - 300) < EPS)
  })

  it("pizza 330×330×45 t1.5: slots are 20 × 3.5 mm for 16 mm tabs, folded dims exact", () => {
    const d = generateDieline("pizza", { length: 330, width: 330, height: 45, thickness: 1.5 }, { vents: true })
    const slots = d.features.filter((f) => f.kind === "slot")
    const tabs = d.features.filter((f) => f.kind === "tab")
    assert.equal(slots.length, 2)
    assert.equal(tabs.length, 2)
    for (const s of slots) {
      assert.ok(Math.abs(s.w - 20) < EPS, `slot width ${s.w}`)
      assert.ok(Math.abs(s.h - 3.5) < EPS, `slot height ${s.h}`)
    }
    for (const tb of tabs) assert.ok(Math.abs(tb.w - 16) < EPS)
    const report = checkDieline(d)
    assert.deepEqual(report.failures, [])
    assert.ok(Math.abs(report.foldedInternal.length - 330) < EPS)
    assert.ok(Math.abs(report.foldedInternal.height - 45) < EPS)
  })

  it("tuck 80×55×160 t0.5: tube height H + t = 160.5, flap = span 55.5 + depth 25 = 80.5, dust = 26.75", () => {
    const d = generateDieline("tuck", { length: 80, width: 55, height: 160, thickness: 0.5 }, { tuckStyle: "straight" })
    assert.ok(Math.abs(panel(d, "front").height - 160.5) < EPS, "tube height")
    // tuck depth: W/2 = 27.5 clamped to the 25 mm cap — a LITERAL here,
    // so a change to the generator's depth rule cannot pass silently
    assert.ok(Math.abs(panel(d, "tuck-top").height - 80.5) < EPS, "tuck flap length")
    assert.ok(Math.abs(panel(d, "dust-top-side-r").height - 26.75) < EPS, "dust flap length")
    const report = checkDieline(d)
    assert.deepEqual(report.failures, [])
    assert.ok(Math.abs(report.foldedInternal.height - 160) < EPS)
  })

  it("tuck 80×55×160 t2 (thick board): tongue is L − 2t − 1 = 75 mm, not L − t − 1 = 77", () => {
    // At t = 0.5 the closure cap (closure − 1) hides the difference
    // between the two tongue formulae; at t = 2 the L − 2t − 1 term is
    // the binding one, so this size separates them.
    const d = generateDieline("tuck", { length: 80, width: 55, height: 160, thickness: 2 }, { tuckStyle: "straight" })
    assert.ok(Math.abs(tongueWidth(d, "tuck-top") - 75) < EPS, `tongue ${tongueWidth(d, "tuck-top")}`)
    assert.deepEqual(checkDieline(d).failures, [])
  })
})

describe("coverage pins — dimensions the S2 addendum left unmeasured (batch T2)", () => {
  it("mailer 320×240×80 t1.5: tuck width 316.5, roll depth 236.5, dust length 118.25", () => {
    const d = generateDieline("mailer", { length: 320, width: 240, height: 80, thickness: 1.5 })
    assert.ok(Math.abs(panel(d, "tuck").width - 316.5) < EPS, "tuck width (L + t) − 2t − 2")
    assert.ok(Math.abs(panel(d, "roll-l").height - 236.5) < EPS, "roll depth (W + t) − 2t − 2")
    assert.ok(Math.abs(panel(d, "dust-back-l").width - 118.25) < EPS, "dust length (W + t)/2 − t − 1")
    assert.deepEqual(checkDieline(d).failures, [])
  })

  it("pizza 330×330×45 t1.5: dust length 163.25 (M7's dimension), flap 326.5 × 26, side flap 44.5 × 329.5, tab spacing 282.5, vents 4 × r4", () => {
    const d = generateDieline("pizza", { length: 330, width: 330, height: 45, thickness: 1.5 }, { vents: true })
    assert.ok(Math.abs(panel(d, "dust-back-l").width - 163.25) < EPS, "dust length (W + t)/2 − t − 1")
    const flap = panel(d, "lid-front-flap")
    assert.ok(Math.abs(flap.width - 326.5) < EPS, "flap width (L + t) − 2t − 2")
    assert.ok(Math.abs(flap.height - 26) < EPS, "flap height = tab 10 + body 16")
    const side = panel(d, "lid-flap-l")
    assert.ok(Math.abs(side.width - 44.5) < EPS, "lid side flap length H + t − 2")
    assert.ok(Math.abs(side.height - 329.5) < EPS, "lid side flap depth (W + t) − 2")
    const tabs = d.features.filter((f) => f.kind === "tab")
    assert.ok(Math.abs(Math.abs(tabs[1].at.x - tabs[0].at.x) - 282.5) < EPS, "tab centre spacing (flapW − 2×inset 14 − tab 16)")
    for (const tb of tabs) assert.ok(Math.abs(tb.h - 10) < EPS, "tab length 10")
    const vents = d.features.filter((f) => f.kind === "vent")
    assert.equal(vents.length, 4)
    for (const v of vents) {
      assert.ok(Math.abs(v.w - 8) < EPS && Math.abs(v.h - 8) < EPS && Math.abs((v.r ?? 0) - 4) < EPS, "vent 8 × 8 mm, r 4")
    }
    assert.deepEqual(checkDieline(d).failures, [])
  })

  it("RSC 400×300×300 t3: glue flap width 15 (min of glueWidth 15 and (W + t)/3), flap width = panel − slotGap", () => {
    const d = generateDieline("rsc", { length: 400, width: 300, height: 300, thickness: 3 })
    assert.ok(Math.abs(panel(d, "glue").width - 15) < EPS, "glue width")
    assert.ok(Math.abs(panel(d, "panel-l1-flap-top").width - (403 - 3)) < EPS, "flap width = score width − slotGap 3")
    assert.deepEqual(checkDieline(d).failures, [])
  })

  it("tuck 80×55×160 t0.5: glue flap width 15 (min of glueWidth 15 and span/2)", () => {
    const d = generateDieline("tuck", { length: 80, width: 55, height: 160, thickness: 0.5 }, { tuckStyle: "straight" })
    assert.ok(Math.abs(panel(d, "glue").width - 15) < EPS, "glue width")
    assert.deepEqual(checkDieline(d).failures, [])
  })
})

describe("tightened tolerance across all 12 reference configurations", () => {
  const CONFIGS: [string, Parameters<typeof generateDieline>[0], Parameters<typeof generateDieline>[1], Parameters<typeof generateDieline>[2]][] = [
    ["mailer-s", "mailer", { length: 200, width: 150, height: 50, thickness: 1.5 }, undefined],
    ["mailer-m", "mailer", { length: 320, width: 240, height: 80, thickness: 1.5 }, undefined],
    ["mailer-l", "mailer", { length: 450, width: 350, height: 120, thickness: 1.5 }, undefined],
    ["rsc-s", "rsc", { length: 300, width: 200, height: 200, thickness: 3 }, undefined],
    ["rsc-m", "rsc", { length: 400, width: 300, height: 300, thickness: 3 }, undefined],
    ["rsc-l", "rsc", { length: 600, width: 400, height: 400, thickness: 3 }, undefined],
    ["pizza-s", "pizza", { length: 260, width: 260, height: 40, thickness: 1.5 }, { vents: false }],
    ["pizza-m", "pizza", { length: 330, width: 330, height: 45, thickness: 1.5 }, { vents: true }],
    ["pizza-l", "pizza", { length: 410, width: 410, height: 50, thickness: 1.5 }, { vents: true }],
    ["tuck-s", "tuck", { length: 60, width: 40, height: 120, thickness: 0.5 }, { tuckStyle: "straight" }],
    ["tuck-m", "tuck", { length: 80, width: 55, height: 160, thickness: 0.5 }, { tuckStyle: "reverse" }],
    ["tuck-l", "tuck", { length: 110, width: 70, height: 210, thickness: 0.5 }, { tuckStyle: "straight" }],
  ]
  it("checkDieline passes everywhere at the 0.05 mm tolerance (no size fails)", () => {
    for (const [name, type, spec, opts] of CONFIGS) {
      const report = checkDieline(generateDieline(type, spec, opts))
      assert.deepEqual(report.failures, [], `${name}: ${report.failures.join("; ")}`)
    }
  })
})
