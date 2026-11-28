// Batch T13 — pouch: the stand-up pouch / doypack group
// (stand_up_pouch, doypack_pouch, compostable_doypack,
// recyclable_doypack, doypack_valve) as a FLAT FILM
// PATTERN — one web folded: back panel, bottom gusset
// strip with a centre crease, front panel. Not a board
// dieline. Every seal width, zip height and valve size
// is a stated parameter, not a verified value.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, renderDielineSvg } from "../lib/dieline-gen/index.ts"

// catalogue id -> [L, W (gusset depth), H]; film thickness is a
// stated nominal 0.5 — the catalogue states no film thickness.
const PRODUCTS: [string, number, number, number, object][] = [
  ["stand_up_pouch", 150, 50, 220, {}],
  ["doypack_pouch", 150, 80, 220, {}],
  ["compostable_doypack", 150, 80, 220, {}],
  ["recyclable_doypack", 150, 80, 220, {}],
  ["doypack_valve", 150, 80, 220, { valve: true }],
]

test("pouch: all five catalogue products generate and check clean as flat film patterns", () => {
  for (const [id, L, W, H, opts] of PRODUCTS) {
    const d = generateDieline("pouch", { length: L, width: W, height: H, thickness: 0.5 }, opts)
    const r = checkDieline(d)
    assert.deepEqual(r.failures, [], id)
    assert.equal(d.panels.length, 3, id)
    assert.equal(d.folds.length, 3, id)
    assert.equal(d.blankWidth, L, id)
    assert.equal(d.blankHeight, 2 * H + W, id)
    assert.deepEqual(
      { length: r.foldedInternal.length, width: r.foldedInternal.width, height: r.foldedInternal.height },
      { length: L, width: W, height: H },
      id,
    )
    const seals = d.features.filter((f) => f.kind === "seal")
    assert.equal(seals.length, 5, id)
  }
})

test("pouch: the valve product carries exactly one valve feature on the front panel", () => {
  const d = generateDieline("pouch", { length: 150, width: 80, height: 220, thickness: 0.5 }, { valve: true })
  const valves = d.features.filter((f) => f.kind === "valve")
  assert.equal(valves.length, 1)
  // front panel starts at H + W = 300; valve centre a stated
  // quarter of the panel height below its top edge
  assert.deepEqual(valves[0].at, { x: 75, y: 300 + 55 })
  assert.equal(valves[0].w, 20)
  assert.equal(valves[0].h, 20)
})

test("pouch: zip strips sit inside the top seals, tear notches in the side seals", () => {
  const d = generateDieline("pouch", { length: 150, width: 80, height: 220, thickness: 0.5 }, { zipHeight: 15, tearNotch: true })
  assert.equal(checkDieline(d).ok, true)
  const zips = d.features.filter((f) => f.kind === "zip")
  assert.equal(zips.length, 2)
  // back zip: centre at sealWidth (10) + zip/2 below the top edge
  assert.deepEqual(zips[0].at, { x: 75, y: 17.5 })
  assert.equal(zips[0].w, 130) // L - 2 * sealWidth: the zip runs between the side seals
  assert.equal(zips[0].h, 15)
  const notches = d.features.filter((f) => f.kind === "notch")
  assert.equal(notches.length, 2)
  assert.deepEqual(notches[0].at, { x: 5, y: 5 })
})

test("pouch: stated-parameter guards reject seals and closures that do not fit", () => {
  const spec = { length: 150, width: 50, height: 220, thickness: 0.5 }
  assert.throws(() => generateDieline("pouch", { length: 90, width: 50, height: 220, thickness: 0.5 }, { sealWidth: 46 }), /side seals would overlap/)
  assert.throws(() => generateDieline("pouch", { length: 150, width: 30, height: 220, thickness: 0.5 }, { sealWidth: 40 }), /wider than the gusset/)
  assert.throws(() => generateDieline("pouch", spec, { zipHeight: 100 }), /does not fit/)
  assert.equal(generateDieline("pouch", spec, { zipHeight: 99 }).type, "pouch")
  assert.throws(() => generateDieline("pouch", { length: 150, width: 50, height: 150, thickness: 0.5 }, { valve: true, valveSize: 100 }), /valve does not fit/)
})

test("pouch: spec grid — generate + check clean, seals inside the film", () => {
  let n = 0
  for (const length of [80, 150, 300])
    for (const width of [30, 50, 80])
      for (const height of [100, 220, 350])
        for (const thickness of [0.3, 0.5, 2]) {
          const d = generateDieline("pouch", { length, width, height, thickness })
          assert.deepEqual(checkDieline(d).failures, [], `${length}x${width}x${height} t${thickness}`)
          for (const f of d.features) {
            assert.ok(f.at.x - f.w / 2 >= 0 && f.at.x + f.w / 2 <= d.blankWidth, "feature inside film width")
            assert.ok(f.at.y - f.h / 2 >= 0 && f.at.y + f.h / 2 <= d.blankHeight, "feature inside film height")
          }
          n++
        }
  assert.equal(n, 81)
})

test("pouch: svg renders", () => {
  const d = generateDieline("pouch", { length: 150, width: 80, height: 220, thickness: 0.5 }, { valve: true })
  const svg = renderDielineSvg(d)
  assert.ok(svg.includes("<svg") && svg.length > 200)
})

test("pouch: guard boundaries — just inside each stated limit generates, and tiny zips still count", () => {
  // seal * 2 vs L: 2 x 46 = 92 < 110 generates (a 2.5 multiplier would throw)
  assert.equal(generateDieline("pouch", { length: 110, width: 50, height: 220, thickness: 0.5 }, { sealWidth: 46 }).type, "pouch")
  // a sub-millimetre zip is still a zip: two zip features appear
  const d = generateDieline("pouch", { length: 150, width: 80, height: 220, thickness: 0.5 }, { zipHeight: 0.4 })
  assert.equal(d.features.filter((f) => f.kind === "zip").length, 2)
  assert.equal(checkDieline(d).ok, true)
  // ...and the fit guard still applies to it: seal 50 + zip 0.4 >= H/2 = 50 on a 100 mm panel throws
  assert.throws(() => generateDieline("pouch", { length: 150, width: 50, height: 100, thickness: 0.5 }, { sealWidth: 50, zipHeight: 0.4 }), /does not fit/)
  // valve fit boundary: 100 <= H/2 = 110 generates (a 2.5 divisor would throw)
  const v = generateDieline("pouch", { length: 150, width: 80, height: 220, thickness: 0.5 }, { valve: true, valveSize: 100 })
  assert.equal(v.features.filter((f) => f.kind === "valve").length, 1)
  assert.equal(checkDieline(v).ok, true)
})
