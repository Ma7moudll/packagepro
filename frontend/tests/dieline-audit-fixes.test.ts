import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { buildDieline } from "../lib/editor/geometry/dieline.ts"
import { checkOverlaps, serializeSVG } from "../lib/editor/services/dieline-service.ts"
import { serializeDesignData, type DesignDataV2 } from "../lib/editor/services/dieline-manifest.ts"
import { mmToPx } from "../lib/editor/geometry/units.ts"
import type { DielineBlueprint } from "../../shared/types/index.ts"
import type { DesignCoreState } from "../lib/editor/state/types.ts"

// Audit fixes, reconciled with the hybrid layout engine:
//  1. Resolved geometry whose panels overlap is recorded on the manifest
//     (dielineOverlaps) instead of being presented as a clean snapshot,
//     and the dieline view refuses to export it. With the hybrid engine
//     an overlap can still reach a save one way: a blueprint whose own
//     AUTHORED layout overlaps (the authored size is the compatibility
//     baseline and resolves verbatim). The planted fixture below is
//     exactly that case.
//  2. The view is fail-closed: a failed resolution (unsupported size or
//     error) shows an explicit blocked notice with NO export, instead of
//     falling through to the generic M7 legacy net; only a genuinely
//     absent blueprint (no-blueprint) keeps the legacy delegate.

const cut = { class: "cut" } as const

function plantedBlueprint(backX: number): DielineBlueprint {
  return {
    schemaVersion: 1,
    boxType: "planted-box",
    faceOrder: ["front", "back", "top"],
    outline: { w: 200, h: 140 },
    panels: {
      front: { faceId: "front", x: 0, y: 0, w: 100, h: 60, rotation: 0, edges: { top: cut, right: cut, bottom: cut, left: cut } },
      back: { faceId: "back", x: backX, y: 0, w: 100, h: 60, rotation: 0, edges: { top: cut, right: cut, bottom: cut, left: cut } },
      top: { faceId: "top", x: 0, y: 60, w: 100, h: 80, rotation: 0, edges: { top: cut, right: cut, bottom: cut, left: cut } },
    },
  } as unknown as DielineBlueprint
}

function plantedState(blueprint: DielineBlueprint): DesignCoreState {
  return {
    canvas: { width: mmToPx(100), height: mmToPx(60), backgroundColor: "#ffffff" },
    model: {
      type: "planted_box",
      category: "boxes",
      dimensions: { length: 100, width: 80, height: 60 },
      material: "cardboard-kraft",
      faces: ["front", "back", "top"].map((id) => ({ id, name: id })),
      printCoverage: "outside",
      adhesiveStrip: "none",
      finishing: "none",
      lamination: "none",
      fluteType: "E",
      colorVariant: "full_color",
      quantity: 50,
    },
    layers: [],
    selectedLayerIds: [],
    camera: { position: [4, 4, 4], target: [0, 0, 0], zoom: 1 },
    activeTool: "select",
    ui: {
      leftSidebarOpen: true, rightSidebarOpen: true, gridVisible: true, guidesVisible: true,
      selectedFace: "front", viewMode: "2d", boxOpenState: 0,
    },
    lifecycleStatus: "DRAFT",
    product: {
      id: "prod-planted-box", slug: "planted-box", name: "Planted Box", type: "box", boxType: "planted-box",
      dieline: blueprint,
    },
  } as unknown as DesignCoreState
}

test("engine control: the planted blueprint overlaps at its authored size and is clean when authored coherently", () => {
  const overlapping = buildDieline(plantedBlueprint(50), { length: 100, width: 80, height: 60 })
  assert.deepEqual(checkOverlaps(overlapping), [{ a: "front", b: "back" }])
  const coherent = buildDieline(plantedBlueprint(100), { length: 100, width: 80, height: 60 })
  assert.deepEqual(checkOverlaps(coherent), [])
})

test("manifest: coherent geometry saves clean; overlapping authored geometry is recorded, not hidden", () => {
  const clean = serializeDesignData(plantedState(plantedBlueprint(100))) as DesignDataV2
  assert.ok(clean.manifest.dieline, "blueprint snapshot persists")
  assert.equal(clean.manifest.dielineOverlaps, undefined)
  assert.equal(clean.reproducibility, "exact")

  const broken = serializeDesignData(plantedState(plantedBlueprint(50))) as DesignDataV2
  assert.ok(broken.manifest.dieline, "the snapshot itself is still persisted (history is not altered)")
  assert.deepEqual(broken.manifest.dielineOverlaps, [{ a: "front", b: "back" }])
})

