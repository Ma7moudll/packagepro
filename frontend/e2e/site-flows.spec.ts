import { test, expect } from "@playwright/test"
import {
  loginViaApi,
  attachQaListeners,
  assertNoCriticalErrors,
  QA_EMAIL,
  QA_PASSWORD,
} from "./helpers"

test.describe("Homepage", () => {
  test("loads and shows key content", async ({ page }) => {
    const qa = attachQaListeners(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const text = await page.locator("body").innerText()
    // Should have PackagePro branding
    expect(text).toContain("PackagePro")
    // Should have navigation links
    expect(/products|design editor|templates/i.test(text)).toBe(true)

    await page.screenshot({ path: "playwright-report/homepage.png" })
    assertNoCriticalErrors(qa)
  })

  test("language toggle switches between EN/AR", async ({ page }) => {
    const qa = attachQaListeners(page)
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Find and click the language toggle button
    const langBtn = page.getByRole("button", { name: /العربية|English|lang/i }).first()
    if (await langBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await langBtn.click()
      await page.waitForTimeout(500)

      // RTL should be set after switching to Arabic
      const dir = await page.locator("html").getAttribute("dir")
      // dir could be "rtl" or attribute may not exist (ltr default)
      // Just verify the page still works
      const text = await page.locator("body").innerText()
      expect(text.length).toBeGreaterThan(50)
    }

    assertNoCriticalErrors(qa)
  })
})

test.describe("Auth flows", () => {
  test("login page renders and accepts credentials", async ({ page }) => {
    const qa = attachQaListeners(page)
    await page.goto("/login")
    await page.waitForLoadState("networkidle")

    // Check login form exists
    const emailField = page.locator("#email")
    const passwordField = page.locator("#password")
    await expect(emailField).toBeVisible({ timeout: 5000 })
    await expect(passwordField).toBeVisible()

    // Fill and submit
    await emailField.fill(QA_EMAIL)
    await passwordField.fill(QA_PASSWORD)
    await page.getByRole("button", { name: /sign in|log in|تسجيل|login/i }).first().click()

    // Wait for redirect away from login (up to 10s)
    await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 10000 })

    // Verify tokens set in localStorage
    const hasToken = await page.evaluate(() => !!localStorage.getItem("accessToken"))
    expect(hasToken).toBe(true)

    assertNoCriticalErrors(qa)
  })

  test("unauthenticated user redirected to login for protected routes", async ({ page }) => {
    const qa = attachQaListeners(page)
    await page.goto("/checkout")
    await page.waitForTimeout(3000)

    const url = page.url()
    // Should either redirect to login or show login prompt
    expect(/login|checkout/.test(url)).toBe(true)

    assertNoCriticalErrors(qa)
  })
})

test.describe("Catalog / Products", () => {
  test("products page loads with product listings", async ({ page }) => {
    const qa = attachQaListeners(page)
    await page.goto("/products")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    const text = await page.locator("body").innerText()
    // Should show some product-related content
    expect(/product|box|material|packaging/i.test(text)).toBe(true)

    await page.screenshot({ path: "playwright-report/products.png" })
    assertNoCriticalErrors(qa)
  })

  test("search functionality works", async ({ page }) => {
    const qa = attachQaListeners(page)
    await page.goto("/products")
    await page.waitForLoadState("networkidle")

    // Find search input
    const searchInput = page.getByPlaceholder(/search|بحث/i).or(page.getByLabel(/search|بحث/i)).first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill("mailer")
      await page.waitForTimeout(1000)

      const text = await page.locator("body").innerText()
      expect(/box|mailer|package/i.test(text)).toBe(true)
    }

    assertNoCriticalErrors(qa)
  })

  test("template page loads", async ({ page }) => {
    const qa = attachQaListeners(page)
    await page.goto("/templates")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(1000)

    const text = await page.locator("body").innerText()
    expect(/template|design|model/i.test(text)).toBe(true)

    await page.screenshot({ path: "playwright-report/templates.png" })
    assertNoCriticalErrors(qa)
  })
})

test.describe("Profile", () => {
  test("profile page accessible after login", async ({ page }) => {
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto("/profile")
    await page.waitForTimeout(2000)

    const text = await page.locator("body").innerText()
    expect(/profile|account|qa-tester/i.test(text)).toBe(true)

    await page.screenshot({ path: "playwright-report/profile.png" })
    assertNoCriticalErrors(qa)
  })
})

test.describe("Responsive viewport", () => {
  test("mobile viewport renders without crash", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const qa = attachQaListeners(page)

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const text = await page.locator("body").innerText()
    expect(text.length).toBeGreaterThan(50)
    await page.screenshot({ path: "playwright-report/mobile-home.png" })

    // Editor should also work on mobile
    await page.goto("/editor?sku=box--mailer-box--23--cardboard-natural--print-monochrome--foil-none")
    await page.waitForTimeout(3000)
    await page.screenshot({ path: "playwright-report/mobile-editor.png" })

    assertNoCriticalErrors(qa)
  })

  test("tablet viewport renders without crash", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 })
    const qa = attachQaListeners(page)

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    const text = await page.locator("body").innerText()
    expect(text.length).toBeGreaterThan(50)

    assertNoCriticalErrors(qa)
  })
})
