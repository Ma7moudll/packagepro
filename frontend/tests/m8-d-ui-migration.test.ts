import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import type { DielineBlueprint } from "../../shared/types/index.ts"
import { buildDieline, flatBounds } from "../lib/editor/geometry/dieline.ts"
import { resolveDieline } from "../lib/editor/geometry/resolve-dieline.ts"
import { facePanel } from "../lib/editor/geometry/units.ts"
import { serializeSVG, checkOverlaps } from "../lib/editor/services/dieline-service.ts"

// M8-D: migrated dieline UI binds to the canonical M8-C geometry authority.
//
//   A  migrated UI consumes buildDieline()/resolveDieline() output
//   B  migrated UI no longer imports dieline-generator (only M7DielineFallback)
//   C  legacy DielineService geometry/template generation is retired
//   D  no duplicate panel-position / edge-path / outline / overlap impl in UI
//   E  panel dims come from the canonical engine (facePanel), never hardcoded
//   F  cut/fold/score/glue/perf lines come from DielineGeometry arrays
//   G  faces keep canonical FaceIds + data-face-id groups
//   H  no legacy 0.5 display scale in the migrated (blueprint) path
//   I  F42 regression: 370×178 sheet, 12 face groups, front 115×38 / top
//      115×70 / left 70×38
//   J  blueprint-absent products resolve to the M7 compat no-blueprint path
//   K  single resolution point: resolveDieline called in exactly one prod site,
//      children consume the RESULT (never resolve themselves)

const FACE_IDS: readonly string[] = [
  "front", "back", "left", "right", "top", "bottom",
  "inside_front", "inside_back", "inside_left", "inside_right",
  "inside_top", "inside_bottom",
]
const MAILER_DIMS = { length: 115, width: 70, height: 38 }

const mailerBlueprint: DielineBlueprint = {
  schemaVersion: 1,
  boxType: "mailer-box",
  faceOrder: ["left", "front", "right", "back", "top", "bottom"],
  // Exact seed MAILER_DIELINE_TEMPLATE (F42) — see dieline-geometry.test.ts.
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

const read = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), "utf8")

function buildMailerGeometry() {
  const resolution = resolveDieline(mailerBlueprint, MAILER_DIMS)
  assert.equal(resolution.ok, true)
  return (resolution as { ok: true; geometry: ReturnType<typeof buildDieline> }).geometry
}

// A — the migrated UI consumes the canonical resolution (geometry object).
test("A: resolveDieline produces canonical DielineGeometry the UI consumes", () => {
  const geometry = buildMailerGeometry()
  assert.equal(geometry.schemaVersion, 1)
  assert.equal(geometry.boxType, "mailer-box")
  assert.deepEqual(geometry.dims, { length: 115, width: 70, height: 38, unit: "mm" })
  assert.ok(geometry.panels)
  assert.ok(Array.isArray(geometry.cutPaths))
  assert.ok(Array.isArray(geometry.foldPaths))
  assert.ok(Array.isArray(geometry.adjacency))
})

// E — panel sizes come from the canonical engine (facePanel), never hardcoded
// in the UI.
test("E: panel dims equal the canonical facePanel mapping for all 12 faces", () => {
  const geometry = buildMailerGeometry()
  for (const faceId of FACE_IDS) {
    const panel = geometry.panels[faceId as keyof typeof geometry.panels]
    const { w, h } = facePanel(MAILER_DIMS, faceId as Parameters<typeof facePanel>[1])
    assert.equal(panel.w, w, `panel w ${faceId}`)
    assert.equal(panel.h, h, `panel h ${faceId}`)
  }
})

// F — per-class line arrays come straight from DielineGeometry.
test("F: cut/fold/score/glue/perf lines reflect the geometry arrays (F42 truth)", () => {
  const geometry = buildMailerGeometry()
  assert.equal(geometry.cutPaths.length, 9)
  assert.equal(geometry.foldPaths.length, 5)
  assert.equal(geometry.scorePaths.length, 0)
  assert.equal(geometry.gluePaths.length, 5)
  assert.equal(geometry.perfPaths.length, 0)
  assert.equal(geometry.outline.length, 1)
  for (const path of [...geometry.cutPaths, ...geometry.foldPaths, ...geometry.gluePaths]) {
    assert.ok(path.id.length > 0)
    assert.ok(path.points.length >= 2)
    assert.equal(path.class !== undefined, true)
  }
})

// I — F42 regression: sheet 370×178, 12 face groups, key panel sizes, no px,
// no overlaps.
test("I: F42 sheet renders 370×178 with 12 canonical groups and no overlaps", () => {
  const geometry = buildMailerGeometry()
  const bounds = flatBounds(geometry)
  assert.equal(bounds.x1 - bounds.x0, 370)
  assert.equal(bounds.y1 - bounds.y0, 178)
  assert.equal(Object.keys(geometry.panels).length, 12)
  assert.equal(geometry.panels.front.w, 115)
  assert.equal(geometry.panels.front.h, 38)
  assert.equal(geometry.panels.top.w, 115)
  assert.equal(geometry.panels.top.h, 70)
  assert.equal(geometry.panels.left.w, 70)
  assert.equal(geometry.panels.left.h, 38)
  assert.deepEqual(checkOverlaps(geometry), [])

  const svg = serializeSVG(geometry)
  assert.equal(svg.includes(`width="370"`), true)
  assert.equal(svg.includes(`height="178"`), true)
  assert.equal(svg.includes("px"), false)
  assert.equal(svg.includes("3px"), false)
})

