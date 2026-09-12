import { test, expect } from "@playwright/test"
import { mmToPx } from "../lib/editor/geometry/units"
import {
  loginViaApi,
  attachQaListeners,
  waitForEditor,
  assertNoCriticalErrors,
} from "./helpers"

const EDITOR_URL = "/editor?product=custom-mailer-box&qty=50"

// Expected geometry derived from the canonical units module (M8-PLAN §1): the
// editor's canvas is sized in logical px via PX_PER_MM, never the old 800×600.
//   front = length × height = 115 × 38 mm → 345 × 114
//   top   = length × width  = 115 × 70 mm → 345 × 210
//   left  = width  × height = 70  × 38 mm → 210 × 114
const EXPECTED = {
  dims: { length: 115, width: 70, height: 38 },
  front: { w: mmToPx(115), h: mmToPx(38) },
  top: { w: mmToPx(115), h: mmToPx(70) },
  left: { w: mmToPx(70), h: mmToPx(38) },
}

test.describe.serial("M8-A physical geometry (F42 mailer, 115 × 70 × 38 mm)", () => {
  test("2D canvas is sized from mm panels via PX_PER_MM — never 800×600", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    // waitForFunction runs in the browser; pass expected values as the arg.
    const frontHandle = await page.waitForFunction(
      (cfg: typeof EXPECTED) => {
        const c = (window as any).__fabricCanvas
        const state = (window as any).__editorState?.()
        if (!c || !state?.model) return false
        if (!state.product?.id || !state.productConfig?.variantId) return false // hydration
        const d = state.model.dimensions
        if (!d || d.length !== cfg.dims.length || d.width !== cfg.dims.width || d.height !== cfg.dims.height) return false
        if (c.getWidth() !== cfg.front.w || c.getHeight() !== cfg.front.h) return false
        return { w: c.getWidth(), h: c.getHeight(), dims: d }
      },
      EXPECTED,
      { timeout: 30_000 }
    )
    const front = (await frontHandle.jsonValue()) as { w: number; h: number; dims: typeof EXPECTED.dims }
    expect(front.dims).toEqual(EXPECTED.dims)
    expect(front.w).toBe(EXPECTED.front.w)
    expect(front.h).toBe(EXPECTED.front.h)

    // Top face: 115 × 70 mm → 345 × 210; canvas resizes on face switch.
    await page.evaluate(() => (window as any).__editorSetFace("top"))
    const topHandle = await page.waitForFunction(
      (t: { w: number; h: number }) => {
        const c = (window as any).__fabricCanvas
        if (!c) return false
        if (c.getWidth() !== t.w || c.getHeight() !== t.h) return false
        return { w: c.getWidth(), h: c.getHeight() }
      },
      EXPECTED.top,
      { timeout: 15_000 }
    )
    const top = (await topHandle.jsonValue()) as { w: number; h: number }
    expect(top.w).toBe(EXPECTED.top.w)
    expect(top.h).toBe(EXPECTED.top.h)

    // Left face: 70 × 38 mm → 210 × 114.
    await page.evaluate(() => (window as any).__editorSetFace("left"))
    const leftHandle = await page.waitForFunction(
      (l: { w: number; h: number }) => {
        const c = (window as any).__fabricCanvas
        if (!c) return false
        if (c.getWidth() !== l.w || c.getHeight() !== l.h) return false
        return { w: c.getWidth(), h: c.getHeight() }
      },
      EXPECTED.left,
      { timeout: 15_000 }
    )
    const left = (await leftHandle.jsonValue()) as { w: number; h: number }
    expect(left.w).toBe(EXPECTED.left.w)
    expect(left.h).toBe(EXPECTED.left.h)

    await page.screenshot({ path: "playwright-report/m8-a-canvas.png" })
    assertNoCriticalErrors(qa)
  })
})