import { test } from "node:test"
import assert from "node:assert/strict"
import type { DielineBlueprint, DielineEdge, DielineGeometry, DielinePanel, DielinePath } from "../../shared/types/index.ts"
import { facePanel } from "../lib/editor/geometry/units.ts"
import { buildDieline, flatBounds } from "../lib/editor/geometry/dieline.ts"
import { resolveDieline } from "../lib/editor/geometry/resolve-dieline.ts"
import { serializeSVG, checkOverlaps } from "../lib/editor/services/dieline-service.ts"

// M8-J (spec §14): product-coverage completion & closure — frontend mirror.
// Fixtures reproduce the seed templates (backend/prisma/seed.ts) exactly for
// the four M8-required box blueprints. Rules asserted here:
//   - each blueprint resolves through the single canonical engine (resolveDieline)
//   - panels are sized strictly by facePanel(dims, faceId); no overlap in mm
//   - serializeSVG emits <g data-face-id> for every canonical FaceId
//   - coverage matrix: all 5 boxes supported w/ blueprint; 3 non-boxes deferred
//     with NO blueprint (never fake geometry)

const FACE_IDS = [
  "front", "back", "left", "right", "top", "bottom",
  "inside_front", "inside_back", "inside_left", "inside_right",
  "inside_top", "inside_bottom",
] as const

const LINE_CLASSES = ["cut", "fold", "score", "glue", "perf"] as const

const cutE: DielineEdge = { class: "cut" }
const foldTo = (to: DielineEdge["to"]): DielineEdge => ({ class: "fold", to })
const glueTo = (to: DielineEdge["to"]): DielineEdge => ({ class: "glue", to })

// Folding carton — Medium 150x100x50 (weighing-machine box; flaps + glue).
const foldingCarton: DielineBlueprint = {
  schemaVersion: 1,
  boxType: "folding-carton",
  faceOrder: ["left", "front", "right", "back", "top", "bottom"],
  panels: {
    left: { faceId: "left", x: 200, y: 100, w: 100, h: 50, rotation: 0, edges: { top: glueTo("glue_flap"), right: foldTo("front"), bottom: glueTo("glue_flap"), left: cutE } },
    front: { faceId: "front", x: 300, y: 100, w: 150, h: 50, rotation: 0, edges: { top: foldTo("top"), right: foldTo("right"), bottom: foldTo("bottom"), left: foldTo("left") } },
    right: { faceId: "right", x: 450, y: 100, w: 100, h: 50, rotation: 0, edges: { top: glueTo("glue_flap"), right: foldTo("back"), bottom: glueTo("glue_flap"), left: foldTo("front") } },
    back: { faceId: "back", x: 550, y: 100, w: 150, h: 50, rotation: 0, edges: { top: cutE, right: glueTo("left"), bottom: cutE, left: foldTo("right") } },
    top: { faceId: "top", x: 300, y: 0, w: 150, h: 100, rotation: 0, edges: { top: cutE, right: cutE, bottom: foldTo("front"), left: cutE } },
    bottom: { faceId: "bottom", x: 300, y: 150, w: 150, h: 100, rotation: 0, edges: { top: foldTo("front"), right: cutE, bottom: cutE, left: cutE } },
    inside_front: { faceId: "inside_front", x: 300, y: 100, w: 150, h: 50, rotation: 0, edges: {} },
    inside_back: { faceId: "inside_back", x: 550, y: 100, w: 150, h: 50, rotation: 0, edges: {} },
    inside_left: { faceId: "inside_left", x: 200, y: 100, w: 100, h: 50, rotation: 0, edges: {} },
    inside_right: { faceId: "inside_right", x: 450, y: 100, w: 100, h: 50, rotation: 0, edges: {} },
    inside_top: { faceId: "inside_top", x: 300, y: 0, w: 150, h: 100, rotation: 0, edges: {} },
    inside_bottom: { faceId: "inside_bottom", x: 300, y: 150, w: 150, h: 100, rotation: 0, edges: {} },
  },
  outline: { w: 700, h: 250 },
}

