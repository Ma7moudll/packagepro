import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import {
  BLEED_MM,
  SAFE_MM,
  ZONE_MATCH_TOLERANCE_MM,
  mmToPx,
  pxToMm,
  facePanel,
} from "../lib/editor/geometry/units.ts"
import {
  PrintValidationService,
  layerBoundsMm,
  checkElementExtendsBeyondBleed,
  checkElementWithinSafeArea,
  checkForOverlaps,
} from "../lib/editor/services/print-validation.ts"

// M8-F: Unified Frontend Geometry Validation — UX mirror (M8_SPEC §11, M8_PLAN M8-F).
//
//   A  bleed: layer edge 2.5mm inside the trim fails; 3.5mm beyond passes
//   B  safe: layer edge crossing the 5mm safe line fails; 5.5mm passes
//   C  overlap: two intersecting layers report an overlap; separated by >0 pass
//   D  zone: anchor within ZONE_MATCH_TOLERANCE_MM labels the required zone satisfied
//   E  engine: validatePerFace covers all faces, inside_* via the outer-sibling fallback
//   F  AMENDMENT 4: geometry-only rules; no FE authority claim (no DPI/CMYK/font/file)
//
// Fixture: F42 mailer (115x70x38mm), PX_PER_MM = 3.

const MAILER = { length: 115, width: 70, height: 38 }
const FACES = [
  { id: "front", name: "Front" },
  { id: "back", name: "Back" },
  { id: "left", name: "Left" },
  { id: "right", name: "Right" },
  { id: "top", name: "Top" },
  { id: "bottom", name: "Bottom" },
  { id: "inside_front", name: "Inside Front" },
  { id: "inside_back", name: "Inside Back" },
  { id: "inside_left", name: "Inside Left" },
  { id: "inside_right", name: "Inside Right" },
  { id: "inside_top", name: "Inside Top" },
  { id: "inside_bottom", name: "Inside Bottom" },
]

const FRONT_W = facePanel(MAILER, "front").w // 115
const FRONT_H = facePanel(MAILER, "front").h // 38

/** Layer whose right edge sits `gapMm` inside the front trim (negative = beyond). */
function rightEdgeLayer(gapMm: number, widthMm = 20, topMm = 10, heightMm = 18): any {
  const rightPx = mmToPx(FRONT_W - gapMm)
  return {
    id: "l",
    faceId: "front",
    position: { x: rightPx - mmToPx(widthMm), y: mmToPx(topMm) },
    width: mmToPx(widthMm),
    height: mmToPx(heightMm),
    scale: { x: 1, y: 1 },
  }
}

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8")
}

test("A: bleed — edge 2.5mm inside fails, 3.5mm beyond passes", () => {
  // Pure mm helper.
  const inside = { left: 92.5, top: 10, right: 112.5, bottom: 28 }
  assert.equal(checkElementExtendsBeyondBleed(inside, FRONT_W, FRONT_H), false)
  const beyond = { left: 98.5, top: 10, right: 118.5, bottom: 28 }
  assert.equal(checkElementExtendsBeyondBleed(beyond, FRONT_W, FRONT_H), true)

  // Engine (px layer → pxToMm).
  const fail = layerBoundsMm(rightEdgeLayer(2.5))
  assert.equal(checkElementExtendsBeyondBleed(fail, FRONT_W, FRONT_H), false)
  const pass = layerBoundsMm(rightEdgeLayer(-3.5))
  assert.equal(checkElementExtendsBeyondBleed(pass, FRONT_W, FRONT_H), true)

  // Deep-interior element needs no bleed.
  const deep = layerBoundsMm({
    id: "d",
    faceId: "front",
    position: { x: mmToPx(30), y: mmToPx(10) },
    width: mmToPx(10),
    height: mmToPx(10),
    scale: { x: 1, y: 1 },
  })
  assert.equal(checkElementExtendsBeyondBleed(deep, FRONT_W, FRONT_H), true)
})

test("B: safe — edge crossing the 5mm safe line fails, 5.5mm passes", () => {
  // Edge exactly on the safe line (gap = SAFE_MM) fails.
  const onLine = { left: 95, top: 13, right: 110, bottom: 25 }
  assert.equal(checkElementWithinSafeArea(onLine, FRONT_W, FRONT_H), false)
  // 5.5mm passes.
  const inside = { left: 95, top: 13, right: 109.5, bottom: 25 }
  assert.equal(checkElementWithinSafeArea(inside, FRONT_W, FRONT_H), true)
  // Centered element passes on every side.
  const centered = { left: 40, top: 10, right: 75, bottom: 28 }
  assert.equal(checkElementWithinSafeArea(centered, FRONT_W, FRONT_H), true)

  const failLayer = rightEdgeLayer(5, 10, 13, 12)
  const passLayer = rightEdgeLayer(5.5, 10, 13, 12)
  assert.equal(checkElementWithinSafeArea(layerBoundsMm(failLayer), FRONT_W, FRONT_H), false)
  assert.equal(checkElementWithinSafeArea(layerBoundsMm(passLayer), FRONT_W, FRONT_H), true)
})

