import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import type { DielineBlueprint, DielineGeometry, DielinePoint } from "../../shared/types/index.ts"
import { buildDieline, flatBounds } from "../lib/editor/geometry/dieline.ts"
import { resolveDieline } from "../lib/editor/geometry/resolve-dieline.ts"
import { serializeSVG } from "../lib/editor/services/dieline-service.ts"
import {
  deriveFoldAngleAnnotations,
  deriveGlueTabAnnotations,
  deriveCornerAnnotations,
} from "../lib/editor/geometry/annotations.ts"

// M8-G: canonical SVG path-body contract + manifest independence (M8_SPEC §12, M8_PLAN M8-G).
//
//   A  the exported SVG is a well-formed mm document (xxmlns/width/height/viewBox, zero px)
//   B  canonical F42 dimensions: sheet 370×178; front=back 115×38, top=bottom 115×70,
//      left=right 70×38; top/bottom/front visibly distinct in the exported groups
//   C  every exported group is a canonical FaceId — exactly the F42 12-face set, no
//      invented/numeric/`flap` ids; inside_* groups exist and carry no geometry
//   D  each serialized path preserves its canonical path id (data-path-id) — ids round-trip
//      irectly with DielineGeometry arrays (cut=9 fold=5 glue=5 score=0 perf=0 outline=1)
//   E  path BODIES come from canonical points: parsing each `d` reconstructs the canonical
//      polyline (mm, 3dp) and the closed flag — geometry → SVG → geometry round-trip
//   F  classes are distinguishable (cut solid black / fold dashed / glue teal 6-2 / outline);
//      every exported body carries id + class + a real path body
//   G  annotations are screen-only: no fold-angle / glue-tab-leader / corner-relief / ruler /
//      toggle state leaks into the export, even when annotations are derivable
//   H  serializeSVG is pure — geometry deep-equals before and after
//   I  manifest independence (AMENDMENT 5): mutating unrelated editor/manifest state never
//      changes the serialization; output is a pure DielineGeometry → SVG function
//   J  no legacy exporter in the canonical path — mm coords (outline exactly 370×178, not the
//      legacy 0.5 y-compression), no px, no fabric.toSVG, no 3.779, no generateDieline
//   K  static architecture audit (§13): no buildDieline/generateDieline/DielineService/
//      `const panels`/`const edges`/`const faces` in the export implementation, and exactly
//      one serializeSVG call path in the prod export surface
//
// Fixture is the seed MAILER_DIELINE_TEMPLATE (F42 mailer, 115×70×38 mm) exactly, as in
// M8-C / M8-D.

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

const CANONICAL_OUTER = ["front", "back", "left", "right", "top", "bottom"]

function read(rel: string): string {
  return readFileSync(resolve(process.cwd(), rel), "utf8")
}

function buildGeometry(): DielineGeometry {
  const resolution = resolveDieline(mailerBlueprint, MAILER_DIMS)
  assert.equal(resolution.ok, true, "resolution must succeed for the F42 fixture")
  return (resolution as { ok: true; geometry: DielineGeometry }).geometry
}

function fmt(n: number): string {
  return String(Math.round(n * 1000) / 1000)
}

const PATH_RE =
  /<path d="([^"]+)" data-path-id="([^"]+)" class="([^"]+)" style="([^"]+)" \/>/g

const GROUP_RE = /<g data-face-id="([^"]+)">([\s\S]*?)<\/g>/g

const OUTLINE_GROUP_RE = /<g data-role="outline">([\s\S]*?)<\/g>/

interface SerializedPath {
  id: string
  cls: string
  d: string
  style: string
  points: DielinePoint[]
  closed: boolean
}

function parsePaths(svg: string): SerializedPath[] {
  const out: SerializedPath[] = []
  for (const m of svg.matchAll(PATH_RE)) {
    const [, d, id, cls, style] = m
    const nums = d.replace(/[MLZ]/g, " ").trim().split(/\s+/).map(Number)
    const points: DielinePoint[] = []
    for (let i = 0; i + 1 < nums.length; i += 2) points.push({ x: nums[i], y: nums[i + 1] })
    out.push({ id, cls, d, style, points, closed: d.trim().endsWith("Z") })
  }
  return out
}

