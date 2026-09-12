import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { DielineBlueprint, DielineGeometry } from "../../shared/types/index.ts"
import { buildDieline } from "../lib/editor/geometry/dieline.ts"
import {
  deriveFoldAngleAnnotations,
  deriveGlueTabAnnotations,
  deriveCornerAnnotations,
  foldAngleDeg,
  formatMm,
} from "../lib/editor/geometry/annotations.ts"

// M8-E: canonical dieline geometry annotations (DESIGN-EDITOR §9, M8-E).
//
//   A  annotations reference canonical geometry only (ids, FaceIds, mm values)
//   B  derivation is pure: it does not mutate or fabricate canonical geometry
//   C  fold-angle markers sit at canonical fold-path midpoints; the angle is
//      derived from the canonical adjacency relationships (90/180 only)
//   D  glue-tab leaders display the canonical endpoint distance; the mm label
//      matches formatMm(lengthMm); leaders are placed from canonical midpoints
//   E  corner/relief marks are derived from the flat outline (R0 when the
//      blueprint declares no relief — never an invented radius)
//   F  static architecture: no second geometry model, no engine calls, no
//      leftover legacy scale/px-factors in the annotation path
//
// Fixture: the seed MAILER_DIELINE_TEMPLATE (F42, 115x70x38 mm) exactly.

const MAILER_DIMS = { length: 115, width: 70, height: 38 }

const mailerBlueprint: DielineBlueprint = {
  schemaVersion: 1,
  boxType: "mailer-box",
  faceOrder: ["left", "front", "right", "back", "top", "bottom"],
  panels: {
    left: { faceId: "left", x: 0, y: 70, w: 70, h: 38, rotation: 0, edges: { top: { class: "glue", to: "glue_flap" }, right: { class: "fold", to: "front" }, bottom: { class: "glue", to: "glue_flap" }, left: { class: "cut" } } },
    front: { faceId: "front", x: 70, y: 70, w: 115, h: 38, rotation: 0, edges: { top: { class: "fold", to: "top" }, right: { class: "fold", to: "right" }, bottom: { class: "fold", to: "bottom" }, left: { class: "fold", to: "left" } } },
    right: { faceId: "right", x: 185, y: 70, w: 70, h: 38, rotation: 0, edges: { top: { class: "glue", to: "glue_flap" }, right: { class: "fold", to: "back" }, bottom: { class: "glue", to: "glue_flap" }, left: { class: "fold", to: "front" } } },
    back: { faceId: "back", x: 255, y: 70, w: 115, h: 38, rotation: 0, edges: { top: { class: "cut" }, right: { class: "glue", to: "left" }, bottom: { class: "cut" }, left: { class: "fold", to: "right" } } },
    top: { faceId: "top", x: 70, y: 0, w: 115, h: 70, rotation: 0, edges: { top: { class: "cut" }, right: { class: "cut" }, bottom: { class: "fold", to: "front" }, left: { class: "cut" } } },
    bottom: { faceId: "bottom", x: 70, y: 108, w: 115, h: 70, rotation: 0, edges: { top: { class: "fold", to: "front" }, right: { class: "cut" }, bottom: { class: "cut" }, left: { class: "cut" } } },
    inside_front: { faceId: "inside_front", x: 70, y: 70, w: 115, h: 38, rotation: 0, edges: {} },
    inside_back: { faceId: "inside_back", x: 255, y: 70, w: 115, h: 38, rotation: 0, edges: {} },
    inside_left: { faceId: "inside_left", x: 0, y: 70, w: 70, h: 38, rotation: 0, edges: {} },
    inside_right: { faceId: "inside_right", x: 185, y: 70, w: 70, h: 38, rotation: 0, edges: {} },
    inside_top: { faceId: "inside_top", x: 70, y: 0, w: 115, h: 70, rotation: 0, edges: {} },
    inside_bottom: { faceId: "inside_bottom", x: 70, y: 108, w: 115, h: 70, rotation: 0, edges: {} },
  },
  outline: { w: 370, h: 178 },
}

const geometry = buildDieline(mailerBlueprint, MAILER_DIMS)

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8")
}

