import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, layoutLabels, validateSpec, type Dieline } from "../lib/dieline-gen/index.ts"
import { checkDieline } from "../lib/dieline-gen/checks.ts"
import { renderDielineSvg } from "../lib/dieline-gen/svg.ts"

// Batch R — parametric dieline generator tests.
// Inputs are INTERNAL dimensions (FEFCO convention), mm.
// Score (centreline) spans are internal + thickness; outer = internal + 2t.

const RSC = { length: 400, width: 300, height: 300, thickness: 3 }

describe("validation", () => {
  it("rejects out-of-range dimensions and thickness with clear errors", () => {
    assert.throws(() => validateSpec({ length: 10, width: 300, height: 300, thickness: 3 }), /length/i)
    assert.throws(() => validateSpec({ length: 400, width: 300, height: 300, thickness: 0.1 }), /thickness/i)
    assert.throws(() => validateSpec({ length: 400, width: 300, height: 300, thickness: 12 }), /thickness/i)
    assert.throws(() => validateSpec({ length: 400, width: 300, height: 2000, thickness: 3 }), /height/i)
  })
})

describe("RSC (FEFCO 0201 style)", () => {
  const d = generateDieline("rsc", RSC)

  it("panel score widths are internal + t around the tube, glue flap first", () => {
    const tube = d.panels.filter((p) => p.kind === "panel")
    assert.equal(tube.length, 4)
    assert.deepEqual(
      tube.map((p) => Math.round(p.width * 10) / 10),
      [403, 303, 403, 303],
    )
    const glue = d.panels.find((p) => p.kind === "glue")
    assert.ok(glue, "glue flap exists")
  })

  it("all 8 flaps share the 0201 flap length: W/2 + t/2 − meetGap/2", () => {
    const flaps = d.panels.filter((p) => p.kind === "flap")
    assert.equal(flaps.length, 8)
    const expected = 300 / 2 + 3 / 2 - 1 // meetGap default 2 → −1
    for (const f of flaps) {
      const len = f.height // flaps hinge on the panel's top/bottom edge: length = extent from the hinge
      assert.ok(Math.abs(len - expected) < 0.6, `flap length ${len} ≈ ${expected}`)
    }
  })

  it("passes its own checks, with the glue overlap measured", () => {
    const report = checkDieline(d)
    assert.equal(report.ok, true, JSON.stringify(report.failures))
    assert.ok(report.glueOverlapMm2 > 0)
  })
})

describe("mailer (FEFCO 0427 style)", () => {
  const d = generateDieline("mailer", { length: 320, width: 240, height: 80, thickness: 1.5 })
  it("has a lid, a tuck flap, dust flaps and inner roll panels", () => {
    assert.ok(d.panels.some((p) => p.kind === "lid"))
    assert.ok(d.panels.some((p) => p.kind === "tuck"))
    assert.equal(d.panels.filter((p) => p.kind === "dust").length, 4)
    assert.equal(d.panels.filter((p) => p.kind === "roll").length, 2)
    // the roll fold reverses direction: it must be a mountain crease
    const rollFold = d.folds.find((f) => f.between.includes("side-wall-l") && f.between.includes("roll-l"))
    assert.equal(rollFold?.crease, "mountain")
  })
  it("passes its own checks", () => {
    assert.equal(checkDieline(d).ok, true)
  })
})

describe("pizza (0427 family, locking tabs)", () => {
  const d = generateDieline("pizza", { length: 330, width: 330, height: 45, thickness: 1.5 }, { vents: true })
  it("has two locking tabs, two slots and four vents", () => {
    assert.equal(d.features.filter((f) => f.kind === "tab").length, 2)
    assert.equal(d.features.filter((f) => f.kind === "slot").length, 2)
    assert.equal(d.features.filter((f) => f.kind === "vent").length, 4)
    const noVent = generateDieline("pizza", { length: 330, width: 330, height: 45, thickness: 1.5 }, { vents: false })
    assert.equal(noVent.features.filter((f) => f.kind === "vent").length, 0)
  })
  it("passes its own checks", () => {
    assert.equal(checkDieline(d).ok, true)
  })
})

describe("tuck-end (ECMA family)", () => {
  it("straight tuck puts both tuck flaps on the same panel; reverse on opposite panels", () => {
    const straight = generateDieline("tuck", { length: 60, width: 40, height: 120, thickness: 0.5 }, { tuckStyle: "straight" })
    const reverse = generateDieline("tuck", { length: 60, width: 40, height: 120, thickness: 0.5 }, { tuckStyle: "reverse" })
    const hinge = (d: Dieline, end: string) => d.panels.find((p) => p.kind === "tuck" && p.id.includes(end))?.hingePanel
    assert.equal(hinge(straight, "top"), hinge(straight, "bottom"))
    assert.notEqual(hinge(reverse, "top"), hinge(reverse, "bottom"))
    assert.equal(checkDieline(straight).ok, true)
    assert.equal(checkDieline(reverse).ok, true)
  })
})

describe("checks catch broken geometry (negative tests)", () => {
  it("reports an overlap when a flap is shifted onto its neighbour", () => {
    const d = generateDieline("rsc", RSC)
    const flap = d.panels.find((p) => p.kind === "flap")!
    const broken: Dieline = {
      ...d,
      panels: d.panels.map((p) => (p.id === flap.id ? { ...p, polygon: p.polygon.map((pt) => ({ x: pt.x + 30, y: pt.y })) } : p)),
    }
    const report = checkDieline(broken)
    assert.equal(report.ok, false)
    assert.ok(report.overlaps.length > 0, "overlap pair reported")
  })

  it("reports a dimension failure when a panel width is corrupted", () => {
    const d = generateDieline("rsc", RSC)
    const tube = d.panels.find((p) => p.kind === "panel")!
    const broken: Dieline = {
      ...d,
      panels: d.panels.map((p) =>
        p.id === tube.id ? { ...p, polygon: p.polygon.map((pt, i) => (i === 1 || i === 2 ? { x: pt.x + 5, y: pt.y } : pt)) } : p,
      ),
    }
    const report = checkDieline(broken)
    assert.equal(report.ok, false)
    assert.ok(report.failures.some((f) => /dimension|width|fold/i.test(f)), JSON.stringify(report.failures))
  })
})

describe("SVG output", () => {
  it("is in mm with the named layers and a viewBox matching the blank + bleed", () => {
    const d = generateDieline("rsc", RSC)
    const svg = renderDielineSvg(d)
    assert.match(svg, /width="[\d.]+mm"/)
    assert.match(svg, /id="cut"/)
    assert.match(svg, /id="fold-valley"/)
    assert.match(svg, /id="bleed"/)
    assert.match(svg, /id="labels"/)
    const vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg)!
    assert.ok(Math.abs(parseFloat(vb[3]) - (d.blankWidth + 2 * d.options.bleed)) < 0.2)
    // S2: the viewBox height additionally carries the legend strip when
    // small panels fall back to codes (0 when every label fits in full)
    const { legend } = layoutLabels(d)
    const legendHeight = legend.length > 0 ? (legend.length + 1) * 4.4 + 2 : 0
    assert.ok(Math.abs(parseFloat(vb[4]) - (d.blankHeight + 2 * d.options.bleed + legendHeight)) < 0.2)
  })
})