function pathById(geometry: DielineGeometry, id: string) {
  const all = [
    ...geometry.cutPaths,
    ...geometry.foldPaths,
    ...geometry.scorePaths,
    ...geometry.gluePaths,
    ...geometry.perfPaths,
    ...geometry.outline,
  ]
  const hit = all.find((p) => p.id === id)
  assert.ok(hit, `canonical path ${id} must exist`)
  return hit
}

function groupBodies(svg: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const m of svg.matchAll(GROUP_RE)) {
    map.set(m[1], m[2])
  }
  return map
}

// A — the exported SVG is a well-formed mm document.
test("A: exported SVG is a well-formed mm document (xmlns, dims, viewBox, zero px)", () => {
  const geometry = buildGeometry()
  const svg = serializeSVG(geometry)
  assert.equal(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), true)
  assert.equal(svg.endsWith("</svg>"), true)
  assert.equal(svg.includes(`width="370"`), true)
  assert.equal(svg.includes(`height="178"`), true)
  assert.equal(svg.includes(`viewBox="0 0 370 178"`), true)
  assert.equal(svg.includes("px"), false, "coordinates are millimetres, never pixels")
  assert.equal(svg.includes("fabric"), false, "no fabric serialization")
})

// B — canonical F42 dimensions; top/bottom/front are visibly distinct faces in the export.
test("B: canonical F42 dimensions and distinguishable top/bottom/front groups", () => {
  const geometry = buildGeometry()
  assert.deepEqual(geometry.dims, { length: 115, width: 70, height: 38, unit: "mm" })

  assert.deepEqual(
    [geometry.panels.front.w, geometry.panels.front.h], [115, 38], "front")
  assert.deepEqual(
    [geometry.panels.back.w, geometry.panels.back.h], [115, 38], "back")
  assert.deepEqual(
    [geometry.panels.top.w, geometry.panels.top.h], [115, 70], "top")
  assert.deepEqual(
    [geometry.panels.bottom.w, geometry.panels.bottom.h], [115, 70], "bottom")
  assert.deepEqual(
    [geometry.panels.left.w, geometry.panels.left.h], [70, 38], "left")
  assert.deepEqual(
    [geometry.panels.right.w, geometry.panels.right.h], [70, 38], "right")

  const bounds = flatBounds(geometry)
  assert.deepEqual(bounds, { x0: 0, y0: 0, x1: 370, y1: 178 })

  // Top-difference: every outer face exports a distinct path-body payload.
  const svg = serializeSVG(geometry)
  const bodies = groupBodies(svg)
  for (const faceId of CANONICAL_OUTER) {
    assert.ok(bodies.has(faceId), `missing group ${faceId}`)
  }
  const keys = [...bodies.keys()].filter((k) => CANONICAL_OUTER.includes(k))
  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      assert.notEqual(bodies.get(keys[i]), bodies.get(keys[j]), `${keys[i]} must differ from ${keys[j]}`)
    }
  }
})

// C — every exported group is a canonical FaceId; inside_* are present but empty.
test("C: exactly the canonical F42 FaceId set, no invented/numeric/flap ids", () => {
  const geometry = buildGeometry()
  const svg = serializeSVG(geometry)
  const groups = groupBodies(svg)
  const groupIds = [...groups.keys()].sort()
  assert.deepEqual(groupIds, [...FACE_IDS].sort(), "group set equals the canonical 12-face set")

  const serialized = parsePaths(svg)
  for (const p of serialized) {
    const canonical = pathById(geometry, p.id)
    if (canonical.faceId) {
      assert.equal(groups.has(canonical.faceId), true, `${canonical.faceId} owns ${p.id}`)
      assert.ok(groups.get(canonical.faceId)!.includes(`data-path-id="${p.id}"`))
    }
  }
  for (const faceId of FACE_IDS) {
    assert.equal(faceId.includes("flap"), false)
    assert.equal(faceId.includes("none"), false)
    assert.ok(!/^[0-9]/.test(faceId), "no numeric FaceIds")
  }
  // inside_* are reverse-side mirrors: groups exist, no geometry bodies inside.
  for (const faceId of FACE_IDS.filter((f) => f.startsWith("inside_"))) {
    assert.ok(groups.has(faceId), `inside group ${faceId} must serialize`)
    assert.equal(groups.get(faceId)!.includes("<path"), false, `${faceId} must be empty`)
  }
})

