import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, type Dieline } from "../lib/dieline-gen/index.ts"
import { checkLabels, layoutLabels, MIN_LABEL_MM, type LabelLayout } from "../lib/dieline-gen/labels.ts"

// Batch S2 Part 1 — dieline label legibility.
// MIN_LABEL_MM is the stated readable minimum: 2.5 mm ≈ 7 pt, the
// smallest type that stays legible printed at arm's length; panels that
// cannot fit a full label at that size get a short code + legend entry.

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

const ALL: [string, Dieline][] = CONFIGS.map(([name, type, spec, opts]) => [name, generateDieline(type, spec, opts)])

describe("label legibility across all 12 R configurations", () => {
  it("no label is smaller than the readable minimum", () => {
    for (const [name, d] of ALL) {
      const { labels } = layoutLabels(d)
      assert.equal(labels.length, d.panels.length, `${name}: one label per panel`)
      for (const l of labels) {
        assert.ok(l.fontSize >= MIN_LABEL_MM - 1e-9, `${name}/${l.panelId}: ${l.fontSize}mm < ${MIN_LABEL_MM}mm minimum`)
      }
    }
  })

  it("no label box overflows its panel or touches a fold line or cut feature", () => {
    for (const [name, d] of ALL) {
      const { labels } = layoutLabels(d)
      const failures = checkLabels(d, labels)
      assert.deepEqual(failures, [], `${name}: ${failures.join("; ")}`)
    }
  })

  it("the pizza lid-front-flap label is fully inside its narrow panel", () => {
    const d = generateDieline("pizza", { length: 330, width: 330, height: 45, thickness: 1.5 }, { vents: true })
    const { labels } = layoutLabels(d)
    const flap = labels.find((l) => l.panelId === "lid-front-flap")!
    assert.ok(flap, "label exists")
    const failures = checkLabels(d, labels).filter((f) => f.includes("lid-front-flap"))
    assert.deepEqual(failures, [])
    assert.ok(flap.fontSize >= MIN_LABEL_MM)
  })

  it("large boxes get large labels (readable at fit-to-screen)", () => {
    const rscL = generateDieline("rsc", { length: 600, width: 400, height: 400, thickness: 3 })
    const { labels } = layoutLabels(rscL)
    for (const l of labels.filter((x) => x.panelId.startsWith("panel-"))) {
      assert.ok(l.fontSize >= 6, `RSC-L ${l.panelId} label ${l.fontSize}mm should be ≥ 6mm`)
    }
    const tuckL = generateDieline("tuck", { length: 110, width: 70, height: 210, thickness: 0.5 })
    const tl = layoutLabels(tuckL).labels
    for (const l of tl.filter((x) => ["front", "back"].includes(x.panelId))) {
      assert.ok(l.fontSize >= 5, `tuck-L ${l.panelId} label ${l.fontSize}mm should be ≥ 5mm`)
    }
  })

  it("panels too small for a full label fall back to a code with a legend entry", () => {
    const rscM = generateDieline("rsc", { length: 400, width: 300, height: 300, thickness: 3 })
    const { labels, legend } = layoutLabels(rscM)
    const glue = labels.find((l) => l.panelId === "glue")!
    assert.equal(glue.mode, "code", "the 15 mm glue flap cannot fit 'GLUE FLAP' + dims at the minimum size")
    assert.ok(legend.some((e) => e.code === glue.code && /GLUE FLAP/.test(e.text)), "legend explains the code")
  })
})

describe("label checks catch bad labels (negative tests)", () => {
  it("reports a too-small font and an overflowing box", () => {
    const d = generateDieline("rsc", { length: 400, width: 300, height: 300, thickness: 3 })
    const { labels } = layoutLabels(d)
    const tampered: LabelLayout[] = labels.map((l) =>
      l.panelId === "panel-l1" ? { ...l, fontSize: 1.2 } : l.panelId === "panel-w1" ? { ...l, boxW: l.boxW * 4, boxH: l.boxH * 4 } : l,
    )
    const failures = checkLabels(d, tampered)
    assert.ok(failures.some((f) => f.includes("panel-l1") && /minimum/.test(f)), JSON.stringify(failures))
    assert.ok(failures.some((f) => f.includes("panel-w1") && /overflow/.test(f)), JSON.stringify(failures))
  })
})
