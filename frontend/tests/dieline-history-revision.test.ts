import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { buildDieline } from "../lib/editor/geometry/dieline.ts"
import { resolveDieline, selectEffectiveDieline, dielineRuntimeStatus, type DielineResolution } from "../lib/editor/geometry/resolve-dieline.ts"
import {
  serializeDesignData,
  deserializeDesignData,
  normalizeFromManifest,
  type DesignDataV2,
} from "../lib/editor/services/dieline-manifest.ts"
import { serializeSVG } from "../lib/editor/services/dieline-service.ts"
import { createHash } from "node:crypto"
import {
  assembleDielineDelivery,
  canonicalLiveGeometry,
  canonicalSvg,
  artifactsMatch,
} from "../lib/editor/services/certified-export.ts"
import { invalidateStaleStoredSnapshot } from "../lib/editor/state/stored-snapshot.ts"
import { mmToPx } from "../lib/editor/geometry/units.ts"
import type { DielineBlueprint, DielineGeometry } from "../../shared/types/index.ts"
import type { DesignCoreState } from "../lib/editor/state/types.ts"

// Whole-path revision semantics for restored dieline snapshots:
//
//   load → the saved snapshot is the EFFECTIVE geometry (one selector
//   shared by display, SVG export, certified export and save), so what
//   is shown is what is downloaded is what an unchanged save re-emits.
//
//   edit → a geometry-input commit through the store's history boundary
//   invalidates the carrier (invalidateStaleStoredSnapshot, the pure rule
//   pushToHistory applies); changing the inputs back afterwards does NOT
//   resurrect it. Only undo/redo — whole-revision restores that bypass
//   the rule — bring the historical revision back.
//
// The zustand store cannot be imported by the node unit runner
// (extensionless/@/ imports in its graph — the established pattern in
// this repo is pure helpers + source assertions), so the history
// behaviour is exercised through a simulator that mirrors pushToHistory
// / undo / redo exactly, plus source assertions on the store wiring.

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

/** The storage restore pipeline (services/storage.ts). */
function restore(envelope: DesignDataV2): DesignCoreState {
  const { state, provenance, manifest } = deserializeDesignData(JSON.parse(JSON.stringify(envelope)))
  const restored = normalizeFromManifest(state, manifest)
  return { ...restored, manifestMetadata: provenance } as DesignCoreState
}

/** The old-engine enlarged-mailer envelope (pre-patch resolver fixture). */
function oldMailerEnvelope(): { envelope: DesignDataV2; oldGeometry: DielineGeometry; dims: Dims } {
  const oldGeometry = JSON.parse(
    readFileSync("tests/fixtures/old-mailer-265-geometry.json", "utf8")
  ) as DielineGeometry
  const dims = { length: 265, width: 195, height: 60 }
  const envelope = serializeDesignData(stateFor(MAILER, "prod-mailer-box", "mailer-box", "mailer_box", dims)) as DesignDataV2
  envelope.manifest.dieline = oldGeometry
  envelope.manifest.faces = Object.fromEntries(
    Object.entries(oldGeometry.panels).map(([faceId, p]) => [faceId, { w: p.w, h: p.h }])
  )
  delete envelope.manifest.dielineOverlaps
  delete envelope.manifest.dielineSerializerVersion
  return { envelope, oldGeometry, dims }
}

function effectiveFor(state: DesignCoreState): Extract<DielineResolution, { ok: true }> {
  const effective = selectEffectiveDieline(resolveDieline(state.product?.dieline, state.model.dimensions), {
    productId: state.product?.id,
    dims: state.model.dimensions,
    stored: state.storedDielineSnapshot,
  })
  if (!effective.ok) throw new Error(`expected effective geometry, got ${effective.reason}`)
  return effective
}

/** Mirrors the store's pushToHistory / undo / redo semantics exactly:
 *  commits pass through invalidateStaleStoredSnapshot; undo/redo restore
 *  whole revisions verbatim and never apply it. */
