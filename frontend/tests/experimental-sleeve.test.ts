import { test } from "node:test"
import assert from "node:assert/strict"
import { generateExperimentalSleeve, foldExperimentalSleeve, experimentalSleeveSvg } from "../lib/box-generator/experimental/sleeve.ts"
const input = { length: 195, width: 60, height: 265, unit: "mm" as const, glueFlap: 20, caliperMm: 0.5 }
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)

test("original sleeve blank includes four walls, physical glue flap and exactly four creases", () => {
  const s = generateExperimentalSleeve(input)
  assert.deepEqual(s.panels.map(p => p.width), [195, 60, 195, 60, 20])
  assert.deepEqual(s.creases.map(c => c.x), [195, 255, 450, 510])
  assert.deepEqual(s.blank, { width: 530, height: 265 })
  assert.equal(s.cut.length, 6)
  assert.ok(s.cut.every(p => p.x >= 0 && p.y >= 0 && p.x <= s.blank.width && p.y <= s.blank.height))
  assert.equal(s.productionApproved, false)
  assert.equal(s.compensationApplied, false)
  assert.equal(s.dimensionBasis, "score-to-score")
  assert.match(s.warnings.join(" "), /NOT calculated/)
})
test("mm, cm and inch normalize the complete blank, but caliperMm remains mm", () => {
  const mm = generateExperimentalSleeve({ ...input, length: 127, width: 50.8, height: 254, glueFlap: 12.7 })
  const cm = generateExperimentalSleeve({ ...input, length: 12.7, width: 5.08, height: 25.4, glueFlap: 1.27, unit: "cm" })
  const inch = generateExperimentalSleeve({ ...input, length: 5, width: 2, height: 10, glueFlap: 0.5, unit: "inch" })
  for (const s of [cm, inch]) {
    near(s.blank.width, mm.blank.width); near(s.blank.height, mm.blank.height)
    near(s.glueFlapMm, mm.glueFlapMm); near(s.caliperMm, 0.5)
  }
})
test("dimensions regenerate every panel position and cut/crease coordinate", () => {
  const s = generateExperimentalSleeve({ ...input, length: 100, width: 30, height: 80, glueFlap: 10 })
  assert.deepEqual(s.creases.map(c => c.x), [100, 130, 230, 260])
  assert.deepEqual(s.blank, { width: 270, height: 80 })
  assert.deepEqual(s.cut[2], { x: 270, y: 5 })
  assert.deepEqual(s.cut[3], { x: 270, y: 75 })
})
test("invalid dimensions, units, glue, caliper and progress fail instead of clamping", () => {
  for (const value of [0, -1, 4.9, 2001, NaN, Infinity, -Infinity]) {
    for (const key of ["length", "width", "height"]) assert.throws(() => generateExperimentalSleeve({ ...input, [key]: value }), RangeError)
  }
  for (const value of [0, -1, 31, NaN, Infinity]) assert.throws(() => generateExperimentalSleeve({ ...input, glueFlap: value }), RangeError)
  for (const value of [0, -1, 7, NaN, Infinity]) assert.throws(() => generateExperimentalSleeve({ ...input, caliperMm: value }), RangeError)
  // Runtime consumers can bypass TypeScript.
  assert.throws(() => generateExperimentalSleeve({ ...input, unit: "px" as "mm" }), RangeError)
  assert.throws(() => generateExperimentalSleeve({ ...input, length: "195" as unknown as number }), RangeError)
  for (const value of [-1, 1.01, NaN, Infinity]) assert.throws(() => foldExperimentalSleeve(generateExperimentalSleeve(input), value), RangeError)
})
test("fold chain keeps hinge endpoints attached at 101 progress samples", () => {
  const s = generateExperimentalSleeve(input)
  for (let step = 0; step <= 100; step++) {
    const faces = foldExperimentalSleeve(s, step / 100)
    for (let i = 1; i < faces.length; i++) {
      const prev = faces[i - 1].points
      const next = faces[i].points
      for (const axis of ["x", "y", "z"] as const) {
        near(prev[1][axis], next[0][axis]); near(prev[2][axis], next[3][axis])
      }
    }
  }
})
test("fully folded wall loop closes across a deterministic dimension sweep", () => {
  for (const length of [5, 30, 195, 999, 2000]) for (const width of [5, 60, 500]) for (const height of [5, 265, 2000]) {
    const s = generateExperimentalSleeve({ ...input, length, width, height, glueFlap: Math.min(length, width) / 3, caliperMm: 0.2 })
    const faces = foldExperimentalSleeve(s, 1)
    for (const axis of ["x", "y", "z"] as const) {
      near(faces[3].points[1][axis], faces[0].points[0][axis])
      near(faces[3].points[2][axis], faces[0].points[3][axis])
    }
    // Glue overlaps first wall; both open ends remain uncapped.
    near(faces[4].points[1].z, 0)
    near(faces[4].points[1].x, s.glueFlapMm)
    assert.equal(faces.length, 5)
  }
})
test("flat fold matches the original cut blank, including bevelled glue", () => {
  const s = generateExperimentalSleeve(input)
  const faces = foldExperimentalSleeve(s, 0)
  for (let i = 0; i < faces.length; i++) {
    near(faces[i].points[0].x, s.panels[i].x)
    assert.ok(faces[i].points.every(p => p.z === 0))
  }
  assert.deepEqual(faces[4].points[1], { x: s.cut[2].x, y: s.cut[2].y, z: 0 })
})
test("SVG is physical mm review geometry with one cut contour and separate creases", () => {
  const s = generateExperimentalSleeve(input)
  const svg = experimentalSleeveSvg(s)
  assert.match(svg, /width="530mm" height="265mm" viewBox="0 0 530 265"/)
  assert.equal((svg.match(/<path /g) || []).length, 5)
  assert.match(svg, /id="CUT"/); assert.match(svg, /id="CREASE"/)
  assert.match(svg, /not production approved/)
  assert.match(svg, /L530 10 L530 255 L510 265 L0 265 Z/)
  assert.equal(svg, experimentalSleeveSvg(generateExperimentalSleeve(input)))
})
test("caliper is recorded rather than silently changing geometry", () => {
  const s = generateExperimentalSleeve(input)
  const thicker = generateExperimentalSleeve({ ...input, caliperMm: 1 })
  assert.deepEqual(s.cut, thicker.cut)
  assert.deepEqual(s.creases, thicker.creases)
  assert.notEqual(s.caliperMm, thicker.caliperMm)
})

