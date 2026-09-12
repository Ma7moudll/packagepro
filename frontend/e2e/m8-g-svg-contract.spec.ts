import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { loginViaApi, attachQaListeners, waitForEditor, assertNoCriticalErrors } from "./helpers"

const EDITOR_URL = "/editor?product=custom-mailer-box&qty=50"

const F42_FACE_IDS = [
  "back", "bottom", "front", "inside_back", "inside_bottom",
  "inside_front", "inside_left", "inside_right", "inside_top",
  "left", "right", "top",
].sort()

test.describe.serial("M8-G canonical SVG export contract", () => {
  test("exported file is canonical serializeSVG: FaceId groups, path ids, annotation-free", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    await page.evaluate(() => (window as any).__editorSetViewMode("dieline"))
    await page.waitForTimeout(800)

    // Annotations default ON — proves the export is independent of the toggle state.
    await expect(page.locator('[data-annotation]')).not.toHaveCount(0)

    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "Export SVG" }).click()
    const download = await downloadPromise
    const file = readFileSync(await download.path(), "utf8")

    // Exact canonical FaceId group set (F42).
    const faceIds = [...file.matchAll(/data-face-id="([^"]+)"/g)].map((m) => m[1])
    expect(faceIds.sort()).toEqual(F42_FACE_IDS)

    // Outline role group + per-class path bodies carrying canonical path ids.
    expect(file).toContain('data-role="outline"')
    expect(file).toMatch(/class="dieline-cut"/)
    expect(file).toMatch(/class="dieline-fold"/)
    expect(file).toMatch(/data-path-id="/)
    expect(file.match(/data-path-id="/g)!.length).toBeGreaterThanOrEqual(10)

    // Annotations are screen-only: visible on canvas, absent from the export.
    expect(file).not.toContain('data-annotation="')

    await page.screenshot({ path: "playwright-report/m8-g-svg-contract.png" })

    assertNoCriticalErrors(qa)
  })
})