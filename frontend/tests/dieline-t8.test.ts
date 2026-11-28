// Batch T8 — auto-bottom (crash-lock) carton: generator, checks,
// clamp audit. The type's top end is the tuck-end's top
// construction and is covered by the shared tuck restatements in
// checks.ts; the bottom end has its own restatements (flap
// outlines, diagonal endpoints). The self-erecting action of the
// glued bottom is a property of the assembly, not of the flat
// pattern, and no test here claims it.
//
// Clamp audit (instrumented Math.min/Math.max over the sizes
// below; the full table is in the batch notes): every clamp in
// autobottom.ts takes both branches across this size set except
// two that no valid size can flip, each with its proof:
//   leadR = min(2.5, tuckDepth/3): tuckDepth >= 10 by its own
//     clamp, so tuckDepth/3 >= 3.33 > 2.5 always (cap only);
//   the tuckDepth floor max(10, W/2): W >= 25 by validation, so
//     W/2 >= 12.5 > 10 always (floor never binds).
// Both are the same dead branches the tuck-end carries.
//
// The other four types in the batch's scope are not generated
// here; the batch notes give the per-type evidence (bottle_box
// is the snaplock construction itself; rigid_box,
// rigid_magnetic_box and gift_box are two-piece wrapped
// chipboard, for which no single flat blank exists).

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, layoutLabels, checkLabels, type Dieline } from "../lib/dieline-gen/index.ts"

const panel = (d: Dieline, id: string) => d.panels.find((p) => p.id === id)!
function expectFailure(d: Dieline, ...needles: string[]) {
  const failures = checkDieline(d).failures
  assert.ok(
    failures.some((f) => needles.every((n) => f.includes(n))),
    `expected a failure containing [${needles.join(" + ")}], got: ${failures.join(" | ") || "(none)"}`,
  )
}
function expectClean(spec: Parameters<typeof generateDieline>[1], options?: Parameters<typeof generateDieline>[2]) {
  const d = generateDieline("autobottom", spec, options)
  assert.deepEqual(checkDieline(d).failures, [])
  const { labels } = layoutLabels(d)
  assert.deepEqual(checkLabels(d, labels), [])
  return d
}

// ---- pass sizes (checks + labels) --------------------------------

test("autobottom 70×70×280 t0.5: checks and labels pass (wine-box proportions)", () => {
  expectClean({ length: 70, width: 70, height: 280, thickness: 0.5 })
})
test("autobottom 120×90×200 t1: checks and labels pass", () => {
  expectClean({ length: 120, width: 90, height: 200, thickness: 1 })
})
test("autobottom 200×150×80 t2: checks and labels pass", () => {
  expectClean({ length: 200, width: 150, height: 80, thickness: 2 })
})
test("autobottom 45×30×120 t0.5: checks and labels pass (dust taper value branch)", () => {
  expectClean({ length: 45, width: 30, height: 120, thickness: 0.5 })
})
test("autobottom 60×25×140 t0.5: checks and labels pass (glue width span branch, tuck depth value)", () => {
  expectClean({ length: 60, width: 25, height: 140, thickness: 0.5 })
})
test("autobottom 35×25×120 t3: checks and labels pass (notch radius value branch)", () => {
  expectClean({ length: 35, width: 25, height: 120, thickness: 3 })
})
test("autobottom 60×40×150 t3: checks and labels pass (tongue width value branch)", () => {
  expectClean({ length: 60, width: 40, height: 150, thickness: 3 })
})
test("autobottom 300×200×150 t1.5: checks and labels pass", () => {
  expectClean({ length: 300, width: 200, height: 150, thickness: 1.5 })
})
test("autobottom glueWidth 10: checks pass (glue bevel value branch)", () => {
  expectClean({ length: 120, width: 90, height: 200, thickness: 1 }, { glueWidth: 10 })
})
test("autobottom glueWidth 20: checks pass (glue width option branch)", () => {
  expectClean({ length: 120, width: 90, height: 200, thickness: 1 }, { glueWidth: 20 })
})

// ---- geometry spot-pins ------------------------------------------

test("autobottom bottom depths: main flaps cross the centreline, side flaps nearly meet", () => {
  const d = generateDieline("autobottom", { length: 70, width: 70, height: 280, thickness: 0.5 })
  const span = 70.5
  assert.ok(Math.abs(panel(d, "bottom-main-front").height - (span / 2 + 4)) < 1e-9)
  assert.ok(Math.abs(panel(d, "bottom-side-side-r").height - (span / 2 - 1)) < 1e-9)
  const diagonals = d.folds.filter((f) => f.internal && f.between[0] === "bottom-main-front")
  assert.equal(diagonals.length, 2)
  // Batch T8b restatement: at 70×70 the flap (span − 3 = 67.5
  // wide) is narrower than twice its depth (2 × 39.25), so the
  // diagonal run is half the flap width and the two diagonals
  // meet at the lead centre; the rise stays the flap depth.
  const leg = Math.min(span / 2 + 4, (span - 3) / 2)
  for (const f of diagonals) {
    assert.ok(Math.abs(Math.abs(f.to.x - f.from.x) - leg) < 1e-9, "diagonal run = min(depth, width / 2)")
    assert.ok(Math.abs(Math.abs(f.to.y - f.from.y) - (span / 2 + 4)) < 1e-9, "diagonal rise = flap depth")
  }
})

