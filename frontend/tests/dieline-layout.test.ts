import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { buildDieline, DielineResolutionError } from "../lib/editor/geometry/dieline.ts"
import { resolveDieline } from "../lib/editor/geometry/resolve-dieline.ts"
import { checkOverlaps, serializeSVG } from "../lib/editor/services/dieline-service.ts"
import { serializeDesignData, type DesignDataV2 } from "../lib/editor/services/dieline-manifest.ts"
import { facePanel, mmToPx } from "../lib/editor/geometry/units.ts"
import type { DielineBlueprint, DielineGeometry } from "../../shared/types/index.ts"
import type { DesignCoreState } from "../lib/editor/state/types.ts"

// Hybrid layout (buildDieline), three cases per blueprint and size:
//  - authored size: the authored positions are used verbatim for ALL five
//    blueprints (the compatibility baseline — output identical to the
//    pre-change engine);
//  - sufficient topology (mailer, folding carton): positions are derived
//    from the declared fold relationships and stay coherent at every size;
//  - insufficient topology (shipping, rigid, pizza) at other sizes: the
//    legacy layout is validated per size — coherent sizes (rigid's
//    editor-open size among them) resolve exactly as before, incoherent
//    sizes return the explicit, distinct "unsupported-size" result
//    instead of a silently wrong net.

const seed = readFileSync("../backend/prisma/seed.ts", "utf8")

