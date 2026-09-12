import { test } from "node:test"
import assert from "node:assert/strict"
import type { DielineBlueprint, DielineGeometry } from "../../shared/types/index.ts"
import { resolveDieline } from "../lib/editor/geometry/resolve-dieline.ts"
import { mmToPx } from "../lib/editor/geometry/units.ts"
import type { DesignCoreState } from "../lib/editor/state/types.ts"
import {
  DESIGN_DATA_SCHEMA_VERSION,
  deserializeDesignData,
  isDesignDataV2,
  normalizeFromManifest,
  serializeDesignData,
  type DesignDataV2,
} from "../lib/editor/services/dieline-manifest.ts"

// M8-H: persistence & reproducibility (M8_SPEC §13, M8_PLAN M8-H).
//
//   A  serializeDesignData writes schemaVersion 2 + manifestSource "blueprint"
//      + reproducibility "exact" for a blueprint-backed fresh design (AC1)
//   B  manifest faces match the resolved dieline panels for F42 (115×70×38);
//      the dieline snapshot carries paths + faceRelationships (AC1)
//   C  legacy v1 blobs deserialize with layers preserved and flag
//      migrated/best_effort; re-saving keeps that lineage (AMENDMENT 3, AC5)
//   D  manifest-first reopen: seed-change is irrelevant — dims + canvas come
//      from the persisted manifest (AC2 345×114, AC3 reproducibility)
//   E  the load path returns metadata that the store attaches as manifestMetadata
//   F  M7 artifact contract untouched: state stays top-level in the v2 payload
//      (m7-e reads savedDesign.product/layers off designData) (regression)
//   G  manifest independence (AMENDMENT 5): no export/geometry re-derivation
//      required; the snapshot IS the resolve-layer output
//   H  no-blueprint legacy reconstruction: best_effort faces via the canonical
//      face↔axis mapping, dieline omitted, never claims exactness
//
// Fixture is the seed MAILER_DIELINE_TEMPLATE (F42 mailer, 115×70×38) exactly.

const MAILER_DIMS = { length: 115, width: 70, height: 38 }

const FACE_IDS: readonly string[] = [
  "front", "back", "left", "right", "top", "bottom",
  "inside_front", "inside_back", "inside_left", "inside_right",
  "inside_top", "inside_bottom",
]

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

function baseCore(overrides: Partial<DesignCoreState> = {}): DesignCoreState {
  return {
    canvas: { width: mmToPx(115), height: mmToPx(38), backgroundColor: "#d2b48c" },
    model: {
      type: "mailer_box",
      category: "boxes",
      dimensions: { ...MAILER_DIMS },
      material: "cardboard-natural",
      faces: [],
      printCoverage: "outside",
      adhesiveStrip: "none",
      finishing: "none",
      lamination: "none",
      fluteType: "E",
      colorVariant: "one_colour",
      quantity: 50,
    },
    layers: [
      {
        id: "l1",
        type: "text",
        name: "Label",
        visible: true,
        locked: false,
        opacity: 1,
        blendMode: "normal",
        position: { x: 10, y: 10 },
        rotation: 0,
        scale: { x: 1, y: 1 },
        faceId: "front",
        textProperties: {
          content: "Hello",
          fontFamily: "Arial",
          fontSize: 12,
          fontWeight: 400,
          lineHeight: 1.2,
          letterSpacing: 0,
          align: "left",
          color: "#000000",
        },
      },
    ],
    selectedLayerIds: ["l1"],
    camera: { position: [4, 4, 4], target: [0, 0, 0], zoom: 1 },
    activeTool: "select",
    ui: {
      leftSidebarOpen: true,
      rightSidebarOpen: true,
      gridVisible: true,
      guidesVisible: true,
      selectedFace: "front",
      viewMode: "2d",
      boxOpenState: 0,
    },
    lifecycleStatus: "DRAFT",
    product: {
      id: "prod-mailer-box",
      slug: "custom-mailer-box",
      name: "Mailer Box",
      type: "box",
      boxType: "mailer-box",
      dieline: mailerBlueprint,
      prepress: { caliperMm: 0.5, fluteType: "E", glueFlapToleranceMm: 1.5 },
    },
    productConfig: {
      selectedSize: "f42",
      selectedMaterial: "cardboard-natural",
      variantId: "variant-f42",
      sku: "box--mailer-box--f42--cardboard-natural--print-monochrome--foil-none",
      quantity: 50,
    },
    structureType: "mailer-box",
    zones: { front: [{ label: "logo", required: true, position: [0, 0, 0] }] },
    ...overrides,
  }
}

