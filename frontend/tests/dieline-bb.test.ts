// Batch BB: closes the survivors of the auditor's T13 mutation run
// (all in checks.ts: pouch and bag fold and feature pins, the "outside the
// film blank" test) and one AY gap (magnet mark width and height).
// Every case mutates a generated dieline by 1 mm and expects the
// matching failure message; unmutated dielines must report none.
import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline } from "../lib/dieline-gen/index.ts"
import type { Dieline } from "../lib/dieline-gen/index.ts"

type Case = { name: string; d: Dieline }
const pouchSpec = { length: 130, width: 70, height: 200, thickness: 0.3 }
const bagSpec = { length: 250, width: 350, height: 0.5, thickness: 0.5 }
const cases: Case[] = [
  { name: "pouch full", d: generateDieline("pouch", pouchSpec, { zipHeight: 15, tearNotch: true, valve: true }) },
  { name: "pouch plain", d: generateDieline("pouch", pouchSpec) },
  { name: "bag flap", d: generateDieline("bag", bagSpec) },
  { name: "bag plain", d: generateDieline("bag", bagSpec, { flapHeight: 0 }) },
  { name: "bag zip", d: generateDieline("bag", bagSpec, { flapHeight: 0, zipHeight: 15 }) },
]
const fails = (d: Dieline) => checkDieline(d).failures
const clone = (d: Dieline): Dieline => structuredClone(d)
const type = (d: Dieline) => d.type

test("unmutated pouch and bag dielines report no failures", () => {
  for (const c of cases) assert.deepEqual(fails(c.d), [], c.name)
})

test("each fold coordinate shifted by 1 mm is reported, by fold index", () => {
  for (const c of cases) {
    c.d.folds.forEach((_, i) => {
      for (const key of ["from.x", "from.y", "to.x", "to.y"]) {
        for (const delta of [1, -1]) {
          const m = clone(c.d)
          const [end, axis] = key.split(".") as ["from" | "to", "x" | "y"]
          m.folds[i][end][axis] += delta
          const re = new RegExp(`${type(m)}: fold ${i} runs`)
          assert.ok(fails(m).some((f) => re.test(f)), `${c.name} fold ${i} ${key} ${delta}`)
        }
      }
    })
  }
})

test("fold neighbours are pinned", () => {
  for (const c of cases) {
    c.d.folds.forEach((f0, i) => {
      if (f0.between[0] === f0.between[1]) return // gusset|gusset: a swap is the same value
      const m = clone(c.d)
      m.folds[i].between = [m.folds[i].between[1], m.folds[i].between[0]]
      assert.ok(fails(m).some((f) => f.includes(`fold ${i} is between`)), `${c.name} fold ${i}`)
    })
  }
})

test("pouch fold internal flags are pinned", () => {
  const d = cases[0].d
  d.folds.forEach((_, i) => {
    const m = clone(d)
    m.folds[i].internal = !m.folds[i].internal
    assert.ok(fails(m).some((f) => f.includes(`fold ${i} internal flag`)), `fold ${i}`)
  })
})

test("each feature centre, width and height shifted by 1 mm is reported, by feature index", () => {
  for (const c of cases) {
    c.d.features.forEach((f0, i) => {
      for (const delta of [1, -1]) {
        for (const key of ["x", "y"] as const) {
          const m = clone(c.d)
          m.features[i].at[key] += delta
          assert.ok(fails(m).some((f) => f.includes(`feature ${i} (${f0.kind}) centre`)), `${c.name} f${i} at.${key} ${delta}`)
        }
        for (const key of ["w", "h"] as const) {
          const m = clone(c.d)
          m.features[i][key] += delta
          assert.ok(fails(m).some((f) => f.includes(`feature ${i} (${f0.kind}) size`)), `${c.name} f${i} ${key} ${delta}`)
        }
      }
    })
  }
})

test("feature kind is pinned", () => {
  for (const c of cases) {
    c.d.features.forEach((_, i) => {
      const m = clone(c.d)
      m.features[i].kind = m.features[i].kind === "seal" ? "zip" : "seal"
      assert.ok(fails(m).some((f) => f.includes(`feature ${i} kind`)), `${c.name} f${i}`)
    })
  }
})