test("cut contour is simple and has positive area, without cutting any crease", () => {
  for (const length of [5, 195, 2000]) for (const width of [5, 60, 2000]) for (const height of [5, 265, 2000]) {
    const s = generateExperimentalSleeve({ ...input, length, width, height, glueFlap: Math.min(length, width) / 2, caliperMm: 0.2 })
    const points = s.cut
    const cross = (a: typeof points[0], b: typeof points[0], c: typeof points[0]) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)
    let twiceArea = 0
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i+1)%points.length]
      twiceArea += a.x*b.y - b.x*a.y
      assert.ok(a.x !== b.x || a.y !== b.y, "no zero-length cut segments")
      for (let j = i+1; j < points.length; j++) {
        if (j === i+1 || (i === 0 && j === points.length-1)) continue
        const c = points[j], d = points[(j+1)%points.length]
        assert.ok(!(cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0), "nonadjacent cut segments do not intersect")
      }
    }
    const bevel = Math.min(s.glueFlapMm / 2, height / 4)
    near(twiceArea/2, s.blank.width*height - s.glueFlapMm*bevel)
    assert.equal(new Set(s.creases.map(c => c.x)).size, 4)
    for (const crease of s.creases) assert.ok(crease.x > 0 && crease.x < s.blank.width)
  }
})
