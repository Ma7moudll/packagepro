import { test, expect } from "@playwright/test"
import {
  loginViaApi,
  attachQaListeners,
  waitForEditor,
  editorState,
  addTextLayer,
  addImageLayer,
  assertNoCriticalErrors,
  PNG_1PX,
  BACKEND,
} from "./helpers"

const EDITOR_URL =
  "/editor?sku=box--mailer-box--23--cardboard-natural--print-monochrome--foil-none&quantity=30"

let sharedSessionId = ""

test.describe.serial("Design editor end-to-end (2D/3D, save, reload, reopen)", () => {
  test("open template, add 2D layers, transform, save to backend", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    const state0 = await editorState(page)
    expect(state0.model.type).toBe("mailer_box")
    expect(state0.model.material).toBe("cardboard-kraft")
    expect(state0.model.dimensions).toEqual({ length: 200, width: 150, height: 100 })
    const n0 = state0.layers.length

    // ---- 2D: add heading via real UI ----
    await page.waitForTimeout(500)
    await page.getByRole("button", { name: /Heading|عنوان/ }).first().waitFor({ state: "visible", timeout: 10000 })
    await page.getByRole("button", { name: /Heading|عنوان/ }).first().click()
    await page.waitForTimeout(300)

    // ---- 2D: text EN + AR via harness ----
    const enS = await addTextLayer(page, "Hello Seal", { position: { x: 120, y: 90 } })
    const enId = enS.layers[enS.layers.length - 1].id
    const arS = await addTextLayer(page, "مرحبا", { position: { x: 200, y: 160 } })
    const arId = arS.layers[arS.layers.length - 1].id

    // ---- 2D: image layer (data-URL persisted) ----
    const imgS = await addImageLayer(page, PNG_1PX)
    expect(imgS.layers.some((l: any) => l.type === "image")).toBe(true)
    const imgLayer = imgS.layers.find((l: any) => l.type === "image")
    expect(String(imgLayer.imageProperties.src)).toContain("data:image/png;base64,")

    // ---- move + rotate ----
    await page.evaluate(
      ({ id }) => {
        ;(window as any).__editorUpdateLayer(id, {
          position: { x: 260, y: 220 },
          rotation: 45,
          scale: { x: 1.5, y: 1.5 },
        })
      },
      { id: enId }
    )
    const s1 = await editorState(page)
    const moved = s1.layers.find((l: any) => l.id === enId)
    expect(moved.position).toEqual({ x: 260, y: 220 })
    expect(moved.rotation).toBe(45)
    expect(moved.scale).toEqual({ x: 1.5, y: 1.5 })

    // ---- zoom via harness ----
    const z0 = (await editorState(page)).camera.zoom
    await page.evaluate(() => (window as any).__editorZoom(0.2))
    await page.waitForTimeout(200)
    const z1 = (await editorState(page)).camera.zoom
    expect(z1).toBeGreaterThan(z0)

    // ---- 3D preview (bottom bar button) ----
    await page.locator("footer button:has(.lucide-box)").click()
    await page.waitForTimeout(1200)
    expect((await editorState(page)).ui.viewMode).toBe("3d")
    await page.screenshot({ path: "playwright-report/editor-3d.png" })

    // ---- switch back to 2D for save ----
    await page.evaluate(() => (window as any).__editorSetViewMode("2d"))
    await page.waitForTimeout(500)
    expect((await editorState(page)).ui.viewMode).toBe("2d")

    // ---- Save to backend ----
    await page.getByRole("button", { name: /Save|حفظ/ }).first().click()
    await page.waitForFunction(
      () => {
        const m = (window.location.href || "").match(/sessionId=([0-9a-f-]{36})/i)
        return m ? true : false
      },
      { timeout: 25000 }
    )
    const sessionId = await page.evaluate(() => {
      const m = (window.location.href || "").match(/sessionId=([0-9a-f-]{36})/i)
      return m ? m[1] : ""
    })
    expect(sessionId).toMatch(/[0-9a-f-]{36}/)
    sharedSessionId = sessionId

    // ---- verify persisted on backend ----
    const backend = await page.evaluate(async ({ sid, backEnd }) => {
      const res = await fetch(`${backEnd}/designs/session/${sid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      })
      return res.json()
    }, { sid: sessionId, backEnd: BACKEND })
    expect(backend.success).toBe(true)
    const savedDesign = backend.data?.designData as any
    expect(savedDesign).toBeTruthy()
    const texts = savedDesign.layers.filter((l: any) => l.type === "text")
    const contents = texts.map((l: any) => l.textProperties?.content)
    expect(contents).toContain("Hello Seal")
    expect(contents.some((c: string) => /مرحبا/.test(c || ""))).toBe(true)
    expect(savedDesign.layers.some((l: any) => l.type === "image")).toBe(true)
    // verify transformed layer persisted
    const savedMoved = savedDesign.layers.find((l: any) => l.textProperties?.content === "Hello Seal")
    expect(savedMoved.position).toEqual({ x: 260, y: 220 })
    expect(savedMoved.rotation).toBe(45)

    assertNoCriticalErrors(qa)
  })

  test("reload + reopen restores the saved design from the backend", async ({ page }) => {
    test.setTimeout(120_000)
    expect(sharedSessionId).toMatch(/[0-9a-f-]{36}/)
    const sessionId = sharedSessionId

    await loginViaApi(page)
    const qa = attachQaListeners(page)
    await page.goto(`${EDITOR_URL}&sessionId=${sessionId}`)
    await waitForEditor(page)

    // ---- reload (same URL, server round-trip) ----
    await page.reload()
    await waitForEditor(page)
    expect(page.url()).toContain(sessionId)

    let state = await editorState(page)
    const textContents = state.layers
      .filter((l: any) => l.type === "text")
      .map((l: any) => l.textProperties?.content)
    expect(textContents).toContain("Hello Seal")
    expect(textContents.some((c: string) => /مرحبا/.test(c || ""))).toBe(true)
    expect(state.layers.some((l: any) => l.type === "image")).toBe(true)
    const moved = state.layers.find((l: any) => l.textProperties?.content === "Hello Seal")
    expect(moved?.position).toEqual({ x: 260, y: 220 })
    expect(moved?.rotation).toBe(45)

    // ---- reopen in a fresh tab from sessionId only ----
    const fresh = await page.context().newPage()
    await loginViaApi(fresh)
    const qa2 = attachQaListeners(fresh)
    await fresh.goto(`/editor?sessionId=${sessionId}`)
    await waitForEditor(fresh)
    state = await editorState(fresh)
    const freshTexts = state.layers.filter((l: any) => l.type === "text")
    expect(freshTexts.length).toBeGreaterThanOrEqual(1)
    expect(state.layers.some((l: any) => l.type === "image")).toBe(true)
    await fresh.screenshot({ path: "playwright-report/editor-reopened.png" })

    assertNoCriticalErrors(qa)
    assertNoCriticalErrors(qa2)
  })
})