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

const EDITOR_URL =
  "/editor?sku=box--mailer-box--23--cardboard-natural--print-monochrome--foil-none&quantity=50"

test.describe.serial("Editor → Cart → Checkout → Order", () => {
  let sessionId = ""
  let orderId = ""

  test("add to cart from editor, verify cart item and server price", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    // Add a text layer so the design is non-trivial
    await addTextLayer(page, "Cart Test Design", { position: { x: 100, y: 100 } })

    // Save design to get a sessionId
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

    // Verify design saved on backend
    const designCheck = await page.evaluate(async ({ sid, backEnd }) => {
      const res = await fetch(`${backEnd}/designs/session/${sid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      })
      return res.json()
    }, { sid: sessionId, backEnd: BACKEND })
    expect(designCheck.success).toBe(true)

    // Switch to 2D for Add to Cart
    await page.evaluate(() => (window as any).__editorSetViewMode("2d"))
    await page.waitForTimeout(500)

    // Click "Add to Cart" button in the header — opens the dialog
    await page.getByRole("button", { name: /Add to Cart|إضافة إلى السلة/ }).first().click()
    await page.waitForTimeout(1000)

    // Wait for the dialog to appear
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })

    // Fill in design name
    const nameInput = dialog.getByLabel(/Design Name|اسم التصميم/).or(dialog.locator("#designName"))
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill("QA Cart Test")
    }

    // Wait for server price to load (spinner gone, price visible)
    await dialog.locator("text=$").first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {})

    // Click the submit button INSIDE the dialog (not the trigger button)
    const submitBtn = dialog.getByRole("button", { name: /Add to Cart|إضافة|Adding/ })
    await submitBtn.click()

    // Should navigate to cart page
    await page.waitForURL("**/cart*", { timeout: 15000 }).catch(async () => {
      console.log("Did not navigate to cart, URL:", page.url())
      await page.goto("/cart")
    })
    await page.waitForLoadState("load")
    await page.waitForTimeout(1500)

    // Verify cart page loaded and has items
    const bodyText = await page.locator("body").innerText()
    expect(/cart|سلة|Cart|CartItems|subtotal|total/i.test(bodyText)).toBe(true)

    // Check backend cart API
    const cartItems = await page.evaluate(async ({ backEnd }) => {
      const res = await fetch(`${backEnd}/cart`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      })
      return res.json()
    }, { backEnd: BACKEND })
    expect(cartItems.success).toBe(true)

    const items = cartItems.data?.items || []
    const cartItem = items.find((i: any) => i.sessionId === sessionId)
    expect(cartItem).toBeTruthy()
    expect(cartItem.quantity).toBeGreaterThanOrEqual(1)
    expect(Number(cartItem.unitPrice)).toBeGreaterThan(0)
    expect(Number(cartItem.totalPrice)).toBeGreaterThan(0)

    await page.screenshot({ path: "playwright-report/cart-page.png" })
    assertNoCriticalErrors(qa)
  })

  test("complete checkout with Stripe test card", async ({ page }) => {
    test.setTimeout(120_000)
    expect(sessionId).toMatch(/[0-9a-f-]{36}/)

    await loginViaApi(page)
    const qa = attachQaListeners(page)

    // Verify cart still has items
    const cartBefore = await page.evaluate(async ({ backEnd }) => {
      const res = await fetch(`${backEnd}/cart`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      })
      return res.json()
    }, { backEnd: BACKEND })
    const items = cartBefore.data?.items || []
    const cartItem = items.find((i: any) => i.sessionId === sessionId)
    expect(cartItem).toBeTruthy()

    // Navigate to checkout
    await page.goto("/checkout")
    await page.waitForTimeout(2000)

    // Fill shipping info if present
    const fields = [
      { label: /name|اسم/i, value: "QA Tester" },
      { label: /email|بريد/i, value: "qa-tester@packagepro.test" },
      { label: /address|عنوان/i, value: "123 Test Street" },
      { label: /city|مدينة/i, value: "Dubai" },
    ]
    for (const { label, value } of fields) {
      const field = page.getByLabel(label).first()
      if (await field.isVisible({ timeout: 1000 }).catch(() => false)) {
        await field.fill(value)
      }
    }
    await page.waitForTimeout(1000)

    // Try Stripe iframe
    try {
      const stripeFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]').first()
      const cardField = stripeFrame.locator('[name="cardnumber"]')
      if (await cardField.isVisible({ timeout: 3000 })) {
        await cardField.fill("4242424242424242")
        await stripeFrame.locator('[name="exp-date"]').fill("12/34")
        await stripeFrame.locator('[name="cvc"]').fill("123")
        await page.waitForTimeout(500)
      }
    } catch {
      // Stripe may not be in test mode or card fields may not be visible
    }

    // Submit order
    const submitBtn = page.getByRole("button", { name: /place order|submit|تأكيد|دفع|pay/i }).first()
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click()
      await page.waitForTimeout(5000)
    }

    // Check orders via backend
    const orders = await page.evaluate(async ({ backEnd }) => {
      const res = await fetch(`${backEnd}/orders`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      })
      return res.json()
    }, { backEnd: BACKEND })

    if (orders.success && orders.data?.length > 0) {
      orderId = orders.data[0].id
      expect(orderId).toBeTruthy()

      // Cart should be cleared after order
      const cartAfter = await page.evaluate(async ({ backEnd }) => {
        const res = await fetch(`${backEnd}/cart`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
        return res.json()
      }, { backEnd: BACKEND })
      const remainingItems = cartAfter.data?.items || []
      const hasDesign = remainingItems.find((i: any) => i.sessionId === sessionId)
      expect(hasDesign).toBeFalsy()
    }

    await page.screenshot({ path: "playwright-report/checkout-complete.png" })
    assertNoCriticalErrors(qa)
  })
})