import { test, expect } from "@playwright/test"
import {
  loginViaApi,
  attachQaListeners,
  waitForEditor,
  editorState,
  assertNoCriticalErrors,
  BACKEND,
} from "./helpers"

const CANONICAL = "/editor?product=custom-mailer-box&qty=50"
const LEGACY =
  "/editor?sku=box--mailer-box--23--cardboard-natural--print-monochrome--foil-none&quantity=30"

test.describe.serial("M7-B canonical product route + legacy SKU route", () => {
  test("A: canonical route — backend EditorConfig flows into the store without invention", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    // Backend API is the source of truth for physical configuration.
    const cfg = await page.evaluate(async ({ backEnd }) => {
      const res = await fetch(`${backEnd}/catalog/custom-mailer-box/editor-config?quantity=50`)
      return res.json()
    }, { backEnd: BACKEND })
    expect(cfg.success).toBe(true)
    const config = cfg.data as any

    // Product + variant identity.
    expect(config.product.id).toBe("prod-mailer-box")
    expect(config.product.slug).toBe("custom-mailer-box")
    expect(config.product.type).toBe("box")
    expect(config.product.boxType).toBe("mailer-box")
    expect(config.variant.id).toBeTruthy()
    expect(config.variant.sku).toContain("box--")
    expect(config.variant.sizeCode).toBe("f42")
    expect(config.variant.materialCode).toBe("kraft")
    expect(config.variant.printMode).toBe("none")
    expect(config.variant.printSides).toBe(1)
    expect(config.variant.finish).toBe("none")

    // Dimensions normalized to mm (seed stores cm: 11.5×7×3.8 → 115×70×38).
    expect(config.variant.dimensions.unit).toBe("mm")
    expect(config.variant.dimensions).toEqual({ length: 115, width: 70, height: 38, unit: "mm" })

    // Material + pricing.
    expect(config.material.code).toBe("kraft")
    expect(config.material.name).toBeTruthy()
    expect(config.material.hex).toMatch(/^#/)
    expect(config.quantity).toBe(50)
    expect(config.pricing.unitPrice).toBeGreaterThan(0)
    expect(config.pricing.totalPrice).toBeGreaterThan(0)
    expect(config.pricing.currency).toBe("USD")

    // Structure: faces, zones, rules from the backend ProductStructure.
    expect(config.product.structure.type).toBe("box")
    expect(config.product.structure.faces.front.label).toBe("Front Panel")
    expect(config.product.structure.faces.front.width).toBe(115)
    expect(config.product.structure.zones.front).toBeTruthy()
    expect(config.product.structure.rules.moq).toBe(30)

    // The catalog endpoint issues no session — the editor must not invent one.
    expect(config.sessionId).toBeUndefined()

    await page.goto(CANONICAL)
    await waitForEditor(page)

    const state = await editorState(page)
    expect(state.product).toMatchObject({
      id: "prod-mailer-box",
      slug: "custom-mailer-box",
      type: "box",
      boxType: "mailer-box",
    })
    expect(state.productConfig.variantId).toBeTruthy()
    expect(state.productConfig.sku).toContain("box--")
    expect(state.productConfig.quantity).toBe(50)
    expect(state.productConfig.selectedMaterial).toBe("kraft")
    expect(state.productConfig.selectedFinish).toBeUndefined()
    expect(state.structureType).toBe("box")
    expect(state.zones.front).toBeTruthy()

    expect(state.model.type).toBe("mailer_box")
    expect(state.model.dimensions).toEqual({ length: 115, width: 70, height: 38 })
    expect(state.model.material).toBe("kraft")
    expect(state.model.quantity).toBe(50)
    const faceNames = state.model.faces.map((f: any) => f.name)
    expect(faceNames).toContain("Front Panel")
    expect(faceNames).not.toContain("Inside Front")

    // URL quantity drives both header + config, and no phantom session is created.
    await page.getByText(/Qty: 50/).first().waitFor({ state: "visible", timeout: 10000 })
    expect(page.url()).not.toMatch(/sessionId=/)

    await page.screenshot({ path: "playwright-report/m7b-canonical.png" })
    assertNoCriticalErrors(qa)
  })

  test("B: legacy SKU route — 200×150×100 kraft mailer, no product identity", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(LEGACY)
    await waitForEditor(page)

    const state = await editorState(page)
    expect(state.model.type).toBe("mailer_box")
    expect(state.model.material).toBe("cardboard-kraft")
    expect(state.model.dimensions).toEqual({ length: 200, width: 150, height: 100 })
    expect(state.model.quantity).toBe(30)

    // Legacy SKU is UI-composed, not catalog-driven — nothing backend-derived leaks in.
    expect(state.product).toBeUndefined()
    expect(state.productConfig).toBeUndefined()
    expect(state.zones).toBeUndefined()
    expect(state.structureType).toBeUndefined()

    await page.getByText(/Qty: 30/).first().waitFor({ state: "visible", timeout: 10000 })
    expect(page.url()).not.toMatch(/sessionId=/)
    assertNoCriticalErrors(qa)
  })

  test("C: direct navigation + reload reproduces the initialized state in fresh contexts", async ({ browser }) => {
    test.setTimeout(240_000)
    const ctx = await browser.newContext()
    let page: any = null
    try {
      page = await ctx.newPage()
      await loginViaApi(page)
      const qa = attachQaListeners(page)

      // Direct URL in a brand-new browser context (no prior localStorage/cookies).
      await page.goto(CANONICAL)
      await waitForEditor(page)
      let state = await editorState(page)
      expect(state.product?.slug).toBe("custom-mailer-box")
      expect(state.model.dimensions).toEqual({ length: 115, width: 70, height: 38 })
      expect(state.model.material).toBe("kraft")
      expect(state.productConfig?.quantity).toBe(50)

      // Full reload re-runs URL-driven init from scratch — same result, clean layers.
      await page.reload()
      await waitForEditor(page)
      state = await editorState(page)
      expect(state.product?.slug).toBe("custom-mailer-box")
      expect(state.model.dimensions).toEqual({ length: 115, width: 70, height: 38 })
      expect(state.layers.length).toBe(0)
      expect(page.url()).not.toMatch(/sessionId=/)

      assertNoCriticalErrors(qa)
    } finally {
      await ctx.close()
    }

    const ctx2 = await browser.newContext()
    let page2: any = null
    try {
      page2 = await ctx2.newPage()
      await loginViaApi(page2)
      const qa2 = attachQaListeners(page2)

      await page2.goto(LEGACY)
      await waitForEditor(page2)
      let state2 = await editorState(page2)
      expect(state2.model.dimensions).toEqual({ length: 200, width: 150, height: 100 })
      expect(state2.model.material).toBe("cardboard-kraft")
      expect(state2.product).toBeUndefined()

      await page2.reload()
      await waitForEditor(page2)
      state2 = await editorState(page2)
      expect(state2.model.dimensions).toEqual({ length: 200, width: 150, height: 100 })
      expect(state2.product).toBeUndefined()
      expect(page2.url()).not.toMatch(/sessionId=/)

      assertNoCriticalErrors(qa2)
    } finally {
      await ctx2.close()
    }
  })

  test("D: no state leakage between canonical and legacy routes", async ({ page }) => {
    test.setTimeout(300_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)
    const sessionCreations: string[] = []
    page.on("response", (res) => {
      if (res.url().includes("/api/designs/session") && res.request().method() === "POST") {
        sessionCreations.push(res.url())
      }
    })

    // 1) Canonical first.
    await page.goto(CANONICAL)
    await waitForEditor(page)
    let state = await editorState(page)
    expect(state.product?.slug).toBe("custom-mailer-box")
    expect(state.model.dimensions).toEqual({ length: 115, width: 70, height: 38 })
    expect(state.zones?.front).toBeTruthy()

    // 2) Full navigation to the legacy SKU route must not inherit canonical identity.
    await page.goto(LEGACY)
    await waitForEditor(page)
    state = await editorState(page)
    expect(state.product).toBeUndefined()
    expect(state.productConfig).toBeUndefined()
    expect(state.zones).toBeUndefined()
    expect(state.structureType).toBeUndefined()
    expect(state.model.dimensions).toEqual({ length: 200, width: 150, height: 100 })
    expect(state.model.material).toBe("cardboard-kraft")
    expect(state.model.quantity).toBe(30)
    expect(state.layers.length).toBe(0)

    // 3) Back to canonical: catalog identity restored, no legacy pollution.
    await page.goto(CANONICAL)
    await waitForEditor(page)
    state = await editorState(page)
    expect(state.product?.slug).toBe("custom-mailer-box")
    expect(state.productConfig?.quantity).toBe(50)
    expect(state.model.dimensions).toEqual({ length: 115, width: 70, height: 38 })
    expect(state.model.material).toBe("kraft")
    expect(state.zones?.front).toBeTruthy()
    expect(state.layers.length).toBe(0)

    // 4) Pure route framing never fabricates a backend session.
    expect(page.url()).not.toMatch(/sessionId=/)
    expect(sessionCreations.length).toBe(0)

    assertNoCriticalErrors(qa)
  })
})