class HistorySim {
  past: DesignCoreState[] = []
  future: DesignCoreState[] = []
  present: DesignCoreState
  constructor(present: DesignCoreState) {
    this.present = present
  }
  commit(next: DesignCoreState) {
    const committed = invalidateStaleStoredSnapshot(this.present, next)
    this.past.push(this.present)
    this.present = committed
    this.future = []
  }
  undo() {
    const previous = this.past.pop()
    if (!previous) return
    this.future.unshift(this.present)
    this.present = previous
  }
  redo() {
    const next = this.future.shift()
    if (!next) return
    this.past.push(this.present)
    this.present = next
  }
}

test("historical identity: load → display, download, certified and save all use the saved snapshot (enlarged mailer)", () => {
  const { envelope, oldGeometry, dims } = oldMailerEnvelope()
  const restored = restore(envelope)
  assert.ok(restored.storedDielineSnapshot, "restore attaches the carrier")

  // Display: the selector picks the stored snapshot, not the fresh relayout.
  const effective = effectiveFor(restored)
  assert.ok(effective.ok)
  assert.equal(effective.source, "stored")
  assert.deepEqual(effective.geometry.panels, oldGeometry.panels)

  // Download: the exported bytes are the saved geometry's bytes.
  assert.equal(serializeSVG(effective.geometry), serializeSVG(oldGeometry))

  // Certified: live geometry through the same selector IS the persisted
  // geometry, so the byte-identity coverage check compares like with like.
  const live = canonicalLiveGeometry({
    blueprint: MAILER,
    dims,
    productId: "prod-mailer-box",
    stored: restored.storedDielineSnapshot,
  })
  assert.ok(live)
  assert.deepEqual(live!.panels, oldGeometry.panels)
  assert.ok(artifactsMatch(canonicalSvg(live!), canonicalSvg(oldGeometry)))

  // Save: an unchanged save re-emits the same snapshot, marked as stored.
  const resaved = serializeDesignData(restored)
  assert.deepEqual(resaved.manifest.dieline!.panels, oldGeometry.panels)
  assert.equal(resaved.manifest.dielineSource, "stored-snapshot")
})

test("historical identity, non-mailer: a stored shipping snapshot that differs from fresh resolution wins at unchanged inputs", () => {
  const authored = { length: 400, width: 300, height: 250 }
  const envelope = serializeDesignData(stateFor(SHIPPING, "prod-shipping-box", "shipping-box", "shipping_box", authored)) as DesignDataV2
  // An older engine's placement: same dims/product, one panel elsewhere.
  const shifted = JSON.parse(JSON.stringify(envelope.manifest.dieline!)) as DielineGeometry
  shifted.panels.front = { ...shifted.panels.front, x: shifted.panels.front.x + 7 }
  envelope.manifest.dieline = shifted

  const restored = restore(envelope)
  const effective = effectiveFor(restored)
  assert.ok(effective.ok)
  assert.equal(effective.source, "stored")
  assert.equal(effective.geometry.panels.front.x, shifted.panels.front.x)
  const resaved = serializeDesignData(restored)
  assert.deepEqual(resaved.manifest.dieline!.panels, shifted.panels)
})

test("edit starts a new revision and changing back does NOT resurrect the old carrier", () => {
  const { envelope, oldGeometry, dims } = oldMailerEnvelope()
  const history = new HistorySim(restore(envelope))
  assert.equal(effectiveFor(history.present).source, "stored")

  // +11 length edit through the history boundary.
  history.commit({
    ...history.present,
    model: { ...history.present.model, dimensions: { ...dims, length: dims.length + 11 } },
  })
  assert.equal(history.present.storedDielineSnapshot, undefined, "the edit invalidates the carrier")
  assert.equal(effectiveFor(history.present).source, "fresh")

  // Change back to the original dimensions — an ordinary edit, not undo.
  history.commit({
    ...history.present,
    model: { ...history.present.model, dimensions: dims },
  })
  assert.equal(history.present.storedDielineSnapshot, undefined, "the old carrier stays dead")
  const effective = effectiveFor(history.present)
  assert.equal(effective.source, "fresh")
  assert.ok(effective.ok)
  assert.deepEqual(effective.geometry.panels, buildDieline(MAILER, dims).panels, "fresh relayout, not the old snapshot")
  assert.notDeepEqual(effective.geometry.panels, oldGeometry.panels)

  // The save after change-back is a fresh revision: no stored marker.
  const saved = serializeDesignData(history.present)
  assert.equal(saved.manifest.dielineSource, undefined)
  assert.deepEqual(saved.manifest.dieline!.panels, buildDieline(MAILER, dims).panels)
})