test("A — fresh blueprint-backed save writes blueprint/exact v2 envelope", () => {
  const envelope = serializeDesignData(baseCore())

  assert.equal(isDesignDataV2(envelope), true)
  assert.equal(envelope.schemaVersion, DESIGN_DATA_SCHEMA_VERSION)
  assert.equal(envelope.manifestSource, "blueprint")
  assert.equal(envelope.reproducibility, "exact")
})

test("B — manifest faces match the resolved F42 dieline incl. paths + faceRelationships", () => {
  const state = baseCore()
  const envelope = serializeDesignData(state) as DesignDataV2
  const resolution = resolveDieline(mailerBlueprint, MAILER_DIMS)
  assert.equal(resolution.ok, true, "F42 fixture must resolve")
  const geometry = (resolution as { ok: true; geometry: DielineGeometry }).geometry

  for (const faceId of FACE_IDS) {
    const panel = geometry.panels[faceId as keyof DielineGeometry["panels"]]
    assert.deepEqual(
      envelope.manifest.faces[faceId],
      { w: panel.w, h: panel.h },
      `face ${faceId} extent must match the resolved panel`
    )
  }
  // Spot F42 invariants.
  assert.deepEqual(envelope.manifest.faces.front, { w: 115, h: 38 })
  assert.deepEqual(envelope.manifest.faces.top, { w: 115, h: 70 })
  assert.deepEqual(envelope.manifest.faces.left, { w: 70, h: 38 })

  // The dieline snapshot IS the resolve-layer output — paths + relationships.
  assert.deepEqual(envelope.manifest.dieline, geometry)
  assert.equal(envelope.manifest.dieline!.cutPaths.length, 9)
  assert.equal(envelope.manifest.dieline!.foldPaths.length, 5)
  assert.equal(envelope.manifest.dieline!.gluePaths.length, 5)
  assert.ok(envelope.manifest.dieline!.faceRelationships.length > 0)

  // Prepress baseline snapshot.
  assert.equal(envelope.manifest.prepress.bleedMm, 3)
  assert.equal(envelope.manifest.prepress.safeMm, 5)
  assert.equal(envelope.manifest.prepress.dpiMin, 300)
  assert.equal(envelope.manifest.prepress.caliperMm, 0.5)
})

test("C — legacy v1 blob migrates with layers preserved + migrated/best_effort lineage", () => {
  // A legacy blob is a raw core state with no schemaVersion envelope.
  const legacy = baseCore()
  const raw = { ...legacy } as unknown

  const { state, provenance, manifest } = deserializeDesignData(raw)
  assert.equal(provenance.schemaVersion, 1)
  assert.equal(provenance.manifestSource, "migrated")
  assert.equal(provenance.reproducibility, "best_effort")
  assert.equal(manifest, undefined)
  assert.deepEqual(state.layers, legacy.layers, "layers preserved without envelope")

  // Re-saving keeps the migrated/best_effort lineage — never re-claimed exact
  // (AMENDMENT 3). simulate storage attaching provenance to the restored state.
  const reopened = { ...state, manifestMetadata: provenance }
  const envelope = serializeDesignData(reopened) as DesignDataV2
  assert.equal(envelope.schemaVersion, 2)
  assert.equal(envelope.manifestSource, "migrated")
  assert.equal(envelope.reproducibility, "best_effort")
  assert.deepEqual(envelope.layers, legacy.layers, "artifact layers survive the lineage save")
})

