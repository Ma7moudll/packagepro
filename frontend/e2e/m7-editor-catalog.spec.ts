import { test, expect } from "@playwright/test"
import {
  loginViaApi,
  attachQaListeners,
  waitForEditor,
  editorState,
  addTextLayer,
  assertNoCriticalErrors,
  BACKEND,
} from "./helpers"

const EDITOR_URL = "/editor?product=custom-mailer-box&qty=50"

test.describe.serial("M7 catalog-driven editor (backend ProductStructure, multi-face, prepress)", () => {
  let sessionId = ""

  test("init editor from backend editor-config: dims, product identity, real faces + zones", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    // Sanity-check the canonical endpoint the editor consumes.
    const cfg = await page.evaluate(async ({ backEnd }) => {
      const res = await fetch(`${backEnd}/catalog/custom-mailer-box/editor-config?quantity=50`)
      return res.json()
    }, { backEnd: BACKEND })
    expect(cfg.success).toBe(true)
    const config = cfg.data as any
    // Dimensions normalized to mm (seed stores cm).
    expect(config.variant.dimensions.unit).toBe("mm")
    expect(config.variant.dimensions).toEqual({ length: 115, width: 70, height: 38, unit: "mm" })
    // Backend-issued structure must carry real faces + zones.
    expect(config.product.structure?.faces?.front?.label).toBe("Front Panel")
    expect(config.product.structure?.faces?.front?.width).toBe(115)
    expect(config.product.structure?.zones?.front).toBeTruthy()
    expect(config.product.structure?.rules?.moq).toBe(30)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    const state = await editorState(page)
    // Product identity flows from the catalog config (productId + variantId + sku).
    expect(state.product).toMatchObject({
      id: "prod-mailer-box",
      slug: "custom-mailer-box",
      type: "box",
      boxType: "mailer-box",
    })
    expect(state.productConfig?.variantId).toBeTruthy()
    expect(state.productConfig?.sku).toContain("box--")
    expect(state.productConfig?.quantity).toBe(50)
    expect(state.structureType).toBe("box")

    // Model: mailer box at real mm dims, kraft material, printSides=1 → 6 outside faces.
    expect(state.model.type).toBe("mailer_box")
    expect(state.model.dimensions).toEqual({ length: 115, width: 70, height: 38 })
    expect(state.model.material).toBe("kraft")
    expect(state.model.quantity).toBe(50)
    const faceNames = state.model.faces.map((f: any) => f.name)
    expect(faceNames).toContain("Front Panel")
    expect(faceNames).toContain("Back Panel")
    expect(faceNames).toContain("Left Panel")
    expect(faceNames).not.toContain("Inside Front")

    // Zones from the ProductStructure are retained for prepress validation.
    expect(state.zones?.front).toBeTruthy()
    expect(state.zones?.front.some((z: any) => z.label === "Brand Logo" && z.required)).toBe(true)

    // Face surfaces must be derivable — the dieline view renders per-face canvases.
    await page.evaluate(() => (window as any).__editorSetViewMode("dieline"))
    await page.waitForTimeout(800)
    expect((await editorState(page)).ui.viewMode).toBe("dieline")
    await page.screenshot({ path: "playwright-report/m7-dieline.png" })

    assertNoCriticalErrors(qa)
  })

  test("multi-face edit: front + top layers persist to backend with product config", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    // Front face layer, positioned inside the required Brand Logo zone.
    const s0 = await addTextLayer(page, "M7 Brand Logo", { position: { x: 57.5, y: 15 } })
    const frontId = s0.layers[s0.layers.length - 1].id

    // Switch the selected face to the top flap and add a second layer there.
    await page.evaluate(() => (window as any).__editorSetFace("top"))
    const s1 = await addTextLayer(page, "M7 Top Seal", { position: { x: 57.5, y: 35 } })
    const topId = s1.layers[s1.layers.length - 1].id

    const mid = await editorState(page)
    expect(mid.layers.find((l: any) => l.id === frontId)?.faceId).toBe("front")
    expect(mid.layers.find((l: any) => l.id === topId)?.faceId).toBe("top")

    // Save to backend.
    await page.getByRole("button", { name: /Save|حفظ/ }).first().click()
    await page.waitForFunction(
      () => (window.location.href || "").match(/sessionId=([0-9a-f-]{36})/i),
      { timeout: 25000 }
    )
    sessionId = await page.evaluate(() => {
      const m = (window.location.href || "").match(/sessionId=([0-9a-f-]{36})/i)
      return m ? m[1] : ""
    })
    expect(sessionId).toMatch(/[0-9a-f-]{36}/)

    // Verify the persisted design carries product identity + config + both face layers.
    const backend = await page.evaluate(async ({ sid, backEnd }) => {
      const res = await fetch(`${backEnd}/designs/session/${sid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      })
      return res.json()
    }, { sid: sessionId, backEnd: BACKEND })
    expect(backend.success).toBe(true)
    const savedDesign = backend.data?.designData as any
    expect(savedDesign).toBeTruthy()
    expect(savedDesign.zones?.front).toBeTruthy()
    expect(savedDesign.product).toMatchObject({ slug: "custom-mailer-box", id: "prod-mailer-box" })
    expect(savedDesign.productConfig?.sku).toContain("box--")
    expect(savedDesign.productConfig?.variantId).toBeTruthy()

    const savedFront = savedDesign.layers.find((l: any) => l.textProperties?.content === "M7 Brand Logo")
    expect(savedFront?.faceId).toBe("front")
    expect(savedFront.position).toEqual({ x: 57.5, y: 15 })
    const savedTop = savedDesign.layers.find((l: any) => l.textProperties?.content === "M7 Top Seal")
    expect(savedTop?.faceId).toBe("top")

    await page.screenshot({ path: "playwright-report/m7-saved.png" })
    assertNoCriticalErrors(qa)
  })

  test("reopen from sessionId restores product structure + multi-face layers", async ({ page }) => {
    test.setTimeout(120_000)
    expect(sessionId).toMatch(/[0-9a-f-]{36}/)

    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(`/editor?sessionId=${sessionId}`)
    await waitForEditor(page)

    const state = await editorState(page)
    expect(state.product?.slug).toBe("custom-mailer-box")
    expect(state.zones?.front).toBeTruthy()
    const texts = state.layers
      .filter((l: any) => l.type === "text")
      .map((l: any) => ({ face: l.faceId, content: l.textProperties?.content }))
    expect(texts).toContainEqual({ face: "front", content: "M7 Brand Logo" })
    expect(texts).toContainEqual({ face: "top", content: "M7 Top Seal" })
    await page.screenshot({ path: "playwright-report/m7-reopened.png" })

    assertNoCriticalErrors(qa)
  })
})