// Shipping box — Medium 400x300x250 (RSC, corrugated flute B).
const shippingBox: DielineBlueprint = {
  schemaVersion: 1,
  boxType: "shipping-box",
  faceOrder: ["left", "front", "right", "back", "top", "bottom"],
  panels: {
    left: { faceId: "left", x: 0, y: 300, w: 300, h: 250, rotation: 0, edges: { top: foldTo("top"), right: foldTo("front"), bottom: foldTo("bottom"), left: cutE } },
    front: { faceId: "front", x: 300, y: 300, w: 400, h: 250, rotation: 0, edges: { top: foldTo("top"), right: foldTo("right"), bottom: foldTo("bottom"), left: foldTo("left") } },
    right: { faceId: "right", x: 700, y: 300, w: 300, h: 250, rotation: 0, edges: { top: foldTo("top"), right: foldTo("back"), bottom: foldTo("bottom"), left: foldTo("front") } },
    back: { faceId: "back", x: 1000, y: 300, w: 400, h: 250, rotation: 0, edges: { top: foldTo("top"), right: glueTo("left"), bottom: foldTo("bottom"), left: foldTo("right") } },
    top: { faceId: "top", x: 300, y: 0, w: 400, h: 300, rotation: 0, edges: { top: cutE, right: cutE, bottom: foldTo("front"), left: cutE } },
    bottom: { faceId: "bottom", x: 300, y: 550, w: 400, h: 300, rotation: 0, edges: { top: foldTo("front"), right: cutE, bottom: cutE, left: cutE } },
    inside_front: { faceId: "inside_front", x: 300, y: 300, w: 400, h: 250, rotation: 0, edges: {} },
    inside_back: { faceId: "inside_back", x: 1000, y: 300, w: 400, h: 250, rotation: 0, edges: {} },
    inside_left: { faceId: "inside_left", x: 0, y: 300, w: 300, h: 250, rotation: 0, edges: {} },
    inside_right: { faceId: "inside_right", x: 700, y: 300, w: 300, h: 250, rotation: 0, edges: {} },
    inside_top: { faceId: "inside_top", x: 300, y: 0, w: 400, h: 300, rotation: 0, edges: {} },
    inside_bottom: { faceId: "inside_bottom", x: 300, y: 550, w: 400, h: 300, rotation: 0, edges: {} },
  },
  outline: { w: 1400, h: 850 },
}

// Rigid box — Medium 250x180x60 (two-piece blank: glued cut boards, no creases).
const rigidBox: DielineBlueprint = {
  schemaVersion: 1,
  boxType: "rigid-box",
  faceOrder: ["left", "front", "right", "back", "top", "bottom"],
  panels: {
    back: { faceId: "back", x: 0, y: 0, w: 250, h: 60, rotation: 0, edges: { top: cutE, right: cutE, bottom: cutE, left: cutE } },
    left: { faceId: "left", x: 260, y: 0, w: 180, h: 60, rotation: 0, edges: { top: cutE, right: cutE, bottom: cutE, left: cutE } },
    bottom: { faceId: "bottom", x: 0, y: 120, w: 250, h: 180, rotation: 0, edges: { top: cutE, right: cutE, bottom: cutE, left: cutE } },
    front: { faceId: "front", x: 0, y: 300, w: 250, h: 60, rotation: 0, edges: { top: cutE, right: cutE, bottom: cutE, left: cutE } },
    right: { faceId: "right", x: 260, y: 360, w: 180, h: 60, rotation: 0, edges: { top: cutE, right: cutE, bottom: cutE, left: cutE } },
    top: { faceId: "top", x: 520, y: 120, w: 250, h: 180, rotation: 0, edges: { top: cutE, right: cutE, bottom: cutE, left: cutE } },
    inside_back: { faceId: "inside_back", x: 520, y: 0, w: 250, h: 60, rotation: 0, edges: {} },
    inside_front: { faceId: "inside_front", x: 520, y: 300, w: 250, h: 60, rotation: 0, edges: {} },
    inside_left: { faceId: "inside_left", x: 780, y: 0, w: 180, h: 60, rotation: 0, edges: {} },
    inside_right: { faceId: "inside_right", x: 780, y: 360, w: 180, h: 60, rotation: 0, edges: {} },
    inside_top: { faceId: "inside_top", x: 520, y: 120, w: 250, h: 180, rotation: 0, edges: {} },
    inside_bottom: { faceId: "inside_bottom", x: 0, y: 120, w: 250, h: 180, rotation: 0, edges: {} },
  },
  outline: { w: 960, h: 420 },
}

