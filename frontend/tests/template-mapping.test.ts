import { test } from "node:test"
import assert from "node:assert/strict"
import { toEditorTemplate, loadTemplateIntoEditor, slugify, templateProductSlug } from "../lib/editor/services/template-mapping.ts"

// The editor template service maps backend Template rows (designData) onto the
// editor Template shape (designState). Catalog seed rows carry a fabric-style
// `{version, objects, metadata}` document — not a DesignCoreState — and loading
// one must never replace the editor's live core state.

const baseBackend = {
  id: "tpl-mailer-box",
  name: "Classic Mailer Box",
  description: "Customizable mailer box",
  category: "business",
  thumbnail: "https://example.com/t.png",
  productType: "box",
  boxType: "mailer-box",
  isPublic: true,
  usageCount: 0,
  tags: ["mailer"],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
}

function makeCore() {
  return {
    canvas: { width: 800, height: 600, backgroundColor: "#fff" },
    model: {
      type: "mailer_box",
      category: "boxes",
      dimensions: { length: 200, width: 150, height: 100 },
      material: "cardboard-kraft",
      faces: [],
      printCoverage: "outside",
      adhesiveStrip: "none",
      finishing: "none",
      lamination: "none",
      colorVariant: "one_colour",
      quantity: 30,
    },
    layers: [],
    selectedLayerIds: [],
    camera: { position: [0, 0, 5], target: [0, 0, 0], zoom: 1 },
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
  } as any
}

test("catalog seed template maps metadata and merges into live state", () => {
  const backend = {
    ...baseBackend,
    designData: {
      version: "6.5.4",
      objects: [],
      metadata: {
        defaultMaterial: "kraft",
        defaultDimensions: { length: 152, width: 102, height: 51, unit: "mm" },
      },
    },
  }

  const template = toEditorTemplate(backend as any)
  assert.equal(template.id, "tpl-mailer-box")
  assert.equal(template.slug, "tpl-mailer-box")

  const core = makeCore()
  const next = loadTemplateIntoEditor(template)(core)
  // Live editor state is preserved; only the template defaults apply.
  assert.equal(next.canvas, core.canvas)
  assert.equal(next.layers, core.layers)
  assert.equal(next.model.material, "kraft")
  assert.deepEqual(next.model.dimensions, { length: 152, width: 102, height: 51 })
})

test("full saved editor state replaces the core state", () => {
  const saved = makeCore()
  saved.model.material = "cardboard-white"
  saved.layers = [{ id: "l1" }]

  const template = toEditorTemplate({ ...baseBackend, designData: { designState: saved } } as any)
  const next = loadTemplateIntoEditor(template)(makeCore())
  assert.equal(next, saved)
})

test("bare editor state (no designState wrapper) is honored too", () => {
  const saved = makeCore()
  const template = toEditorTemplate({ ...baseBackend, designData: saved } as any)
  const next = loadTemplateIntoEditor(template)(makeCore())
  assert.equal(next, saved)
})

test("template without usable metadata leaves the live state untouched", () => {
  const template = toEditorTemplate({ ...baseBackend, designData: {} } as any)
  const core = makeCore()
  const next = loadTemplateIntoEditor(template)(core)
  assert.equal(next.canvas, core.canvas)
  assert.equal(next.model.material, core.model.material)
  assert.deepEqual(next.model.dimensions, core.model.dimensions)
})

test("slugify matches the legacy mock route slug format", () => {
  assert.equal(slugify("Classic Mailer Box!"), "classic-mailer-box")
})

test("templateProductSlug resolves the catalog product behind each boxType", () => {
  const t = (boxType: string, productType = "box") =>
    templateProductSlug(toEditorTemplate({ ...baseBackend, boxType, productType } as any))
  assert.equal(t("mailer-box"), "custom-mailer-box")
  assert.equal(t("shipping-box"), "custom-shipping-box")
  assert.equal(t("rigid-box"), "custom-rigid-box")
  assert.equal(t("folding-carton"), "custom-product-box")
  assert.equal(t("pizza-box"), "custom-pizza-box")
})

test("templateProductSlug maps gift-box to the rigid-box product", () => {
  const template = toEditorTemplate({ ...baseBackend, boxType: "gift-box" } as any)
  assert.equal(templateProductSlug(template), "custom-rigid-box")
})

test("templateProductSlug falls back to productType for bag and label", () => {
  const bag = toEditorTemplate({ ...baseBackend, boxType: null, productType: "bag" } as any)
  const label = toEditorTemplate({ ...baseBackend, boxType: null, productType: "label" } as any)
  assert.equal(templateProductSlug(bag), "custom-paper-bag")
  assert.equal(templateProductSlug(label), "custom-label-sticker")
})

test("templateProductSlug returns null for unknown products", () => {
  const unknown = toEditorTemplate({ ...baseBackend, boxType: "hovercraft", productType: "box" } as any)
  const none = toEditorTemplate({ ...baseBackend, boxType: null, productType: "mystery" } as any)
  assert.equal(templateProductSlug(unknown), null)
  assert.equal(templateProductSlug(none), null)
})

test("editor templates carry the backend productType and boxType", () => {
  const template = toEditorTemplate({ ...baseBackend } as any)
  assert.equal(template.productType, "box")
  assert.equal(template.boxType, "mailer-box")
})