test("D — deterministic reopen: manifest beats any live seed change (AC2/AC3)", () => {
  const envelope = serializeDesignData(baseCore()) as DesignDataV2
  const { state, manifest } = deserializeDesignData(envelope)
  assert.ok(manifest, "v2 envelope carries the manifest")

  // Livelihood: an assumed seed change gives the re-opened design bogus dims
  // and a mutated blueprint. The manifest must win.
  const mutated = {
    ...state,
    product: { ...(state.product ?? {}), dieline: { ...mailerBlueprint, outline: { w: 500, h: 500 } } },
    model: { ...state.model, dimensions: { length: 999, width: 999, height: 999 } },
  } as DesignCoreState
  const reopened = normalizeFromManifest(mutated, manifest)

  assert.deepEqual(reopened.model.dimensions, { length: 115, width: 70, height: 38 })
  // F42 front face at PX_PER_MM=3: 115×3=345, 38×3=114 (AC2).
  assert.equal(reopened.canvas.width, 345)
  assert.equal(reopened.canvas.height, 114)
  assert.equal(reopened.product!.id, "prod-mailer-box")
  assert.equal(reopened.product!.slug, "custom-mailer-box")

  // Re-serializing the reopened state reproduces the same manifest faces.
  const again = serializeDesignData(reopened) as DesignDataV2
  assert.deepEqual(again.manifest.faces, envelope.manifest.faces)
})

test("E — load path returns provenance for the store to attach", () => {
  const envelope = serializeDesignData(baseCore()) as DesignDataV2
  const { provenance } = deserializeDesignData(envelope)
  assert.deepEqual(provenance, {
    schemaVersion: 2,
    manifestSource: "blueprint",
    reproducibility: "exact",
  })
})

test("F — M7 artifact contract: state stays top-level in the v2 payload", () => {
  const state = baseCore()
  const envelope = serializeDesignData(state) as DesignDataV2

  // m7-e reads savedDesign.product/productConfig/zones/layers off designData.
  assert.deepEqual((envelope as any).product, state.product)
  assert.deepEqual((envelope as any).productConfig, state.productConfig)
  assert.deepEqual((envelope as any).zones, state.zones)
  assert.deepEqual(envelope.layers, state.layers)

  const { state: restored } = deserializeDesignData(envelope)
  assert.deepEqual(restored.layers, state.layers)
  assert.deepEqual(restored.productConfig, state.productConfig)
})

test("G — manifest independence: snapshot IS resolve-layer output, no export involved", () => {
  const state = baseCore()
  const envelope = serializeDesignData(state) as DesignDataV2

  // Mutating unrelated editor state (a UI pref / an extra layer) never changes
  // the manifest — the snapshot is independent of ambient editor state.
  const noisy = {
    ...state,
    ui: { ...state.ui, viewMode: "3d" as const, boxOpenState: 0.5 },
    layers: [...state.layers, {
      id: "l2", type: "shape" as const, name: "Shape", visible: true, locked: false,
      opacity: 1, blendMode: "normal" as const, position: { x: 5, y: 5 }, rotation: 0,
      scale: { x: 1, y: 1 }, faceId: "front" as const,
      shapeProperties: { shape: "rect" as const, fill: "#000", stroke: "#fff", strokeWidth: 1 },
    }],
  }
  const noisyEnvelope = serializeDesignData(noisy) as DesignDataV2
  assert.deepEqual(noisyEnvelope.manifest, envelope.manifest)
  assert.deepEqual(noisyEnvelope.manifest.dieline, envelope.manifest.dieline)
  // Serialization is deterministic/pure.
  assert.deepEqual(serializeDesignData(state), envelope)
})

test("H — no-blueprint legacy reconstructs best_effort faces, dieline omitted", () => {
  const noBlueprint = baseCore({ product: { id: "prod-shipping-box", slug: "custom-shipping-box", name: "Shipping Box", type: "box", boxType: "shipping-box" } })
  const envelope = serializeDesignData(noBlueprint) as DesignDataV2

  assert.equal(envelope.manifestSource, "migrated")
  assert.equal(envelope.reproducibility, "best_effort")
  assert.equal(envelope.manifest.dieline, undefined)
  // Faces reconstructed from the canonical face↔axis mapping (mm).
  assert.deepEqual(envelope.manifest.faces.front, { w: 115, h: 38 })
  assert.deepEqual(envelope.manifest.faces.top, { w: 115, h: 70 })
  assert.deepEqual(envelope.manifest.faces.left, { w: 70, h: 38 })
  assert.deepEqual(envelope.manifest.faces.inside_back, { w: 115, h: 38 })
})