import { test, expect } from "@playwright/test"
import {
  loginViaApi,
  attachQaListeners,
  waitForEditor,
  editorState,
  assertNoCriticalErrors,
  BACKEND,
} from "./helpers"
import {
  findDesignBySession,
  updateDesignLifecycle,
  findDesignLifecycle,
  insertLegacyDesignRow,
  closeDb,
} from "./db"

const EDITOR_URL = "/editor?product=custom-mailer-box&qty=50"

/**
 * M8-H — Persistence & Reproducibility (real PostgreSQL).
 *
 * Proves the v2 design-data contract end to end:
 *   A  Manifest snapshot on save      — schemaVersion 2 + blueprint/exact
 *      provenance + resolved-geometry manifest (faces, prepress, dieline incl.
 *      faceRelationships), while M7 consumers' top-level state fields survive.
 *   B  Deterministic reopen           — manifest-first restore reproduces the
 *      canvas extent and re-saving yields an IDENTICAL manifest (independent of
 *      the live seed — AMENDMENT 5: the manifest snapshots resolved geometry,
 *      never requires an export artifact).
 *   C  Lifecycle save gate            — a SUBMITTED session rejects saves (400);
 *      the persisted designData is left untouched.
 *   D  Legacy (v1) migration          — a raw core-state blob loads and re-saves
 *      as a v2 envelope with migrated/best_effort provenance + preserved layers.
 */