test("A: annotations reference canonical path ids, FaceIds and mm values", () => {
  const panels = Object.keys(geometry.panels)
  const foldIds = new Set(geometry.foldPaths.map((p) => p.id))
  const glueIds = new Set(geometry.gluePaths.map((p) => p.id))

  const folds = deriveFoldAngleAnnotations(geometry)
  assert.equal(folds.length, geometry.foldPaths.length, "one fold marker per canonical fold path")
  for (const f of folds) {
    assert.equal(foldIds.has(f.pathId), true, `fold marker uses non-canonical path ${f.pathId}`)
    assert.equal(panels.includes(f.faceId), true, `fold marker invents face ${f.faceId}`)
    assert.equal(panels.includes(f.otherFaceId), true, `fold marker invents face ${f.otherFaceId}`)
    assert.equal(f.angleDeg === 90 || f.angleDeg === 180, true, `non-canonical fold angle ${f.angleDeg}`)
    assert.equal(Number.isFinite(f.at.x) && Number.isFinite(f.at.y), true)
  }

  const glue = deriveGlueTabAnnotations(geometry)
  assert.equal(glue.length, geometry.gluePaths.length, "one glue leader per canonical glue path")
  for (const g of glue) {
    assert.equal(glueIds.has(g.pathId), true, `glue leader uses non-canonical path ${g.pathId}`)
    if (g.faceId !== undefined) {
      assert.equal(panels.includes(g.faceId), true, `glue leader invents face ${g.faceId}`)
    }
    assert.equal(g.lengthMm > 0, true)
    assert.equal(g.labelMm, `${formatMm(g.lengthMm)} mm`, "mm label must match canonical length")
  }

  const corners = deriveCornerAnnotations(geometry)
  assert.equal(corners.length, 4, "flat outline is a rectangle for the mailer")
  for (const c of corners) {
    for (const faceId of c.faceIds) {
      assert.equal(panels.includes(faceId), true, `corner invents face ${faceId}`)
    }
  }
})

test("B: derivation is pure — canonical geometry is not mutated or duplicated", () => {
  const before = JSON.stringify({
    panels: geometry.panels,
    cutPaths: geometry.cutPaths,
    foldPaths: geometry.foldPaths,
    gluePaths: geometry.gluePaths,
    outline: geometry.outline,
    adjacency: geometry.adjacency,
  })

  deriveFoldAngleAnnotations(geometry)
  deriveGlueTabAnnotations(geometry)
  deriveCornerAnnotations(geometry)

  const after = JSON.stringify({
    panels: geometry.panels,
    cutPaths: geometry.cutPaths,
    foldPaths: geometry.foldPaths,
    gluePaths: geometry.gluePaths,
    outline: geometry.outline,
    adjacency: geometry.adjacency,
  })

  assert.equal(after, before, "annotation derivation must not alter canonical geometry")
  assert.equal(geometry.cutPaths.length, 9, "canonical cut count unchanged")
  assert.equal(geometry.foldPaths.length, 5, "canonical fold count unchanged")
  assert.equal(geometry.gluePaths.length, 5, "canonical glue count unchanged")
})

test("C: fold markers sit at canonical fold midpoints with canonical angles", () => {
  const folds = deriveFoldAngleAnnotations(geometry)

  const midpoints = geometry.foldPaths.map(
    (p) => `${(p.points[0].x + p.points[p.points.length - 1].x) / 2},${(p.points[0].y + p.points[p.points.length - 1].y) / 2}`,
  )
  const markerPoints = folds.map((f) => `${f.at.x},${f.at.y}`)
  assert.deepEqual(markerPoints.sort(), midpoints.sort(), "markers must be fold-path midpoints")

  const byAt = (x: number, y: number) => folds.find((f) => f.at.x === x && f.at.y === y)!

  const frontTop = byAt(127.5, 70)
  assert.equal(frontTop.faceId, "front")
  assert.equal(frontTop.otherFaceId, "top")
  assert.equal(frontTop.via, "top")
  assert.equal(frontTop.angleDeg, 90)

  const frontBottom = byAt(127.5, 108)
  assert.equal(frontBottom.otherFaceId, "bottom")
  assert.equal(frontBottom.angleDeg, 90)

  const leftRight = byAt(70, 89)
  assert.equal(leftRight.faceId, "left")
  assert.equal(leftRight.otherFaceId, "front")
  assert.equal(leftRight.angleDeg, 90)

  const rightFold = byAt(255, 89)
  assert.equal(rightFold.faceId, "right")
  assert.equal(rightFold.otherFaceId, "back")
  assert.equal(rightFold.angleDeg, 90)

  assert.equal(foldAngleDeg("front", "back"), 180, "same-axis faces fold flat")
})