// D — canonical path ids are preserved on every serialized path and round-trip 1:1.
test("D: path IDs preserved (data-path-id) — ids equal the canonical path id set", () => {
  const geometry = buildGeometry()
  const svg = serializeSVG(geometry)
  const serialized = parsePaths(svg)

  assert.equal(geometry.cutPaths.length, 9)
  assert.equal(geometry.foldPaths.length, 5)
  assert.equal(geometry.scorePaths.length, 0)
  assert.equal(geometry.gluePaths.length, 5)
  assert.equal(geometry.perfPaths.length, 0)
  assert.equal(geometry.outline.length, 1)

  const canonicalIds = [
    ...geometry.cutPaths,
    ...geometry.foldPaths,
    ...geometry.scorePaths,
    ...geometry.gluePaths,
    ...geometry.perfPaths,
    ...geometry.outline,
  ].map((p) => p.id)

  const serializedIds = serialized.map((p) => p.id)
  assert.deepEqual([...serializedIds].sort(), [...canonicalIds].sort(), "id sets match 1:1")
  assert.equal(new Set(serializedIds).size, serializedIds.length, "ids are unique")

  const outline = serialized.find((p) => p.id === "outline")
  assert.ok(outline, "outline path id preserved")
  assert.equal(outline.cls, "dieline-outline")
})

// E — path bodies are the canonical points; geometry → SVG → geometry round-trips.
test("E: path bodies come from canonical points (parse `d` == canonical polyline)", () => {
  const geometry = buildGeometry()
  const svg = serializeSVG(geometry)
  const serialized = parsePaths(svg)
  assert.equal(serialized.length, 20, "9 cut + 5 fold + 5 glue + 1 outline")

  for (const p of serialized) {
    const canonical = pathById(geometry, p.id)
    assert.equal(p.closed, canonical.closed === true, `${p.id} closed flag`)
    assert.equal(p.points.length, canonical.points.length, `${p.id} point count`)
    for (let i = 0; i < canonical.points.length; i += 1) {
      assert.equal(Math.abs(p.points[i].x - canonical.points[i].x) < 0.0005, true, `${p.id} x[${i}]`)
      assert.equal(Math.abs(p.points[i].y - canonical.points[i].y) < 0.0005, true, `${p.id} y[${i}]`)
    }
    // Round-trip: rebuilding the polyline from the serialized `d` must reproduce fmt(coords).
    const rebuilt = parsePaths(`<path d="${p.d}" data-path-id="${p.id}" class="${p.cls}" style="${p.style}" />`)
    assert.equal(rebuilt[0].points.length, canonical.points.length, `${p.id} round-trip points`)
  }
})

// F — line classes are distinguishable and every body carries id + class + real geometry.
test("F: classes distinguishable — styles, per-class bodies, no phantom score/perf", () => {
  const geometry = buildGeometry()
  const svg = serializeSVG(geometry)
  const serialized = parsePaths(svg)

  const count = (cls: string) => serialized.filter((p) => p.cls === cls).length
  assert.equal(count("dieline-cut"), 9)
  assert.equal(count("dieline-fold"), 5)
  assert.equal(count("dieline-glue"), 5)
  assert.equal(count("dieline-score"), 0)
  assert.equal(count("dieline-perf"), 0)
  assert.equal(count("dieline-outline"), 1)

  const cut = serialized.find((p) => p.cls === "dieline-cut")!
  assert.equal(cut.style.includes("stroke:#000000"), true)
  assert.equal(cut.style.includes("fill:none"), true)
  const fold = serialized.find((p) => p.cls === "dieline-fold")!
  assert.equal(fold.style.includes("stroke:#666666"), true)
  assert.equal(fold.style.includes("stroke-dasharray:4 2"), true)
  const glue = serialized.find((p) => p.cls === "dieline-glue")!
  assert.equal(glue.style.includes("stroke:#0a7a7a"), true)
  assert.equal(glue.style.includes("stroke-dasharray:6 2"), true)
  const outline = serialized.find((p) => p.cls === "dieline-outline")!
  assert.equal(outline.style.includes("stroke:#000000"), true)

  for (const p of serialized) {
    assert.ok(p.id.length > 0)
    assert.ok(p.points.length >= 2, `${p.id} is a real path body`)
  }
})