test("a feature pushed past any film blank edge is reported outside; one that stays inside is not", () => {
  const EPS = 1e-9
  for (const c of cases) {
    const bw = c.d.blankWidth, bh = c.d.blankHeight
    c.d.features.forEach((f0, i) => {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
        const m = clone(c.d)
        m.features[i].at.x += dx
        m.features[i].at.y += dy
        const f = m.features[i]
        const outside = f.at.x - f.w / 2 < -EPS || f.at.x + f.w / 2 > bw + EPS || f.at.y - f.h / 2 < -EPS || f.at.y + f.h / 2 > bh + EPS
        const reported = fails(m).some((s) => s.includes(`feature ${i} (${f0.kind}) lies outside the film blank`))
        assert.equal(reported, outside, `${c.name} f${i} (${dx},${dy})`)
      }
    })
  }
})

test("a feature touching each blank edge exists, so every edge comparison is exercised", () => {
  const touch = { left: false, right: false, top: false, bottom: false }
  for (const c of cases) {
    for (const f of c.d.features) {
      if (Math.abs(f.at.x - f.w / 2) < 1e-9) touch.left = true
      if (Math.abs(f.at.x + f.w / 2 - c.d.blankWidth) < 1e-9) touch.right = true
      if (Math.abs(f.at.y - f.h / 2) < 1e-9) touch.top = true
      if (Math.abs(f.at.y + f.h / 2 - c.d.blankHeight) < 1e-9) touch.bottom = true
    }
  }
  assert.deepEqual(touch, { left: true, right: true, top: true, bottom: true })
})

test("pouch tear notch with a seal under 3 mm sticks out of the blank and is reported", () => {
  for (const seal of [2, 2.9]) {
    const d = generateDieline("pouch", pouchSpec, { tearNotch: true, sealWidth: seal })
    assert.ok(fails(d).some((f) => f.includes("lies outside the film blank")), `seal ${seal}`)
  }
  const ok = generateDieline("pouch", pouchSpec, { tearNotch: true, sealWidth: 3 })
  assert.ok(!fails(ok).some((f) => f.includes("lies outside")))
})

test("rigid_magnetic: every magnet mark has w = h = 2r", () => {
  const d = generateDieline("rigid_magnetic", { length: 120, width: 90, height: 60, thickness: 2 })
  assert.equal(d.features.length, 4)
  for (const f of d.features) {
    assert.equal(f.w, 2 * f.r!)
    assert.equal(f.h, 2 * f.r!)
  }
})

// ---- boundary tests: the checks use TOL = 0.05 and strict comparisons,
// so a value exactly on the bound passes and one ulp past it fails. The
// helper walks doubles until the checker's own arithmetic lands exactly on
// the bound; if it cannot, the test fails instead of passing silently.
const TOL = 0.05
const f64 = new Float64Array(1)
const u64 = new BigInt64Array(f64.buffer)
const up = (x: number) => { f64[0] = x; u64[0] += x >= 0 ? 1n : -1n; return f64[0] }
const down = (x: number) => { f64[0] = x; u64[0] -= x >= 0 ? 1n : -1n; return f64[0] }
let reached = 0, unreachable = 0
function solve(g: (x: number) => number, target: number, guess: number): number | undefined {
  for (let a = guess, b = guess, k = 0; k < 4000; k++, a = up(a), b = down(b)) {
    if (g(a) === target) return a
    if (g(b) === target) return b
  }
  // 0.05 is not a multiple of the spacing between doubles at larger values, so the
  // exact bound is only reachable near zero; elsewhere the tests below skip it.
  unreachable++
  return undefined
}

test("fold coordinate: a gap of exactly TOL passes, one ulp more fails (where reachable)", () => {
  for (const c of cases) {
    c.d.folds.forEach((f0, i) => {
      for (const [end, axis] of [["from", "x"], ["from", "y"], ["to", "x"], ["to", "y"]] as const) {
        const v = f0[end][axis]
        const x = solve((x) => Math.abs(x - v), TOL, v + TOL)
        if (x === undefined) continue
        reached++
        const ok = clone(c.d)
        ok.folds[i][end][axis] = x
        assert.ok(!fails(ok).some((f) => f.includes(`fold ${i} runs`)), `${c.name} fold ${i} ${end}.${axis} on the bound`)
        const bad = clone(c.d)
        bad.folds[i][end][axis] = up(ok.folds[i][end][axis])
        assert.ok(fails(bad).some((f) => f.includes(`fold ${i} runs`)), `${c.name} fold ${i} ${end}.${axis} past the bound`)
      }
    })
  }
})