function extractTemplate(name: string): DielineBlueprint {
  const start = seed.indexOf(`const ${name} = {`)
  assert.ok(start >= 0, `${name} exists in seed`)
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
const CARTON = extractTemplate("FOLDING_CARTON_DIELINE_TEMPLATE")
const SHIPPING = extractTemplate("SHIPPING_BOX_DIELINE_TEMPLATE")
const RIGID = extractTemplate("RIGID_BOX_DIELINE_TEMPLATE")
const PIZZA = extractTemplate("PIZZA_BOX_DIELINE_TEMPLATE")

const AUTHORED: Record<string, { length: number; width: number; height: number }> = {
  mailer: { length: 115, width: 70, height: 38 },
  carton: { length: 150, width: 100, height: 50 },
}

const OPPOSITE: Record<string, string> = { top: "bottom", bottom: "top", left: "right", right: "left" }
const EDGES = ["top", "right", "bottom", "left"] as const

function edgeSegment(panel: { x: number; y: number; w: number; h: number }, edge: string): string {
  const pts =
    edge === "top" ? [[panel.x, panel.y], [panel.x + panel.w, panel.y]]
    : edge === "bottom" ? [[panel.x, panel.y + panel.h], [panel.x + panel.w, panel.y + panel.h]]
    : edge === "left" ? [[panel.x, panel.y], [panel.x, panel.y + panel.h]]
    : [[panel.x + panel.w, panel.y], [panel.x + panel.w, panel.y + panel.h]]
  return pts.map((p) => p.join(",")).sort().join("|")
}

function pathCounts(geometry: DielineGeometry): Record<string, number> {
  return {
    cut: geometry.cutPaths.length,
    fold: geometry.foldPaths.length,
    score: geometry.scorePaths.length,
    glue: geometry.gluePaths.length,
    perf: geometry.perfPaths.length,
  }
}

function assertCoherent(blueprint: DielineBlueprint, dims: { length: number; width: number; height: number }, label: string) {
  const resolution = resolveDieline(blueprint, dims)
  assert.ok(resolution.ok, `${label}: resolution succeeds at ${dims.length}x${dims.width}x${dims.height} (${resolution.ok ? "" : resolution.error})`)
  const geometry = resolution.geometry
  // No panel overlap.
  assert.deepEqual(checkOverlaps(geometry), [], `${label}: no overlaps at ${dims.length}x${dims.width}x${dims.height}`)
  // Panel sizes come from the dimensions (areas match dims exactly).
  for (const [faceId, panel] of Object.entries(geometry.panels)) {
    const size = facePanel(dims, faceId)
    assert.equal(panel.w, size.w, `${label}: ${faceId} width from dims`)
    assert.equal(panel.h, size.h, `${label}: ${faceId} height from dims`)
  }
  // Every declared fold pair shares its edge geometrically.
  for (const [faceId, panel] of Object.entries(geometry.panels)) {
    if (faceId.startsWith("inside_")) continue
    for (const edge of EDGES) {
      const decl = panel.edges[edge]
      if (!decl || decl.class !== "fold" || !decl.to || decl.to === "glue_flap" || decl.to === "none") continue
      const neighbour = geometry.panels[decl.to as keyof typeof geometry.panels]
      assert.equal(
        edgeSegment(panel, edge),
        edgeSegment(neighbour, OPPOSITE[edge]),
        `${label}: ${faceId}.${edge} coincides with ${decl.to}.${OPPOSITE[edge]} at ${dims.length}x${dims.width}x${dims.height}`
      )
    }
  }
  return geometry
}

for (const [key, blueprint] of [["mailer", MAILER], ["carton", CARTON]] as const) {
  test(`${key}: authored-size output is exactly the authored layout (positions, sizes, path counts)`, () => {
    const dims = AUTHORED[key]
    const geometry = buildDieline(blueprint, dims)
    for (const [faceId, panel] of Object.entries(geometry.panels)) {
      const raw = blueprint.panels[faceId as keyof typeof blueprint.panels]
      assert.equal(panel.x, raw.x, `${key}: ${faceId} x unchanged at authored size`)
      assert.equal(panel.y, raw.y, `${key}: ${faceId} y unchanged at authored size`)
      const size = facePanel(dims, faceId)
      assert.equal(panel.w, size.w)
      assert.equal(panel.h, size.h)
    }
  })

  test(`${key}: net stays coherent across a range of sizes, with stable cut/fold counts and adjacency`, () => {
    const authored = AUTHORED[key]
    const sizes = [
      authored,
      { length: 265, width: 195, height: 60 },          // catalogue default (mailer) / larger carton
      { length: 100, width: 60, height: 30 },           // carton editor-open Small; smaller mailer
      { length: Math.round(authored.length * 1.2), width: Math.round(authored.width * 1.2), height: Math.round(authored.height * 1.2) },
      { length: Math.round(authored.length * 0.8), width: Math.round(authored.width * 0.8), height: Math.round(authored.height * 0.8) },
      { length: authored.length + 37, width: authored.width - 13, height: authored.height + 9 }, // asymmetric
      { length: 60, width: 40, height: 20 },            // well below authored
      { length: 320, width: 240, height: 120 },         // well above authored
    ]
    const baseline = assertCoherent(blueprint, authored, key)
    const baselineCounts = pathCounts(baseline)
    const baselineAdjacency = baseline.adjacency.map((a) => `${a.a}~${a.b}:${a.via}`).sort()
    for (const dims of sizes.slice(1)) {
      const geometry = assertCoherent(blueprint, dims, key)
      assert.deepEqual(pathCounts(geometry), baselineCounts, `${key}: cut/fold/glue counts stable at ${dims.length}x${dims.width}x${dims.height}`)
      assert.deepEqual(
        geometry.adjacency.map((a) => `${a.a}~${a.b}:${a.via}`).sort(),
        baselineAdjacency,
        `${key}: declared adjacencies preserved at ${dims.length}x${dims.width}x${dims.height}`
      )
    }
  })
}

function assertAuthoredLayoutPreserved(blueprint: DielineBlueprint, dims: { length: number; width: number; height: number }, label: string) {
  const geometry = buildDieline(blueprint, dims)
  for (const [faceId, panel] of Object.entries(geometry.panels)) {
    const raw = blueprint.panels[faceId as keyof typeof blueprint.panels]
    assert.equal(panel.x, raw.x, `${label}: ${faceId} x is the authored position`)
    assert.equal(panel.y, raw.y, `${label}: ${faceId} y is the authored position`)
    const size = facePanel(dims, faceId)
    assert.equal(panel.w, size.w, `${label}: ${faceId} w from dims`)
    assert.equal(panel.h, size.h, `${label}: ${faceId} h from dims`)
  }
  assert.deepEqual(checkOverlaps(geometry), [], `${label}: authored layout is coherent`)
  return geometry
}

test("shipping: authored size resolves exactly as before; incoherent sizes return unsupported-size", () => {
  // Compatibility baseline: the authored size keeps the legacy resolution.
  assertAuthoredLayoutPreserved(SHIPPING, { length: 400, width: 300, height: 250 }, "shipping")
  // Editor-open size: panels detach (every authored shared edge is lost) —
  // an explicit unsupported-size result, distinct from no-blueprint/error.
  const open = resolveDieline(SHIPPING, { length: 250, width: 200, height: 150 })
  assert.equal(open.ok, false)
  if (!open.ok) {
    assert.equal(open.reason, "unsupported-size")
    assert.match(open.error ?? "", /Unsupported size 250x200x150mm/)
    assert.match(open.error ?? "", /not reciprocal/)
  }
  // Grown size: panels overlap — also unsupported-size, never a wrong net.
  const grown = resolveDieline(SHIPPING, { length: 480, width: 360, height: 300 })
  assert.equal(grown.ok, false)
  if (!grown.ok) assert.equal(grown.reason, "unsupported-size")
  assert.throws(
    () => buildDieline(SHIPPING, { length: 250, width: 200, height: 150 }),
    (err: unknown) => err instanceof DielineResolutionError && err.code === "unsupported-size"
  )
})

test("rigid: authored size preserved; the coherent legacy region (incl. editor-open) still resolves; colliding sizes are gated", () => {
  assertAuthoredLayoutPreserved(RIGID, { length: 250, width: 180, height: 60 }, "rigid")
  // Rigid declares no adjacency at all (a parts layout), so coherence is
  // overlap-only: smaller sizes and slight growth keep the legacy layout.
  for (const dims of [{ length: 200, width: 150, height: 50 }, { length: 200, width: 144, height: 48 }, { length: 259, width: 180, height: 60 }]) {
    const geometry = assertAuthoredLayoutPreserved(RIGID, dims, "rigid")
    assert.deepEqual(checkOverlaps(geometry), [])
  }
  // Growth that closes the authored gaps collides: gated, not returned.
  const grown = resolveDieline(RIGID, { length: 300, width: 216, height: 72 })
  assert.equal(grown.ok, false)
  if (!grown.ok) {
    assert.equal(grown.reason, "unsupported-size")
    assert.match(grown.error ?? "", /overlap/)
  }
})

test("pizza: authored size resolves exactly as before; editor-open size returns unsupported-size", () => {
  assertAuthoredLayoutPreserved(PIZZA, { length: 330, width: 330, height: 45 }, "pizza")
  const open = resolveDieline(PIZZA, { length: 250, width: 250, height: 40 })
  assert.equal(open.ok, false)
  if (!open.ok) {
    assert.equal(open.reason, "unsupported-size")
    assert.match(open.error ?? "", /Unsupported size 250x250x40mm/)
  }
})

test("path endpoints coincide with panel edges: fold lines are exactly the shared edges; every path endpoint is a panel corner", () => {
  for (const [key, blueprint] of [["mailer", MAILER], ["carton", CARTON]] as const) {
    for (const dims of [AUTHORED[key], { length: 265, width: 195, height: 60 }, { length: 100, width: 60, height: 30 }]) {
      const geometry = buildDieline(blueprint, dims)
      const corners = (p: { x: number; y: number; w: number; h: number }) =>
        new Set([`${p.x},${p.y}`, `${p.x + p.w},${p.y}`, `${p.x},${p.y + p.h}`, `${p.x + p.w},${p.y + p.h}`])
      const allPaths = [...geometry.cutPaths, ...geometry.foldPaths, ...geometry.scorePaths, ...geometry.gluePaths, ...geometry.perfPaths]
      for (const path of allPaths) {
        if (!path.faceId) continue
        const panel = geometry.panels[path.faceId]
        for (const point of path.points) {
          assert.ok(corners(panel).has(`${point.x},${point.y}`), `${key}: ${path.id} endpoint ${point.x},${point.y} is a corner of ${path.faceId}`)
        }
      }
      // Each fold path IS the shared edge: identical segment on both panels.
      for (const path of geometry.foldPaths) {
        const [faceId, edge] = (path.id ?? "").split("-") as [string, string]
        const panel = geometry.panels[faceId as keyof typeof geometry.panels]
        const decl = panel?.edges[edge as keyof typeof panel.edges]
        assert.ok(decl?.to && decl.to !== "glue_flap" && decl.to !== "none", `${key}: ${path.id} declares a neighbour`)
        const neighbour = geometry.panels[decl!.to as keyof typeof geometry.panels]
        assert.equal(
          edgeSegment(panel, edge),
          edgeSegment(neighbour, OPPOSITE[edge]),
          `${key}: fold ${path.id} segment equals the neighbour's ${OPPOSITE[edge]} edge at ${dims.length}x${dims.width}x${dims.height}`
        )
        const pathSegment = path.points.map((p) => `${p.x},${p.y}`).sort().join("|")
        assert.equal(pathSegment, edgeSegment(panel, edge), `${key}: fold ${path.id} endpoints are the shared edge endpoints`)
      }
    }
  }
})

test("SVG export: the viewBox reconciles the real bounds origin — no path point is clipped; zero-origin output is unchanged", () => {
  const scaled = (base: { length: number; width: number; height: number }, f: number) => ({
    length: Math.round(base.length * f * 10) / 10,
    width: Math.round(base.width * f * 10) / 10,
    height: Math.round(base.height * f * 10) / 10,
  })
  const cases: [string, DielineBlueprint, { length: number; width: number; height: number }][] = [
    ["mailer 0.8x", MAILER, scaled(AUTHORED.mailer, 0.8)],
    ["mailer 1x (authored)", MAILER, AUTHORED.mailer],
    ["mailer 1.2x", MAILER, scaled(AUTHORED.mailer, 1.2)],
    ["mailer non-uniform", MAILER, { length: 152, width: 57, height: 47 }],
    ["mailer 265x195x60", MAILER, { length: 265, width: 195, height: 60 }],
    ["carton 0.8x", CARTON, scaled(AUTHORED.carton, 0.8)],
    ["carton 1x (authored)", CARTON, AUTHORED.carton],
    ["carton 1.2x", CARTON, scaled(AUTHORED.carton, 1.2)],
    ["carton non-uniform", CARTON, { length: 187, width: 83, height: 64 }],
    ["carton editor-open", CARTON, { length: 100, width: 60, height: 30 }],
    ["shipping authored", SHIPPING, { length: 400, width: 300, height: 250 }],
  ]
  for (const [label, blueprint, dims] of cases) {
    const geometry = buildDieline(blueprint, dims)
    const svg = serializeSVG(geometry)
    const match = svg.match(/viewBox="([-\d.]+) ([-\d.]+) ([-\d.]+) ([-\d.]+)"/)
    assert.ok(match, `${label}: viewBox present`)
    const [vx, vy, vw, vh] = match.slice(1).map(Number)
    const panels = Object.values(geometry.panels)
    const x0 = Math.min(...panels.map((p) => p.x))
    const y0 = Math.min(...panels.map((p) => p.y))
    assert.equal(vx, x0, `${label}: viewBox x starts at the bounds origin`)
    assert.equal(vy, y0, `${label}: viewBox y starts at the bounds origin`)
    // Every panel rectangle lies inside the viewBox.
    for (const panel of panels) {
      assert.ok(
        panel.x >= vx - 1e-9 && panel.x + panel.w <= vx + vw + 1e-9 && panel.y >= vy - 1e-9 && panel.y + panel.h <= vy + vh + 1e-9,
        `${label}: panel ${panel.faceId} inside the viewBox`
      )
    }
    // Every path point lies inside the viewBox.
    const allPaths = [...geometry.cutPaths, ...geometry.foldPaths, ...geometry.scorePaths, ...geometry.gluePaths, ...geometry.perfPaths, ...geometry.outline]
    for (const path of allPaths) {
      for (const point of path.points) {
        assert.ok(
          point.x >= vx - 1e-9 && point.x <= vx + vw + 1e-9 && point.y >= vy - 1e-9 && point.y <= vy + vh + 1e-9,
          `${label}: ${path.id} point ${point.x},${point.y} inside the viewBox`
        )
      }
    }
  }
  // Zero-origin layouts serialize exactly as before the fix (the M8-G
  // pinned form): mailer at its authored size has bounds origin 0,0.
  const mailerSvg = serializeSVG(buildDieline(MAILER, AUTHORED.mailer))
  assert.ok(mailerSvg.includes('viewBox="0 0 370 178"'), "zero-origin viewBox unchanged")
  assert.ok(mailerSvg.includes('width="370"'), "numeric width unchanged")
  assert.ok(mailerSvg.includes('height="178"'), "numeric height unchanged")
})

test("glue placement: glue paths lie on the declaring panel's declared glue edges; no glue flap panel is invented", () => {
  const geometry = buildDieline(MAILER, { length: 265, width: 195, height: 60 })
  // The geometry's panel set is exactly the blueprint's — glue is an edge
  // class in this model, never a synthesized flap panel.
  assert.deepEqual(Object.keys(geometry.panels).sort(), Object.keys(MAILER.panels).sort())
  assert.ok(geometry.gluePaths.length > 0, "mailer declares glue edges")
  for (const path of geometry.gluePaths) {
    const [faceId, edge] = (path.id ?? "").split("-") as [string, string]
    const raw = MAILER.panels[faceId as keyof typeof MAILER.panels]
    assert.equal(raw?.edges[edge as keyof typeof raw.edges]?.class, "glue", `${path.id} is a declared glue edge of ${faceId}`)
    const panel = geometry.panels[faceId as keyof typeof geometry.panels]
    assert.equal(
      path.points.map((p) => `${p.x},${p.y}`).sort().join("|"),
      edgeSegment(panel, edge),
      `${path.id} lies exactly on the ${faceId}.${edge} panel edge`
    )
  }
})

test("saved geometry: a mailer design saved at the authored size snapshots the same panels as before the layout change", () => {
  const state = {
    canvas: { width: mmToPx(115), height: mmToPx(38), backgroundColor: "#ffffff" },
    model: {
      type: "mailer_box", category: "boxes",
      dimensions: { ...AUTHORED.mailer },
      material: "cardboard-kraft",
      faces: ["front", "back", "left", "right", "top", "bottom"].map((id) => ({ id, name: id })),
      printCoverage: "outside", adhesiveStrip: "none", finishing: "none", lamination: "none",
      fluteType: "E", colorVariant: "full_color", quantity: 50,
    },
    layers: [], selectedLayerIds: [],
    camera: { position: [4, 4, 4], target: [0, 0, 0], zoom: 1 },
    activeTool: "select",
    ui: { leftSidebarOpen: true, rightSidebarOpen: true, gridVisible: true, guidesVisible: true, selectedFace: "front", viewMode: "2d", boxOpenState: 0 },
    lifecycleStatus: "DRAFT",
    product: { id: "prod-mailer-box", slug: "custom-mailer-box", name: "Mailer Box", type: "box", boxType: "mailer-box", dieline: MAILER },
  } as unknown as DesignCoreState
  const envelope = serializeDesignData(state) as DesignDataV2
  assert.equal(envelope.reproducibility, "exact")
  assert.ok(envelope.manifest.dieline)
  for (const [faceId, panel] of Object.entries(envelope.manifest.dieline.panels)) {
    const raw = MAILER.panels[faceId as keyof typeof MAILER.panels]
    assert.equal(panel.x, raw.x, `manifest ${faceId} x matches the pre-change snapshot`)
    assert.equal(panel.y, raw.y, `manifest ${faceId} y matches the pre-change snapshot`)
  }
  // The same design saved at a non-authored size now snapshots the coherent
  // derived layout instead of the old overlapping one.
  const bigger = serializeDesignData({
    ...state,
    model: { ...state.model, dimensions: { length: 265, width: 195, height: 60 } },
  } as DesignCoreState) as DesignDataV2
  assert.ok(bigger.manifest.dieline)
  assert.deepEqual(checkOverlaps(bigger.manifest.dieline), [])
})