// G — M8-E annotations are screen-only; nothing leaks into the export.
test("G: annotation overlay never contaminates the exported SVG", () => {
  const geometry = buildGeometry()
  const folds = deriveFoldAngleAnnotations(geometry)
  const glue = deriveGlueTabAnnotations(geometry)
  const corners = deriveCornerAnnotations(geometry)
  assert.ok(folds.length > 0 && glue.length > 0 && corners.length > 0, "annotations exist screen-side")

  const svg = serializeSVG(geometry)
  for (const marker of [
    "data-annotation", "fold-angle", "glue-tab-leader", "corner-relief",
    "R0", "data-fold-path-id", "data-glue-path-id", "data-corner-at",
  ]) {
    assert.equal(svg.includes(marker), false, `export must not contain ${marker}`)
  }
  assert.equal(svg.includes("°"), false, "angle labels are screen-only")
  assert.equal(svg.includes("annotations"), false)
  assert.equal(svg.includes("showAnnotations"), false)

  const view = read("components/editor/canvas/DielineView.tsx")
  const exportBlock = /const handleExport = \(\) => \{([\s\S]*?)\n  \}\n/.exec(view)?.[1] ?? ""
  assert.equal(exportBlock.includes("annotations"), false, "export handler is annotation-free")
  assert.equal(exportBlock.includes("showAnnotations"), false, "export ignores the toggle state")
})

// H — serialization is pure: the canonical geometry is not mutated.
test("H: serializeSVG does not mutate the geometry (deep equality)", () => {
  const geometry = buildGeometry()
  const before = structuredClone(geometry)
  serializeSVG(geometry)
  assert.deepEqual(geometry, before)
  const again = structuredClone(geometry)
  serializeSVG(geometry)
  serializeSVG(geometry)
  assert.deepEqual(geometry, again)
})

// I — manifest independence (AMENDMENT 5): export never reads editor/manifest state.
test("I: manifest independence — unrelated state mutations never change the SVG", () => {
  const geometry = buildGeometry()
  const svg1 = serializeSVG(geometry)

  // A plausible in-flight editor session / designData manifest that MUST be ignored.
  const manifest: Record<string, any> = {
    schemaVersion: 1,
    designId: "design_1",
    sessionId: "00000000-0000-4000-8000-000000000000",
    model: { boxType: "mailer-box", material: "cardboard-kraft", dimensions: MAILER_DIMS },
    layers: [
      { id: "l1", type: "text", faceId: "front", position: { x: 100, y: 100 }, scale: { x: 1, y: 1 } },
      { id: "l2", type: "image", faceId: "front", position: { x: 200, y: 200 }, scale: { x: 1, y: 1 } },
    ],
    zones: [],
    printSides: 2,
  }

  // Aggressively perturb every unrelated field (incl. planting a WRONG geometry).
  manifest.layers = [...manifest.layers, { id: "extra" }]
  manifest.model.dimensions = { length: 999, width: 999, height: 999 }
  manifest.model.material = "foam"
  manifest.boxType = "folding-carton"
  ;(manifest as any).dieline = buildGeometry() // a different resolved object — never read

  assert.equal(serializeSVG(geometry), svg1, "manifest mutations must not affect the export")

  // Direction is DielineGeometry → SVG, never Manifest → geometry → SVG:
  const other = buildGeometry()
  other.dims = { length: 999, width: 999, height: 999, unit: "mm" } // ignored: bounds come from panels
  other.foldPaths[0].points[0].x += 1 // a canonical geometry change MUST alter the SVG
  assert.notEqual(serializeSVG(other), svg1, "the serializer keys on geometry, not ambient state")

  const source = read("lib/editor/services/dieline-service.ts")
  for (const word of ["manifest", "designData", "session", "layers", "store", "saveDesign", "editor"]) {
    assert.equal(source.includes(word), false, `serializer must not reference ${word}`)
  }
})

