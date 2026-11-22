import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { buildHomeStatCounts, formatExactCount, UNAVAILABLE_STAT } from "../lib/home-stats.ts"

const ok = (c: number, f: number, t: number, v = 123456789) => ({
  success: true,
  stats: {
    completedDeals: { raw: c },
    registeredFactories: { raw: f },
    transactionVolume: { raw: v },
    activeTraders: { raw: t },
  },
})

test("counts are exact: no plus, no rounding up, true zero", () => {
  assert.equal(formatExactCount(0), "0")
  assert.equal(formatExactCount(999), "999")
  assert.equal(formatExactCount(1500), "1,500")
  assert.equal(formatExactCount(1999), "1,999")
})

test("invalid counts are unavailable, never invented", () => {
  for (const bad of [undefined, null, "7", -1, 1.5, NaN, Infinity]) {
    assert.equal(formatExactCount(bad), null)
  }
})

test("real response maps to exact counts and drops volume", () => {
  const out = buildHomeStatCounts(ok(7, 3, 9))
  assert.deepEqual(out, { completedDeals: "7", registeredFactories: "3", activeTraders: "9" })
  assert.equal("transactionVolume" in out, false)
})

test("real zeros stay zero", () => {
  assert.deepEqual(buildHomeStatCounts(ok(0, 0, 0)), {
    completedDeals: "0",
    registeredFactories: "0",
    activeTraders: "0",
  })
})

test("failure and malformed payloads are unavailable", () => {
  for (const bad of [null, undefined, {}, { success: false, error: "x" }, { success: true }, "x"]) {
    assert.deepEqual(buildHomeStatCounts(bad), UNAVAILABLE_STAT)
  }
})

test("homepage has no currency-labelled volume tile or fabricated placeholder counts", () => {
  const src = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8")
  assert.equal(/Million (EGP|USD) Transactions/.test(src), false)
  assert.equal(src.includes("مليون دولار"), false)
  assert.equal(src.includes("مليون جنيه"), false)
  assert.equal(src.includes("formatCategoryCount(data.stats"), false)
  assert.equal(src.includes('value: "0+"'), false)
})
