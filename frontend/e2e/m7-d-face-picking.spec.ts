import { test, expect, Page } from "@playwright/test"
import {
  loginViaApi,
  attachQaListeners,
  waitForEditor,
  editorState,
  addTextLayer,
  assertNoCriticalErrors,
} from "./helpers"

const EDITOR_URL = "/editor?product=custom-mailer-box&qty=50"
const PRODUCT_FACES = ["front", "back", "left", "right", "top", "bottom"]

/** Switch the store view mode and wait for the shell to re-render. */
async function setViewMode(page: Page, mode: "2d" | "3d") {
  await page.evaluate((m) => (window as any).__editorSetViewMode(m), mode)
  await page.waitForFunction(
    (m) => {
      const s = (window as any).__editorState
      return !!s && s().ui.viewMode === m
    },
    mode
  )
}

/**
 * Log in, open the catalog-driven editor (defaults to 2D in waitForEditor) and
 * switch to the real 3D canvas. Waits until the real-raycast pick harness
 * (`__editorPickFace*`, `__editor3DFaces`) is live on the mounted scene.
 */
async function open3D(page: Page) {
  await loginViaApi(page)
  const qa = attachQaListeners(page)
  await page.goto(EDITOR_URL)
  await waitForEditor(page)
  await setViewMode(page, "3d")
  await page.waitForFunction(
    () =>
      typeof (window as any).__editorPickFace === "function" &&
      typeof (window as any).__editorPickFaceAt === "function" &&
      typeof (window as any).__editorPickScan === "function" &&
      typeof (window as any).__editor3DFaces === "function",
    { timeout: 30000 }
  )
  await page.waitForSelector("canvas", { state: "visible", timeout: 30000 })
  return qa
}

/** Real raycast grid scan → apply the pick of the first face we can actually hit. */
async function pickAnyVisibleFace(page: Page): Promise<string> {
  const res = await page.evaluate(() => {
    if (typeof (window as any).__editorPickScan !== "function") {
      return { target: null, applied: null }
    }
    const scan = (window as any).__editorPickScan()
    if (!scan.length) return { target: null, applied: null }
    const first = scan[0]
    const applied = (window as any).__editorPickFaceAt(first.ndc[0], first.ndc[1])
    return { target: first.faceId as string, applied }
  })
  expect(res.target, "no physical face was raycastable").toBeTruthy()
  expect(res.applied).toBe(res.target)
  return res.target as string
}

/**
 * Wait until a specific face id becomes raycastable through the real raycaster
 * (the box auto-rotates, so the wanted physical surface rotates into view), then
 * apply the pick. Proves the real scene/camera/projection, not a forced shortcut.
 */
async function waitForVisibleFace(page: Page, faceId: string, timeout = 20_000) {
  await expect
    .poll(
      () =>
        page.evaluate((fid) => {
          if (typeof (window as any).__editorPickScan !== "function") return null
          const scan = (window as any).__editorPickScan()
          const hit = scan.find((s: any) => s.faceId === fid)
          if (!hit) return null
          const applied = (window as any).__editorPickFaceAt(hit.ndc[0], hit.ndc[1])
          return applied
        }, faceId),
      { timeout, intervals: [300] }
    )
    .toBe(faceId)
}

/** Snapshot the live Fabric canvas objects (per-face editing surface). */
async function fabricObjects(page: Page) {
  await page.waitForFunction(() => {
    const c = (window as any).__fabricCanvas
    return !!c && typeof c.getObjects === "function"
  })
  await page.waitForTimeout(150)
  return page.evaluate(() => {
    const c = (window as any).__fabricCanvas
    return (c.getObjects() || []).map((o: any) => o.layerId)
  })
}

/** Add a text layer on the currently active face. */
async function addText(page: Page, content: string, overrides: Record<string, unknown> = {}) {
  const state = await addTextLayer(page, content, overrides)
  const layer = state.layers[state.layers.length - 1]
  return { id: layer.id as string, state }
}

/** Expected 2D editor canvas size for the current selected face (M7-C mapping). */
async function expectingCanvasDims(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__editorState()
    const d = s.model.dimensions
    const face: string = s.ui.selectedFace
    let cw: number, ch: number
    if (face.includes("left") || face.includes("right")) {
      cw = d.width * 3
      ch = d.height * 3
    } else if (face.includes("top") || face.includes("bottom")) {
      cw = d.length * 3
      ch = d.width * 3
    } else {
      cw = d.length * 3
      ch = d.height * 3
    }
    return { cw, ch }
  })
}