test("undo/redo across an edit are revision-aware: undo restores the historical revision, redo drops it again", () => {
  const { envelope, dims } = oldMailerEnvelope()
  const restored = restore(envelope)
  const carrier = restored.storedDielineSnapshot
  const history = new HistorySim(restored)

  history.commit({
    ...history.present,
    model: { ...history.present.model, dimensions: { ...dims, length: dims.length + 11 } },
  })
  assert.equal(history.present.storedDielineSnapshot, undefined)

  history.undo()
  assert.equal(history.present.storedDielineSnapshot, carrier, "undo restores the carrier with its revision")
  assert.equal(effectiveFor(history.present).source, "stored")

  history.redo()
  assert.equal(history.present.storedDielineSnapshot, undefined, "redo returns to the edited revision")
  assert.equal(effectiveFor(history.present).source, "fresh")
})

test("carrier boundaries: product or material edits invalidate; layer edits and fresh restores do not", () => {
  const { envelope } = oldMailerEnvelope()
  const restored = restore(envelope)
  const carrier = restored.storedDielineSnapshot

  const productChanged = invalidateStaleStoredSnapshot(restored, {
    ...restored,
    product: { ...restored.product!, id: "prod-other", slug: "custom-other" },
  })
  assert.equal(productChanged.storedDielineSnapshot, undefined, "product change invalidates")

  const materialChanged = invalidateStaleStoredSnapshot(restored, {
    ...restored,
    model: { ...restored.model, material: "cardboard-white" },
  })
  assert.equal(materialChanged.storedDielineSnapshot, undefined, "material change invalidates")

  const layerEdited = invalidateStaleStoredSnapshot(restored, {
    ...restored,
    layers: [{ id: "l1" } as never],
  })
  assert.equal(layerEdited.storedDielineSnapshot, carrier, "artwork edits keep the carrier")

  // A restore installing a NEW carrier object is never stripped, even in
  // the same commit as a dimension change — identity, not content, rules.
  const newCarrier = { geometry: carrier!.geometry, productId: carrier!.productId }
  const reinstalled = invalidateStaleStoredSnapshot(restored, {
    ...restored,
    storedDielineSnapshot: newCarrier,
    model: { ...restored.model, dimensions: { length: 100, width: 60, height: 30 } },
  })
  assert.equal(reinstalled.storedDielineSnapshot, newCarrier, "a freshly installed carrier is kept")
})

test("serializer versioning: the version lives in records, never in the artifact bytes — F42 zero-origin bytes are identical to the pre-versioning serializer", () => {
  const authored = { length: 115, width: 70, height: 38 }
  const svg = serializeSVG(buildDieline(MAILER, authored))
  assert.ok(!svg.includes("data-dieline-serializer"), "no version marker in the SVG bytes")
  // Byte identity against the combined-patch (pre-versioning) serializer,
  // whose F42 output hashes to this value: the certified mailer's
  // recorded geometry hash and the backend byte comparisons depend on
  // zero-origin output staying exactly these bytes.
  assert.equal(
    createHash("sha256").update(svg).digest("hex"),
    "f125005fe59ae13e79abcdaf968f96aea0d42bef7e4e3e946bd654d86357d343",
    "F42 zero-origin bytes unchanged"
  )

  const freshSave = serializeDesignData(stateFor(MAILER, "prod-mailer-box", "mailer-box", "mailer_box", authored))
  assert.equal(freshSave.manifest.dielineSerializerVersion, 2, "fresh saves record the current version")

  // A pre-versioning envelope (no stamp) resaves without gaining one on
  // its stored snapshot; an envelope stamped 1 keeps 1.
  const { envelope } = oldMailerEnvelope()
  const resaved = serializeDesignData(restore(envelope))
  assert.equal(resaved.manifest.dielineSerializerVersion, undefined, "pre-versioning history stays unmarked")
  envelope.manifest.dielineSerializerVersion = 1
  const resavedV1 = serializeDesignData(restore(envelope))
  assert.equal(resavedV1.manifest.dielineSerializerVersion, 1, "a stored snapshot keeps its saved version")

  // The delivered-certification receipt records the artifact's version.
  const delivery = assembleDielineDelivery({
    geometry: buildDieline(MAILER, authored),
    boxType: "mailer-box",
    assessment: { status: "CERTIFIED", reason: "test" },
    checkedAt: null,
  })
  assert.equal(delivery.status, "delivered")
  assert.equal(delivery.status === "delivered" ? delivery.serializerVersion : 0, 2)
})

