// Batch T11 — magnethinge: the hinged-flap variant of
// the magnetic rigid box (rigid_magnetic_box, variant
// (b): hinged-flap lid). ONE connected blank: base tray,
// hinge strip, lid (top panel + front/side skirts) and a
// front flap that folds down over the base front wall,
// with a magnet pair stated by parameter (diameter and
// inset) on the flap and the base front wall.
// All hinge, flap and magnet numbers are stated
// parameters, not verified values: the catalogue gives
// no hinge, flap or magnet data for this product.
// Separate generator, checks section and test file so
// the variant is reviewed on its own.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, renderDielineSvg } from "../lib/dieline-gen/index.ts"

const CATALOGUE = { length: 250, width: 200, height: 100, thickness: 2 }

test("magnethinge: catalogue size generates and checks clean, one connected blank", () => {
  const d = generateDieline("magnethinge", CATALOGUE)
  const r = checkDieline(d)
  assert.deepEqual(r.failures, [])
  assert.equal(r.ok, true)
  // base: bottom + front/back + 2 sides + 4 glue = 9
  // lid assembly: top + front skirt + 2 side skirts + 2 glue = 6
  // plus the hinge strip and the front flap = 17
  assert.equal(d.panels.length, 17)
  assert.equal(d.folds.length, 16)
  assert.equal(d.features.length, 2)
  assert.ok(d.features.every((f) => f.kind === "magnet" && f.w === 10 && f.h === 10), "both features are 10 mm magnet discs by default")
  assert.deepEqual(
    { length: r.foldedInternal.length, width: r.foldedInternal.width, height: r.foldedInternal.height },
    { length: 250, width: 200, height: 100 },
    "folded internal dimensions recover the input (base depth + lid skirt depth)",
  )
})

test("magnethinge: hinge strip and front flap carry the stated parameter sizes", () => {
  const d = generateDieline("magnethinge", CATALOGUE, { hingeWidth: 9, flapHeight: 55 })
  const hinge = d.panels.find((p) => p.id === "hinge")!
  const flap = d.panels.find((p) => p.id === "flap")!
  assert.equal(hinge.height, 9, "hinge strip height is the hingeWidth parameter")
  assert.equal(flap.height, 55, "front flap height is the flapHeight parameter")
  assert.equal(hinge.width, 252, "hinge strip spans the base back wall's score width (L + t)")
  assert.equal(checkDieline(d).ok, true)
})

test("magnethinge: magnets sit at the stated blank positions", () => {
  const d = generateDieline("magnethinge", CATALOGUE, { magnetDiameter: 14, magnetInset: 8 })
  const flap = d.panels.find((p) => p.id === "flap")!
  const front = d.panels.find((p) => p.id === "base-front")!
  const flapYs = flap.polygon.map((v) => v.y)
  const frontYs = front.polygon.map((v) => v.y)
  const flapMagnet = d.features.find((f) => Math.abs(f.at.x - flap.labelAt.x) < 1e-9 && f.at.y >= Math.min(...flapYs) && f.at.y <= Math.max(...flapYs))
  const frontMagnet = d.features.find((f) => Math.abs(f.at.x - front.labelAt.x) < 1e-9 && f.at.y >= Math.min(...frontYs) && f.at.y <= Math.max(...frontYs))
  assert.ok(flapMagnet, "magnet inside the flap")
  assert.ok(frontMagnet, "magnet inside the base front wall")
  // flap free edge is the blank's top edge of the flap panel:
  // centre sits inset + radius below it
  assert.ok(Math.abs(flapMagnet!.at.y - (Math.min(...flapYs) + 8 + 7)) < 1e-9)
  // base front free edge is the panel's max y: centre sits
  // inset + radius above it
  assert.ok(Math.abs(frontMagnet!.at.y - (Math.max(...frontYs) - 8 - 7)) < 1e-9)
  assert.equal(checkDieline(d).ok, true)
})

test("magnethinge: a magnet that does not fit the flap or the base wall is rejected", () => {
  // default flap height 40 fits 6 + 10 = 16; a 30 mm disc
  // with an 8 mm inset needs 38 mm of flap — fits; 45 does not
  assert.throws(
    () => generateDieline("magnethinge", CATALOGUE, { magnetDiameter: 30, magnetInset: 8, flapHeight: 37 }),
    /does not fit/,
  )
  const d = generateDieline("magnethinge", CATALOGUE, { magnetDiameter: 30, magnetInset: 8, flapHeight: 38 })
  assert.equal(checkDieline(d).ok, true)
})

test("magnethinge: the under-4 mm glue flap guard fires and clears at its stated boundary", () => {
  // a 2 mm magnet with a 1 mm inset (3 mm total) keeps the
  // magnet-fit guard out of the way at these extreme shares,
  // where the base wall is only ~5 mm tall
  const smallMagnet = { magnetDiameter: 2, magnetInset: 1 }
  // base flap reach = H x (1 - lidShare) at these sizes (the
  // span cap does not bind): 3.6 mm reach must throw, 4.2 mm
  // and 6 mm reaches must generate clean
  assert.throws(() => generateDieline("magnethinge", { length: 250, width: 200, height: 60, thickness: 1 }, { lidShare: 0.94, ...smallMagnet }), /under 4 mm/)
  for (const lidShare of [0.93, 0.9]) {
    const d = generateDieline("magnethinge", { length: 250, width: 200, height: 60, thickness: 1 }, { lidShare, ...smallMagnet })
    assert.equal(checkDieline(d).ok, true, `lidShare ${lidShare} should generate clean`)
  }
  // the same boundary on the lid side: lid flap reach =
  // H x lidShare — 3.6 mm must throw, 4.2 mm and 6.6 mm
  // must generate clean
  assert.throws(() => generateDieline("magnethinge", { length: 250, width: 200, height: 60, thickness: 1 }, { lidShare: 0.06, ...smallMagnet }), /under 4 mm/)
  for (const lidShare of [0.07, 0.11]) {
    const d = generateDieline("magnethinge", { length: 250, width: 200, height: 60, thickness: 1 }, { lidShare, ...smallMagnet })
    assert.equal(checkDieline(d).ok, true, `lidShare ${lidShare} should generate clean`)
  }
})

test("magnethinge: validation rejects a too-short box and an extreme lid share", () => {
  assert.throws(() => generateDieline("magnethinge", { length: 100, width: 100, height: 39, thickness: 1 }), /at least 40 mm/)
  assert.throws(() => generateDieline("magnethinge", CATALOGUE, { lidShare: 0.97 }), /lidShare/)
})

test("magnethinge: spec grid — generate + check clean, no degenerate panels, no crossings", () => {
  let n = 0
  for (const length of [60, 120, 250, 400])
    for (const width of [60, 120, 250, 400])
      for (const height of [40, 60, 100, 160])
        for (const thickness of [0.5, 2]) {
          const d = generateDieline("magnethinge", { length, width, height, thickness })
          const r = checkDieline(d)
          assert.deepEqual(r.failures, [], `${length}x${width}x${height} t${thickness}`)
          for (const p of d.panels) {
            assert.ok(p.width > 0 && p.height > 0, `degenerate panel ${p.id} at ${length}x${width}x${height} t${thickness}`)
          }
          n++
        }
  assert.equal(n, 128)
})

test("magnethinge: svg renders", () => {
  const svg = renderDielineSvg(generateDieline("magnethinge", CATALOGUE))
  assert.ok(svg.includes("<svg") && svg.length > 500)
})
