// Batch BD: closes the gaps the auditor found in the T14 types (cup, tube,
// carrier, pocket). Table-driven 1 mm displacement tests as in BB, the tube
// tab-fit limit, the pocket layoutGap and sealWidth limits, and the carrier
// label limit stated as a test. Prototypes only, stated parameters.
import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, layoutLabels, checkLabels } from "../lib/dieline-gen/index.ts"
import type { Dieline } from "../lib/dieline-gen/index.ts"

const carrier = (o = {}) => generateDieline("carrier", { length: 260, width: 110, height: 350, thickness: 0.5 }, o)
const pocket = (o = {}) => generateDieline("pocket", { length: 250, width: 300, height: 0.5, thickness: 0.5 }, o)
const cup = () => generateDieline("cup", { length: 60, width: 90, height: 100, thickness: 0.5 })
const tube = (o = {}) => generateDieline("tube", { length: 25, width: 25, height: 100, thickness: 1 }, o)
const fails = (d: Dieline) => checkDieline(d).failures
const clone = (d: Dieline): Dieline => structuredClone(d)

const withFeatures: [string, Dieline][] = [["carrier", carrier()], ["carrier no-handle-offset", carrier({ handleInset: 30 })], ["pocket", pocket()], ["pocket flap 30", pocket({ flapHeight: 30 })]]

test("unmutated cup, tube, carrier and pocket report no failures", () => {
  for (const [n, d] of [...withFeatures, ["cup", cup()], ["tube", tube()]] as [string, Dieline][]) assert.deepEqual(fails(d), [], n)
})

test("carrier and pocket: each feature centre or size shifted 1 mm is reported by index", () => {
  for (const [n, d] of withFeatures) {
    d.features.forEach((f0, i) => {
      for (const delta of [1, -1]) {
        for (const key of ["x", "y"] as const) {
          const m = clone(d); m.features[i].at[key] += delta
          assert.ok(fails(m).some((f) => f.includes(`feature ${i} (${f0.kind}) centre`)), `${n} f${i} at.${key} ${delta}`)
        }
        for (const key of ["w", "h"] as const) {
          const m = clone(d); m.features[i][key] += delta
          assert.ok(fails(m).some((f) => f.includes(`feature ${i} (${f0.kind}) size`)), `${n} f${i} ${key} ${delta}`)
        }
      }
      const k = clone(d); k.features[i].kind = f0.kind === "seal" ? "slot" : "seal"
      assert.ok(fails(k).some((f) => f.includes(`feature ${i} kind`)), `${n} f${i} kind`)
    })
  }
})

test("carrier and pocket: a feature moved past a blank edge is reported outside exactly when it leaves the blank", () => {
  for (const [n, d] of withFeatures) {
    d.features.forEach((f0, i) => {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [300, 0], [-300, 0], [0, 400], [0, -400]] as const) {
        const m = clone(d); m.features[i].at.x += dx; m.features[i].at.y += dy
        const f = m.features[i]
        const out = f.at.x - f.w / 2 < -0.05 || f.at.x + f.w / 2 > d.blankWidth + 0.05 || f.at.y - f.h / 2 < -0.05 || f.at.y + f.h / 2 > d.blankHeight + 0.05
        const rep = fails(m).some((s) => s.includes(`feature ${i} (${f0.kind}) lies outside the blank`))
        assert.equal(rep, out, `${n} f${i} (${dx},${dy})`)
      }
    })
  }
})

test("carrier folds: every endpoint shifted 1 mm, neighbours and internal flags are reported", () => {
  const d = carrier()
  assert.equal(d.folds.length, 5)
  d.folds.forEach((_, i) => {
    for (const end of ["from", "to"] as const) for (const axis of ["x", "y"] as const) for (const delta of [1, -1]) {
      const m = clone(d); m.folds[i][end][axis] += delta
      assert.ok(fails(m).some((f) => f.includes(`carrier: fold ${i} endpoints differ`)), `fold ${i} ${end}.${axis} ${delta}`)
    }
    for (const side of [0, 1] as const) {
      const m = clone(d); m.folds[i].between[side] = "nowhere"
      assert.ok(fails(m).some((f) => f.includes(`carrier: fold ${i} is between`)), `fold ${i} side ${side}`)
    }
    const m = clone(d); m.folds[i].internal = !m.folds[i].internal
    assert.ok(fails(m).some((f) => f.includes(`carrier: fold ${i} internal flag`)), `fold ${i} internal`)
  })
})

test("pocket flap fold: every endpoint shifted 1 mm and either neighbour changed is reported", () => {
  const d = pocket()
  assert.equal(d.folds.length, 1)
  for (const end of ["from", "to"] as const) for (const axis of ["x", "y"] as const) for (const delta of [1, -1]) {
    const m = clone(d); m.folds[0][end][axis] += delta
    assert.ok(fails(m).some((f) => f.includes("pocket: the flap fold does not run")), `${end}.${axis} ${delta}`)
  }
  for (const side of [0, 1] as const) {
    const m = clone(d); m.folds[0].between[side] = "nowhere"
    assert.ok(fails(m).some((f) => f.includes("pocket: fold 0 is between")), `side ${side}`)
  }
})