test("D: glue leaders carry canonical distance labels from canonical midpoints", () => {
  const glue = deriveGlueTabAnnotations(geometry)

  const backRight = glue.find((g) => g.pathId === "back-right")!
  assert.equal(backRight.lengthMm, 38)
  assert.equal(backRight.labelMm, "38 mm")
  assert.equal(backRight.at.x, 370)
  assert.equal(backRight.at.y, 89)
  assert.equal(backRight.leaderTo.x > 370, true, "leader must extend away from the sheet")
  assert.equal(backRight.leaderTo.y, 89)

  const leftTop = glue.find((g) => g.pathId === "left-top")!
  assert.equal(leftTop.lengthMm, 70)
  assert.equal(leftTop.labelMm, "70 mm")
  assert.equal(leftTop.at.x, 35)
  assert.equal(leftTop.at.y, 70)

  const returned = new Set(glue.map((g) => g.pathId))
  assert.equal(returned.size, geometry.gluePaths.length, "every glue path yields exactly one leader")
})

test("E: corner relief is derived (R0), never invented", () => {
  const corners = deriveCornerAnnotations(geometry)
  const positions = corners.map((c) => `${c.at.x},${c.at.y}`)
  assert.deepEqual(positions, ["0,0", "370,0", "370,178", "0,178"])
  for (const c of corners) {
    assert.equal(c.radiusMm, 0, "blueprint declares no relief → derived radius is 0")
    assert.equal(c.reliefLabel, "R0")
    assert.deepEqual(c.faceIds, [], "mailer sheet corners touch no panel boundary")
  }
})

test("F: static architecture — no second geometry model, no engine calls", () => {
  const annotations = read("lib/editor/geometry/annotations.ts")
  const component = read("components/editor/canvas/DielineAnnotations.tsx")
  const view = read("components/editor/canvas/DielineView.tsx")

  for (const src of [annotations, component, view]) {
    assert.equal(src.includes("buildDieline("), false, "annotation path must not call the engine")
    assert.equal(src.includes("resolveDieline("), false)
    assert.equal(src.includes("generateDieline("), false)
    assert.equal(src.includes("const panels ="), false, "annotation path must not duplicate panels")
    assert.equal(src.includes("const edges ="), false)
    assert.equal(src.includes("const faces ="), false)
    assert.equal(src.includes("3" + ".779"), false)
    assert.equal(src.includes("pxToMm("), false, "no px conversion in the annotation path")
  }

  // DielineView still binds to the canonical single resolution point + export.
  assert.equal(view.includes("serializeSVG(geometry)"), true)
  assert.equal(view.includes("data-face-id={"), true)
  assert.equal(view.includes("deriveFoldAngleAnnotations(geometry)"), true)
  assert.equal(view.includes("showAnnotations"), true)
  assert.equal(view.includes("DielineAnnotations"), true)

  // The annotation component ties markers to canonical identity via data attrs.
  assert.equal(component.includes('data-annotation="fold-angle"'), true)
  assert.equal(component.includes('data-annotation="glue-tab-leader"'), true)
  assert.equal(component.includes('data-annotation="corner-relief"'), true)

  // Frozen legacy path untouched (scale lives only in dieline-generator).
  const legacy = read("lib/editor/utils/dieline-generator.ts")
  assert.equal(legacy.includes("const scale = 0.5"), true, "legacy generator must keep its documented scale")
  const fallback = read("components/editor/canvas/M7DielineFallback.tsx")
  assert.equal(fallback.includes("generateDieline"), true, "M7 fallback must keep the legacy delegate")
})