test("autobottom: the proportions the T8 validation rejected now generate clean (batch T8b)", () => {
  // 40×90 t0.5: flap 37.5 wide, 49.25 deep — the T8 rule threw
  // here. With the shortened run the diagonals meet at the lead
  // centre and the pattern checks clean.
  expectClean({ length: 40, width: 90, height: 120, thickness: 0.5 })
})

// ---- negatives ----------------------------------------------------

test("negative: deepening a main flap fails its outline pin", () => {
  const d = generateDieline("autobottom", { length: 70, width: 70, height: 280, thickness: 0.5 })
  const flap = panel(d, "bottom-main-front")
  const maxY = Math.max(...flap.polygon.map((v) => v.y))
  flap.polygon = flap.polygon.map((v) => (v.y === maxY ? { x: v.x, y: v.y + 2 } : v))
  expectFailure(d, "autobottom flap bottom-main-front", "design vertex")
})

test("negative: shortening a side flap fails its outline pin", () => {
  const d = generateDieline("autobottom", { length: 70, width: 70, height: 280, thickness: 0.5 })
  const flap = panel(d, "bottom-side-side-r")
  const maxY = Math.max(...flap.polygon.map((v) => v.y))
  flap.polygon = flap.polygon.map((v) => (v.y === maxY ? { x: v.x, y: v.y - 2 } : v))
  expectFailure(d, "autobottom flap bottom-side-side-r", "design vertex")
})

test("negative: shifting a bottom flap sideways fails its outline pin", () => {
  // The generator-side version is the autobottom.ts bottom-loop
  // fx divisor mutant (sg/2 -> sg/2.5 / sg/5): the flap polygon,
  // its hinge fold and its diagonals all derive from the same fx
  // and move together by 0.30 / 0.90 mm, so this tamper moves all
  // three. A pin anchored on the flap's own fold would move with
  // them; the checks anchor on the host panel, and this fails.
  const d = generateDieline("autobottom", { length: 70, width: 70, height: 280, thickness: 0.5 })
  const flap = panel(d, "bottom-main-back")
  flap.polygon = flap.polygon.map((v) => ({ x: v.x + 0.5, y: v.y }))
  for (const f of d.folds) {
    if (f.between.includes("bottom-main-back")) {
      f.from = { x: f.from.x + 0.5, y: f.from.y }
      f.to = { x: f.to.x + 0.5, y: f.to.y }
    }
  }
  expectFailure(d, "autobottom flap bottom-main-back", "design vertex")
})

test("negative: moving a diagonal's lead point fails the diagonal pin", () => {
  const d = generateDieline("autobottom", { length: 70, width: 70, height: 280, thickness: 0.5 })
  const diag = d.folds.find((f) => f.internal && f.between[0] === "bottom-main-back")!
  diag.to = { x: diag.to.x + 3, y: diag.to.y }
  expectFailure(d, "autobottom: main flap bottom-main-back", "diagonal score")
})

test("negative: deleting a diagonal fails the diagonal count", () => {
  const d = generateDieline("autobottom", { length: 70, width: 70, height: 280, thickness: 0.5 })
  const idx = d.folds.findIndex((f) => f.internal && f.between[0] === "bottom-main-front")
  d.folds.splice(idx, 1)
  expectFailure(d, "autobottom: main flap bottom-main-front", "diagonal scores, the design carries 2")
})

test("negative: a diagonal on a side flap fails the side-flap rule", () => {
  const d = generateDieline("autobottom", { length: 70, width: 70, height: 280, thickness: 0.5 })
  const flap = panel(d, "bottom-side-side-l")
  const minY = Math.min(...flap.polygon.map((v) => v.y))
  d.folds.push({
    from: { x: flap.polygon[0].x, y: minY },
    to: { x: flap.polygon[0].x + 10, y: minY + 10 },
    crease: "valley",
    between: ["bottom-side-side-l", "bottom-side-side-l"],
    internal: true,
  })
  expectFailure(d, "autobottom: side flap bottom-side-side-l", "design carries none")
})

test("negative: widening the top tongue fails the shared tuck outline pin", () => {
  const d = generateDieline("autobottom", { length: 70, width: 70, height: 280, thickness: 0.5 })
  const flap = panel(d, "tuck-top")
  const minY = Math.min(...flap.polygon.map((v) => v.y))
  flap.polygon = flap.polygon.map((v) => (v.y === minY ? { x: v.x, y: v.y - 1 } : v))
  expectFailure(d, "tuck flap tuck-top")
})