test("C: overlap — intersecting layers report an overlap, separated by >0 pass", () => {
  const a = { left: 45, top: 14, right: 55, bottom: 24 }
  const b = { left: 48, top: 14, right: 58, bottom: 24 }
  assert.equal(checkForOverlaps([a, b]), true)
  const separated = { left: 56, top: 14, right: 66, bottom: 24 }
  assert.equal(checkForOverlaps([a, separated]), false)
  // Touching edges are not an intersection.
  const touching = { left: 55, top: 14, right: 65, bottom: 24 }
  assert.equal(checkForOverlaps([a, touching]), false)
})

test("D: zone — anchor within ZONE_MATCH_TOLERANCE_MM labels the required zone satisfied", async () => {
  const zones: Record<string, Array<{ label: string; required: boolean; position: [number, number, number] }>> = {
    front: [{ label: "Logo", required: true, position: [10, 10, 0] }],
  }
  const at7mm = {
    id: "z",
    faceId: "front",
    position: { x: mmToPx(7), y: mmToPx(8) },
    width: 0,
    height: 0,
    scale: { x: 1, y: 1 },
  }
  const faces = await PrintValidationService.validatePerFace([at7mm], { dimensions: MAILER, faces: FACES }, zones)
  const front = faces.find((f) => f.faceId === "front")!
  assert.equal(front.missingRequiredZones.length, 0, "|pxToMm(7)-10| <= 5 satisfies the anchor")

  assert.equal(Math.abs(pxToMm(mmToPx(7)) - 10) <= ZONE_MATCH_TOLERANCE_MM, true, "zones math uses pxToMm")
})

test("E: engine — all faces validated, inside_* via outer-sibling fallback", async () => {
  const bleedFail = rightEdgeLayer(2.5)
  bleedFail.id = "inside-bleed"
  bleedFail.faceId = "inside_front"
  const layers = [bleedFail]
  const faces = await PrintValidationService.validatePerFace(layers, { dimensions: MAILER, faces: FACES })
  assert.equal(faces.length, FACES.length, "one FaceValidationResult per canonical face")
  const insideFace = faces.find((f) => f.faceId === "inside_front")!
  assert.equal(insideFace.layerCount, 1, "inside_* layers are picked up")
  const bleedResult = insideFace.results.find((r) => r.rule.id === "bleed-area")!
  assert.equal(bleedResult.passed, false, "inside_* bounds come from the outer sibling via facePanel")

  const trim = facePanel(MAILER, "inside_front")
  assert.equal(trim.w, FRONT_W)
  assert.equal(trim.h, FRONT_H)

  const printReady = await PrintValidationService.validatePrintReady(layers, { dimensions: MAILER, faces: FACES })
  assert.equal(printReady.errors >= 1, true, "bleed failure is an error")
  assert.equal(printReady.printReady, false)
})

test("F: AMENDMENT 4 — geometry-only rules, no FE authority claim", () => {
  const ruleIds = PrintValidationService.getValidationRules().map((r) => r.id).sort()
  assert.deepEqual(ruleIds, ["bleed-area", "face-bounds", "overlapping-elements", "required-zones", "safe-area"])
  for (const r of PrintValidationService.getValidationRules()) {
    assert.equal(r.category, "layout", "M8-F rules are geometry/layout only")
  }

  const source = read("lib/editor/services/print-validation.ts")
  assert.equal(source.includes("SAFE_" + "MARGIN"), false)
  assert.equal(source.includes("BLEED_" + "MARGIN"), false)
  assert.equal(source.includes("3" + ".779"), false)
  assert.equal(source.includes("image-dpi"), false)
  assert.equal(source.includes("image-color-mode"), false)
  assert.equal(source.includes("text-size"), false)
  assert.equal(source.includes("file-size"), false)
  assert.equal(source.includes("MIN_DPI"), false)

  const panel = read("components/editor/panels/ValidationPanel.tsx")
  assert.equal(panel.includes("PrintValidationService.quickValidate(layers, model, canvas)"), true, "quick check feeds geometry")

  // Orphaned legacy duplicate validator (the old duplicate FE authority path) is gone.
  assert.throws(() => read("lib/editor/services/validation.ts"))
  assert.throws(() => read("components/editor/validation/ValidationPanel.tsx"))
})