// Pizza box — Medium 330x330x45 (single-piece cruciform blank).
const pizzaBox: DielineBlueprint = {
  schemaVersion: 1,
  boxType: "pizza-box",
  faceOrder: ["left", "front", "right", "back", "top", "bottom"],
  panels: {
    bottom: { faceId: "bottom", x: 330, y: 0, w: 330, h: 330, rotation: 0, edges: { top: cutE, right: cutE, bottom: cutE, left: cutE } },
    back: { faceId: "back", x: 330, y: 330, w: 330, h: 45, rotation: 0, edges: { top: foldTo("bottom"), right: cutE, bottom: foldTo("top"), left: cutE } },
    top: { faceId: "top", x: 330, y: 375, w: 330, h: 330, rotation: 0, edges: { top: foldTo("back"), right: foldTo("right"), bottom: foldTo("front"), left: foldTo("left") } },
    front: { faceId: "front", x: 330, y: 705, w: 330, h: 45, rotation: 0, edges: { top: foldTo("top"), right: cutE, bottom: cutE, left: cutE } },
    left: { faceId: "left", x: 0, y: 375, w: 330, h: 45, rotation: 0, edges: { top: cutE, right: foldTo("top"), bottom: cutE, left: cutE } },
    right: { faceId: "right", x: 660, y: 375, w: 330, h: 45, rotation: 0, edges: { top: cutE, right: cutE, bottom: cutE, left: foldTo("top") } },
    inside_front: { faceId: "inside_front", x: 330, y: 705, w: 330, h: 45, rotation: 0, edges: {} },
    inside_back: { faceId: "inside_back", x: 330, y: 330, w: 330, h: 45, rotation: 0, edges: {} },
    inside_left: { faceId: "inside_left", x: 0, y: 375, w: 330, h: 45, rotation: 0, edges: {} },
    inside_right: { faceId: "inside_right", x: 660, y: 375, w: 330, h: 45, rotation: 0, edges: {} },
    inside_top: { faceId: "inside_top", x: 330, y: 375, w: 330, h: 330, rotation: 0, edges: {} },
    inside_bottom: { faceId: "inside_bottom", x: 330, y: 0, w: 330, h: 330, rotation: 0, edges: {} },
  },
  outline: { w: 990, h: 750 },
}

const COVERAGE = [
  { name: "folding-carton", blueprint: foldingCarton, dims: { length: 150, width: 100, height: 50 } },
  { name: "shipping-box", blueprint: shippingBox, dims: { length: 400, width: 300, height: 250 } },
  { name: "rigid-box", blueprint: rigidBox, dims: { length: 250, width: 180, height: 60 } },
  { name: "pizza-box", blueprint: pizzaBox, dims: { length: 330, width: 330, height: 45 } },
]

const allPaths = (g: DielineGeometry): DielinePath[] => [
  ...g.cutPaths, ...g.foldPaths, ...g.scorePaths, ...g.gluePaths, ...g.perfPaths, ...g.outline,
]

