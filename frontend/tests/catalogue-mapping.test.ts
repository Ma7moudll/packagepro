import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  CATALOGUE_PRODUCTS,
  CATALOGUE_CATEGORIES,
  CATALOGUE_SUBCATEGORIES,
  CATALOGUE_PRODUCT_COUNT,
} from "../../shared/catalog/products.ts"
import { catalogueMappingMismatches } from "../lib/editor/data/catalog-mapping.ts"

// Picker ids extracted from source (products-data.ts is a client module).

// Unified catalogue (55 picker products = 55 storefront catalogue rows).

test("registry holds exactly 55 products with unique identities", () => {
  assert.equal(CATALOGUE_PRODUCTS.length, CATALOGUE_PRODUCT_COUNT)
  for (const key of ["id", "boxType", "slug", "productId"] as const) {
    const seen = new Set<string>()
    for (const p of CATALOGUE_PRODUCTS) {
      assert.ok(!seen.has(p[key]), `duplicate ${key} "${p[key]}"`)
      seen.add(p[key])
    }
  }
})

test("every picker product maps to a catalogue entry and back", () => {
  const source = readFileSync("lib/editor/data/products-data.ts", "utf8")
  const pickerIds = [...source.matchAll(/id: "([\w-]+)",\n\s+name: \{ en:/g)].map((m) => m[1])
  assert.equal(pickerIds.length, 55, "picker extraction must see all 55 products")
  assert.deepEqual(catalogueMappingMismatches(pickerIds), [])
})

test("classification is internally consistent", () => {
  for (const sub of CATALOGUE_SUBCATEGORIES) {
    assert.ok(
      CATALOGUE_CATEGORIES.some((c) => c.id === sub.categoryId),
      `subcategory ${sub.id} has unknown categoryId`,
    )
  }
  for (const p of CATALOGUE_PRODUCTS) {
    const sub = CATALOGUE_SUBCATEGORIES.find((s) => s.slug === p.subcategory)
    assert.ok(sub, `${p.id}: unknown subcategory ${p.subcategory}`)
    const cat = CATALOGUE_CATEGORIES.find((c) => c.id === sub!.categoryId)
    assert.equal(cat!.slug, p.category, `${p.id}: category slug mismatch`)
  }
})

test("readiness flags never overclaim", () => {
  for (const p of CATALOGUE_PRODUCTS) {
    // deferred production must always carry a human reason
    if (p.readiness.dieline === "deferred") assert.ok(p.supportReason, p.id)
    // a routed preview family is required unless preview is unavailable
    if (p.readiness.preview !== "unavailable") assert.ok(p.previewFamily, p.id)
    // quote_required products must not pretend to carry a rate card
    if (p.readiness.pricing === "quote_required") {
      assert.notEqual(p.readiness.dieline, "supported", `${p.id}: no rates without production support`)
    }
    // boxType is the kebab normalization of the canonical id
    assert.equal(p.boxType, p.id.replace(/_/g, "-"), p.id)
  }
})

test("the 8 originally seeded products keep their ids and slugs", () => {
  const expected = {
    mailer_box: ["prod-mailer-box", "custom-mailer-box"],
    folding_carton: ["prod-product-box", "custom-product-box"],
    shipping_box: ["prod-shipping-box", "custom-shipping-box"],
    rigid_box: ["prod-rigid-box", "custom-rigid-box"],
    pizza_box: ["prod-pizza-box", "custom-pizza-box"],
    paper_bag: ["prod-paper-bag", "custom-paper-bag"],
    poly_mailer_bag: ["prod-poly-mailer", "custom-poly-mailer"],
    rectangle_label: ["prod-sticker-label", "custom-label-sticker"],
  }
  for (const [id, [productId, slug]] of Object.entries(expected)) {
    const p = CATALOGUE_PRODUCTS.find((x) => x.id === id)
    assert.ok(p, id)
    assert.equal(p!.productId, productId)
    assert.equal(p!.slug, slug)
    assert.equal(p!.readiness.pricing, "estimated", `${id} keeps its seeded rates`)
  }
})

test("only the 5 blueprint-backed products claim supported dielines", () => {
  const supported = CATALOGUE_PRODUCTS.filter((p) => p.readiness.dieline === "supported").map((p) => p.id)
  assert.deepEqual(
    supported.sort(),
    ["folding_carton", "mailer_box", "pizza_box", "rigid_box", "shipping_box"],
  )
})