// G — faces keep canonical FaceIds and every group is emitted as data-face-id.
test("G: serializer groups carry canonical data-face-id per FaceId", () => {
  const geometry = buildMailerGeometry()
  const svg = serializeSVG(geometry)
  for (const faceId of FACE_IDS) {
    assert.equal(svg.includes(`data-face-id="${faceId}"`), true, `missing ${faceId}`)
  }
  for (const faceId of Object.keys(geometry.panels)) {
    assert.equal(FACE_IDS.includes(faceId), true, `non-canonical face ${faceId}`)
  }
})

// J — blueprint-absent products land on the M7 compat (no-blueprint) path.
test("J: products without a blueprint resolve to the no-blueprint compat path", () => {
  const absent = resolveDieline(undefined, MAILER_DIMS)
  assert.deepEqual(absent, { ok: false, reason: "no-blueprint" })

  const broken = resolveDieline(
    { ...mailerBlueprint, outline: { w: 0, h: 0 } },
    MAILER_DIMS
  )
  assert.equal(broken.ok, false)
  assert.equal(broken.reason, "error")
  assert.ok(typeof broken.error === "string" && broken.error.length > 0)
})

// B — the migrated blueprint path no longer imports the legacy generator; only
// the frozen M7DielineFallback delegate may.
test("B: migrated UI no longer imports dieline-generator (M7 fallback only)", () => {
  for (const rel of ["components/editor/canvas/DielineCanvas.tsx", "components/editor/canvas/DielineView.tsx"]) {
    const src = read(rel)
    assert.equal(src.includes("dieline-generator"), false, `${rel} imports dieline-generator`)
    assert.equal(src.includes("generateDieline("), false, `${rel} calls generateDieline`)
  }
  const fallback = read("components/editor/canvas/M7DielineFallback.tsx")
  assert.equal(fallback.includes("generateDieline"), true, "M7 fallback must keep the legacy delegate")
})

// C — legacy DielineService geometry/template generation is retired.
test("C: legacy DielineService API is gone from the service and migrated UI", () => {
  const service = read("lib/editor/services/dieline-service.ts")
  assert.equal(service.includes("class DielineService"), false)
  assert.equal(service.includes("DielineTemplate"), false)
  assert.equal(service.includes("DielineDesign"), false)
  assert.equal(service.includes("getTemplates("), false)
  assert.equal(service.includes("createDesign("), false)
  assert.equal(service.includes("exportAsSVG("), false)
  assert.equal(service.includes("TEMPLATES"), false)

  for (const rel of ["components/editor/panels/DielineEditor.tsx", "components/editor/canvas/DielineView.tsx"]) {
    const src = read(rel)
    assert.equal(src.includes("DielineService"), false, `${rel} references DielineService`)
    assert.equal(src.includes(".getTemplates("), false)
    assert.equal(src.includes("createDesign("), false)
  }
})

// D — the canonical renderer maps geometry arrays; it never re-derives panels,
// edges, outlines or overlaps.
test("D: DielineView maps geometry arrays and contains no second geometry model", () => {
  const src = read("components/editor/canvas/DielineView.tsx")
  for (const fabricator of ["buildDieline(", "resolveDieline(", "generateDieline(", "edgePoints(", "lineKey(", "const panels =", "aabbOverlap(", "boundsOfPanels("]) {
    assert.equal(src.includes(fabricator), false, `DielineView fabricates geometry via ${fabricator}`)
  }
  assert.equal(src.includes("geometry.panels"), true)
  assert.equal(src.includes("geometry.cutPaths"), true)
  assert.equal(src.includes("geometry.foldPaths"), true)
  assert.equal(src.includes("data-face-id={"), true)
  assert.equal(src.includes("serializeSVG(geometry)"), true)
})

// H — no legacy 0.5 physical geometry scale in the migrated path; it lives
// only in the frozen legacy generator.
test("H: the 0.5 legacy scale is confined to dieline-generator", () => {
  for (const rel of ["components/editor/canvas/DielineCanvas.tsx", "components/editor/canvas/DielineView.tsx", "components/editor/panels/DielineEditor.tsx"]) {
    const src = read(rel)
    assert.equal(/const\s+scale\s*=\s*0\.5/.test(src), false, `${rel} carries the legacy 0.5 scale`)
    assert.equal(src.includes("Math.min(sw * 0.7"), false)
    assert.equal(src.includes("glueTab = 15 * scale"), false)
  }
  const legacy = read("lib/editor/utils/dieline-generator.ts")
  assert.equal(legacy.includes("const scale = 0.5"), true, "legacy generator must keep its documented scale")
})

// K — single resolution point: one resolveDieline call site, children consume
// the result and never resolve themselves.
test("K: packhelp editor hosts the single resolution point; children do not resolve", () => {
  const packhelp = read("components/design-editor/PackhelpEditor.tsx")
  const calls = packhelp.split("resolveDieline(").length - 1
  assert.equal(calls, 1, "resolveDieline must be called exactly once in the prod surface")
  assert.equal(packhelp.includes("<DielineCanvas resolution={dielineResolution}"), true)

  for (const rel of ["components/editor/canvas/DielineCanvas.tsx", "components/editor/canvas/DielineView.tsx"]) {
    const src = read(rel)
    assert.equal(src.includes("resolveDieline("), false, `${rel} must not resolve geometry`)
    assert.equal(src.includes("buildDieline("), false, `${rel} must not call buildDieline`)
  }
})