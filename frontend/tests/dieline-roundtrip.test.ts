import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  serializeDesignData,
  deserializeDesignData,
  normalizeFromManifest,
  type DesignDataV2,
} from "../lib/editor/services/dieline-manifest.ts"
import { facePanel, mmToPx } from "../lib/editor/geometry/units.ts"
import type { DielineBlueprint, DielineGeometry } from "../../shared/types/index.ts"
import type { DesignCoreState } from "../lib/editor/state/types.ts"

// Saved-snapshot preservation across the real storage pipeline
// (serialize → deserialize → normalizeFromManifest → provenance restore →
// serialize, mirroring services/storage.ts). A manifest dieline snapshot
// must not be silently dropped or rewritten when the current engine
// cannot freshly resolve the restored dimensions: it is re-emitted
// verbatim and marked dielineSource: "stored-snapshot". Provenance stays
// separate: "exact" is claimed only when the envelope actually reproduces
// geometry (fresh resolution or the stored snapshot).

const seed = readFileSync("../backend/prisma/seed.ts", "utf8")

function extractTemplate(name: string): DielineBlueprint {
  const start = seed.indexOf(`const ${name} = {`)
  let i = seed.indexOf("{", start)
  let depth = 0
  let j = i
  for (; j < seed.length; j += 1) {
    if (seed[j] === "{") depth += 1
    else if (seed[j] === "}") { depth -= 1; if (depth === 0) break }
  }
  return new Function(`return (${seed.slice(i, j + 1)})`)() as DielineBlueprint
}

const MAILER = extractTemplate("MAILER_DIELINE_TEMPLATE")
const SHIPPING = extractTemplate("SHIPPING_BOX_DIELINE_TEMPLATE")
const RIGID = extractTemplate("RIGID_BOX_DIELINE_TEMPLATE")
const PIZZA = extractTemplate("PIZZA_BOX_DIELINE_TEMPLATE")

type Dims = { length: number; width: number; height: number }

function stateFor(blueprint: DielineBlueprint, productId: string, boxType: string, modelType: string, dims: Dims): DesignCoreState {
  return {
    canvas: { width: mmToPx(dims.length), height: mmToPx(dims.height), backgroundColor: "#ffffff" },
    model: {
      type: modelType, category: "boxes", dimensions: dims, material: "cardboard-kraft",
      faces: ["front", "back", "left", "right", "top", "bottom"].map((id) => ({ id, name: id })),
      printCoverage: "outside", adhesiveStrip: "none", finishing: "none", lamination: "none",
      fluteType: "E", colorVariant: "full_color", quantity: 50,
    },
    layers: [], selectedLayerIds: [],
    camera: { position: [4, 4, 4], target: [0, 0, 0], zoom: 1 },
    activeTool: "select",
    ui: { leftSidebarOpen: true, rightSidebarOpen: true, gridVisible: true, guidesVisible: true, selectedFace: "front", viewMode: "2d", boxOpenState: 0 },
    lifecycleStatus: "DRAFT",
    product: { id: productId, slug: `custom-${boxType}`, name: boxType, type: "box", boxType, dieline: blueprint },
  } as unknown as DesignCoreState
}

/** The storage restore pipeline (services/storage.ts): deserialize,
 *  normalize from the manifest, then carry provenance into the state. */
function restoreAndResave(envelope: DesignDataV2): DesignDataV2 {
  const { state, provenance, manifest } = deserializeDesignData(envelope)
  const restored = normalizeFromManifest(state, manifest)
  const withProvenance = { ...restored, manifestMetadata: provenance } as DesignCoreState
  return serializeDesignData(withProvenance)
}

/** Build the envelope the OLD (position-copying) engine would have saved
 *  at `dims`: an authored-size save whose snapshot panels are resized in
 *  place (authored positions kept) and whose dims fields point at `dims`. */