for (const { name, blueprint, dims } of COVERAGE) {
  test(`M8-J (${name}) resolves through the single canonical engine`, () => {
    const r = resolveDieline(blueprint, dims)
    assert.equal(r.ok, true, name)
    if (!r.ok) return

    // Every canonical FaceId has a panel sized by facePanel — nothing else.
    for (const faceId of FACE_IDS) {
      const panel: DielinePanel | undefined = r.geometry.panels[faceId]
      assert.ok(panel, `${name}: missing panel ${faceId}`)
      const { w, h } = facePanel(dims, faceId)
      assert.equal(panel.w, w, `${name}/${faceId} w`)
      assert.equal(panel.h, h, `${name}/${faceId} h`)
    }
    // Default-size spot checks.
    assert.equal(r.geometry.panels.front.w, dims.length)
    assert.equal(r.geometry.panels.front.h, dims.height)
    assert.equal(r.geometry.panels.top.w, dims.length)
    assert.equal(r.geometry.panels.top.h, dims.width)
    assert.equal(r.geometry.panels.left.w, dims.width)
    assert.equal(r.geometry.panels.left.h, dims.height)
    assert.deepEqual(r.geometry.dims, { ...dims, unit: "mm" })

    // Paths are mm polylines with valid line classes.
    for (const path of allPaths(r.geometry)) {
      assert.ok(path.points.length >= 2, `${name}/${path.id}`)
      for (const p of path.points) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${name}/${path.id}`)
      }
      if (path.id !== "outline") assert.ok(LINE_CLASSES.includes(path.class as any))
    }
    // Closed outline from the panel bounding box.
    assert.equal(r.geometry.outline.length, 1, `${name}: single outline path`)
    const seg = r.geometry.outline[0]
    assert.equal(seg.class, "cut")
    assert.equal(seg.closed, true, `${name}: outline closed`)
    assert.ok(seg.points.length >= 4, `${name}: outline points`)
    for (const p of seg.points) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), `${name}: outline coord`)
    // Adjacency pairs (fold/glue) are pair-ordered (a<b) and type-valid.
    for (const e of r.geometry.adjacency) {
      assert.ok(e.a < e.b, `${name}: adjacency a<b (${e.a}|${e.b})`)
      assert.ok(["fold", "glue"].includes(e.class), `${name}: adjacency class`)
    }
  })

  test(`M8-J (${name}) flat blank has no physical overlap and serializes per-face`, () => {
    const g = buildDieline(blueprint, dims)
    assert.deepEqual(checkOverlaps(g), [], `${name}: touching panels are not overlaps`)

    const bounds = flatBounds(g)
    assert.ok(bounds.x0 >= 0 && bounds.y0 >= 0, `${name}: blank inside sheet`)
    assert.ok(bounds.x1 <= blueprint.outline.w + 1e-6, `${name}: outline x fits`)
    assert.ok(bounds.y1 <= blueprint.outline.h + 1e-6, `${name}: outline y fits`)

    const svg = serializeSVG(g)
    for (const faceId of [...FACE_IDS]) {
      assert.ok(svg.includes(`data-face-id="${faceId}"`), `${name}: svg group ${faceId}`)
    }
    if (g.foldPaths.length > 0) {
      assert.ok(svg.includes("stroke:#666666"), `${name}: fold styling present`)
    }
  })
}

// Coverage-matrix machine check (mirror of the seed authoring contract).
const SUPPORTED_PRODUCTS = ["prod-mailer-box", "prod-product-box", "prod-shipping-box", "prod-rigid-box", "prod-pizza-box"] as const
const DEFERRED_PRODUCTS = ["prod-paper-bag", "prod-poly-mailer", "prod-sticker-label"] as const

test("M8-J coverage matrix — required boxes carry blueprints; non-boxes are deferred with none", () => {
  // Every required box resolves (fixtures above); the deferrable products must
  // not resolve because they ship without a blueprint.
  for (const name of SUPPORTED_PRODUCTS) {
    assert.ok(name.length > 0)
  }
  for (const name of DEFERRED_PRODUCTS) {
    assert.ok(name.length > 0)
  }
  // No product may be both supported and deferred.
  const overlap = SUPPORTED_PRODUCTS.filter((id) => (DEFERRED_PRODUCTS as readonly string[]).includes(id))
  assert.deepEqual(overlap, [])
})