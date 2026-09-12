import { test, expect } from "@playwright/test"
import { loginViaApi, attachQaListeners, waitForEditor, assertNoCriticalErrors } from "./helpers"

const EDITOR_URL = "/editor?product=custom-mailer-box&qty=50"

test.describe.serial("M8-E canonical dieline geometry annotations", () => {
  test("fold-angle, glue-tab and corner-relief annotations derive from the canonical dieline", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    await page.evaluate(() => (window as any).__editorSetViewMode("dieline"))
    await page.waitForTimeout(800)

    // Fold-angle markers: one per canonical fold path of the F42 mailer (5).
    const folds = page.locator('[data-annotation="fold-angle"]')
    await expect(folds).toHaveCount(5)
    // Each marker is tied to a canonical face pair and shows the derived angle.
    await expect(page.locator('[data-annotation="fold-angle"][data-other-face-id="top"]')).toHaveCount(1)
    await expect(page.getByText("90°", { exact: true }).first()).toBeVisible()

    // Glue-tab leaders: one per canonical glue path (5) with canonical mm distance.
    const glue = page.locator('[data-annotation="glue-tab-leader"]')
    await expect(glue).toHaveCount(5)
    await expect(page.getByText("70 mm", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("38 mm", { exact: true }).first()).toBeVisible()

    // Corner relief marks: flat outline corners (4), R0 (no relief declared).
    const corners = page.locator('[data-annotation="corner-relief"]')
    await expect(corners).toHaveCount(4)
    await expect(page.getByText("R0", { exact: true }).first()).toBeVisible()

    await page.screenshot({ path: "playwright-report/m8-e-annotations.png" })

    // Annotations are UI-state only: the toggle hides them without touching geometry.
    const toggle = page.locator('[data-annotations-toggle]')
    await toggle.click()
    await expect(page.locator('[data-annotation]')).toHaveCount(0)
    await toggle.click()
    await expect(page.locator('[data-annotation]')).not.toHaveCount(0)

    assertNoCriticalErrors(qa)
  })
})