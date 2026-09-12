import { test } from "node:test"
import assert from "node:assert/strict"
import type { DielineBlueprint, DielinePanel, EditorConfig, LineClass, EdgeName } from "../../shared/types/index.ts"
import { facePanel } from "../lib/editor/geometry/units.ts"

// M8-B: frontend typeguard test — the mailer dieline template must satisfy the
// shared DielineBlueprint contract (M8_SPEC §7–§8) and the F42 invariants,
// and EditorConfigLike consumers must tolerate its presence/absence.

const LINE_CLASSES: string[] = ["cut", "fold", "score", "glue", "perf"]
const FACE_IDS: string[] = [
  "front", "back", "left", "right", "top", "bottom",
  "inside_front", "inside_back", "inside_left", "inside_right",
  "inside_top", "inside_bottom",
]
const EDGE_TARGETS = [...FACE_IDS, "glue_flap", "none"]
const MAILER_DIMS = { length: 115, width: 70, height: 38 }

const mailerBlueprint: DielineBlueprint = {
  schemaVersion: 1,
  boxType: "mailer-box",
  faceOrder: ["left", "front", "right", "back", "top", "bottom"],
  panels: {
    left: { faceId: "left", x: 0, y: 70, w: 70, h: 38, rotation: 0, edges: { right: { class: "fold", to: "front" } } },
    front: { faceId: "front", x: 70, y: 70, w: 115, h: 38, rotation: 0, edges: { right: { class: "fold", to: "right" }, top: { class: "fold", to: "top" }, bottom: { class: "fold", to: "bottom" } } },
    right: { faceId: "right", x: 185, y: 70, w: 70, h: 38, rotation: 0, edges: {} },
    back: { faceId: "back", x: 255, y: 70, w: 115, h: 38, rotation: 0, edges: {} },
    top: { faceId: "top", x: 70, y: 0, w: 115, h: 70, rotation: 0, edges: { bottom: { class: "fold", to: "front" } } },
    bottom: { faceId: "bottom", x: 70, y: 108, w: 115, h: 70, rotation: 0, edges: {} },
    inside_front: { faceId: "inside_front", x: 70, y: 70, w: 115, h: 38, rotation: 0, edges: {} },
    inside_back: { faceId: "inside_back", x: 255, y: 70, w: 115, h: 38, rotation: 0, edges: {} },
    inside_left: { faceId: "inside_left", x: 0, y: 70, w: 70, h: 38, rotation: 0, edges: {} },
    inside_right: { faceId: "inside_right", x: 185, y: 70, w: 70, h: 38, rotation: 0, edges: {} },
    inside_top: { faceId: "inside_top", x: 70, y: 0, w: 115, h: 70, rotation: 0, edges: {} },
    inside_bottom: { faceId: "inside_bottom", x: 70, y: 108, w: 115, h: 70, rotation: 0, edges: {} },
  },
  outline: { w: 370, h: 178 },
}

// A config that carries the blueprint — must type as EditorConfig.
const configWithBlueprint: EditorConfig = {
  product: {
    id: "prod-mailer-box",
    slug: "custom-mailer-box",
    name: "Custom Mailer Box",
    type: "box",
    boxType: "mailer-box",
    schemaVersion: 1,
    unit: "mm",
    dieline: mailerBlueprint,
    prepress: { caliperMm: 0.5, fluteType: "E", glueFlapToleranceMm: 1.5 },
  },
  variant: {
    id: "v1",
    sku: "MB-F42-115",
    sizeCode: "f42",
    materialCode: "cardboard-kraft",
    printMode: "full_color",
    printSides: 1,
    finish: "none",
    dimensions: { length: 115, width: 70, height: 38, unit: "mm" },
  },
  material: { code: "cardboard-kraft", name: "Kraft Cardboard", hex: "#b8936a" },
  quantity: 50,
  pricing: { unitPrice: 0.55, totalPrice: 27.5, currency: "USD" },
}

test("mailer blueprint satisfies the DielineBlueprint contract", () => {
  assert.equal(mailerBlueprint.schemaVersion, 1)
  assert.equal(mailerBlueprint.boxType, "mailer-box")
  assert.deepEqual(mailerBlueprint.faceOrder, ["left", "front", "right", "back", "top", "bottom"])

  // All 12 canonical FaceIds present, keys match faceId.
  for (const faceId of FACE_IDS) {
    const panel: DielinePanel = mailerBlueprint.panels[faceId as keyof typeof mailerBlueprint.panels]
    assert.ok(panel, `missing panel ${faceId}`)
    assert.equal(panel.faceId, faceId)
    assert.ok(panel.w > 0 && panel.h > 0)
    assert.ok([0, 90, 180, 270].includes(panel.rotation))

    // Every declared edge uses a whitelisted LineClass + valid target.
    const edges = panel.edges as Record<string, { class: string; to?: string }>
    for (const edge of Object.values(edges)) {
      assert.ok(LINE_CLASSES.includes(edge.class), `bad line class ${edge.class} on ${faceId}`)
      if (edge.to !== undefined) {
        assert.ok(EDGE_TARGETS.includes(edge.to), `bad target ${edge.to} on ${faceId}`)
      }
    }
  }

  assert.equal(mailerBlueprint.outline.w, 370)
  assert.equal(mailerBlueprint.outline.h, 178)
})

test("blueprint panels agree with the canonical facePanel mapping (F42)", () => {
  for (const faceId of FACE_IDS) {
    const panel: DielinePanel = mailerBlueprint.panels[faceId as keyof typeof mailerBlueprint.panels]
    const { w, h } = facePanel(MAILER_DIMS, faceId)
    assert.equal(panel.w, w, `panel w ${faceId}`)
    assert.equal(panel.h, h, `panel h ${faceId}`)
  }
})

test("EditorConfig may or may not carry the blueprint (additive, backward-compat)", () => {
  const withBp: EditorConfig = configWithBlueprint
  assert.equal(withBp.product.dieline, mailerBlueprint)

  // Products without a blueprint simply omit the fields (additive only).
  const withoutBp: EditorConfig = {
    ...configWithBlueprint,
    product: { ...configWithBlueprint.product, schemaVersion: undefined, unit: undefined, dieline: undefined, prepress: undefined },
  }
  assert.equal(withoutBp.product.dieline, undefined)
  assert.equal(withoutBp.product.schemaVersion, undefined)
  assert.equal(withoutBp.product.unit, undefined)
  assert.equal(withoutBp.product.prepress, undefined)
  // M7 structure key remains independent and untouched.
  assert.equal(withoutBp.product.structure, undefined)
})