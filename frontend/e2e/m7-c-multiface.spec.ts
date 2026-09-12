import { test, expect, Page } from "@playwright/test"
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

function expectSession(str: string) {
  expect(str).toMatch(/[0-9a-f-]{36}/i)
  return str
}

/** Switch the active per-face editing context and wait for the store to settle. */
async function setFace(page: Page, face: string) {
  await page.evaluate((f) => (window as any).__editorSetFace(f), face)
  await page.waitForFunction(
    (f) => {
      const s = (window as any).__editorState
      return !!s && s().ui.selectedFace === f
    },
    face
  )
}

/** Snapshot the live Fabric canvas objects (per-face editing surface). */
async function fabricObjects(page: Page) {
  await page.waitForFunction(() => {
    const c = (window as any).__fabricCanvas
    return !!c && typeof c.getObjects === "function"
  })
  // Let the layers→Fabric sync effect flush before reading the surface.
  await page.waitForTimeout(150)
  return page.evaluate(() => {
    const c = (window as any).__fabricCanvas
    return (c.getObjects() || []).map((o: any) => ({
      layerId: o.layerId,
      type: o.type,
      angle: o.angle,
      left: o.left,
      top: o.top,
      scaleX: o.scaleX,
      scaleY: o.scaleY,
    }))
  })
}

/** Add a text layer and return the store snapshot + new layer id. */
async function addText(page: Page, content: string, overrides: Record<string, unknown> = {}) {
  const state = await addTextLayer(page, content, overrides)
  const layer = state.layers[state.layers.length - 1]
  return { id: layer.id as string, state }
}