test("negative control: a no-blueprint design carries neither a dieline snapshot nor overlaps", () => {
  const state = plantedState(plantedBlueprint(50))
  const noBlueprint = {
    ...state,
    product: { id: "prod-gift-box", slug: "custom-gift-box", name: "Gift Box", type: "box", boxType: "gift-box" },
    model: { ...state.model, type: "gift_box" },
  } as unknown as DesignCoreState
  const envelope = serializeDesignData(noBlueprint) as DesignDataV2
  assert.equal(envelope.manifest.dieline, undefined)
  assert.equal(envelope.manifest.dielineOverlaps, undefined)
})

test("output geometry control: serializeSVG output is unchanged in form for coherent and overlapping geometry", () => {
  // The gate lives in the view's export handler and the manifest record —
  // the canonical serializer is not altered.
  const coherentSvg = serializeSVG(buildDieline(plantedBlueprint(100), { length: 100, width: 80, height: 60 }))
  assert.ok(coherentSvg.includes('data-face-id="front"'))
  const overlappingSvg = serializeSVG(buildDieline(plantedBlueprint(50), { length: 100, width: 80, height: 60 }))
  assert.ok(overlappingSvg.includes('data-face-id="front"'))
})

test("view gate: DielineView checks overlaps, warns on screen and blocks the SVG export", () => {
  const view = readFileSync("components/editor/canvas/DielineView.tsx", "utf8")
  assert.ok(view.includes("checkOverlaps("), "view resolves overlaps from the canonical geometry")
  assert.ok(view.includes("data-dieline-overlaps"), "overlap state is visible on screen")
  assert.ok(view.includes("Export blocked: the resolved dieline panels overlap"), "export refusal message")
})

test("view fail-closed: a failed or unsupported-size resolution is blocked explicitly; only no-blueprint reaches the legacy delegate", () => {
  const view = readFileSync("components/editor/canvas/DielineView.tsx", "utf8")
  assert.ok(view.includes('resolution.reason !== "no-blueprint"'), "the view distinguishes no-blueprint from failed resolution")
  assert.ok(view.includes("data-dieline-blocked={resolution.reason}"), "the blocked state is explicit and detectable")
  assert.ok(view.includes("no substitute layout has been generated"), "the notice says no generic net was substituted")
  // The legacy delegate remains, reachable only on the blueprint-absent path.
  assert.ok(view.includes("return <M7DielineFallback />"), "legacy delegate kept for no-blueprint")
  const blockedAt = view.indexOf("data-dieline-blocked")
  const fallbackAt = view.indexOf("return <M7DielineFallback />")
  assert.ok(blockedAt >= 0 && fallbackAt > blockedAt, "the blocked branch is evaluated before the fallback")
  const fallback = readFileSync("components/editor/canvas/M7DielineFallback.tsx", "utf8")
  assert.ok(fallback.includes("generateDieline"), "M7 fallback keeps the legacy delegate")
  const canvas = readFileSync("components/editor/canvas/DielineCanvas.tsx", "utf8")
  assert.ok(canvas.includes("DeferredDielinePlaceholder"), "deferred products still get the placeholder")
  assert.ok(!canvas.includes("ReferenceDielineView"), "no second geometry surface was added")
})

test("origin consistency: the view's line overlay and the annotation overlay carry the bounds-origin viewBox", () => {
  // Both inline SVGs draw absolute geometry coordinates inside an element
  // positioned at the bounds origin — without a matching viewBox the
  // lines would be shifted by the origin and clipped, as the exported
  // SVG was. Zero-origin layouts are unaffected (viewBox starts at 0 0).
  const view = readFileSync("components/editor/canvas/DielineView.tsx", "utf8")
  assert.ok(view.includes("viewBox={bounds ? `${bounds.x0} ${bounds.y0} ${sheetW} ${sheetH}` : undefined}"), "line overlay viewBox from the shared bounds")
  const annotations = readFileSync("components/editor/canvas/DielineAnnotations.tsx", "utf8")
  assert.ok(annotations.includes("viewBox={`${bounds.x0} ${bounds.y0} ${bounds.sheetW} ${bounds.sheetH}`}"), "annotation overlay viewBox from the shared bounds")
  const service = readFileSync("lib/editor/services/dieline-service.ts", "utf8")
  assert.ok(service.includes("flatBounds(geometry)"), "the serializer uses the single shared bounds helper")
  assert.ok(service.includes('viewBox="${fmt(x0)} ${fmt(y0)}'), "the exported viewBox starts at the real origin")
})

test("single resolution point preserved: PackhelpEditor resolves once and builds no parallel geometry", () => {
  const packhelp = readFileSync("components/design-editor/PackhelpEditor.tsx", "utf8")
  assert.equal(packhelp.split("resolveDieline(").length - 1, 1)
  assert.ok(!packhelp.includes("buildReferenceDieline"))
  assert.ok(!packhelp.includes("reference-dieline"))
})