/** Aims at the visible face nearest the screen centre and returns its client coords. */
async function getAimPoint(page: Page) {
  return page.evaluate(() => {
    if (
      typeof (window as any).__editor3DFaces !== "function" ||
      typeof (window as any).__editorPickFace !== "function"
    ) {
      return null
    }
    const faces = (window as any)
      .__editor3DFaces()
      .filter((f: any) => f.visible)
      .sort(
        (a: any, b: any) =>
          Math.hypot(a.ndc[0], a.ndc[1]) - Math.hypot(b.ndc[0], b.ndc[1])
      )
    const canvas = document.querySelector("canvas") as HTMLCanvasElement
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return null
    for (const f of faces) {
      const clientX = rect.left + ((f.ndc[0] + 1) / 2) * rect.width
      const clientY = rect.top + ((1 - f.ndc[1]) / 2) * rect.height
      const probe = (window as any).__editorPickFace(clientX, clientY, { apply: false })
      if (probe === f.faceId) {
        return { faceId: f.faceId, clientX, clientY }
      }
    }
    return null
  })
}

test.describe.serial("M7-D physical 3D face picking -> real Face ID -> 2D face editor", () => {
  test("A: a real raycast on a physical surface resolves to its ProductStructure Face ID", async ({ page }) => {
    test.setTimeout(180_000)
    const qa = await open3D(page)

    // Every printable physical surface carries explicit stable Face ID metadata.
    const faces = await page.evaluate(() => (window as any).__editor3DFaces())
    expect(faces.length).toBeGreaterThanOrEqual(6)
    const ids = new Set(faces.map((f: any) => f.faceId))
    for (const id of PRODUCT_FACES) expect(ids.has(id)).toBe(true)

    // The ids are strings from ProductStructure — not array indexes or positions.
    const state0 = await editorState(page)
    const productIds = state0.model.faces.map((f: any) => f.id)
    for (const id of Array.from(ids)) {
      expect(productIds).toContain(id)
    }
    // Same logical face may live on several physical meshes (e.g. the top flaps) —
    // the id travels with the geometry metadata, never an array position.
    const grouped = new Map<string, number>()
    for (const f of faces) grouped.set(f.faceId, (grouped.get(f.faceId) || 0) + 1)
    expect(grouped.get("top") || 0).toBeGreaterThanOrEqual(1)

    // Real interaction path: raycast -> face id -> store binding -> selection.
    const target = await pickAnyVisibleFace(page)
    const state = await editorState(page)
    expect(state.ui.selectedFace).toBe(target)
    expect(PRODUCT_FACES).toContain(target)

    // Empty space (top-left corner of the viewport) hits no printable surface.
    const miss = await page.evaluate(() => {
      const rect = (document.querySelector("canvas") as HTMLCanvasElement).getBoundingClientRect()
      const hit = (window as any).__editorPickFace(rect.left + 8, rect.top + 8, { apply: false })
      return hit
    })
    expect(miss).toBeNull()

    assertNoCriticalErrors(qa)
  })

  test("B: distinct physical surfaces resolve to distinct stable Face IDs", async ({ page }) => {
    test.setTimeout(180_000)
    const qa = await open3D(page)

    // First pick — real raycast resolves whatever front-facing surface is shown.
    const first = await pickAnyVisibleFace(page)

    // Turn the model (turntable harness) until a DIFFERENT surface is raycastable.
    let second = first
    for (let i = 0; i < 30 && second === first; i++) {
      await page.evaluate((y: number) => {
        ;(window as any).__editorSpinBox.active = false
        ;(window as any).__editorSpinBox.yOverride = y
      }, (i + 1) * 0.7)
      await page.waitForTimeout(400)
      const r = await page.evaluate((avoid) => {
        if (typeof (window as any).__editorPickScan !== "function") return null
        const scan = (window as any)
          .__editorPickScan()
          .filter((s: any) => s.faceId !== avoid)
        if (!scan.length) return null
        const el = scan[0]
        ;(window as any).__editorPickFaceAt(el.ndc[0], el.ndc[1])
        return el.faceId as string
      }, first)
      if (r) second = r
    }
    expect(second).not.toBe(first)
    expect(PRODUCT_FACES).toContain(second)

    // A resolve can never yield a face outside the ProductStructure set.
    const s = await editorState(page)
    expect(PRODUCT_FACES).toContain(s.ui.selectedFace)

    assertNoCriticalErrors(qa)
  })

  test("C: picking a physical face activates that exact face in the 2D editor", async ({ page }) => {
    test.setTimeout(180_000)
    const qa = await open3D(page)

    // 1) Pick whatever physical face is raycastable now (real raycaster).
    const picked = await pickAnyVisibleFace(page)

    // 2) The SAME face becomes active in the 2D editor, with matching canvas geometry.
    await setViewMode(page, "2d")
    const s2d = await editorState(page)
    expect(s2d.ui.selectedFace).toBe(picked)
    const expectedDims = await expectingCanvasDims(page)
    expect(s2d.canvas).toMatchObject({ width: expectedDims.cw, height: expectedDims.ch })

    // 3) Artwork added while that face is active lands on the picked face.
    const layer = await addText(page, "PICKED FACE ART")
    expect(layer.state.layers.find((l: any) => l.id === layer.id)?.faceId).toBe(picked)
    const objs = await fabricObjects(page)
    expect(objs).toEqual([layer.id])

    // 4) Back to 3D: rotate until the SAME physical face is raycastable again, then pick it.
    await setViewMode(page, "3d")
    await waitForVisibleFace(page, picked)
    const s3d = await editorState(page)
    expect(s3d.ui.selectedFace).toBe(picked)

    // 5) The 2D surface reconstructs the picked face's artwork — live, bidirectional.
    await setViewMode(page, "2d")
    expect((await editorState(page)).ui.selectedFace).toBe(picked)
    const objs2 = await fabricObjects(page)
    expect(objs2).toEqual([layer.id])

    await page.screenshot({ path: "playwright-report/m7d-picked.png" })
    assertNoCriticalErrors(qa)
  })

  test("D: orbit drag never selects; a real click on the canvas does", async ({ page }) => {
    test.setTimeout(180_000)
    const qa = await open3D(page)

    // Freeze the turntable so the surface under any pixel is static (the click
    // itself is still a genuine pointer click driven over the WebGL canvas).
    await page.evaluate(() => {
      ;(window as any).__editorSpinBox.active = false
    })

    // Baseline selection.
    const before = (await editorState(page)).ui.selectedFace

    // Drag to orbit the camera — must NOT change the selection.
    const aim0 = await getAimPoint(page)
    expect(aim0).toBeTruthy()
    const aim = aim0!
    await page.mouse.move(aim.clientX, aim.clientY)
    await page.mouse.down()
    await page.mouse.move(aim.clientX + 90, aim.clientY + 50, { steps: 6 })
    await page.mouse.up()
    const afterDrag = (await editorState(page)).ui.selectedFace
    expect(afterDrag).toBe(before)

    // A real pointer click (no movement) hits the WebGL canvas; the selection
    // must equal the face the REAL raycaster reads back under that same pixel.
    let verified: { expected: string; selected: string } | null = null
    for (let i = 0; i < 6 && verified === null; i++) {
      const aimP = await getAimPoint(page)
      if (!aimP) {
        await page.waitForTimeout(300)
        continue
      }
      await page.mouse.click(aimP.clientX, aimP.clientY)
      await page.waitForTimeout(120)
      const selected = (await editorState(page)).ui.selectedFace
      const expected = await page.evaluate(
        ({ x, y }) => {
          if (typeof (window as any).__editorPickFace !== "function") return null
          return (window as any).__editorPickFace(x, y, { apply: false })
        },
        { x: aimP.clientX, y: aimP.clientY }
      )
      if (expected && selected === expected) {
        verified = { expected, selected }
      }
    }
    expect(
      verified,
      "a real click never produced a face selection matching the raycast"
    ).toBeTruthy()
    expect(PRODUCT_FACES).toContain(verified!.expected)

    assertNoCriticalErrors(qa)
  })

  test("E: 2D artwork maps onto the picked 3D face; M7-C per-face isolation survives 2D/3D hops", async ({ page }) => {
    test.setTimeout(180_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)
    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    // Independent multi-face artwork (M7-C baseline).
    await setViewMode(page, "2d")
    await page.evaluate(() => (window as any).__editorSetFace("front"))
    const front = await addText(page, "E FRONT", { position: { x: 90, y: 40 } })
    await page.evaluate(() => (window as any).__editorSetFace("back"))
    const back = await addText(page, "E BACK", { position: { x: 60, y: 30 } })

    // All six physical surfaces are tagged with the ProductStructure face ids.
    await setViewMode(page, "3d")
    await page.waitForFunction(
      () => typeof (window as any).__editor3DFaces === "function",
      { timeout: 30000 }
    )
    const faces = await page.evaluate(() => (window as any).__editor3DFaces())
    const ids = new Set(faces.map((f: any) => f.faceId))
    for (const id of PRODUCT_FACES) expect(ids.has(id)).toBe(true)

    // Rotate-to-front (turntable harness pins the azimuth so the front wall
    // faces the camera) and pick it through the real raycaster.
    await page.evaluate(() => {
      ;(window as any).__editorSpinBox.active = false
      ;(window as any).__editorSpinBox.yOverride = Math.PI / 4
    })
    await waitForVisibleFace(page, "front")
    expect((await editorState(page)).ui.selectedFace).toBe("front")

    // Back in 2D, only the front face's artwork is on the surface (isolation held).
    await setViewMode(page, "2d")
    expect((await editorState(page)).ui.selectedFace).toBe("front")
    const objs = await fabricObjects(page)
    expect(objs).toHaveLength(1)
    expect(objs[0]).toBe(front.id)

    // Toggle to back — still independent, not polluted by 3D visits or picks.
    await page.evaluate(() => (window as any).__editorSetFace("back"))
    const objsBack = await fabricObjects(page)
    expect(objsBack).toHaveLength(1)
    expect(objsBack[0]).toBe(back.id)

    const state = await editorState(page)
    expect(state.layers.find((l: any) => l.id === front.id)?.faceId).toBe("front")
    expect(state.layers.find((l: any) => l.id === back.id)?.faceId).toBe("back")
    // viewMode stayed put — DesignCanvas2D was never unmounted by a stale history push.
    expect(state.ui.viewMode).toBe("2d")

    assertNoCriticalErrors(qa)
  })
})