// J — no legacy exporter survives in the canonical path.
test("J: mm bodies, exact outline, no px / fabric / 3.779 / generateDieline legacy", () => {
  const geometry = buildGeometry()
  const svg = serializeSVG(geometry)

  // The legacy M7 generator compressed y with a 0.5 physical scale; the canonical
  // outline must stay EXACTLY 370×178 mm — a 0.5 y-compression would produce 89.
  const outline = parsePaths(svg).find((p) => p.id === "outline")!
  assert.deepEqual(outline.points, [
    { x: 0, y: 0 }, { x: 370, y: 0 }, { x: 370, y: 178 }, { x: 0, y: 178 },
  ])
  assert.ok(!svg.includes("px"))
  assert.ok(!svg.includes("toSVG")) // not a fabric canvas re-export

  const service = read("lib/editor/services/dieline-service.ts")
  for (const legacy of ["generateDieline(", "class DielineService", "DielineTemplate",
    "exportAsSVG(", "TEMPLATES", "3" + ".779", "* 0.5", "0.5 *", "canvas.toSVG"]) {
    assert.equal(service.includes(legacy), false, `legacy ${legacy} in the canonical exporter`)
  }
})

// K — static architecture audit (§13): the export implementation fabricates nothing.
test("K: export implementation fabricates no panels/edges/geometry; single serializeSVG path", () => {
  const service = read("lib/editor/services/dieline-service.ts")
  for (const fabricated of ["buildDieline(", "generateDieline(", "DielineService",
    "const panels =", "const edges ="]) {
    assert.equal(service.includes(fabricated), false, `serializer fabricates via ${fabricated}`)
  }
  // The serializer's face list must derive FROM the canonical panels, never hardcode F42.
  const faceSource = /const\s+faces\s*=\s*([^;\n]+)/.exec(service)
  assert.ok(faceSource, "serializer must enumerate canonical faces once")
  assert.equal(faceSource![1].includes("Object.keys(geometry.panels)"), true,
    "faces must derive from geometry.panels")
  for (const lit of ["370", "178", "115", "70", "38"]) {
    assert.equal(service.includes(lit), false, `serializer hardcodes ${lit}`)
  }
  // The serializer consumes DielineGeometry paths directly.
  assert.equal(service.includes("geometry[`${cls}Paths`]"), true)
  assert.equal(service.includes("geometry.outline"), true)

  const view = read("components/editor/canvas/DielineView.tsx")
  for (const fabricated of ["buildDieline(", "generateDieline(", "resolveDieline(",
    "edgePoints(", "lineKey(", "const panels =", "const edges =", "const faces =",
    "aabbOverlap(", "boundsOfPanels("]) {
    assert.equal(view.includes(fabricated), false, `DielineView fabricates via ${fabricated}`)
  }
  // Exactly one canonical serialization call in the prod export surface (import + call).
  assert.equal(view.split("serializeSVG(").length - 1, 2, "one import + one call in DielineView")
  assert.equal(
    view.split("\n").filter((l) => l.includes("const svg = serializeSVG(geometry)")).length,
    1,
    "serializeSVG(geometry) called exactly once",
  )

  // The legacy parallel-implementation export dialog was deleted; what remains
  // must not exist at all rather than merely avoid dieline export.
  assert.equal(
    existsSync(resolve(process.cwd(), "components/design-editor/export/ExportDialog.tsx")),
    false,
    "legacy design-editor ExportDialog is gone",
  )
})