test("cup seam fold: every endpoint shifted 1 mm and either neighbour changed is reported", () => {
  const d = cup()
  assert.equal(d.folds.length, 1)
  for (const end of ["from", "to"] as const) for (const axis of ["x", "y"] as const) for (const delta of [1, -1]) {
    const m = clone(d); m.folds[0][end][axis] += delta
    assert.ok(fails(m).some((f) => f.includes("cup: the seam fold does not run along the shared radial edge")), `${end}.${axis} ${delta}`)
  }
  for (const side of [0, 1] as const) {
    const m = clone(d); m.folds[0].between[side] = "nowhere"
    assert.ok(fails(m).some((f) => f.includes("cup: the seam fold is not between wrap and tab")), `side ${side}`)
  }
})

test("tube: a seam tab wider than the wrap is refused by the generator and reported by the checker", () => {
  // diameter 25 gives a 78.54 mm wrap
  assert.throws(() => tube({ seamOverlap: 100 }), /seam tab is wider than the wrap/)
  assert.throws(() => tube({ seamOverlap: 78.6 }), /seam tab is wider than the wrap/)
  assert.deepEqual(fails(tube({ seamOverlap: 78.5 })), [])
  assert.deepEqual(fails(tube({ seamOverlap: 15 })), [])
  // a tab forged wider than the wrap, with the option edited to match, still fails the checker
  const d = tube()
  const m = clone(d)
  m.options.seamOverlap = 100
  m.panels.find((p) => p.id === "tab")!.polygon = m.panels.find((p) => p.id === "tab")!.polygon.map((v) => ({ x: v.x === d.panels.find((p) => p.id === "tab")!.polygon[1].x ? v.x - 15 + 100 : v.x, y: v.y }))
  m.panels.find((p) => p.id === "tab")!.width = 100
  assert.ok(fails(m).some((f) => f.includes("tube: seam tab") && f.includes("wider than the wrap")))
})

test("pocket: layoutGap must be above 0 (0 always failed the shared-boundary check) and sealWidth must be below the pocket length", () => {
  assert.throws(() => pocket({ layoutGap: 0 }), /layoutGap must be above 0/)
  assert.throws(() => pocket({ layoutGap: -1 }), /layoutGap/)
  assert.deepEqual(fails(pocket({ layoutGap: 0.1 })), [])
  assert.deepEqual(fails(pocket({ layoutGap: 100 })), [])
  assert.throws(() => pocket({ layoutGap: 100.1 }), /layoutGap/)
  assert.throws(() => generateDieline("pocket", { length: 250, width: 40, height: 0.5, thickness: 0.5 }, { sealWidth: 40, flapHeight: 10 }), /bottom seal does not fit/)
  assert.throws(() => generateDieline("pocket", { length: 250, width: 40, height: 0.5, thickness: 0.5 }, { sealWidth: 45, flapHeight: 10 }), /bottom seal does not fit/)
  assert.doesNotThrow(() => generateDieline("pocket", { length: 250, width: 60, height: 0.5, thickness: 0.5 }, { sealWidth: 40, flapHeight: 10 }))
})

test("carrier: stated limit. checkDieline stays clean, but a large bottom seal on a short bag makes the labels collide", () => {
  // default 350 mm bag: clean at seal 10, 20 and 40
  for (const seal of [10, 20, 40]) {
    const d = carrier({ sealWidth: seal })
    assert.deepEqual(fails(d), [], `seal ${seal}`)
    assert.deepEqual(checkLabels(d, layoutLabels(d).labels), [], `seal ${seal}`)
  }
  // 60 mm tall bag: seal 10 is clean, seal 20 and 40 collide with the labels (a known limit, no guard)
  const short = (seal: number) => generateDieline("carrier", { length: 260, width: 110, height: 60, thickness: 0.5 }, { sealWidth: seal, handleInset: 10, handleHeight: 15, handleWidth: 100 })
  assert.deepEqual(checkLabels(short(10), layoutLabels(short(10)).labels), [])
  for (const seal of [20, 40]) {
    const d = short(seal)
    assert.deepEqual(fails(d), [], `geometry stays clean at seal ${seal}`)
    assert.ok(checkLabels(d, layoutLabels(d).labels).some((f) => f.includes("overlaps a cut feature (seal)")), `labels collide at seal ${seal}`)
  }
})

test("carrier and pocket: for every feature and each blank edge, 1 mm past and 1 mm short of the edge are judged against the blank", () => {
  for (const [n, d] of withFeatures) {
    const bw = d.blankWidth, bh = d.blankHeight
    d.features.forEach((f0, i) => {
      const edges: [string, "x" | "y", number][] = [
        ["left", "x", f0.at.x - f0.w / 2],
        ["right", "x", bw - (f0.at.x + f0.w / 2)],
        ["top", "y", f0.at.y - f0.h / 2],
        ["bottom", "y", bh - (f0.at.y + f0.h / 2)],
      ]
      for (const [edge, axis, toEdge] of edges) {
        for (const off of [1, -1]) {
          const m = clone(d)
          // toEdge is the distance from the feature's edge to the blank edge (>= 0 inside): moving by toEdge + off puts it off mm past that edge
          const dir = edge === "left" || edge === "top" ? -1 : 1
          m.features[i].at[axis] += dir * (toEdge + off)
          const g = m.features[i]
          const want = g.at.x - g.w / 2 < -0.05 || g.at.x + g.w / 2 > bw + 0.05 || g.at.y - g.h / 2 < -0.05 || g.at.y + g.h / 2 > bh + 0.05
          const got = fails(m).some((s) => s.includes(`feature ${i} (${f0.kind}) lies outside the blank`))
          assert.equal(got, want, `${n} f${i} ${edge} ${off}`)
        }
      }
    })
  }
})
