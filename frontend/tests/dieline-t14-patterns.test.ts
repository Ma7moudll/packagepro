// Batch T14 — the curved and remaining flat-pattern
// groups: cup frustum wraps (cup, smoothie_cup), cylinder
// tube wraps (tube, tube_metal_lid), the paper carrier
// bag (paper_bag), the corrugated flat mailer
// (corrugated_envelope) and the flat disc (circle_label).
// All are FLAT PATTERNS, not production dielines, with no
// manufacturing claims. Curved edges are segmented
// polygons (the library's existing curve representation);
// every overlap, seam width, handle size, layout gap and
// segment count is a stated parameter, not a verified
// value.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, renderDielineSvg } from "../lib/dieline-gen/index.ts"

test("cup: both catalogue cups generate and check clean as frustum wrap patterns", () => {
  // [bottom diameter (L), top diameter (W), height] — stated field reading
  for (const [Db, Dt, H] of [[80, 90, 100], [90, 100, 150]]) {
    const d = generateDieline("cup", { length: Db, width: Dt, height: H, thickness: 1.5 })
    const r = checkDieline(d)
    assert.deepEqual(r.failures, [], `${Db}/${Dt}/${H}`)
    assert.equal(d.panels.length, 2) // wrap + seam tab
    assert.equal(d.folds.length, 1)
    assert.equal(d.features.length, 0)
    assert.ok(Math.abs(r.foldedInternal.length - Db) < 0.5, "bottom diameter recovered")
    assert.ok(Math.abs(r.foldedInternal.width - Dt) < 0.5, "top diameter recovered")
    assert.ok(Math.abs(r.foldedInternal.height - H) < 0.5, "height recovered")
  }
})

test("cup: guards reject a cylinder and an oversized seam tab", () => {
  assert.throws(() => generateDieline("cup", { length: 90, width: 90, height: 100, thickness: 1.5 }), /top diameter must exceed/)
  assert.throws(() => generateDieline("cup", { length: 50, width: 60, height: 60, thickness: 1.5 }, { seamOverlap: 96 }), /seam tab/)
})

test("cup: spec grid — generate + check clean", () => {
  let n = 0
  for (const Db of [50, 80, 120])
    for (const Dt of [70, 90, 150])
      for (const H of [60, 100, 200])
        for (const thickness of [0.5, 1.5]) {
          if (Dt <= Db) continue
          const d = generateDieline("cup", { length: Db, width: Dt, height: H, thickness })
          assert.deepEqual(checkDieline(d).failures, [], `${Db}/${Dt}/${H} t${thickness}`)
          n++
        }
  assert.equal(n, 36)
})

test("tube: both catalogue tubes generate and check clean as cylinder wrap patterns", () => {
  for (const id of ["tube", "tube_metal_lid"]) {
    const d = generateDieline("tube", { length: 80, width: 80, height: 200, thickness: 2 })
    const r = checkDieline(d)
    assert.deepEqual(r.failures, [], id)
    assert.equal(d.panels.length, 2) // wrap + seam tab
    assert.equal(d.folds.length, 1)
    const wrap = d.panels[0]
    assert.ok(Math.abs(wrap.width - Math.PI * 80) < 1e-6, "wrap width is the circumference")
    assert.ok(Math.abs(d.blankWidth - (Math.PI * 80 + 15)) < 1e-6, "blank adds the stated seam overlap 15")
    assert.ok(Math.abs(r.foldedInternal.length - 80) < 1e-6)
    assert.ok(Math.abs(r.foldedInternal.height - 200) < 1e-6)
  }
})

test("tube: spec grid — generate + check clean", () => {
  let n = 0
  for (const D of [40, 80, 150])
    for (const H of [50, 200, 400])
      for (const thickness of [0.5, 2]) {
        const d = generateDieline("tube", { length: D, width: D, height: H, thickness })
        assert.deepEqual(checkDieline(d).failures, [], `${D}/${H} t${thickness}`)
        n++
      }
  assert.equal(n, 18)
})

