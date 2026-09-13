import { test, expect } from "@playwright/test"
import {
  loginViaApi,
  attachQaListeners,
  waitForEditor,
  editorState,
  assertNoCriticalErrors,
} from "./helpers"
import { facePanel } from "../lib/editor/geometry/units.ts"
import type { DielineBlueprint } from "../../shared/types/index.ts"

// M8-J (spec §14): product coverage completion & closure — e2e.
// Every seeded product must open the editor from the catalog config:
//   - supported (5): boxType + blueprint -> canonical dieline sheets render
//     (div[data-face-id] panels, DielineView toolbar with sheet size).
//   - deferred (3) : no blueprint -> NEITHER the canonical net NOR the M7
//     fallback; only the deferral placeholder (fake geometry is never shipped).

const SUPPORTED: { slug: string; id: string; qty: number }[] = [
  { slug: "custom-mailer-box", id: "prod-mailer-box", qty: 30 },
  { slug: "custom-product-box", id: "prod-product-box", qty: 30 },
  { slug: "custom-shipping-box", id: "prod-shipping-box", qty: 30 },
  { slug: "custom-rigid-box", id: "prod-rigid-box", qty: 30 },
  { slug: "custom-pizza-box", id: "prod-pizza-box", qty: 30 },
]

const DEFERRED: { slug: string; id: string; qty: number; boxType: string }[] = [
  { slug: "custom-paper-bag", id: "prod-paper-bag", qty: 50, boxType: "paper-bag" },
  { slug: "custom-poly-mailer", id: "prod-poly-mailer", qty: 50, boxType: "poly-mailer" },
  { slug: "custom-label-sticker", id: "prod-sticker-label", qty: 25, boxType: "label" },
]

// Mirror of the canonical engine: blueprint positions are fixed (authored at the
// template's reference size); panel w/h are facePanel(runtime dims). The rendered
// sheet label string is computed exactly like DielineView: flatBounds rounded.
function expectedSheet(blueprint: DielineBlueprint, dims: { length: number; width: number; height: number }): string {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [faceId, panel] of Object.entries(blueprint.panels)) {
    const { w, h } = facePanel(dims, faceId as never)
    x0 = Math.min(x0, panel.x)
    y0 = Math.min(y0, panel.y)
    x1 = Math.max(x1, panel.x + w)
    y1 = Math.max(y1, panel.y + h)
  }
  return `(${Math.round(x1 - x0)} x ${Math.round(y1 - y0)} mm)`
}

test.describe.serial("M8-J product coverage (backend ProductStructure + blueprints + deferral)", () => {
  for (const p of SUPPORTED) {
    test(`supported: ${p.slug} renders canonical dieline`, async ({ page }) => {
      test.setTimeout(120_000)
      await loginViaApi(page)
      const qa = attachQaListeners(page)

      await page.goto(`/editor?product=${p.slug}&qty=${p.qty}`)
      await waitForEditor(page)

      const state = await editorState(page)
      expect(state.product).toMatchObject({ id: p.id, slug: p.slug, support: "supported" })
      expect(state.productConfig?.quantity).toBe(p.qty)

      // Canonical DielineView sheets: every canonical FaceId is a DOM panel.
      const sheet = expectedSheet(state.product?.dieline, state.model?.dimensions)
      await page.evaluate(() => (window as any).__editorSetViewMode("dieline"))
      await page.waitForSelector('div[data-face-id="front"]', { timeout: 15000 })
      const faceCount = await page.locator("div[data-face-id]").count()
      expect(faceCount).toBe(12)
      for (const f of ["front", "back", "top", "bottom", "left", "right"]) {
        await expect(page.locator(`div[data-face-id="${f}"]`)).toBeVisible()
      }
      // Toolbar carries the sheet size derived from the actual rendered geometry.
      await expect(page.getByText(sheet, { exact: true })).toBeVisible({ timeout: 15000 })
      // No deferral placeholder on a supported product.
      await expect(page.locator('[data-testid="deferred-badge"]')).toHaveCount(0)

      await page.screenshot({ path: `playwright-report/m8j-${p.slug}.png` })
      assertNoCriticalErrors(qa)
    })
  }

  for (const p of DEFERRED) {
    test(`deferred: ${p.slug} shows deferral placeholder, no fake geometry`, async ({ page }) => {
      test.setTimeout(120_000)
      await loginViaApi(page)
      const qa = attachQaListeners(page)

      await page.goto(`/editor?product=${p.slug}&qty=${p.qty}`)
      await waitForEditor(page)

      const state = await editorState(page)
      expect(state.product).toMatchObject({ id: p.id, slug: p.slug, support: "deferred", boxType: p.boxType })
      expect(state.product?.dieline).toBeUndefined()

      await page.evaluate(() => (window as any).__editorSetViewMode("dieline"))
      // Deferral placeholder replaces the net entirely.
      await expect(page.locator('[data-testid="deferred-badge"]')).toBeVisible({ timeout: 15000 })
      // No canonical sheet panels, no M7 generic fallback net.
      await expect(page.locator("[data-face-id]")).toHaveCount(0)

      await page.screenshot({ path: `playwright-report/m8j-${p.slug}.png` })
      assertNoCriticalErrors(qa)
    })
  }
})