function oldEngineEnvelope(blueprint: DielineBlueprint, productId: string, boxType: string, modelType: string, authored: Dims, dims: Dims): DesignDataV2 {
  const envelope = serializeDesignData(stateFor(blueprint, productId, boxType, modelType, authored)) as DesignDataV2
  assert.ok(envelope.manifest.dieline, "authored save carries a snapshot")
  const clone = JSON.parse(JSON.stringify(envelope)) as DesignDataV2 & { model: { dimensions: Dims } }
  clone.model.dimensions = dims
  clone.manifest.variant.dimensions = { ...dims, unit: "mm" }
  const panels = {} as DielineGeometry["panels"]
  for (const [faceId, raw] of Object.entries(blueprint.panels)) {
    const size = facePanel(dims, faceId)
    panels[faceId as keyof typeof panels] = { ...raw, w: size.w, h: size.h }
  }
  clone.manifest.dieline = { ...clone.manifest.dieline!, dims: { ...dims, unit: "mm" }, panels }
  return clone
}

for (const [label, blueprint, productId, boxType, modelType, authored, open] of [
  ["shipping", SHIPPING, "prod-shipping-box", "shipping-box", "shipping_box", { length: 400, width: 300, height: 250 }, { length: 250, width: 200, height: 150 }],
  ["pizza", PIZZA, "prod-pizza-box", "pizza-box", "pizza_box", { length: 330, width: 330, height: 45 }, { length: 250, width: 250, height: 40 }],
  ["rigid", RIGID, "prod-rigid-box", "rigid-box", "rigid_box", { length: 250, width: 180, height: 60 }, { length: 300, width: 216, height: 72 }],
] as const) {
  test(`${label}: a saved snapshot at a now-unsupported size survives the round trip, marked as stored`, () => {
    const saved = oldEngineEnvelope(blueprint, productId, boxType, modelType, authored, open)
    const resaved = restoreAndResave(saved)
    assert.ok(resaved.manifest.dieline, `${label}: snapshot must not be dropped`)
    assert.deepEqual(resaved.manifest.dieline!.panels, saved.manifest.dieline!.panels, `${label}: snapshot panels verbatim`)
    assert.deepEqual(resaved.manifest.dieline!.dims, saved.manifest.dieline!.dims)
    assert.equal(resaved.manifest.dielineSource, "stored-snapshot", `${label}: stored, not freshly computed`)
    assert.equal(resaved.reproducibility, "exact", `${label}: the envelope does reproduce the saved geometry`)
    // Face extents come from the stored snapshot, not a reconstruction.
    assert.equal(resaved.manifest.faces.front.w, saved.manifest.dieline!.panels.front.w)
    assert.equal(resaved.manifest.faces.front.h, saved.manifest.dieline!.panels.front.h)
  })
}

test("mailer: authored and non-authored round trips re-resolve freshly and preserve the snapshot content", () => {
  for (const dims of [{ length: 115, width: 70, height: 38 }, { length: 265, width: 195, height: 60 }]) {
    const saved = serializeDesignData(stateFor(MAILER, "prod-mailer-box", "mailer-box", "mailer_box", dims)) as DesignDataV2
    assert.ok(saved.manifest.dieline)
    const resaved = restoreAndResave(saved)
    assert.ok(resaved.manifest.dieline, `mailer ${dims.length}x${dims.width}x${dims.height}: snapshot present`)
    assert.deepEqual(resaved.manifest.dieline!.panels, saved.manifest.dieline!.panels, "deterministic fresh resolution reproduces the panels")
    assert.equal(resaved.manifest.dielineSource, undefined, "freshly resolved — no stored marker")
    assert.equal(resaved.reproducibility, "exact")
  }
})

test("rigid at its editor-open size: resave resolves freshly (coherent legacy region), no stored marker", () => {
  const dims = { length: 200, width: 150, height: 50 }
  const saved = serializeDesignData(stateFor(RIGID, "prod-rigid-box", "rigid-box", "rigid_box", dims)) as DesignDataV2
  assert.ok(saved.manifest.dieline)
  const resaved = restoreAndResave(saved)
  assert.ok(resaved.manifest.dieline)
  assert.equal(resaved.manifest.dielineSource, undefined)
  assert.deepEqual(resaved.manifest.dieline!.panels, saved.manifest.dieline!.panels)
})