test("carrier: the paper carrier bag generates and checks clean with gussets, bottom seal and handle slots", () => {
  const d = generateDieline("carrier", { length: 250, width: 100, height: 300, thickness: 0.5 })
  const r = checkDieline(d)
  assert.deepEqual(r.failures, [])
  assert.equal(d.panels.length, 4) // gusset, front, gusset, back
  assert.equal(d.folds.length, 5) // 3 panel folds + 2 gusset creases
  assert.equal(d.blankWidth, 2 * 250 + 2 * 100)
  assert.equal(d.blankHeight, 300)
  const slots = d.features.filter((f) => f.kind === "slot")
  assert.equal(slots.length, 2)
  // front panel spans x 100..350; handle centre at its middle, stated inset 20 + height/2
  assert.deepEqual(slots[0].at, { x: 225, y: 32.5 })
  assert.equal(slots[0].w, 100)
  assert.equal(slots[0].h, 25)
  const seals = d.features.filter((f) => f.kind === "seal")
  assert.equal(seals.length, 1)
  assert.deepEqual(
    { length: r.foldedInternal.length, width: r.foldedInternal.width, height: r.foldedInternal.height },
    { length: 250, width: 100, height: 300 },
  )
})

test("carrier: guards reject handles that do not fit", () => {
  const spec = { length: 250, width: 100, height: 300, thickness: 0.5 }
  assert.throws(() => generateDieline("carrier", spec, { handleWidth: 260 }), /handle does not fit/)
  assert.throws(() => generateDieline("carrier", spec, { handleInset: 140, handleHeight: 25 }), /handle does not fit/)
})

test("carrier: spec grid — generate + check clean", () => {
  let n = 0
  for (const L of [150, 250, 400])
    for (const W of [60, 100, 160])
      for (const H of [200, 300, 450])
        for (const thickness of [0.3, 0.5]) {
          const d = generateDieline("carrier", { length: L, width: W, height: H, thickness })
          assert.deepEqual(checkDieline(d).failures, [], `${L}x${W}x${H} t${thickness}`)
          n++
        }
  assert.equal(n, 54)
})

test("pocket: the corrugated mailer generates and checks clean as a two-web flat pattern", () => {
  // catalogue 350 x 10 x 250 -> length 350, plan width 250, height = thickness = 10
  const d = generateDieline("pocket", { length: 350, width: 250, height: 10, thickness: 10 })
  const r = checkDieline(d)
  assert.deepEqual(r.failures, [])
  assert.equal(d.panels.length, 3) // flap, back, front (separate web)
  assert.equal(d.folds.length, 1) // flap to back only — the bottom is a seal, not a fold
  assert.equal(d.blankWidth, 350 + 10 + 350) // stated layout gap 10
  assert.equal(d.blankHeight, 40 + 250)
  const seals = d.features.filter((f) => f.kind === "seal")
  assert.equal(seals.length, 4) // two side seals + bottom seal + flap adhesive strip
  assert.deepEqual(
    { length: r.foldedInternal.length, width: r.foldedInternal.width, height: r.foldedInternal.height },
    { length: 350, width: 250, height: 10 },
  )
})

test("pocket: the thickness contract is enforced", () => {
  assert.throws(() => generateDieline("pocket", { length: 350, width: 250, height: 5, thickness: 2 }), /must equal thickness/)
})

test("pocket: spec grid — generate + check clean, seals inside the webs", () => {
  let n = 0
  for (const L of [150, 350, 500])
    for (const B of [120, 250, 400])
      for (const thickness of [0.5, 5, 10]) {
        const d = generateDieline("pocket", { length: L, width: B, height: thickness, thickness })
        assert.deepEqual(checkDieline(d).failures, [], `${L}x${B} t${thickness}`)
        for (const f of d.features) {
          assert.ok(f.at.x - f.w / 2 >= 0 && f.at.x + f.w / 2 <= d.blankWidth)
          assert.ok(f.at.y - f.h / 2 >= 0 && f.at.y + f.h / 2 <= d.blankHeight)
        }
        n++
      }
  assert.equal(n, 27)
})

test("disc: the circle label generates and checks clean as a segmented-polygon flat pattern", () => {
  // catalogue 50 x 1 x 50 -> diameter 50, height = thickness = 1
  const d = generateDieline("disc", { length: 50, width: 50, height: 1, thickness: 1 })
  const r = checkDieline(d)
  assert.deepEqual(r.failures, [])
  assert.equal(d.panels.length, 1)
  assert.equal(d.panels[0].polygon.length, 48) // stated arcSegments default
  assert.equal(d.blankWidth, 50)
  assert.equal(d.blankHeight, 50)
  assert.deepEqual(
    { length: r.foldedInternal.length, width: r.foldedInternal.width, height: r.foldedInternal.height },
    { length: 50, width: 50, height: 1 },
  )
})

