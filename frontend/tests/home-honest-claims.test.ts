import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

// The homepage must not state facts the platform cannot back. These are the
// specific unsupported claims removed from the homepage; the real check is the
// rendered page. Backing for the replacement copy: backend order statuses
// (awaiting_approval, in_production, quality_check), prepress and shipment
// modules, and the kraft material options in backend/prisma/seed.ts.
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8")

test("no unproven verification, certification or guarantee claims", () => {
  for (const claim of [
    "Verified and Certified Factories",
    "All factories on our platform have been verified",
    "Commercial registration and document verification",
    "Guaranteed delivery time commitment",
    "FSC certifications",
    "Reduced carbon footprint",
    "Browse Verified Factories",
    "guaranteed quality",
    "Leading Packaging Platform in Egypt",
    "thousands of",
  ]) {
    assert.equal(home.includes(claim), false, claim)
  }
})

test("no invented headline statistics or stock photo on the homepage", () => {
  assert.equal(home.includes("4.8/5"), false)
  assert.equal(home.includes("90%+"), false)
  assert.equal(/<p className="font-bold text-slate-900">100%<\/p>/.test(home), false)
  assert.equal(home.includes("photo-1565299624946-b28f40a0ae38"), false)
})

test("no link to the missing /manufacturers page", () => {
  assert.equal(home.includes('href="/manufacturers"'), false)
})

test("homepage category links use real catalogue category slugs", () => {
  const catalogue = readFileSync(new URL("../../shared/catalog/products.ts", import.meta.url), "utf8")
  const slugs = new Set([...catalogue.matchAll(/id: "cat-[a-z-]+", slug: "([a-z-]+)"/g)].map((m) => m[1]))
  const keys = [...home.matchAll(/categoryKey: "([a-z-]+)"/g)].map((m) => m[1])
  assert.ok(keys.length >= 4)
  for (const key of keys) assert.equal(slugs.has(key), true, key)
})

test("homepage search only sends params the products page honours", () => {
  const sent = [...home.matchAll(/params\.set\("([a-z]+)"/g)].map((m) => m[1]).sort()
  assert.deepEqual(sent, ["category", "search"])
  assert.equal(home.includes("feature="), false)
  assert.equal(home.includes("selectedMaterial"), false)
  assert.equal(home.includes('"fast-delivery"'), false)
})

test("no delivery-speed or wholesale-price promises on the homepage", () => {
  for (const s of ["Fast Delivery", "delivered on time", "wholesale prices"]) assert.equal(home.includes(s), false, s)
})

test("no invented discount or template-count numbers on the homepage", () => {
  assert.equal(/up to 25%|200\+/.test(home), false)
})

test("no templates or flexible-payments promotion on the homepage", () => {
  assert.equal(home.includes('href="/templates"') || home.includes('link: "/templates"'), false)
  assert.equal(home.includes("/payments/flexible"), false)
  assert.equal(/ready-made design templates/i.test(home), false)
})

test("no unsupported integration, industry, wholesale or free-sample promotion", () => {
  for (const route of ["/integrations", "/industries", "/wholesale"]) assert.equal(home.includes(route), false)
  assert.equal(/free sample|عينة مجانية/i.test(home), false)
  assert.equal(home.includes("Configure Design"), true)
})