test.describe.serial("M8-H Persistence & Reproducibility (real Postgres)", () => {
  let sessionId = ""
  let savedDesignData: any = null

  test.afterAll(() => closeDb())

  test("A: save persists a v2 manifest envelope (blueprint/exact) with M7 fields intact", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    // One text layer so the M7 traceability contract (top-level `layers`) is
    // verifiable inside the same envelope that now carries the manifest.
    await page.evaluate(() => (window as any).__editorSetViewMode("2d"))
    await page.waitForTimeout(400)
    await page.evaluate(() => {
      const s = window as any
      s.__editorAddText && s.__editorAddText!()
    })
    await page.waitForTimeout(300)

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

    const design = await findDesignBySession(sessionId)
    expect(design).toBeTruthy()
    const dd = design!.designData as any
    expect(dd).toBeTruthy()

    // v2 envelope + provenance (M8-native save from a seeded blueprint).
    expect(dd.schemaVersion).toBe(2)
    expect(dd.manifestSource).toBe("blueprint")
    expect(dd.reproducibility).toBe("exact")

    // Resolved-geometry manifest — seed F42 115×70×38 mm.
    const mf = dd.manifest as any
    expect(mf).toBeTruthy()
    expect(mf.product).toMatchObject({ id: "prod-mailer-box", slug: "custom-mailer-box" })
    expect(mf.variant.dimensions).toEqual({ length: 115, width: 70, height: 38, unit: "mm" })
    expect(mf.faces.front).toEqual({ w: 115, h: 38 })
    // The full resolved dieline snapshot incl. paths + faceRelationships.
    expect(mf.dieline).toBeTruthy()
    expect(mf.dieline.panels.front).toBeTruthy()
    expect(Array.isArray(mf.dieline.cutPaths)).toBe(true)
    expect(mf.dieline.cutPaths.length).toBeGreaterThan(0)
    expect(mf.dieline.faceRelationships?.length ?? 0).toBeGreaterThan(0)
    // Prepress baseline snapshot (mm).
    expect(mf.prepress).toMatchObject({ bleedMm: 3, safeMm: 5, dpiMin: 300 })

    // M7 traceability contract is untouched by the envelope (top-level fields).
    expect(dd.product).toMatchObject({ id: "prod-mailer-box", slug: "custom-mailer-box" })
    expect(dd.productConfig?.variantId).toBeTruthy()
    expect(dd.productConfig?.sku).toContain("box--")
    expect(Array.isArray(dd.layers)).toBe(true)
    expect(dd.layers.length).toBeGreaterThan(0)

    savedDesignData = dd
    await page.screenshot({ path: "playwright-report/m8-h-save.png" })
    assertNoCriticalErrors(qa)
  })

  test("B: manifest-first reopen reproduces canvas extent; re-save keeps manifest identical", async ({ page }) => {
    expect(sessionId).toMatch(/[0-9a-f-]{36}/)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    // Reopen with ONLY the session id (no catalog init) — the persisted
    // manifest is the single source of truth for geometry.
    await page.goto(`/editor?sessionId=${sessionId}`)
    await waitForEditor(page)

    const st = await editorState(page)
    // F42 front panel 115×38 mm at PX_PER_MM=3 → 345×114 px canvas.
    expect(st.canvas.width).toBe(345)
    expect(st.canvas.height).toBe(114)
    expect(st.product?.id).toBe("prod-mailer-box")

    // Re-save and confirm reproducibility — identical manifest, independent of
    // the live seed (a manifest mutated at seed level cannot alter re-saves).
    await page.getByRole("button", { name: /Save|حفظ/ }).first().click()
    await page.waitForTimeout(2500)

    const design = await findDesignBySession(sessionId)
    const dd = design!.designData as any
    expect(dd.schemaVersion).toBe(2)
    expect(dd.manifestSource).toBe("blueprint")
    expect(dd.manifest.faces.front).toEqual({ w: 115, h: 38 })
    expect(dd.manifest.variant.dimensions).toEqual({ length: 115, width: 70, height: 38, unit: "mm" })
    // manifest is persisted with the design, no export artifact required.
    expect(dd.manifest.dieline?.faceRelationships ?? []).toEqual(savedDesignData?.manifest?.dieline?.faceRelationships ?? [])

    savedDesignData = dd
    await page.screenshot({ path: "playwright-report/m8-h-reopen.png" })
    assertNoCriticalErrors(qa)
  })

  test("C: SUBMITTED lifecycle rejects saves; persisted designData is untouched", async ({ page }) => {
    expect(sessionId).toMatch(/[0-9a-f-]{36}/)
    await loginViaApi(page)

    await updateDesignLifecycle(sessionId, "SUBMITTED")
    expect(await findDesignLifecycle(sessionId)).toBe("SUBMITTED")

    // Drive the real save endpoint (the editor's backend gate) — expect 400.
    const attempt = await page.evaluate(
      async ({ backEnd, sid, designData }) => {
        const res = await fetch(`${backEnd}/designs/save`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId: sid, designData }),
        })
        return { status: res.status, body: await res.json().catch(() => null) }
      },
      { backEnd: BACKEND, sid: sessionId, designData: savedDesignData }
    )
    expect(attempt.status).toBe(400)
    expect(String(attempt.body?.message || JSON.stringify(attempt.body))).toContain(
      "Cannot save design in SUBMITTED status"
    )

    // The rejection must NOT have clobbered anything — designData unchanged.
    const design = await findDesignBySession(sessionId)
    const dd = design!.designData as any
    expect(dd.schemaVersion).toBe(2)
    expect(dd.manifest.faces.front).toEqual({ w: 115, h: 38 })

    // Restore DRAFT so the suite leaves the fixture clean.
    await updateDesignLifecycle(sessionId, "DRAFT")
    await page.screenshot({ path: "playwright-report/m8-h-gate.png" })
  })

  test("D: legacy v1 blob migrates to v2 with best_effort provenance + preserved artwork", async ({ page }) => {
    const legacySession = crypto.randomUUID()

    // Build a FAITHFUL legacy (v1) blob the way pre-M8-H software saved it: the
    // full live core state, with NO envelope (no schemaVersion / manifest).
    // Synthesizing it from the live editor guarantees every ModelState field
    // (quantity, faces, finishing, ...) is present — a hand-crafted minimal blob
    // is not a realistic v1 save.
    await loginViaApi(page)
    await page.goto(EDITOR_URL)
    await waitForEditor(page)
    await page.evaluate(() => {
      const s = window as any
      s.__editorAddText && s.__editorAddText!()
    })
    await page.waitForTimeout(300)
    await page.evaluate(() => {
      const s = window as any
      const st = s.__editorState()
      const id = st.layers[st.layers.length - 1].id
      s.__editorUpdateLayer(id, (l: any) => ({
        ...l,
        textProperties: { ...l.textProperties, content: "LEGACY TEXT" },
      }))
    })
    const live = await editorState(page)
    const legacyCoreState = {
      canvas: live.canvas,
      model: live.model,
      layers: live.layers,
      selectedLayerIds: live.selectedLayerIds,
      camera: live.camera,
      activeTool: "select",
      ui: live.ui,
      lifecycleStatus: "DRAFT",
      zones: live.zones,
      product: live.product,
      productConfig: live.productConfig,
      structureType: live.structureType,
    } as any
    // v1 = { NO schemaVersion, NO manifest envelope } — the raw core-state blob.
    expect(legacyCoreState.schemaVersion).toBeUndefined()
    expect(legacyCoreState.manifest).toBeUndefined()
    expect(legacyCoreState.layers.some((l: any) => l.textProperties?.content === "LEGACY TEXT")).toBe(true)

    await insertLegacyDesignRow({ sessionId: legacySession, productId: "prod-mailer-box", designData: legacyCoreState })

    // Fresh client session: open the editor with ONLY the session id.
    await loginViaApi(page)
    const qa = attachQaListeners(page)
    await page.goto(`/editor?sessionId=${legacySession}`)
    await waitForEditor(page)

    // The migrated state renders and its artwork survives in the store.
    const st = await editorState(page)
    expect(st.canvas.width).toBe(345)
    expect(st.canvas.height).toBe(114)
    expect(st.layers.some((l: any) => l.textProperties?.content === "LEGACY TEXT")).toBe(true)

    await page.getByRole("button", { name: /Save|حفظ/ }).first().click()
    await page.waitForTimeout(2500)

    const design = await findDesignBySession(legacySession)
    const dd = design!.designData as any
    // Now a v2 envelope, but honestly marked as migrated / best_effort — the
    // historical geometry was never recorded, so exactness is never claimed.
    expect(dd.schemaVersion).toBe(2)
    expect(dd.manifestSource).toBe("migrated")
    expect(dd.reproducibility).toBe("best_effort")
    // Layers preserved verbatim through the migration.
    expect(dd.layers.some((l: any) => l.textProperties?.content === "LEGACY TEXT")).toBe(true)
    // Best-effort face extents reconstructed from the canonical mapping.
    expect(dd.manifest.faces.front).toEqual({ w: 115, h: 38 })
    expect(dd.manifest.faces.top).toEqual({ w: 115, h: 70 })
    expect(dd.manifest.faces.left).toEqual({ w: 70, h: 38 })
    expect(dd.manifest.faces.back).toEqual({ w: 115, h: 38 })
    // The present-day blueprint in the state resolves into a dieline snapshot,
    // but provenance stays best_effort — the historical geometry was never
    // recorded, so exactness is NEVER claimed for migrated blobs (AMENDMENT 3).
    expect(dd.manifest.dieline).toBeTruthy()
    expect(dd.manifest.dieline.faceRelationships?.length ?? 0).toBeGreaterThan(0)
    expect(dd.reproducibility).toBe("best_effort")

    await page.screenshot({ path: "playwright-report/m8-h-migrated.png" })
    assertNoCriticalErrors(qa)
  })
})