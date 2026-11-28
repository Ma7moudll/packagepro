// Batch AY — closes the gaps the auditor's corrected AU mutation run
// found: magnet pocket coordinates (layout arithmetic only, no claim
// about closing), the 0.5 mm magnet-to-wall-edge margin boundary, the
// SVG legend height for 0, 1 and 2 legend lines, and the bleed > 0
// boundary.

import { test } from "node:test"
import assert from "node:assert/strict"
import { generateDieline, checkDieline, layoutLabels, renderDielineSvg, type Dieline } from "../lib/dieline-gen/index.ts"
import { rigidLidDepth } from "../lib/dieline-gen/rigid.ts"

const panel = (d: Dieline, id: string) => d.panels.find((p) => p.id === id)!
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} vs ${b}`)

// ---- (1) magnet pocket coordinates, independent arithmetic --------

function expectedMagnets(L: number, W: number, H: number, t: number) {
  const ld = rigidLidDepth(H)
  const baseWall = H + t
  const baseW = L + t
  const baseD = W + t
  const lidWall = ld + t
  const lidTopW = L + 2 * t + 2 + t
  const lidTopD = W + 2 * t + 2 + t
  const lidOx = baseW + 2 * baseWall + 10
  const off = baseW / 4
  const baseCx = baseWall + baseW / 2
  const lidCx = lidOx + lidWall + lidTopW / 2
  const baseY = baseWall + baseD + baseWall - ld / 2
  const lidY = lidWall + lidTopD + ld / 2
  return [
    { x: baseCx - off, y: baseY },
    { x: baseCx + off, y: baseY },
    { x: lidCx - off, y: lidY },
    { x: lidCx + off, y: lidY },
  ]
}

test("rigid_magnetic: literal magnet centres at 120x90x60 t2 (layout arithmetic only)", () => {
  const d = generateDieline("rigid_magnetic", { length: 120, width: 90, height: 60, thickness: 2 })
  const got = d.features.map((f) => `${f.at.x},${f.at.y}`).sort()
  assert.deepEqual(got, ["309.5,127", "309.5,127".replace("309.5", "370.5"), "92.5,207", "153.5,207"].sort())
})

test("rigid_magnetic: magnet centres match independent arithmetic at 4 sizes (base and lid y, x)", () => {
  for (const [L, W, H, t] of [[120, 90, 60, 2], [200, 150, 100, 3], [60, 40, 25, 0.5], [300, 250, 250, 1]] as const) {
    const d = generateDieline("rigid_magnetic", { length: L, width: W, height: H, thickness: t })
    const exp = expectedMagnets(L, W, H, t)
    assert.equal(d.features.length, 4)
    for (const e of exp) {
      const hit = d.features.find((f) => Math.abs(f.at.x - e.x) < 1e-9 && Math.abs(f.at.y - e.y) < 1e-9)
      assert.ok(hit, `no magnet at (${e.x}, ${e.y}) for ${L}x${W}x${H} t${t}`)
    }
  }
})

// ---- (2) 0.5 mm magnet-to-edge margin boundary --------------------

function marginFailures(id: "base-front" | "lid-front", gap: number): string[] {
  const d = generateDieline("rigid_magnetic", { length: 120, width: 90, height: 60, thickness: 2 })
  const wall = panel(d, id)
  const y0 = Math.min(...wall.polygon.map((v) => v.y))
  const y1 = Math.max(...wall.polygon.map((v) => v.y))
  const r = 5.1
  const ref = id === "base-front" ? y1 - rigidLidDepth(60) / 2 : y0 + rigidLidDepth(60) / 2
  const f = d.features.filter((x) => Math.abs(x.at.y - ref) < 1e-9)[0]
  // move the pocket so its top edge is `gap` mm inside the wall's top edge
  f.at = { x: f.at.x, y: y0 + r + gap }
  return checkDieline(d).failures.filter((m) => m.includes("within 0.5 mm of the wall edge"))
}
for (const id of ["base-front", "lid-front"] as const) {
  test(`magnet margin on ${id}: 0.45 mm inside the edge fails, 0.55 mm passes (top edge)`, () => {
    assert.equal(marginFailures(id, 0.45).length, 1)
    assert.equal(marginFailures(id, 0.55).length, 0)
  })
}
test("magnet margin on base-front: 0.45 vs 0.55 mm inside the bottom edge", () => {
  const run = (gap: number) => {
    const d = generateDieline("rigid_magnetic", { length: 120, width: 90, height: 60, thickness: 2 })
    const wall = panel(d, "base-front")
    const y1 = Math.max(...wall.polygon.map((v) => v.y))
    const f = d.features.find((x) => Math.abs(x.at.y - (y1 - rigidLidDepth(60) / 2)) < 1e-9)!
    f.at = { x: f.at.x, y: y1 - 5.1 - gap }
    return checkDieline(d).failures.filter((m) => m.includes("within 0.5 mm of the wall edge")).length
  }
  assert.equal(run(0.45), 1)
  assert.equal(run(0.55), 0)
})
test("magnet margin on the side edges: 0.45 vs 0.55 mm inside", () => {
  const run = (gap: number) => {
    const d = generateDieline("rigid_magnetic", { length: 120, width: 90, height: 60, thickness: 2 })
    const wall = panel(d, "base-front")
    const x0 = Math.min(...wall.polygon.map((v) => v.x))
    const y1 = Math.max(...wall.polygon.map((v) => v.y))
    const f = d.features.find((x) => Math.abs(x.at.y - (y1 - rigidLidDepth(60) / 2)) < 1e-9)!
    f.at = { x: x0 + 5.1 + gap, y: f.at.y }
    return checkDieline(d).failures.filter((m) => m.includes("within 0.5 mm of the wall edge")).length
  }
  assert.equal(run(0.45), 1)
  assert.equal(run(0.55), 0)
})

test("magnet margin on the right side edge: 0.45 vs 0.55 mm inside", () => {
  const run = (gap: number) => {
    const d = generateDieline("rigid_magnetic", { length: 120, width: 90, height: 60, thickness: 2 })
    const wall = panel(d, "base-front")
    const x1 = Math.max(...wall.polygon.map((v) => v.x))
    const y1 = Math.max(...wall.polygon.map((v) => v.y))
    const f = d.features.find((x) => Math.abs(x.at.y - (y1 - rigidLidDepth(60) / 2)) < 1e-9)!
    f.at = { x: x1 - 5.1 - gap, y: f.at.y }
    return checkDieline(d).failures.filter((m) => m.includes("within 0.5 mm of the wall edge")).length
  }
  assert.equal(run(0.45), 1)
  assert.equal(run(0.55), 0)
})

// ---- (3) SVG legend box height for 0, 1, 2 legend lines -----------

function viewBoxH(svg: string): number {
  return Number(svg.match(/viewBox="[^"]*? [^"]*? [^"]*? ([\d.]+)"/)![1])
}
test("svg height = blank + 2 x bleed + legend box ((n + 1) x 4.4 + 2 for n >= 1, 0 for n = 0), n = 0, 1, 2", () => {
  const cases: [string, Dieline, number][] = [
    ["flat", generateDieline("flat", { length: 210, width: 99, height: 0.4, thickness: 0.4 }), 0],
    ["rsc", generateDieline("rsc", { length: 120, width: 90, height: 100, thickness: 2 }), 1],
    ["rigid", generateDieline("rigid", { length: 120, width: 90, height: 60, thickness: 2 }), 2],
  ]
  for (const [name, d, n] of cases) {
    assert.equal(layoutLabels(d).legend.length, n, `${name} legend lines`)
    const legendBox = n > 0 ? (n + 1) * 4.4 + 2 : 0
    const expected = d.blankHeight + 2 * d.options.bleed + legendBox
    assert.ok(Math.abs(viewBoxH(renderDielineSvg(d)) - Math.round(expected * 100) / 100) < 0.011, `${name}: ${viewBoxH(renderDielineSvg(d))} vs ${expected}`)
  }
})

// ---- bleed > 0 boundary -------------------------------------------

test("svg bleed: 0 draws no bleed path, 0.1 draws one per piece", () => {
  const spec = { length: 120, width: 90, height: 60, thickness: 2 }
  const none = renderDielineSvg(generateDieline("rigid", spec, { bleed: 0 }))
  const some = renderDielineSvg(generateDieline("rigid", spec, { bleed: 0.1 }))
  const paths = (svg: string) => (svg.match(/<g id="bleed"[^>]*>([\s\S]*?)<\/g>/)![1].match(/<path /g) ?? []).length
  assert.equal(paths(none), 0)
  assert.equal(paths(some), 2)
})
