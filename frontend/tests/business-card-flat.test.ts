import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { getCatalogueProduct } from "../../shared/catalog/products.ts"
import { productPreviewCoverage } from "../lib/editor/product-preview-coverage.ts"
import { productConfiguration, productDimensionChange } from "../lib/editor/product-configuration.ts"
import { facePanel, isTwoFaceSheet, mmToPx } from "../lib/editor/geometry/units.ts"
import { assertNoUnsupportedSheetArtwork, unsupportedArtworkOutputMessage, unsupportedSheetArtwork, withPrintCoverageFaces } from "../lib/editor/print-coverage.ts"
import {
  serializeDesignData,
  deserializeDesignData,
  normalizeFromManifest,
  type DesignDataV2,
} from "../lib/editor/services/dieline-manifest.ts"
import type { DesignCoreState } from "../lib/editor/state/types.ts"

// Business card (flat, front/back) 2D -> 3D connection.
// The card's printable faces are exactly front and back, each
// length x height; the width axis is the 1mm sheet thickness and is
// never a face. Dieline stays deferred and pricing quote-required:
// this wiring changes the preview/editing connection only.

const CARD_DIMS = { length: 85, width: 1, height: 55 }

test("catalogue honesty: business card and related flats stay in_progress / deferred / quote_required", () => {
  for (const id of ["business_card", "loyalty_card", "thank_you_card", "menu_card", "rectangle_label", "circle_label", "square_label"]) {
    const entry = getCatalogueProduct(id)
    assert.ok(entry, id)
    assert.equal(entry.readiness.preview, "in_progress", id)
    assert.equal(entry.readiness.dieline, "deferred", id)
    // rectangle_label already carries seeded estimate-based pricing; the
    // rest (business card included) stay quote-required. Neither changes.
    assert.equal(entry.readiness.pricing, id === "rectangle_label" ? "estimated" : "quote_required", id)
  }
  const coverage = productPreviewCoverage("business_card")
  assert.equal(coverage.family, "flat")
  assert.equal(coverage.geometry, "preview")
  assert.equal(coverage.productionApproved, false)
})

test("seed gives the business card a front/back-only flat structure and no dieline", () => {
  const seed = readFileSync("../backend/prisma/seed.ts", "utf8")
  const structure = seed.match(/const BUSINESS_CARD_STRUCTURE = \{[\s\S]*?\n  \};/)
  assert.ok(structure, "BUSINESS_CARD_STRUCTURE exists")
  assert.match(structure[0], /front: \{ width: 85, height: 55, depth: 1, label: 'Front' \}/)
  assert.match(structure[0], /back: \{ width: 85, height: 55, depth: 1, label: 'Back' \}/)
  assert.doesNotMatch(structure[0], /left:|right:|top:|bottom:/)

  const entry = seed.match(/id: 'prod-business-card',[\s\S]*?\n    \},\n  \];/)
  assert.ok(entry, "hand-seeded prod-business-card entry exists")
  assert.match(entry[0], /structure: BUSINESS_CARD_STRUCTURE/)
  assert.match(entry[0], /support: 'deferred'/)
  assert.match(entry[0], /priceFrom: null/)
  assert.doesNotMatch(entry[0], /dieline:/)
})

test("flat dimension editing exposes width/height only and keeps the sheet axis at 1mm", () => {
  const config = productConfiguration("business_card")
  assert.deepEqual(config.dimensions.map((d) => d.key), ["length", "height"])

  const longer = productDimensionChange("business_card", CARD_DIMS, "length", 90)
  assert.deepEqual(longer, { length: 90, width: 1, height: 55 })
  const taller = productDimensionChange("business_card", CARD_DIMS, "height", 60)
  assert.deepEqual(taller, { length: 85, width: 1, height: 60 })
})