test.describe.serial("M7-C genuine independent per-face artwork state", () => {
  test("A: per-face layers, stable Face IDs, per-face canvas and object isolation", async ({ page }) => {
    test.setTimeout(180_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    // Front face — add a layer, verify it is bound to "front".
    const front = await addText(page, "FRONT ONLY", { position: { x: 80, y: 40 } })
    expect(front.state.layers.find((l: any) => l.id === front.id)?.faceId).toBe("front")

    // Front canvas shows exactly the front layer.
    await setFace(page, "front")
    let objs = await fabricObjects(page)
    expect(objs).toHaveLength(1)
    expect(objs[0].layerId).toBe(front.id)

    // Back face — independent layer, independent position.
    await setFace(page, "back")
    const back = await addText(page, "BACK ONLY", { position: { x: 40, y: 20 } })
    expect(back.state.layers.find((l: any) => l.id === back.id)?.faceId).toBe("back")

    // While on back, ONLY the back layer is on canvas — front object must be gone.
    objs = await fabricObjects(page)
    expect(objs).toHaveLength(1)
    expect(objs[0].layerId).toBe(back.id)

    // Switching back to front restores the front object; the back one must not leak.
    await setFace(page, "front")
    objs = await fabricObjects(page)
    expect(objs).toHaveLength(1)
    expect(objs[0].layerId).toBe(front.id)

    const state = await editorState(page)
    const frontIds = state.layers.filter((l: any) => l.faceId === "front").map((l: any) => l.id)
    const backIds = state.layers.filter((l: any) => l.faceId === "back").map((l: any) => l.id)
    expect(frontIds).toEqual([front.id])
    expect(backIds).toEqual([back.id])

    // Face IDs are stable string identities, not array indices.
    expect(state.model.faces.map((f: any) => f.id)).toEqual(
      expect.arrayContaining(["front", "back", "left", "right", "top", "bottom"])
    )

    // Per-face canvas geometry follows the face: front = length×height, top = length×width.
    await setFace(page, "front")
    expect((await editorState(page)).canvas).toMatchObject({ width: 115 * 3, height: 38 * 3 })
    await setFace(page, "top")
    expect((await editorState(page)).canvas).toMatchObject({ width: 115 * 3, height: 70 * 3 })

    assertNoCriticalErrors(qa)
  })

  test("B: independent per-face text, color, position, scale and rotation", async ({ page }) => {
    test.setTimeout(180_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    await setFace(page, "front")
    const front = await addText(page, "FRONT LABEL", {
      position: { x: 120, y: 40 },
      scale: { x: 1.4, y: 1.2 },
      rotation: Math.PI / 12,
    })
    await page.evaluate(
      (id) =>
        (window as any).__editorUpdateLayer(id, (l: any) => ({
          ...l,
          textProperties: { ...l.textProperties, color: "#ff0000", fontSize: 32 },
        })),
      front.id
    )

    await setFace(page, "back")
    const back = await addText(page, "BACK LABEL", {
      position: { x: 60, y: 90 },
      scale: { x: 0.8, y: 0.8 },
      rotation: -Math.PI / 6,
    })
    await page.evaluate(
      (id) =>
        (window as any).__editorUpdateLayer(id, (l: any) => ({
          ...l,
          textProperties: { ...l.textProperties, color: "#0000ff", fontSize: 48 },
        })),
      back.id
    )

    await setFace(page, "top")
    const top = await addText(page, "TOP LABEL", { position: { x: 200, y: 100 } })
    expect(top.state.layers.find((l: any) => l.id === top.id)?.faceId).toBe("top")

    // Editing the front layer while another face is active must not touch any other face.
    await page.evaluate(
      (id) =>
        (window as any).__editorUpdateLayer(id, (l: any) => ({
          ...l,
          textProperties: { ...l.textProperties, content: "FRONT EDITED" },
        })),
      front.id
    )

    const state = await editorState(page)
    const byId = (id: string) => state.layers.find((l: any) => l.id === id)
    expect(byId(front.id)).toMatchObject({
      faceId: "front",
      position: { x: 120, y: 40 },
      scale: { x: 1.4, y: 1.2 },
      rotation: Math.PI / 12,
    })
    expect(byId(front.id).textProperties.content).toBe("FRONT EDITED")
    expect(byId(front.id).textProperties.color).toBe("#ff0000")
    expect(byId(front.id).textProperties.fontSize).toBe(32)

    expect(byId(back.id)).toMatchObject({
      faceId: "back",
      position: { x: 60, y: 90 },
      scale: { x: 0.8, y: 0.8 },
      rotation: -Math.PI / 6,
    })
    expect(byId(back.id).textProperties.content).toBe("BACK LABEL")
    expect(byId(back.id).textProperties.color).toBe("#0000ff")
    expect(byId(back.id).textProperties.fontSize).toBe(48)

    expect(byId(top.id).textProperties.content).toBe("TOP LABEL")

    // Fabric round-trips each face's rotation independently (radians ⇄ degrees).
    await setFace(page, "front")
    let objs = await fabricObjects(page)
    expect(objs).toHaveLength(1)
    expect(objs[0].angle).toBeCloseTo((Math.PI / 12) * (180 / Math.PI), 4)
    await setFace(page, "back")
    objs = await fabricObjects(page)
    expect(objs).toHaveLength(1)
    expect(objs[0].angle).toBeCloseTo((-Math.PI / 6) * (180 / Math.PI), 4)

    assertNoCriticalErrors(qa)
  })

  test("C: hidden layers stay isolated per face — visibility never crosses faces", async ({ page }) => {
    test.setTimeout(180_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    await setFace(page, "front")
    const shown = await addText(page, "FRONT SHOWN", { position: { x: 80, y: 40 } })
    const hidden = await addText(page, "FRONT HIDDEN", { position: { x: 120, y: 80 } })
    await page.evaluate((id) => (window as any).__editorUpdateLayer(id, { visible: false }), hidden.id)

    // Front shows exactly its visible layer — the hidden one is not on the surface.
    let objs = await fabricObjects(page)
    expect(objs).toHaveLength(1)
    expect(objs[0].layerId).toBe(shown.id)

    // Back face is fully independent; the hidden FRONT layer must not leak in.
    await setFace(page, "back")
    const backShown = await addText(page, "BACK SHOWN", { position: { x: 60, y: 40 } })
    objs = await fabricObjects(page)
    expect(objs).toHaveLength(1)
    expect(objs[0].layerId).toBe(backShown.id)

    // Re-showing the layer only affects its own face while inactive elsewhere.
    await page.evaluate((id) => (window as any).__editorUpdateLayer(id, { visible: true }), hidden.id)
    objs = await fabricObjects(page)
    expect(objs).toHaveLength(1)
    expect(objs[0].layerId).toBe(backShown.id)

    await setFace(page, "front")
    objs = await fabricObjects(page)
    expect(objs).toHaveLength(2)
    const layerIds = objs.map((o: any) => o.layerId).sort()
    expect(layerIds).toEqual([shown.id, hidden.id].sort())

    const state = await editorState(page)
    expect(state.layers.find((l: any) => l.id === hidden.id)).toMatchObject({
      faceId: "front",
      visible: true,
    })
    expect(state.layers.find((l: any) => l.id === shown.id)?.faceId).toBe("front")
    expect(state.layers.find((l: any) => l.id === backShown.id)?.faceId).toBe("back")

    assertNoCriticalErrors(qa)
  })

  test("D: save → backend → reload reproduces every face exactly", async ({ page }) => {
    test.setTimeout(300_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    await setFace(page, "front")
    const front = await addText(page, "FRONT PERSISTED", {
      position: { x: 100, y: 45 },
      rotation: Math.PI / 6,
    })
    await page.evaluate(
      (id) =>
        (window as any).__editorUpdateLayer(id, (l: any) => ({
          ...l,
          textProperties: { ...l.textProperties, color: "#10b981", fontSize: 36 },
        })),
      front.id
    )

    await setFace(page, "back")
    const back = await addText(page, "BACK PERSISTED", {
      position: { x: 50, y: 80 },
      scale: { x: 1.25, y: 1.25 },
      rotation: -0.4,
    })
    await page.evaluate(
      (id) =>
        (window as any).__editorUpdateLayer(id, (l: any) => ({
          ...l,
          textProperties: { ...l.textProperties, color: "#f59e0b", fontSize: 28 },
        })),
      back.id
    )

    await setFace(page, "top")
    const top = await addText(page, "TOP PERSISTED", { position: { x: 180, y: 130 } })

    // Save via the header; the URL gains the backend session id.
    await page.getByRole("button", { name: /Save|حفظ/ }).first().click()
    await page.waitForFunction(() => /sessionId=([0-9a-f-]{36})/i.test(location.href), { timeout: 30000 })
    const sid = expectSession(
      await page.evaluate(() => (location.href.match(/sessionId=([0-9a-f-]{36})/i) || [])[1])
    )

    // The backend genuinely persisted the per-face artwork (not UI-local state).
    const backend = await page.evaluate(
      async ({ sid, backEnd }) => {
        const res = await fetch(`${backEnd}/designs/session/${sid}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
        return res.json()
      },
      { sid, backEnd: BACKEND }
    )
    expect(backend.success).toBe(true)
    const dd = backend.data?.designData as any
    expect(dd).toBeTruthy()
    expect(dd.layers?.length).toBe(3)
    expect(dd.layers?.map((l: any) => l.faceId).sort()).toEqual(["back", "front", "top"])
    expect(dd.product?.slug).toBe("custom-mailer-box")

    // In-place reload keeps product + sessionId: the restored design must win, never a catalog wipe.
    await page.reload()
    await waitForEditor(page)

    const after = await editorState(page)
    expect(after.layers.length).toBe(3)
    const find = (content: string) => after.layers.find((l: any) => l.textProperties?.content === content)
    expect(find("FRONT PERSISTED")).toBeTruthy()
    expect(find("FRONT PERSISTED")).toMatchObject({
      faceId: "front",
      position: { x: 100, y: 45 },
      rotation: Math.PI / 6,
    })
    expect(find("FRONT PERSISTED").textProperties.color).toBe("#10b981")
    expect(find("FRONT PERSISTED").textProperties.fontSize).toBe(36)
    expect(find("BACK PERSISTED")).toMatchObject({
      faceId: "back",
      position: { x: 50, y: 80 },
      scale: { x: 1.25, y: 1.25 },
      rotation: -0.4,
    })
    expect(find("BACK PERSISTED").textProperties.color).toBe("#f59e0b")
    expect(find("TOP PERSISTED")).toMatchObject({
      faceId: "top",
      position: { x: 180, y: 130 },
    })
    expect(find("TOP PERSISTED").textProperties.content).toBe("TOP PERSISTED")

    // Layer IDs survive the save/reload round-trip — stable identity, not index-derived.
    expect([front.id, back.id, top.id].every((id) => after.layers.some((l: any) => l.id === id))).toBe(true)

    // The editor surface reconstructs the per-face artwork on the active face (top was last active).
    await setFace(page, "front")
    let objs = await fabricObjects(page)
    expect(objs).toHaveLength(1)
    expect(objs[0].layerId).toBe(front.id)
    expect(objs[0].angle).toBeCloseTo(30, 4)

    await page.screenshot({ path: "playwright-report/m7c-reloaded.png" })
    assertNoCriticalErrors(qa)
  })

  test("E: fresh reopen from a clean session URL reconstructs identical multi-face artwork", async ({ browser }) => {
    test.setTimeout(300_000)

    let sid = ""
    let baseline: any = null

    const ctx = await browser.newContext()
    let page: any = null
    try {
      page = await ctx.newPage()
      await loginViaApi(page)
      const qa = attachQaListeners(page)

      await page.goto(EDITOR_URL)
      await waitForEditor(page)

      await setFace(page, "front")
      await addText(page, "E FRONT", { position: { x: 77, y: 33 } })
      await addText(page, "E FRONT 2", { position: { x: 200, y: 60 }, rotation: Math.PI / 4 })
      await setFace(page, "back")
      await addText(page, "E BACK", { position: { x: 90, y: 70 }, scale: { x: 1.5, y: 1.5 } })

      await page.getByRole("button", { name: /Save|حفظ/ }).first().click()
      await page.waitForFunction(() => /sessionId=([0-9a-f-]{36})/i.test(location.href), { timeout: 30000 })
      sid = expectSession(
        await page.evaluate(() => (location.href.match(/sessionId=([0-9a-f-]{36})/i) || [])[1])
      )
      baseline = await editorState(page)
      assertNoCriticalErrors(qa)
    } finally {
      await ctx.close()
    }

    const normalize = (s: any) =>
      s.layers
        .map((l: any) => ({
          face: l.faceId,
          content: l.textProperties?.content,
          position: l.position,
          scale: l.scale,
          rotation: l.rotation,
          color: l.textProperties?.color,
          fontSize: l.textProperties?.fontSize,
        }))
        .sort((x: any, y: any) => `${x.face}:${x.content}`.localeCompare(`${y.face}:${y.content}`))

    const ctx2 = await browser.newContext()
    let page2: any = null
    try {
      page2 = await ctx2.newPage()
      await loginViaApi(page2)
      const qa2 = attachQaListeners(page2)

      // Clean reopen: only the session id frames the editor (no product/catalog re-init).
      await page2.goto(`/editor?sessionId=${sid}`)
      await waitForEditor(page2)

      const restored = await editorState(page2)
      expect(restored.layers.length).toBe(3)

      // Order-independent deep equality of every per-face artwork attribute.
      expect(normalize(restored)).toEqual(normalize(baseline))

      // Layer ids are stable across save/reopen — real identity, not array position.
      const baselineIds = baseline.layers.map((l: any) => l.id).sort()
      const restoredIds = restored.layers.map((l: any) => l.id).sort()
      expect(restoredIds).toEqual(baselineIds)

      // Per-face composition is intact.
      expect(restored.layers.filter((l: any) => l.faceId === "front").length).toBe(2)
      expect(restored.layers.filter((l: any) => l.faceId === "back").length).toBe(1)

      // The reopened surface shows the persisted artwork on its face.
      await setFace(page2, "front")
      const objs = await fabricObjects(page2)
      expect(objs).toHaveLength(2)

      await page2.screenshot({ path: "playwright-report/m7c-reopened.png" })
      assertNoCriticalErrors(qa2)
    } finally {
      await ctx2.close()
    }
  })
})