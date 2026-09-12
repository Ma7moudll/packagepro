import { test } from "node:test"
import assert from "node:assert/strict"
import {
  MM_UNIT,
  PX_PER_MM,
  TEXTURE_PX_PER_MM,
  MM_PER_CM,
  DPI_MIN,
  BLEED_MM,
  SAFE_MM,
  ZONE_MATCH_TOLERANCE_MM,
  mmToPx,
  pxToMm,
  pixelsAt,
  facePanel,
} from "../lib/editor/geometry/units.ts"

test("canonical constants (SPEC §6)", () => {
  assert.equal(MM_UNIT, "mm")
  assert.equal(PX_PER_MM, 3)
  assert.equal(TEXTURE_PX_PER_MM, 5)
  assert.equal(MM_PER_CM, 10)
  assert.equal(DPI_MIN, 300)
  assert.equal(BLEED_MM, 3)
  assert.equal(SAFE_MM, 5)
  assert.equal(ZONE_MATCH_TOLERANCE_MM, 5)
})

test("mmToPx conversion table (PX_PER_MM = 3)", () => {
  const table: Array<[number, number]> = [
    [115, 345],
    [38, 114],
    [70, 210],
    [3, 9],
    [5, 15],
    [10, 30],
    [100, 300],
    [0, 0],
  ]
  for (const [mm, px] of table) assert.equal(mmToPx(mm), px)

  // Math.round semantics on fractional mm inputs
  assert.equal(mmToPx(3.5), 11) // 10.5 rounds half-up to 11
  assert.equal(mmToPx(1.1), 3) // 3.3 -> 3
  assert.equal(mmToPx(1.4), 4) // 4.2 -> 4
})

test("pxToMm is the exact inverse at integer multiples", () => {
  assert.equal(pxToMm(345), 115)
  assert.equal(pxToMm(210), 70)
  assert.equal(pxToMm(114), 38)
  assert.equal(pxToMm(9), 3)
  assert.equal(pxToMm(15), 5)
  assert.equal(pxToMm(0), 0)
})

test("pixelsAt uses dpi/25.4 per mm and rounds", () => {
  assert.equal(pixelsAt(115, 300), 1358) // 115×300/25.4 = 1358.27
  assert.equal(pixelsAt(30, 300), 354) // 30×300/25.4 = 354.33
  assert.equal(pixelsAt(210, 300), 2480) // 210×300/25.4 = 2480.31
  assert.equal(pixelsAt(10, 96), 38) // 10×96/25.4 = 37.79 -> 38
  assert.equal(pixelsAt(0, 300), 0)
})

const MAILER_DIMS = { length: 115, width: 70, height: 38 } // F42 mailer

test("facePanel mapping matrix (SPEC §7)", () => {
  const expectations: Array<[string, number, number]> = [
    ["front", 115, 38],
    ["back", 115, 38],
    ["inside_front", 115, 38],
    ["inside_back", 115, 38],
    ["left", 70, 38],
    ["right", 70, 38],
    ["inside_left", 70, 38],
    ["inside_right", 70, 38],
    ["top", 115, 70],
    ["bottom", 115, 70],
    ["inside_top", 115, 70],
    ["inside_bottom", 115, 70],
    ["flap", 115, 38], // unknown face falls back to front-face geometry
  ]
  for (const [faceId, w, h] of expectations) {
    assert.deepEqual(facePanel(MAILER_DIMS, faceId), { w, h }, `facePanel("${faceId}")`)
  }
})

test("F42 front face renders exactly 345 × 114 logical px (M8-PLAN AC §1)", () => {
  const { w, h } = facePanel(MAILER_DIMS, "front")
  assert.equal(mmToPx(w), 345)
  assert.equal(mmToPx(h), 114)
})