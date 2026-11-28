// Batch T13 — bag: the flat sealed bag group
// (paper_mailer_bag, poly_mailer_bag, bio_poly_mailer_bag,
// frosted_ziplock_bag) as a FLAT FILM PATTERN — one blank
// folded at the bottom: optional peel flap, back panel,
// front panel. Not a board dieline. Spec contract (the
// T12 flat contract): length x width are the plan
// dimensions (bag width x bag length); height is the
// nominal filled thickness and must equal thickness.
// Every seal width, flap height and zip height is a
// stated parameter, not a verified value.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, renderDielineSvg } from "../lib/dieline-gen/index.ts"

// catalogue id -> [L (bag width), B (bag length), nominal thickness]
const MAILERS: [string, number, number, number][] = [
  ["paper_mailer_bag", 300, 400, 10],
  ["poly_mailer_bag", 300, 400, 5],
  ["bio_poly_mailer_bag", 300, 400, 5],
]

test("bag: the three mailer bags generate and check clean with the peel flap layout", () => {
  for (const [id, L, B, t] of MAILERS) {
    const d = generateDieline("bag", { length: L, width: B, height: t, thickness: t })
    const r = checkDieline(d)
    assert.deepEqual(r.failures, [], id)
    assert.equal(d.panels.length, 3, id) // flap, back, front
    assert.equal(d.folds.length, 2, id)
    assert.equal(d.blankWidth, L, id)
    assert.equal(d.blankHeight, 40 + 2 * B, id) // stated flapHeight default 40
    assert.deepEqual(
      { length: r.foldedInternal.length, width: r.foldedInternal.width, height: r.foldedInternal.height },
      { length: L, width: B, height: t },
      id,
    )
    const seals = d.features.filter((f) => f.kind === "seal")
    assert.equal(seals.length, 3, id) // two side seals + the flap adhesive strip
  }
})

test("bag: the ziplock bag generates with no flap and zip strips at both top edges", () => {
  const d = generateDieline("bag", { length: 200, width: 300, height: 5, thickness: 5 }, { flapHeight: 0, zipHeight: 15 })
  const r = checkDieline(d)
  assert.deepEqual(r.failures, [])
  assert.equal(d.panels.length, 2)
  assert.equal(d.folds.length, 1) // the bottom fold only
  assert.equal(d.blankHeight, 600)
  const zips = d.features.filter((f) => f.kind === "zip")
  assert.equal(zips.length, 2)
  assert.deepEqual(zips[0].at, { x: 100, y: 17.5 }) // sealWidth 10 + zip/2 below the back's top edge
  assert.equal(zips[0].w, 180) // L - 2 * sealWidth
  const seals = d.features.filter((f) => f.kind === "seal")
  assert.equal(seals.length, 4) // two side seals + two top seals
})

test("bag: the flap adhesive strip sits on the free half of the flap", () => {
  const d = generateDieline("bag", { length: 300, width: 400, height: 10, thickness: 10 })
  const adh = d.features.filter((f) => f.kind === "seal")[2]
  assert.deepEqual(adh.at, { x: 150, y: 10 }) // free half of the flap (flapHeight 40): y 0 to 20, the fold-side half is left for the label
  assert.equal(adh.w, 280) // L - 2 * sealWidth
  assert.equal(adh.h, 20) // flapHeight / 2
})

test("bag: the thickness contract and the closure guards are enforced", () => {
  assert.throws(() => generateDieline("bag", { length: 300, width: 400, height: 5, thickness: 2 }), /must equal thickness/)
  assert.throws(() => generateDieline("bag", { length: 300, width: 400, height: 10, thickness: 10 }, { zipHeight: 15 }), /one closure/)
  assert.throws(() => generateDieline("bag", { length: 300, width: 400, height: 10, thickness: 10 }, { flapHeight: 250 }), /flap is longer/)
  assert.throws(() => generateDieline("bag", { length: 90, width: 400, height: 10, thickness: 10 }, { sealWidth: 46 }), /side seals would overlap/)
})

test("bag: spec grid — both layouts generate + check clean, seals inside the film", () => {
  let n = 0
  for (const length of [100, 200, 300])
    for (const B of [150, 300, 400])
      for (const thickness of [0.5, 5])
        for (const opts of [{}, { flapHeight: 0, zipHeight: 15 }]) {
          const d = generateDieline("bag", { length, width: B, height: thickness, thickness }, opts)
          assert.deepEqual(checkDieline(d).failures, [], `${length}x${B} t${thickness} ${JSON.stringify(opts)}`)
          for (const f of d.features) {
            assert.ok(f.at.x - f.w / 2 >= 0 && f.at.x + f.w / 2 <= d.blankWidth)
            assert.ok(f.at.y - f.h / 2 >= 0 && f.at.y + f.h / 2 <= d.blankHeight)
          }
          n++
        }
  assert.equal(n, 36)
})

test("bag: svg renders", () => {
  const d = generateDieline("bag", { length: 300, width: 400, height: 10, thickness: 10 })
  const svg = renderDielineSvg(d)
  assert.ok(svg.includes("<svg") && svg.length > 200)
})

test("bag: guard boundaries — just inside each stated limit generates, and tiny closures still count", () => {
  // seal * 2 vs L: 2 x 46 = 92 < 110 generates (a 2.5 multiplier would throw)
  assert.equal(generateDieline("bag", { length: 110, width: 400, height: 10, thickness: 10 }, { sealWidth: 46 }).type, "bag")
  // a sub-millimetre flap is still a flap: three panels, flap layout
  const f = generateDieline("bag", { length: 300, width: 400, height: 10, thickness: 10 }, { flapHeight: 0.4 })
  assert.equal(f.panels.length, 3)
  assert.equal(checkDieline(f).ok, true)
  // ...and it still excludes a zip, however small, and vice versa
  assert.throws(() => generateDieline("bag", { length: 300, width: 400, height: 10, thickness: 10 }, { flapHeight: 0.4, zipHeight: 15 }), /one closure/)
  assert.throws(() => generateDieline("bag", { length: 300, width: 400, height: 10, thickness: 10 }, { flapHeight: 40, zipHeight: 0.4 }), /one closure/)
  // flap length boundary: 180 <= B/2 = 200 generates (a 2.5 divisor would throw)
  assert.equal(generateDieline("bag", { length: 300, width: 400, height: 10, thickness: 10 }, { flapHeight: 180 }).type, "bag")
  // zip fit boundary: seal 10 + zip 85 = 95 < B/2 = 100 generates (a 2.5 divisor would throw)
  const z = generateDieline("bag", { length: 200, width: 200, height: 5, thickness: 5 }, { flapHeight: 0, zipHeight: 85 })
  assert.equal(z.features.filter((x) => x.kind === "zip").length, 2)
  assert.equal(checkDieline(z).ok, true)
  // a sub-millimetre zip still places both zip strips, and the fit guard still applies to it
  const tz = generateDieline("bag", { length: 200, width: 300, height: 5, thickness: 5 }, { flapHeight: 0, zipHeight: 0.4 })
  assert.equal(tz.features.filter((x) => x.kind === "zip").length, 2)
  assert.throws(() => generateDieline("bag", { length: 150, width: 100, height: 5, thickness: 5 }, { flapHeight: 0, sealWidth: 50, zipHeight: 0.4 }), /does not fit/)
})
