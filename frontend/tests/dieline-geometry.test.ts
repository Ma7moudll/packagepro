import { test } from "node:test"
import assert from "node:assert/strict"
import type { DielineBlueprint, DielineGeometry, DielinePath } from "../../shared/types/index.ts"
import { facePanel } from "../lib/editor/geometry/units.ts"
import { buildDieline, flatBounds } from "../lib/editor/geometry/dieline.ts"
import { serializeSVG, checkOverlaps } from "../lib/editor/services/dieline-service.ts"

// M8-C: canonical dieline geometry engine tests (M8_SPEC §7, §17, AMENDMENT 1+2).
// The fixture is the seed MAILER_DIELINE_TEMPLATE (F42, 115x70x38 mm) exactly.

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
const allPaths = (g: DielineGeometry): DielinePath[] => [
  ...g.cutPaths,
  ...g.foldPaths,
  ...g.scorePaths,
  ...g.gluePaths,
  ...g.perfPaths,
  ...g.outline,
]

test("M8-C (A) panels resolve from the canonical facePanel mapping only", () => {
  for (const faceId of Object.keys(geometry.panels) as (keyof typeof geometry.panels)[]) {
    const panel = geometry.panels[faceId]
    const { w, h } = facePanel(MAILER_DIMS, faceId as Parameters<typeof facePanel>[1])
    assert.equal(panel.w, w, `panel w ${faceId}`)
    assert.equal(panel.h, h, `panel h ${faceId}`)
  }
  // F42 spot checks.
  assert.equal(geometry.panels.front.w, 115)
  assert.equal(geometry.panels.front.h, 38)
  assert.equal(geometry.panels.top.w, 115)
  assert.equal(geometry.panels.top.h, 70)
  assert.equal(geometry.panels.left.w, 70)
  assert.equal(geometry.panels.left.h, 38)
  // Canonical mm dims carried through.
  assert.deepEqual(geometry.dims, { length: 115, width: 70, height: 38, unit: "mm" })
})

test("M8-C (B) buildDieline is deterministic", () => {
  const again = buildDieline(mailerBlueprint, MAILER_DIMS)
  assert.deepEqual(geometry, again)
})

test("M8-C (C) path classes and physical-line dedup", () => {
  assert.equal(geometry.cutPaths.length, 9)
  assert.equal(geometry.foldPaths.length, 5, "shared folds emitted once")
  assert.equal(geometry.gluePaths.length, 5, "glue seam lines on declared glue edges")
  assert.equal(geometry.scorePaths.length, 0)
  assert.equal(geometry.perfPaths.length, 0)
  for (const path of geometry.cutPaths) assert.equal(path.class, "cut")
  for (const path of geometry.foldPaths) assert.equal(path.class, "fold")
  for (const path of geometry.gluePaths) assert.equal(path.class, "glue")
  // Every path is an mm polyline (>= 2 points, finite coords).
  for (const path of allPaths(geometry)) {
    assert.ok(path.points.length >= 2, path.id)
    for (const p of path.points) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), path.id)
    }
  }
})

test("M8-C (D) adjacency is deduplicated and pair-ordered (a<b)", () => {
  const pairs = geometry.adjacency.map((e) => `${e.a}|${e.b}`).sort()
  assert.deepEqual(pairs, ["back|left", "back|right", "bottom|front", "front|left", "front|right", "front|top"])
  const glueBackLeft = geometry.adjacency.find((e) => e.a === "back" && e.b === "left")
  assert.ok(glueBackLeft)
  assert.equal(glueBackLeft.class, "glue")
  assert.equal(glueBackLeft.via, "right")
  const foldFrontTop = geometry.adjacency.find((e) => e.a === "front" && e.b === "top")
  assert.ok(foldFrontTop)
  assert.equal(foldFrontTop.class, "fold")
})