test("history case: an old-engine enlarged-mailer snapshot is NOT overwritten by the new engine on an unchanged resave", () => {
  // Fixture geometry produced by the PRE-PATCH resolver on the base tree
  // (tests/fixtures/old-mailer-265-geometry.json): authored positions with
  // resized panels — the overlapping enlarged-mailer snapshot.
  const oldGeometry = JSON.parse(
    readFileSync("tests/fixtures/old-mailer-265-geometry.json", "utf8")
  ) as DielineGeometry
  const dims = { length: 265, width: 195, height: 60 }
  const envelope = serializeDesignData(stateFor(MAILER, "prod-mailer-box", "mailer-box", "mailer_box", dims)) as DesignDataV2
  // Turn the fresh envelope into the old-engine save: same state body and
  // provenance, but the manifest carries the OLD snapshot (and no
  // dielineOverlaps field — that predates it).
  envelope.manifest.dieline = oldGeometry
  envelope.manifest.faces = Object.fromEntries(
    Object.entries(oldGeometry.panels).map(([faceId, p]) => [faceId, { w: p.w, h: p.h }])
  )
  delete envelope.manifest.dielineOverlaps

  const resaved = restoreAndResave(envelope)
  assert.ok(resaved.manifest.dieline, "snapshot present after resave")
  assert.deepEqual(resaved.manifest.dieline!.panels, oldGeometry.panels, "old panel positions preserved verbatim — not recomputed")
  assert.equal(resaved.manifest.dielineSource, "stored-snapshot")
  assert.equal(resaved.reproducibility, "exact", "the envelope reproduces the saved geometry exactly")
  assert.ok(
    (resaved.manifest.dielineOverlaps ?? []).length > 0,
    "the stored snapshot's overlaps are recorded (recomputed from the stored geometry)"
  )
  assert.equal(resaved.manifest.faces.front.w, oldGeometry.panels.front.w)
})

test("history case: a dimension edit after restore is a fresh revision — new geometry, no stored marker", () => {
  const oldGeometry = JSON.parse(
    readFileSync("tests/fixtures/old-mailer-265-geometry.json", "utf8")
  ) as DielineGeometry
  const dims = { length: 265, width: 195, height: 60 }
  const envelope = serializeDesignData(stateFor(MAILER, "prod-mailer-box", "mailer-box", "mailer_box", dims)) as DesignDataV2
  envelope.manifest.dieline = oldGeometry
  delete envelope.manifest.dielineOverlaps

  const { state, provenance, manifest } = deserializeDesignData(envelope)
  const restored = normalizeFromManifest(state, manifest)
  const edited = {
    ...restored,
    manifestMetadata: provenance,
    model: { ...restored.model, dimensions: { length: 200, width: 150, height: 50 } },
  } as DesignCoreState
  const resaved = serializeDesignData(edited)
  assert.ok(resaved.manifest.dieline, "fresh geometry written for the new dimensions")
  assert.equal(resaved.manifest.dielineSource, undefined, "a new revision is not labelled as the stored snapshot")
  assert.notDeepEqual(resaved.manifest.dieline!.panels, oldGeometry.panels, "new geometry, not the old snapshot")
  assert.deepEqual(resaved.manifest.dieline!.dims, { length: 200, width: 150, height: 50, unit: "mm" })
})

test("negative control: after a dimension edit to another unsupported size, the stale snapshot is NOT re-emitted and exact is not claimed", () => {
  const saved = oldEngineEnvelope(SHIPPING, "prod-shipping-box", "shipping-box", "shipping_box",
    { length: 400, width: 300, height: 250 }, { length: 250, width: 200, height: 150 })
  const { state, provenance, manifest } = deserializeDesignData(saved)
  const restored = normalizeFromManifest(state, manifest)
  const edited = {
    ...restored,
    manifestMetadata: provenance,
    model: { ...restored.model, dimensions: { length: 260, width: 210, height: 160 } },
  } as DesignCoreState
  const resaved = serializeDesignData(edited)
  assert.equal(resaved.manifest.dieline, undefined, "a snapshot for different dimensions must not be passed off as this design's geometry")
  assert.equal(resaved.manifest.dielineSource, undefined)
  assert.equal(resaved.reproducibility, "best_effort", "no geometry reproduced — exact must not be claimed")
})