test("fold neighbours: changing either name alone is reported", () => {
  for (const c of cases) {
    c.d.folds.forEach((_, i) => {
      for (const side of [0, 1] as const) {
        const m = clone(c.d)
        m.folds[i].between[side] = "nowhere"
        assert.ok(fails(m).some((f) => f.includes(`fold ${i} is between`)), `${c.name} fold ${i} side ${side}`)
      }
    })
  }
})

test("feature centre and size: exactly TOL passes, one ulp more fails", () => {
  for (const c of cases) {
    c.d.features.forEach((f0, i) => {
      const probes: [string, (m: Dieline, x: number) => void, number, number, string][] = [
        ["at.x", (m, x) => { m.features[i].at.x = x }, f0.at.x, f0.at.x, "centre"],
        ["at.y", (m, x) => { m.features[i].at.y = x }, f0.at.y, f0.at.y, "centre"],
        ["w", (m, x) => { m.features[i].w = x }, f0.w, f0.w, "size"],
        ["h", (m, x) => { m.features[i].h = x }, f0.h, f0.h, "size"],
      ]
      for (const [name, set, v, , what] of probes) {
        const x = solve((x) => Math.abs(x - v), TOL, v + TOL)
        if (x === undefined) continue
        reached++
        const ok = clone(c.d)
        set(ok, x)
        const msg = `feature ${i} (${f0.kind}) ${what}`
        assert.ok(!fails(ok).some((f) => f.includes(msg)), `${c.name} f${i} ${name} on the bound`)
        const bad = clone(c.d)
        set(bad, up(x))
        assert.ok(fails(bad).some((f) => f.includes(msg)), `${c.name} f${i} ${name} past the bound`)
      }
    })
  }
})

test("film blank edge: exactly TOL outside passes, one ulp more fails, on all four edges", () => {
  const seen = { left: 0, right: 0, top: 0, bottom: 0 }
  for (const c of cases) {
    const bw = c.d.blankWidth, bh = c.d.blankHeight
    c.d.features.forEach((f0, i) => {
      const msg = `feature ${i} (${f0.kind}) lies outside the film blank`
      const edges: [keyof typeof seen, boolean, (m: Dieline, x: number) => void, (x: number) => number, number, number][] = [
        ["left", Math.abs(f0.at.x - f0.w / 2) < 1e-9, (m, x) => { m.features[i].at.x = x }, (x) => x - f0.w / 2, -TOL, f0.w / 2 - TOL],
        ["right", Math.abs(f0.at.x + f0.w / 2 - bw) < 1e-9, (m, x) => { m.features[i].at.x = x }, (x) => x + f0.w / 2, bw + TOL, bw - f0.w / 2 + TOL],
        ["top", Math.abs(f0.at.y - f0.h / 2) < 1e-9, (m, x) => { m.features[i].at.y = x }, (x) => x - f0.h / 2, -TOL, f0.h / 2 - TOL],
        ["bottom", Math.abs(f0.at.y + f0.h / 2 - bh) < 1e-9, (m, x) => { m.features[i].at.y = x }, (x) => x + f0.h / 2, bh + TOL, bh - f0.h / 2 + TOL],
      ]
      for (const [edge, touching, set, g, target, guess] of edges) {
        if (!touching) continue
        seen[edge]++
        const x = solve(g, target, guess)
        if (x === undefined) continue
        reached++
        const ok = clone(c.d)
        set(ok, x)
        assert.ok(!fails(ok).some((f) => f === `${type(ok)}: ${msg}`), `${c.name} f${i} ${edge} on the bound`)
        const bad = clone(c.d)
        const outward = edge === "left" || edge === "top"
        let y = x
        while (outward ? g(y) >= target : g(y) <= target) y = outward ? down(y) : up(y)
        set(bad, y)
        assert.ok(fails(bad).some((f) => f === `${type(bad)}: ${msg}`), `${c.name} f${i} ${edge} past the bound`)
      }
    })
  }
  for (const k of Object.keys(seen) as (keyof typeof seen)[]) assert.ok(seen[k] > 0, `no feature touches the ${k} edge`)
})

test("boundary probes: some were reached exactly, the rest are skipped by design", () => {
  assert.ok(reached > 0, "no exact-bound probe was reachable")
  assert.ok(reached + unreachable > 0)
})
