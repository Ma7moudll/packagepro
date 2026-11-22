import test from "node:test"
import assert from "node:assert/strict"
import { generateExperimentalAssembly, experimentalAssemblyPose, type AssemblyInput } from "../lib/box-generator/experimental/assembly.ts"
const example = (): AssemblyInput => ({ mailerMm: { length: 200, width: 150, height: 60 }, sleeve: { length: 206, width: 68, height: 110, glueFlap: 15, caliperMm: 0.5, unit: "mm" }, slideAxis: "width" })
const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`)

test("assembly keeps dimensions independent and never grants production/fit approval", () => {
  const input = example(), assembly = generateExperimentalAssembly(input)
  assert.equal(assembly.fitApproved, false); assert.equal(assembly.productionApproved, false)
  assert.deepEqual(assembly.nominalGapMm, { horizontal: 6, vertical: 8 })
  input.mailerMm.length = 900
  assert.equal(assembly.mailerMm.length, 200)
  assert.equal(assembly.sleeve.dimensions.length, 206)
})
test("slide direction selects correct cross section, without resizing the sleeve", () => {
  const a = generateExperimentalAssembly(example()), b = generateExperimentalAssembly({ ...example(), slideAxis: "length" })
  assert.equal(a.nominalGapMm.horizontal, 6); assert.equal(b.nominalGapMm.horizontal, 56)
  assert.deepEqual(a.sleeve, b.sleeve)
  assert.equal(a.axialMm, 150); assert.equal(b.axialMm, 200)
})
test("posed sleeve has exact specified cross section centered around the Mailer reference", () => {
  for (const slideAxis of ["length", "width"] as const) {
    const a = generateExperimentalAssembly({ ...example(), slideAxis }), pose = experimentalAssemblyPose(a, 0, 0)
    const points = pose.panels.slice(0, 4).flatMap(p => p.points)
    const xs = points.map(p => p.x), ys = points.map(p => p.y), zs = points.map(p => p.z)
    near(Math.max(...ys) - Math.min(...ys), 68); near((Math.max(...ys) + Math.min(...ys)) / 2, 30)
    near(Math.max(...xs) - Math.min(...xs), slideAxis === "length" ? 110 : 206)
    near(Math.max(...zs) - Math.min(...zs), slideAxis === "length" ? 206 : 110)
    near(Math.min(...xs) + Math.max(...xs), 0); near(Math.min(...zs) + Math.max(...zs), 0)
  }
})
test("rigid sleeve translation preserves every dimension, panel joins and glue bevel", () => {
  for (const slideAxis of ["length", "width"] as const) {
    const a = generateExperimentalAssembly({ ...example(), slideAxis })
    const start = experimentalAssemblyPose(a, 0, 0)
    for (let i = 0; i <= 100; i++) {
      const pose = experimentalAssemblyPose(a, i / 100, 0)
      pose.panels.forEach((panel, j) => panel.points.forEach((p, k) => {
        const q = start.panels[j].points[k]
        near(p.y, q.y)
        near(p.x - q.x, slideAxis === "length" ? pose.offsetMm : 0)
        near(p.z - q.z, slideAxis === "width" ? pose.offsetMm : 0)
      }))
      assert.equal(pose.panels.length, 5)
    }
  }
})
test("lid stays shut at every partial removal; full removal unlocks it", () => {
  const a = generateExperimentalAssembly(example())
  for (let i = 0; i < 100; i++) {
    const pose = experimentalAssemblyPose(a, i / 100, 1)
    assert.equal(pose.actualOpen, 0); assert.equal(pose.lidBlocked, true)
  }
  assert.equal(experimentalAssemblyPose(a, 1, 0.7).actualOpen, 0.7)
  assert.equal(experimentalAssemblyPose(a, 1, 0).lidBlocked, false)
})
test("full removal separates nominal axial intervals by a whole band depth", () => {
  for (const slideAxis of ["length", "width"] as const) for (const depth of [5, 80, 2000]) {
    const input = example(); input.slideAxis = slideAxis; input.sleeve.height = depth
    const a = generateExperimentalAssembly(input), pose = experimentalAssemblyPose(a, 1, 1)
    near(pose.axialSeparationMm, depth)
    assert.ok(pose.axialSeparationMm > 0)
  }
})
test("nonpositive nominal gaps are flagged, not converted into fit claims", () => {
  for (const span of [180, 200]) {
    const input = example(); input.sleeve.length = span
    const a = generateExperimentalAssembly(input)
    assert.equal(a.nominalOverlap, true); assert.equal(a.fitApproved, false)
    assert.equal(a.sleeve.dimensions.length, span)
  }
})
test("unit conversion applies only to sleeve inputs, not Mailer mm references", () => {
  const input = example(); input.sleeve = { ...input.sleeve, length: 20.6, width: 6.8, height: 11, glueFlap: 1.5, unit: "cm" }
  const a = generateExperimentalAssembly(input)
  near(a.sleeve.dimensions.length, 206); near(a.sleeve.dimensions.width, 68)
  assert.deepEqual(a.mailerMm, example().mailerMm)
})
test("invalid Mailer dimensions, sleeve dimensions, direction and poses fail closed", () => {
  for (const value of [NaN, Infinity, -1, 0, 19, 1001, "200"] as number[]) {
    const input = example(); input.mailerMm.length = value
    assert.throws(() => generateExperimentalAssembly(input), RangeError)
  }
  assert.throws(() => generateExperimentalAssembly({ ...example(), slideAxis: "height" as "length" }), RangeError)
  const input = example(); input.sleeve.width = 0
  assert.throws(() => generateExperimentalAssembly(input), RangeError)
  const a = generateExperimentalAssembly(example())
  for (const value of [-1, 1.01, NaN, Infinity, "0.5"] as number[]) {
    assert.throws(() => experimentalAssemblyPose(a, value, 0), RangeError)
    assert.throws(() => experimentalAssemblyPose(a, 0, value), RangeError)
  }
})