test("M8-C (E) canonical FaceIds only — no flap ids, no invented FaceIds", () => {
  const panelKeys = Object.keys(geometry.panels).sort()
  assert.equal(panelKeys.length, 12)
  for (const faceId of panelKeys) {
    assert.ok(!faceId.includes("flap") && faceId !== "none")
  }
  // AMENDMENT 1: faceRelationships cover exactly the blueprint faces,
  // mapping to MeshPartIds, never to a new FaceId.
  const relFaces = geometry.faceRelationships.map((r) => r.faceId).sort()
  assert.deepEqual(relFaces, panelKeys)
  for (const r of geometry.faceRelationships) {
    assert.deepEqual(r.meshPartIds, [`${r.faceId}_panel`])
  }
  // inside_* faces carry no geometry (reverse-side mirrors, AMENDMENT 1).
  for (const path of allPaths(geometry)) {
    if (path.faceId) assert.ok(!path.faceId.startsWith("inside_"))
  }
})

test("M8-C (F) outline is a single closed path bounding all geometry", () => {
  const bounds = flatBounds(geometry)
  assert.deepEqual(bounds, { x0: 0, y0: 0, x1: 370, y1: 178 })
  assert.equal(geometry.outline.length, 1)
  const outline = geometry.outline[0]
  assert.equal(outline.closed, true)
  assert.equal(outline.points.length, 4)
  assert.equal(outline.id, "outline")
  for (const path of allPaths(geometry)) {
    for (const p of path.points) {
      assert.ok(p.x >= bounds.x0 && p.x <= bounds.x1, path.id)
      assert.ok(p.y >= bounds.y0 && p.y <= bounds.y1, path.id)
    }
  }
})

test("M8-C (G) SVG serialization is mm, grouped, classed, deterministic", () => {
  const svg = serializeSVG(geometry)
  assert.equal(serializeSVG(geometry), svg, "serialization deterministic")
  assert.match(svg, /viewBox="0 0 370 178"/)
  assert.match(svg, /width="370"/)
  assert.match(svg, /height="178"/)
  for (const faceId of Object.keys(geometry.panels)) {
    assert.ok(svg.includes(`data-face-id="${faceId}"`), `missing group ${faceId}`)
  }
  assert.match(svg, /class="dieline-cut"/)
  assert.match(svg, /class="dieline-fold"/)
  assert.match(svg, /class="dieline-glue"/)
  assert.match(svg, /class="dieline-outline"/)
  // No px factor anywhere — coordinates are millimeters.
  assert.ok(!svg.includes("3px") && !svg.includes("px;"))
})

test("M8-C (AMENDMENT 2) non-rectangular paths serialize as first-class polylines", () => {
  const g: DielineGeometry = {
    ...geometry,
    cutPaths: [
      ...geometry.cutPaths,
      { id: "flap-notch", faceId: "front", class: "cut", points: [{ x: 100, y: 100 }, { x: 100, y: 110 }, { x: 106, y: 114 }, { x: 110, y: 100 }] },
    ],
  }
  const open = serializeSVG(g)
  assert.ok(open.includes("M 100 100 L 100 110 L 106 114 L 110 100"), "open polyline, no Z")

  const closed = serializeSVG({ ...g, cutPaths: [...g.cutPaths, { ...g.cutPaths[g.cutPaths.length - 1], closed: true }] })
  assert.ok(closed.includes('Z"'), "closable polyline gets Z")
})

test("M8-C (H) overlap detection is real — empty for mailer, catches planted overlap", () => {
  assert.deepEqual(checkOverlaps(geometry), [], "touching panels are not overlaps")

  const planted: DielineBlueprint = {
    ...mailerBlueprint,
    panels: { ...mailerBlueprint.panels, left: { ...mailerBlueprint.panels.left, x: 60 } },
  }
  const overlaps = checkOverlaps(buildDieline(planted, MAILER_DIMS))
  assert.ok(overlaps.length >= 1, "planted overlap detected")
  assert.deepEqual(overlaps[0], { a: "left", b: "front" })
})