test("sidebar runtime status: blocked opening sizes, fresh mailer, stored historical snapshot — from the same selector", () => {
  const statusFor = (blueprint: DielineBlueprint | undefined, dims: Dims, stored?: DesignCoreState["storedDielineSnapshot"], productId?: string) =>
    dielineRuntimeStatus(selectEffectiveDieline(resolveDieline(blueprint, dims), { productId, dims, stored }))

  assert.equal(statusFor(SHIPPING, { length: 250, width: 200, height: 150 }), "unsupported", "shipping at its editor-open size is blocked")
  assert.equal(statusFor(PIZZA, { length: 250, width: 250, height: 40 }), "unsupported", "pizza at its editor-open size is blocked")
  assert.equal(statusFor(MAILER, { length: 115, width: 70, height: 38 }), "fresh", "mailer resolves fresh")
  assert.equal(statusFor(undefined, { length: 115, width: 70, height: 38 }), undefined, "no blueprint → no runtime status (catalogue readiness only)")

  const { envelope } = oldMailerEnvelope()
  const restored = restore(envelope)
  assert.equal(
    statusFor(MAILER, restored.model.dimensions, restored.storedDielineSnapshot, "prod-mailer-box"),
    "stored",
    "a restored historical design reports stored geometry"
  )

  // The sidebar renders this status next to the UNCHANGED catalogue
  // readiness line, driven by the selector, with EN/AR text.
  const sidebar = readFileSync("components/editor/layout/EditorRightSidebar.tsx", "utf8")
  assert.ok(sidebar.includes("data-dieline-status={dielineStatus}"), "status line carries the runtime status")
  assert.ok(sidebar.includes("selectEffectiveDieline(resolveDieline("), "sidebar status comes from the shared selector")
  assert.ok(sidebar.includes("s.storedDielineSnapshot"), "sidebar subscribes to the carrier")
  assert.ok(sidebar.includes("Stored geometry from an earlier version"), "EN stored wording")
  assert.ok(sidebar.includes("Unavailable — unsupported size"), "EN unsupported wording")
  assert.ok(sidebar.includes("هندسة محفوظة من إصدار سابق"), "AR stored wording")
  assert.ok(
    sidebar.includes("readinessLabel(currentCatalogue.readiness.dieline,language)"),
    "the catalogue readiness line itself is unchanged"
  )
})

test("wiring: the store applies the invalidation only at the history commit; display and certified paths use the selector", () => {
  const store = readFileSync("lib/editor/state/store.ts", "utf8")
  assert.ok(store.includes("invalidateStaleStoredSnapshot(state.history.present, nextCore)"), "pushToHistory applies the rule")
  assert.equal(store.split("invalidateStaleStoredSnapshot").length - 1, 2, "import + the single commit call site — undo/redo never apply it")

  const packhelp = readFileSync("components/design-editor/PackhelpEditor.tsx", "utf8")
  assert.ok(packhelp.includes("selectEffectiveDieline(resolveDieline("), "display resolution passes through the selector")
  assert.ok(packhelp.includes("s.storedDielineSnapshot"), "the editor subscribes to the carrier")

  const view = readFileSync("components/editor/canvas/DielineView.tsx", "utf8")
  assert.ok(view.includes("data-dieline-stored"), "historical mode is visible in the dieline view")
  assert.ok(view.includes('resolution.source === "stored"'))

  const context = readFileSync("components/editor/export/certified-export-context.tsx", "utf8")
  assert.ok(context.includes("stored: storedDielineSnapshot"), "certified export receives the carrier")
})
