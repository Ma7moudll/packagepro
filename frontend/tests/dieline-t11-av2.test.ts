// Batch AV2 — (1) the glue-flap-wider-than-host check still runs for
// every type that has a glue flap and is not magnethinge (autobottom
// relies on the "side-l" default); (2) the magnethinge magnet pair is
// recorded as NOT meeting when closed at the defaults, and the style
// note says so.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, type Dieline } from "../lib/dieline-gen/index.ts"

const spec = { length: 120, width: 90, height: 200, thickness: 1 }

function widenGlue(d: Dieline, extra: number) {
  const glue = d.panels.find((p) => p.kind === "glue")!
  for (const v of glue.polygon) if (v.x === Math.min(...glue.polygon.map((q) => q.x))) v.x -= extra
  glue.width += extra
}

for (const type of ["autobottom", "tuck", "snaplock"] as const) {
  test(`${type}: a widened glue flap fails the host-width check (fail-before: the AV merge dropped it for autobottom)`, () => {
    const d = generateDieline(type, spec)
    assert.ok(!checkDieline(d).failures.some((f) => f.includes("wider than the panel")))
    widenGlue(d, 500)
    assert.ok(checkDieline(d).failures.some((f) => f.includes("wider than the panel it bonds to")), checkDieline(d).failures.join(" | "))
  })
}

test("magnethinge: style note says magnet marks only and closure alignment not verified", () => {
  const d = generateDieline("magnethinge", { length: 120, width: 90, height: 60, thickness: 2 })
  assert.ok(d.styleNote.includes("MAGNET MARKS ONLY"))
  assert.ok(d.styleNote.includes("NOT verified"))
})

test("magnethinge defaults 120x90x60 t2: the pair does NOT meet when closed (recorded, not fixed)", () => {
  const d = generateDieline("magnethinge", { length: 120, width: 90, height: 60, thickness: 2 })
  const flapMagnet = d.features.find((f) => f.at.y < 60)!
  const baseMagnet = d.features.find((f) => f !== flapMagnet)!
  const lidFront = d.panels.find((p) => p.name.includes("LID FRONT SKIRT"))!
  const flap = d.panels.find((p) => p.name.includes("FRONT FLAP"))!
  const baseFront = d.panels.find((p) => p.name.includes("BASE FRONT WALL"))!
  // distance below the lid top (the skirt's hinge edge) for the flap magnet, and below the base rim for the base magnet
  const lidTopEdgeY = Math.max(...lidFront.polygon.map((v) => v.y))
  const belowLidTop = lidTopEdgeY - flapMagnet.at.y + 0
  const belowRim = Math.max(...baseFront.polygon.map((v) => v.y)) - baseMagnet.at.y
  assert.ok(flap.height === 40)
  assert.ok(Math.abs(belowLidTop - belowRim) > 5, `offsets ${belowLidTop} vs ${belowRim}: if equal, update this test and the style note`)
})
