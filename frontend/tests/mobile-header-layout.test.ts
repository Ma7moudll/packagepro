import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

// Regression guard for the narrow-viewport header overflow. The real check is
// the browser run (document width equals viewport at 320/360/390/768, EN and AR,
// hamburger reachable); these assertions only stop the specific causes returning.
const navbar = readFileSync(new URL("../components/layout/navbar.tsx", import.meta.url), "utf8")
const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8")

test("guest Sign In / Sign Up buttons are not inline on small screens (they live in the menu)", () => {
  assert.match(navbar, /hidden sm:flex items-center space-x-2[^"]*"?[\s\S]{0,200}nav\.login/)
  assert.equal(navbar.includes('{t("nav.login")}'), true)
})

test("mobile menu keeps Sign In / Sign Up for guests", () => {
  const sheet = navbar.slice(navbar.indexOf("<SheetContent"))
  assert.equal(sheet.includes('href="/login"'), true)
  assert.equal(sheet.includes('href="/signup"'), true)
})

test("header action row spacing and logo shrink on small screens", () => {
  assert.equal(navbar.includes("space-x-1 sm:space-x-2"), true)
  assert.equal(navbar.includes("flex flex-col space-y-4 mt-8 px-6"), true)
  assert.equal(navbar.includes("text-lg min-[360px]:text-xl sm:text-2xl"), true)
})

test("homepage floating hero cards do not use negative offsets that overflow the viewport", () => {
  assert.equal(/absolute -(top|bottom)-6 -(left|right)-6/.test(home), false)
})
