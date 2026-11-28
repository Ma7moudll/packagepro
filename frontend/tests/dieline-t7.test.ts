// Batch T7 — pizza design-outline and vent-position pins.
// After T6b, 28 survivors remained in pizza / pillow / sleeve.
// Three are exact equivalents and are classified, not pinned:
// pillow.ts:76 slice(1) +0.5 (slice(1.5) truncates to slice(1)),
// pillow.ts:92 loop bound s <= 4 +0.5 (the same integer set runs),
// sleeve.ts:51 slice(1) +0.5 (same truncation). The other 25 are
// all pizza: the dust-flap taper clamp (pizza.ts:29), the tab
// chamfer and tab outline literals (pizza.ts:38, 56–61, shifts up
// to 4.8 mm), and the vent placement fractions (pizza.ts:97–98,
// invisible to panel-vertex measurement because vents are
// features, not panels). The pins live in checks.ts (design
// outlines restated from the design terms; vent positions
// restated exactly); these tests exercise them at the harness
// sizes and tamper one element per negative, asserting the
// SPECIFIC named failure. On the pre-T7 tree (0921e37) every
// negative fails, because the named failures do not exist there.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, type Dieline } from "../lib/dieline-gen/index.ts"

const panel = (d: Dieline, id: string) => d.panels.find((p) => p.id === id)!
function expectFailure(d: Dieline, ...needles: string[]) {
  const failures = checkDieline(d).failures
  assert.ok(
    failures.some((f) => needles.every((n) => f.includes(n))),
    `expected a failure containing [${needles.join(" + ")}], got: ${failures.join(" | ") || "(none)"}`,
  )
}

const PIZZA = { length: 330, width: 330, height: 45, thickness: 1.5 }

// ---- pass: harness sizes, vents on and off ----------------------

for (const [L, W, H, t] of [[330, 330, 45, 1.5], [200, 200, 40, 0.5], [200, 200, 30, 0.5], [150, 100, 80, 0.5]] as const) {
  test(`pizza ${L}×${W}×${H} t${t}: checks pass`, () => {
    const d = generateDieline("pizza", { length: L, width: W, height: H, thickness: t })
    assert.deepEqual(checkDieline(d).failures, [])
  })
}
test("pizza 330×330×45 vents off: checks pass", () => {
  const d = generateDieline("pizza", PIZZA, { vents: false })
  assert.deepEqual(checkDieline(d).failures, [])
})

// ---- negatives ---------------------------------------------------

test("negative: deepening a pizza dust taper fails the dust outline pin", () => {
  // The generator-side version is the pizza.ts:29 taper mutant:
  // taper 5 -> 5.5 moves both tapered corners of every dust flap.
  const d = generateDieline("pizza", PIZZA)
  const dust = panel(d, "dust-back-l")
  const minX = Math.min(...dust.polygon.map((v) => v.x))
  dust.polygon = dust.polygon.map((v) => (Math.abs(v.x - minX) <= 1e-9 ? { x: v.x, y: v.y + (v.y > 200 ? -2 : 2) } : v))
  expectFailure(d, "pizza dust flap dust-back-l", "design vertex")
})

test("negative: dropping a pizza dust vertex fails the outline pin's count", () => {
  const d = generateDieline("pizza", PIZZA)
  const dust = panel(d, "dust-front-r")
  dust.polygon = dust.polygon.slice(0, 3)
  expectFailure(d, "pizza dust flap dust-front-r", "vertices, the design carries")
})

test("negative: widening a tab chamfer fails the front flap outline pin", () => {
  // The generator-side version is the pizza.ts:38 cham mutant
  // (2 -> 2.5 / 5): the four chamfer vertices of each tab move.
  const d = generateDieline("pizza", PIZZA)
  const flap = panel(d, "lid-front-flap")
  flap.polygon = flap.polygon.map((v) => (v.y === 2 ? { x: v.x, y: 2.5 } : v))
  expectFailure(d, "pizza lid front flap", "design vertex")
})

test("negative: shifting a tab sideways fails the front flap outline pin", () => {
  // The generator-side version is the tabW/2 mutants on
  // pizza.ts:56–61: every tab vertex moves with the tab centre.
  const d = generateDieline("pizza", PIZZA)
  const flap = panel(d, "lid-front-flap")
  const tabCx = Math.min(...flap.polygon.map((v) => v.x)) + 30 // inside the left tab's span
  flap.polygon = flap.polygon.map((v) => (v.y < 10 && v.x < tabCx ? { x: v.x + 1.6, y: v.y } : v))
  expectFailure(d, "pizza lid front flap", "design vertex")
})

test("negative: moving a vent off its design position fails the vent pin", () => {
  // The generator-side version is the pizza.ts:98 fraction mutant
  // (0.32 -> 0.82): the vent stays inside the lid, so only the
  // position pin sees it.
  const d = generateDieline("pizza", PIZZA)
  const vent = d.features.find((f) => f.kind === "vent")!
  vent.at = { x: vent.at.x + 25, y: vent.at.y }
  expectFailure(d, "pizza: vent", "design position")
})

test("negative: moving the vent row fails the vent pin", () => {
  // The generator-side version is the pizza.ts:97 mutant
  // (0.28 -> 0.78): the whole vent row moves toward the lid's
  // far edge, still inside the panel.
  const d = generateDieline("pizza", PIZZA)
  for (const f of d.features) if (f.kind === "vent") f.at = { x: f.at.x, y: f.at.y + 40 }
  expectFailure(d, "pizza: vent", "design position")
})