test("front and back faces are both length x height; canvas bounds follow facePanel", () => {
  for (const faceId of ["front", "back"]) {
    assert.deepEqual(facePanel(CARD_DIMS, faceId), { w: 85, h: 55 }, faceId)
    assert.deepEqual(facePanel({ length: 90, width: 1, height: 55 }, faceId), { w: 90, h: 55 }, faceId)
  }
  // The degenerate box faces are not part of the card's face geometry.
  assert.equal(mmToPx(facePanel(CARD_DIMS, "front").w), 255)
  assert.equal(mmToPx(facePanel(CARD_DIMS, "front").h), 165)

  // Texture generator maps front/back to length x height (regression guard).
  const generator = readFileSync("lib/editor/services/texture-generator.ts", "utf8")
  assert.match(generator, /case "front":\s*\n\s*case "back":\s*\n\s*return \{ width: length, height: height \}/)
})

test("store canvas resync is scoped to two-face sheets and guarded by canvas equality", () => {
  const store = readFileSync("lib/editor/state/store.ts", "utf8")
  const apply = store.match(/applyCoreState: \(updater\) => \{[\s\S]*?pushToHistory\(nextCore\)/)
  assert.ok(apply, "applyCoreState found")
  // Only an actual dimension change on a two-face sheet may resync...
  assert.match(apply[0], /isTwoFaceSheet\(nextCore\.model\.faces\)/)
  assert.match(apply[0], /prevDims\.length !== nextDims\.length/)
  assert.match(apply[0], /facePanel\(nextDims, nextCore\.ui\.selectedFace\)/)
  // ...and only when the canvas extent actually differs (no new object).
  assert.match(apply[0], /if \(nextCore\.canvas\.width !== width \|\| nextCore\.canvas\.height !== height\)/)
})

// The store module itself cannot be imported by the node test runner
// (extensionless + aliased imports in its graph), so the reopen/edit
// sequence is exercised against the exact rule the store implements,
// using the same units.ts helpers the store imports. The source
// assertions above pin the store to this rule.
function storeResyncRule(
  state: { faces: { id: string }[]; dims: { length: number; width: number; height: number }; canvas: { width: number; height: number }; selectedFace: string },
  nextDims: { length: number; width: number; height: number }
): { canvas: { width: number; height: number }; changed: boolean } {
  let canvas = state.canvas
  let changed = false
  if (
    isTwoFaceSheet(state.faces) &&
    (state.dims.length !== nextDims.length || state.dims.width !== nextDims.width || state.dims.height !== nextDims.height)
  ) {
    const panel = facePanel(nextDims, state.selectedFace)
    const width = mmToPx(panel.w)
    const height = mmToPx(panel.h)
    if (canvas.width !== width || canvas.height !== height) {
      canvas = { width, height }
      changed = true
    }
  }
  return { canvas, changed }
}

test("regression: save -> close -> edit -> reopen sequence never resyncs the canvas for a mailer box", () => {
  const mailerFaces = ["front", "back", "left", "right", "top", "bottom"].map((id) => ({ id }))
  const state = {
    faces: mailerFaces,
    dims: { length: 200, width: 150, height: 100 },
    canvas: { width: mmToPx(200), height: mmToPx(100) },
    selectedFace: "front",
  }
  let canvasChanges = 0
  // Reopen restores a design whose dims differ from the current state,
  // an init effect re-applies the entry dimensions, and the cycle repeats:
  // none of it may touch the canvas for a box product.
  const sequence = [
    { length: 115, width: 70, height: 38 },
    { length: 200, width: 150, height: 100 },
    { length: 115, width: 70, height: 38 },
    { length: 115, width: 70, height: 38 },
    { length: 200, width: 150, height: 100 },
  ]
  let dims = state.dims
  for (const next of sequence) {
    const r = storeResyncRule({ ...state, dims }, next)
    if (r.changed) canvasChanges++
    dims = next
  }
  assert.equal(canvasChanges, 0)
})

test("regression: card dimension edit resyncs exactly once; repeats and undo-side restores are no-ops", () => {
  const cardFaces = [{ id: "front" }, { id: "back" }]
  const base = {
    faces: cardFaces,
    dims: { length: 85, width: 1, height: 55 },
    canvas: { width: mmToPx(85), height: mmToPx(55) },
    selectedFace: "front",
  }
  // Genuine edit 85 -> 90: exactly one canvas change, to the new extent.
  const edited = storeResyncRule(base, { length: 90, width: 1, height: 55 })
  assert.equal(edited.changed, true)
  assert.deepEqual(edited.canvas, { width: mmToPx(90), height: mmToPx(55) })
  // Re-applying the same dimensions (restore/reopen churn) changes nothing.
  const repeated = storeResyncRule({ ...base, dims: { length: 90, width: 1, height: 55 }, canvas: edited.canvas }, { length: 90, width: 1, height: 55 })
  assert.equal(repeated.changed, false)
  assert.equal(repeated.canvas, edited.canvas)
  // A state whose canvas already matches the target extent is untouched
  // even when dimensions move (updater already sized the canvas).
  const preSized = storeResyncRule({ ...base, canvas: { width: mmToPx(90), height: mmToPx(55) } }, { length: 90, width: 1, height: 55 })
  assert.equal(preSized.changed, false)
})

function cardCore(overrides: Partial<DesignCoreState> = {}): DesignCoreState {
  return {
    canvas: { width: mmToPx(85), height: mmToPx(55), backgroundColor: "#ffffff" },
    model: {
      type: "business_card",
      category: "cards",
      dimensions: { ...CARD_DIMS },
      material: "card-stock-white",
      faces: [
        { id: "front", name: "Front" },
        { id: "back", name: "Back" },
      ],
      printCoverage: "outside",
      adhesiveStrip: "none",
      finishing: "none",
      lamination: "none",
      fluteType: "E",
      colorVariant: "full_color",
      quantity: 50,
    },
    layers: [
      {
        id: "front-text", type: "text", name: "Name", visible: true, locked: false,
        opacity: 1, blendMode: "normal", position: { x: 40, y: 20 }, rotation: 0,
        scale: { x: 1, y: 1 }, faceId: "front",
        textProperties: { content: "Mahmoud", fontFamily: "Arial", fontSize: 12, fontWeight: 700, lineHeight: 1.2, letterSpacing: 0, align: "left", color: "#111111" },
      },
      {
        id: "back-text", type: "text", name: "Contact", visible: true, locked: false,
        opacity: 1, blendMode: "normal", position: { x: 40, y: 20 }, rotation: 0,
        scale: { x: 1, y: 1 }, faceId: "back",
        textProperties: { content: "hello@example.com", fontFamily: "Arial", fontSize: 10, fontWeight: 400, lineHeight: 1.2, letterSpacing: 0, align: "left", color: "#333333" },
      },
    ],
    selectedLayerIds: ["front-text"],
    camera: { position: [4, 4, 4], target: [0, 0, 0], zoom: 1 },
    activeTool: "select",
    ui: {
      leftSidebarOpen: true, rightSidebarOpen: true, gridVisible: true, guidesVisible: true,
      selectedFace: "back", viewMode: "2d", boxOpenState: 0,
    },
    lifecycleStatus: "DRAFT",
    product: { id: "prod-business-card", slug: "custom-business-card", name: "Custom Business Card", type: "label", boxType: "business-card" },
    ...overrides,
  } as DesignCoreState
}

test("save/reload: manifest faces are exactly front/back, layers and dims survive the round trip", () => {
  const envelope = serializeDesignData(cardCore()) as DesignDataV2

  // No blueprint exists for the card, so exactness is never claimed.
  assert.equal(envelope.reproducibility, "best_effort")
  assert.equal(envelope.manifest.dieline, undefined)
  // Exactly the card's two faces — no invented box faces, no 1mm panels.
  assert.deepEqual(Object.keys(envelope.manifest.faces).sort(), ["back", "front"])
  assert.deepEqual(envelope.manifest.faces.front, { w: 85, h: 55 })
  assert.deepEqual(envelope.manifest.faces.back, { w: 85, h: 55 })
  assert.deepEqual(envelope.manifest.variant.dimensions, { length: 85, width: 1, height: 55, unit: "mm" })

  const { state, manifest } = deserializeDesignData(envelope)
  assert.deepEqual(state.model.dimensions, CARD_DIMS)
  assert.deepEqual(state.model.faces.map((f) => f.id), ["front", "back"])
  assert.deepEqual(state.layers.map((l) => [l.id, l.faceId]), [["front-text", "front"], ["back-text", "back"]])

  // Manifest-first reopen sizes the canvas from the selected (back) face.
  const restored = normalizeFromManifest(state, manifest)
  assert.equal(restored.canvas.width, mmToPx(85))
  assert.equal(restored.canvas.height, mmToPx(55))
})

test("regression: a no-blueprint box keeps the canonical 12-face manifest (proof plates unchanged)", () => {
  const boxFaces = ["front", "back", "left", "right", "top", "bottom"].map((id) => ({ id, name: id }))
  const box = cardCore({
    model: {
      ...cardCore().model,
      type: "shipping_box",
      dimensions: { length: 115, width: 70, height: 38 },
      faces: boxFaces as DesignCoreState["model"]["faces"],
    },
    product: { id: "prod-shipping-box", slug: "custom-shipping-box", name: "Shipping Box", type: "box", boxType: "shipping-box" },
  })
  const envelope = serializeDesignData(box) as DesignDataV2
  assert.deepEqual(Object.keys(envelope.manifest.faces).sort(), [
    "back", "bottom", "front", "inside_back", "inside_bottom", "inside_front",
    "inside_left", "inside_right", "inside_top", "left", "right", "top",
  ])
  assert.equal(Object.keys(envelope.manifest.faces).length, 12)
  assert.deepEqual(envelope.manifest.faces.front, { w: 115, h: 38 })
  assert.deepEqual(envelope.manifest.faces.top, { w: 115, h: 70 })
  assert.deepEqual(envelope.manifest.faces.inside_back, { w: 115, h: 38 })

  // A no-blueprint box with NO face list at all also keeps the 12 faces.
  const noFaces = cardCore({
    model: { ...cardCore().model, type: "shipping_box", dimensions: { length: 115, width: 70, height: 38 }, faces: [] },
    product: { id: "prod-shipping-box", slug: "custom-shipping-box", name: "Shipping Box", type: "box", boxType: "shipping-box" },
  })
  const envelope2 = serializeDesignData(noFaces) as DesignDataV2
  assert.equal(Object.keys(envelope2.manifest.faces).length, 12)
  assert.deepEqual(envelope2.manifest.faces, envelope.manifest.faces)
})

test("save/reload after a dimension change persists the new face bounds", () => {
  const resized = cardCore({
    model: { ...cardCore().model, dimensions: { length: 90, width: 1, height: 55 } },
  })
  const envelope = serializeDesignData(resized) as DesignDataV2
  assert.deepEqual(envelope.manifest.faces.front, { w: 90, h: 55 })
  assert.deepEqual(envelope.manifest.faces.back, { w: 90, h: 55 })
})

test("coverage normalization: a card's inside/both coverage is normalized to outside-only in one place", () => {
  const front = { id: "front", name: "Front" }
  const back = { id: "back", name: "Back" }
  const insideFront = { id: "inside_front", name: "Inside Front" }
  const insideBack = { id: "inside_back", name: "Inside Back" }

  // Coverage flag alone (faces not yet expanded): no inside faces appear,
  // and the stored value becomes consistent ("outside").
  for (const coverage of ["inside", "both"]) {
    const normalized = withPrintCoverageFaces({ faces: [front, back], printCoverage: coverage })
    assert.deepEqual(normalized.faces.map((f) => f.id), ["front", "back"])
    assert.equal(normalized.printCoverage, "outside")
  }

  // Restored/crafted state that already carries the inside faces: they are
  // stripped back to the structure's two faces, coverage normalized.
  const restored = withPrintCoverageFaces({ faces: [front, back, insideFront, insideBack], printCoverage: "both" })
  assert.deepEqual(restored.faces.map((f) => f.id), ["front", "back"])
  assert.equal(restored.printCoverage, "outside")
  const restoredInside = withPrintCoverageFaces({ faces: [front, insideFront, back, insideBack], printCoverage: "inside" })
  assert.deepEqual(restoredInside.faces.map((f) => f.id), ["front", "back"])
  assert.equal(restoredInside.printCoverage, "outside")

  // An already-normal card is returned untouched (same object).
  const clean = { faces: [front, back], printCoverage: "outside" }
  assert.equal(withPrintCoverageFaces(clean), clean)
})

test("coverage behavior for boxes is unchanged: inside faces are still added, coverage value preserved", () => {
  const boxFaces = ["front", "back", "left", "right", "top", "bottom"].map((id) => ({ id, name: id }))
  for (const coverage of ["inside", "both"]) {
    const expanded = withPrintCoverageFaces({ faces: boxFaces, printCoverage: coverage })
    assert.equal(expanded.printCoverage, coverage)
    assert.deepEqual(expanded.faces.map((f) => f.id), [
      "front", "back", "left", "right", "top", "bottom",
      "inside_front", "inside_back", "inside_left", "inside_right", "inside_top", "inside_bottom",
    ])
  }
  const outside = { faces: boxFaces, printCoverage: "outside" }
  assert.equal(withPrintCoverageFaces(outside), outside)
})

test("regression: restored card with inside/both coverage -> length edit -> serialize stays a 2-face sheet", () => {
  const craftedFaces = [
    { id: "front", name: "Front" },
    { id: "back", name: "Back" },
    { id: "inside_front", name: "Inside Front" },
    { id: "inside_back", name: "Inside Back" },
  ]
  // The shared rule recognizes the sheet even before normalization.
  assert.equal(isTwoFaceSheet(craftedFaces), true)

  for (const coverage of ["inside", "both"] as const) {
    const restoredState = cardCore({
      model: {
        ...cardCore().model,
        faces: craftedFaces as DesignCoreState["model"]["faces"],
        printCoverage: coverage,
      },
    })

    // Even if a crafted state reached serialize without normalization,
    // the manifest is exactly the two sheet faces — never 12.
    const rawEnvelope = serializeDesignData(restoredState) as DesignDataV2
    assert.deepEqual(Object.keys(rawEnvelope.manifest.faces).sort(), ["back", "front"])

    // The real restore path: applyCoreState runs withPrintCoverageFaces
    // first, then the dimension edit resyncs the canvas via the same rule.
    const normalizedModel = withPrintCoverageFaces(restoredState.model)
    assert.deepEqual(normalizedModel.faces.map((f) => f.id), ["front", "back"])
    assert.equal(normalizedModel.printCoverage, "outside")
    const resync = storeResyncRule(
      { faces: normalizedModel.faces, dims: normalizedModel.dimensions, canvas: restoredState.canvas, selectedFace: "front" },
      { length: 100, width: 1, height: 55 }
    )
    assert.equal(resync.changed, true)
    assert.deepEqual(resync.canvas, { width: mmToPx(100), height: mmToPx(55) })

    // Serialize the edited, normalized state: 2-face manifest, new bounds.
    const edited = {
      ...restoredState,
      model: { ...normalizedModel, dimensions: { length: 100, width: 1, height: 55 } },
      canvas: { ...restoredState.canvas, ...resync.canvas },
    }
    const envelope = serializeDesignData(edited) as DesignDataV2
    assert.deepEqual(Object.keys(envelope.manifest.faces).sort(), ["back", "front"])
    assert.deepEqual(envelope.manifest.faces.front, { w: 100, h: 55 })
    assert.deepEqual(envelope.manifest.faces.back, { w: 100, h: 55 })
  }
})

test("proof plate list: the face keys the proof generator iterates are 2 for the card, 12 for a both-coverage box", () => {
  // backend/src/services/pre-press-checker/proof-generator.ts builds one
  // plate per Object.keys(manifest.faces).sort() entry.
  const card = cardCore({
    model: {
      ...cardCore().model,
      faces: [
        { id: "front", name: "Front" },
        { id: "back", name: "Back" },
        { id: "inside_front", name: "Inside Front" },
        { id: "inside_back", name: "Inside Back" },
      ] as DesignCoreState["model"]["faces"],
      printCoverage: "both",
    },
  })
  const cardPlates = Object.keys((serializeDesignData(card) as DesignDataV2).manifest.faces).sort()
  assert.deepEqual(cardPlates, ["back", "front"])

  const boxFaces = ["front", "back", "left", "right", "top", "bottom"].map((id) => ({ id, name: id }))
  const boxModel = withPrintCoverageFaces({
    faces: boxFaces,
    printCoverage: "both",
    type: "shipping_box",
    dimensions: { length: 115, width: 70, height: 38 },
  })
  const box = cardCore({
    model: { ...cardCore().model, ...boxModel } as DesignCoreState["model"],
    product: { id: "prod-shipping-box", slug: "custom-shipping-box", name: "Shipping Box", type: "box", boxType: "shipping-box" },
  })
  const boxPlates = Object.keys((serializeDesignData(box) as DesignDataV2).manifest.faces).sort()
  assert.equal(boxPlates.length, 12)
  assert.deepEqual(boxPlates, [
    "back", "bottom", "front", "inside_back", "inside_bottom", "inside_front",
    "inside_left", "inside_right", "inside_top", "left", "right", "top",
  ])
})

test("artwork preservation: restored both-coverage card with inside_front artwork keeps everything and is flagged", () => {
  const baseLayer = cardCore().layers.find((l) => l.faceId === "front")!
  const frontLayer: DesignCoreState["layers"][number] = { ...baseLayer, id: "front-art", faceId: "front", textProperties: { content: "OUT FRONT", fontFamily: "Arial", fontSize: 12, fontWeight: 700, lineHeight: 1.2, letterSpacing: 0, align: "left", color: "#111111" } }
  const insideLayer: DesignCoreState["layers"][number] = { ...baseLayer, id: "inside-art", faceId: "inside_front", textProperties: { content: "INSIDE ART", fontFamily: "Arial", fontSize: 12, fontWeight: 700, lineHeight: 1.2, letterSpacing: 0, align: "left", color: "#111111" } }
  const layers = [frontLayer, insideLayer]
  const restoredModel = {
    ...cardCore().model,
    faces: [
      { id: "front", name: "Front" },
      { id: "back", name: "Back" },
      { id: "inside_front", name: "Inside Front" },
      { id: "inside_back", name: "Inside Back" },
    ] as DesignCoreState["model"]["faces"],
    printCoverage: "both" as const,
  }

  // Coverage handling preserves the restored data exactly when inside
  // artwork exists: same object back — faces and coverage value untouched,
  // no silent rewrite. (Mahmoud's runtime case: front "OUT FRONT" layer
  // plus inside_front "INSIDE ART" layer, coverage "both".)
  assert.equal(withPrintCoverageFaces(restoredModel, layers), restoredModel)

  // The same model with NO inside-face artwork still normalizes as before.
  const normalized = withPrintCoverageFaces(restoredModel, [frontLayer])
  assert.deepEqual(normalized.faces.map((f) => f.id), ["front", "back"])
  assert.equal(normalized.printCoverage, "outside")

  // The flag helper reports exactly the unsupported artwork.
  assert.deepEqual(unsupportedSheetArtwork(restoredModel.faces, layers), { faces: ["inside_front"], layerCount: 1 })
  assert.equal(unsupportedSheetArtwork(cardCore().model.faces, cardCore().layers), null)

  // Save (serialize) succeeds and preserves everything: both layers with
  // their original faceIds, the restored faces, and the coverage value.
  const restored = cardCore({ model: restoredModel, layers })
  const envelope = serializeDesignData(restored) as DesignDataV2 & { layers: DesignCoreState["layers"]; model: DesignCoreState["model"] }
  assert.deepEqual(envelope.layers.map((l) => [l.id, l.faceId]), [["front-art", "front"], ["inside-art", "inside_front"]])
  assert.deepEqual(envelope.model.faces.map((f) => f.id), ["front", "back", "inside_front", "inside_back"])
  assert.equal(envelope.model.printCoverage, "both")
  // The manifest still describes the sheet's two printable faces...
  assert.deepEqual(Object.keys(envelope.manifest.faces).sort(), ["back", "front"])
  // ...but it is flagged, so no proof or export can look complete.
  assert.deepEqual(envelope.manifest.unsupportedArtwork, { faces: ["inside_front"], layerCount: 1 })

  // Reload: both layers come back with their original faceIds and content.
  const { state } = deserializeDesignData(envelope)
  assert.deepEqual(state.layers.map((l) => [l.id, l.faceId, l.textProperties?.content]), [
    ["front-art", "front", "OUT FRONT"],
    ["inside-art", "inside_front", "INSIDE ART"],
  ])
  assert.deepEqual(state.model.faces.map((f) => f.id), ["front", "back", "inside_front", "inside_back"])
  assert.equal(state.model.printCoverage, "both")
})

test("artwork protection does not touch boxes: a box with inside-face layers serializes with layers intact", () => {
  const boxFaces = [
    "front", "back", "left", "right", "top", "bottom",
    "inside_front", "inside_back", "inside_left", "inside_right", "inside_top", "inside_bottom",
  ].map((id) => ({ id, name: id }))
  const insideLayer = { ...cardCore().layers[0], id: "box-inside-text", faceId: "inside_front" }
  const box = cardCore({
    model: {
      ...cardCore().model,
      type: "shipping_box",
      dimensions: { length: 115, width: 70, height: 38 },
      faces: boxFaces as DesignCoreState["model"]["faces"],
      printCoverage: "both",
    },
    layers: [...cardCore().layers, insideLayer] as DesignCoreState["layers"],
    product: { id: "prod-shipping-box", slug: "custom-shipping-box", name: "Shipping Box", type: "box", boxType: "shipping-box" },
  })
  const envelope = serializeDesignData(box) as DesignDataV2 & { layers: DesignCoreState["layers"] }
  assert.equal(Object.keys(envelope.manifest.faces).length, 12)
  assert.ok(envelope.layers.some((l) => l.id === "box-inside-text" && l.faceId === "inside_front"))
})

test("shared output boundary: the guard derives from design data (no manifest involved) and names what is blocked", () => {
  const sheetFaces = [
    { id: "front", name: "Front" },
    { id: "back", name: "Back" },
    { id: "inside_front", name: "Inside Front" },
    { id: "inside_back", name: "Inside Back" },
  ]
  const insideLayers = [{ faceId: "inside_front" }]
  // Flag-absent case: the guard reads faces + layers only, so a design
  // whose manifest flag was stripped is still refused.
  assert.throws(
    () => assertNoUnsupportedSheetArtwork(sheetFaces, insideLayers),
    /Export blocked: This card design has 1 artwork layer\(s\) on inside faces \(inside_front\)/
  )
  const message = unsupportedArtworkOutputMessage({ faces: ["inside_front"], layerCount: 1 })
  for (const blocked of ["PDF, SVG, PNG and JPEG export", "current-face PNG reference", "artwork review download", "certified export", "proof generation"]) {
    assert.ok(message.includes(blocked), `message names: ${blocked}`)
  }
  assert.match(message, /artwork is preserved in the design and the design still saves/)

  // A normal card and a box with inside artwork pass the boundary.
  assert.doesNotThrow(() => assertNoUnsupportedSheetArtwork(cardCore().model.faces, cardCore().layers))
  const boxFaces = ["front", "back", "left", "right", "top", "bottom", "inside_front", "inside_back"].map((id) => ({ id, name: id }))
  assert.doesNotThrow(() => assertNoUnsupportedSheetArtwork(boxFaces, insideLayers))
})

test("guarded path: exportDesign (PDF/SVG/PNG/JPEG) refuses at the shared boundary before rendering", () => {
  const source = readFileSync("lib/editor/services/export.ts", "utf8")
  const guardAt = source.indexOf("assertNoUnsupportedSheetArtwork(state.model.faces, state.layers)")
  assert.ok(guardAt > 0, "exportDesign calls the shared guard on the store data")
  assert.ok(guardAt < source.indexOf("await generateTextureFromLayers"), "guard runs before any texture rendering")
})

test("guarded path: Fabric toolbar current-face PNG refuses at the shared boundary and is labeled as a reference", () => {
  const source = readFileSync("components/editor/canvas/DesignCanvas2D.tsx", "utf8")
  const fn = source.match(/const exportDesign = \(\) => \{[\s\S]*?\n  \}/)
  assert.ok(fn, "toolbar exportDesign found")
  assert.match(fn[0], /unsupportedSheetArtwork\(storeState\.model\.faces, storeState\.layers\)/)
  assert.match(fn[0], /unsupportedArtworkOutputMessage\(unsupported\)/)
  assert.ok(fn[0].indexOf("unsupportedSheetArtwork") < fn[0].indexOf("toDataURL"), "guard runs before the canvas is captured")
  // The button is honestly labeled: one face, a PNG reference — not a
  // full-design export.
  assert.match(source, /Download current face \(PNG reference\)/)
})

test("guarded path: artwork review download refuses at the shared boundary", () => {
  const source = readFileSync("components/editor/export/ArtworkReviewDownload.tsx", "utf8")
  assert.match(source, /assertNoUnsupportedSheetArtwork\(store\.history\.present\.model\.faces, store\.history\.present\.layers\)/)
  assert.ok(
    source.indexOf("assertNoUnsupportedSheetArtwork") < source.indexOf("serializeDesignData(structuredClone"),
    "guard runs before the review snapshot is captured"
  )
})

test("guarded path: certified export refuses on refresh and rechecks at download time", () => {
  const source = readFileSync("components/editor/export/certified-export-context.tsx", "utf8")
  assert.match(source, /assertNoUnsupportedSheetArtwork\(model\?\.faces, useDesignStore\.getState\(\)\.layers\)/)
  const download = source.match(/const downloadCertified = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[state\.delivery\]\)/)
  assert.ok(download, "downloadCertified found")
  assert.match(download[0], /unsupportedSheetArtwork\(live\.model\.faces, live\.layers\)/)
  assert.match(download[0], /unsupportedArtworkOutputMessage\(unsupported\)/)
})

test("guarded paths (backend): proof and the design export service derive from saved data, not the flag alone", () => {
  const proof = readFileSync("../backend/src/services/pre-press-checker/proof-generator.ts", "utf8")
  assert.match(proof, /unsupportedArtwork: deriveUnsupportedArtwork\(d\)/)
  assert.match(proof, /Proof blocked: \$\{unsupportedArtworkOutputMessage/)
  const service = readFileSync("../backend/src/modules/designs/design.service.ts", "utf8")
  assert.match(service, /deriveUnsupportedArtwork\(design\.designData\)/)
  assert.match(service, /Export blocked: \$\{unsupportedArtworkOutputMessage\(unsupported\)\}/)
})

test('duplicate sheet faces retain the same unsupported-artwork boundary as the backend', () => {
  assert.deepEqual(unsupportedSheetArtwork([{id:'front'},{id:'front'},{id:'back'}],[{faceId:'inside_front'}]),{faces:['inside_front'],layerCount:1})
})