test("disc: the thickness contract is enforced and the grid is clean", () => {
  assert.throws(() => generateDieline("disc", { length: 50, width: 50, height: 2, thickness: 1 }), /must equal thickness/)
  let n = 0
  for (const D of [25, 50, 100, 200])
    for (const thickness of [0.3, 1, 2]) {
      const d = generateDieline("disc", { length: D, width: D, height: thickness, thickness })
      assert.deepEqual(checkDieline(d).failures, [], `${D} t${thickness}`)
      n++
    }
  assert.equal(n, 12)
})

test("all five types: svg renders", () => {
  const cases: [string, object, object][] = [
    ["cup", { length: 80, width: 90, height: 100, thickness: 1.5 }, {}],
    ["tube", { length: 80, width: 80, height: 200, thickness: 2 }, {}],
    ["carrier", { length: 250, width: 100, height: 300, thickness: 0.5 }, {}],
    ["pocket", { length: 350, width: 250, height: 10, thickness: 10 }, {}],
    ["disc", { length: 50, width: 50, height: 1, thickness: 1 }, {}],
  ]
  for (const [type, spec, opts] of cases) {
    const svg = renderDielineSvg(generateDieline(type as never, spec as never, opts as never))
    assert.ok(svg.includes("<svg") && svg.length > 200, type)
  }
})

// Mutation hardening: the first full-oracle run left 7
// survivors, all guard-boundary literals — a changed
// divisor moves the guard threshold without touching the
// generated geometry, so each test below sits between the
// pristine threshold and the mutated one: it must generate
// on the shipped code and throw under the mutant.
test("hardening: cup seam guard boundary (theta / 2) is pinned", () => {
  // 50/60/60: theta = 0.522, alpha = 0.235 at seamOverlap 85 —
  // below theta/2 = 0.261 (pristine passes) but above
  // theta/2.5 = 0.209 and theta/5 = 0.104 (mutants throw)
  const d = generateDieline("cup", { length: 50, width: 60, height: 60, thickness: 1.5 }, { seamOverlap: 85 })
  assert.deepEqual(checkDieline(d).failures, [])
})

test("hardening: cup seam tab keeps at least one step at a tiny overlap", () => {
  // seamOverlap 1 on 80/90/100 rounds the tab to 0 steps, so
  // the Math.max(1, ...) floor decides the tab: 1 step on the
  // shipped code, 1.5 under the mutant, which moves the tab
  const d = generateDieline("cup", { length: 80, width: 90, height: 100, thickness: 1.5 }, { seamOverlap: 1 })
  assert.deepEqual(checkDieline(d).failures, [])
})

test("hardening: carrier handle guard boundary (H / 2) is pinned", () => {
  // inset 100 + height 40 = 140, below H/2 = 150 (pristine
  // passes) but above H/2.5 = 120 (mutant throws)
  const d = generateDieline("carrier", { length: 250, width: 100, height: 300, thickness: 0.5 }, { handleInset: 100, handleHeight: 40 })
  assert.deepEqual(checkDieline(d).failures, [])
})

test("hardening: pocket side-seal guard boundary (seal * 2) is pinned", () => {
  // L 35 with seal 15: 2*seal = 30 < 35 (pristine passes) but
  // 2.5*seal = 37.5 and 5*seal = 75 (mutants throw)
  const d = generateDieline("pocket", { length: 35, width: 250, height: 10, thickness: 10 }, { sealWidth: 15 })
  assert.deepEqual(checkDieline(d).failures, [])
})

test("hardening: pocket flap guard boundary (B / 2) is pinned", () => {
  // flapHeight 110 on B 250: below B/2 = 125 (pristine passes)
  // but above B/2.5 = 100 (mutant throws)
  const d = generateDieline("pocket", { length: 350, width: 250, height: 10, thickness: 10 }, { flapHeight: 110 })
  assert.deepEqual(checkDieline(d).failures, [])
})
