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
import {
  findDesignBySession,
  findCartItemBySession,
  findOrderByDesignSession,
  findOrderItemsByOrderId,
  closeDb,
} from "./db"

const EDITOR_URL = "/editor?product=custom-mailer-box&qty=50"

/**
 * M7-E — Design → Cart → Order traceability.
 *
 * Proves, with real PostgreSQL records, that a design saved from the catalog
 * editor flows through the cart and into an order while keeping ONE identity:
 *   Design.id === CartItem.designId === OrderItem.designId
 * plus product identity (productId / variantId / sku) on every hop.
 */
test.describe.serial("M7-E Design→Cart→Order traceability (real Postgres)", () => {
  let sessionId = ""
  let designId = ""
  let designSku = ""
  let cartItemId = ""
  let cartLineDesignId = ""
  let cartSku = ""
  let orderId = ""
  let orderItemDesignId = ""
  let orderSku = ""

  test.afterAll(() => closeDb())

  test("A: save multi-face design → CartItem.designId traces to the Design row", async ({ page }) => {
    test.setTimeout(120_000)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    // Fresh cart so the traceability chain is exactly ours (earlier specs may
    // leave cart residue behind).
    const cleared = await page.evaluate(async ({ backEnd }) => {
      const res = await fetch(`${backEnd}/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      })
      return res.json()
    }, { backEnd: BACKEND })
    expect(cleared.success).toBe(true)

    await page.goto(EDITOR_URL)
    await waitForEditor(page)

    // Three faces each carry a distinct text layer.
    const s0 = await addTextLayer(page, "ORDER FRONT", { position: { x: 57.5, y: 15 } })
    const frontId = s0.layers[s0.layers.length - 1].id
    await page.evaluate(() => (window as any).__editorSetFace("top"))
    const s1 = await addTextLayer(page, "ORDER TOP", { position: { x: 57.5, y: 35 } })
    const topId = s1.layers[s1.layers.length - 1].id
    await page.evaluate(() => (window as any).__editorSetFace("back"))
    const s2 = await addTextLayer(page, "ORDER BACK", { position: { x: 57.5, y: 30 } })
    const backId = s2.layers[s2.layers.length - 1].id

    const mid = await editorState(page)
    expect(mid.layers.find((l: any) => l.id === frontId)?.faceId).toBe("front")
    expect(mid.layers.find((l: any) => l.id === topId)?.faceId).toBe("top")
    expect(mid.layers.find((l: any) => l.id === backId)?.faceId).toBe("back")

    // Save → cloud session persists product identity + designConfig for tracing.
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

    // Real PostgreSQL row for the Design — carrier of the traceable identity.
    const design = await findDesignBySession(sessionId)
    expect(design).toBeTruthy()
    designId = design!.id
    designSku = design!.sku ?? ""
    expect(designId).toBeTruthy()
    expect(design!.productId).toBe("prod-mailer-box")
    expect(design!.variantId).toBeTruthy()
    expect(designSku).toContain("box--")
    // The persisted designConfig mirrors the editor productConfig semantics.
    expect(design!.designConfig).toBeTruthy()
    expect((design!.designConfig as any)?.variantId).toBe(design!.variantId)
    expect((design!.designConfig as any)?.sku).toBe(design!.sku)
    expect((design!.designConfig as any)?.quantity).toBe(50)

    // Add to cart through the real editor dialog. The backend resolves the
    // Design server-side by sessionId and backfills designId + identity.
    await page.evaluate(() => (window as any).__editorSetViewMode("2d"))
    await page.waitForTimeout(400)
    await page.getByRole("button", { name: /Add to Cart|إضافة إلى السلة/ }).first().click()
    await page.waitForTimeout(1000)
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible({ timeout: 5000 })
    const nameInput = dialog.getByLabel(/Design Name|اسم التصميم/).or(dialog.locator("#designName"))
    if (await nameInput.isVisible().catch(() => false)) {
      await nameInput.fill("M7E TRACE")
    }
    await dialog.locator("text=$").first().waitFor({ state: "visible", timeout: 15000 }).catch(() => {})
    await dialog.getByRole("button", { name: /Add to Cart|إضافة|Adding/ }).click()
    await page.waitForURL("**/cart*", { timeout: 15000 }).catch(async () => {
      console.log("M7-E: cart page did not auto-navigate; going directly")
      await page.goto("/cart")
      await page.waitForLoadState("load")
    })
    await page.waitForTimeout(1500)

    // DB: the CartItem row must carry the SAME designId — traced, not null.
    const cartItem = await findCartItemBySession(sessionId)
    expect(cartItem).toBeTruthy()
    cartItemId = cartItem!.id
    cartLineDesignId = cartItem!.designId ?? ""
    cartSku = cartItem!.sku ?? ""
    expect(cartLineDesignId).toBe(designId)
    expect(cartItem!.sessionId).toBe(sessionId)
    expect(cartItem!.productId).toBe("prod-mailer-box")
    expect(cartItem!.variantId).toBeTruthy()
    expect(cartSku).toContain("box--")

    await page.screenshot({ path: "playwright-report/m7-e-cart.png" })
    assertNoCriticalErrors(qa)
  })

  test("B: fresh client session reads CartItem.designId back through GET /cart", async ({ page }) => {
    expect(sessionId).toMatch(/[0-9a-f-]{36}/)
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    const res = await page.evaluate(async ({ backEnd }) => {
      const r = await fetch(`${backEnd}/cart`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      })
      return r.json()
    }, { backEnd: BACKEND })
    expect(res.success).toBe(true)

    const items = ((res.data?.items ?? []) as any[]).filter((i: any) => i.sessionId === sessionId)
    expect(items.length).toBe(1)
    const line = items[0]
    expect(line.id).toBe(cartItemId)
    expect(line.designId).toBe(designId)
    expect(line.productId).toBe("prod-mailer-box")
    expect(line.variantId).toBeTruthy()
    expect(line.sku).toContain("box--")
    expect(Number(line.quantity)).toBeGreaterThanOrEqual(50)
    expect(Number(line.unitPrice)).toBeGreaterThan(0)

    await page.screenshot({ path: "playwright-report/m7-e-cart-restate.png" })
    assertNoCriticalErrors(qa)
  })

  test("C: checkout persists OrderItem.designId + Design.orderId (order-first)", async ({ page }) => {
    expect(sessionId).toMatch(/[0-9a-f-]{36}/)
    await loginViaApi(page)

    const shippingAddress = {
      name: "QA Tester",
      phone: "+971500000000",
      email: "qa-tester@packagepro.test",
      street: "123 Test Street",
      city: "Dubai",
      state: "DXB",
      postalCode: "00000",
      country: "AE",
    }
    const checkout = await page.evaluate(async ({ backEnd, sid, addr }) => {
      const res = await fetch(`${backEnd}/checkout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shippingAddress: addr, designSessionId: sid }),
      })
      return { status: res.status, body: await res.json().catch(() => null) }
    }, { backEnd: BACKEND, sid: sessionId, addr: shippingAddress })

    // The dev Stripe key is a placeholder, so createPaymentIntent rejects AFTER
    // the order was created (order-first) — the traceability records must exist.
    expect(checkout.status).not.toBe(200)

    const order = await findOrderByDesignSession(sessionId)
    expect(order).toBeTruthy()
    orderId = order!.id
    expect(order!.status).toBe("pending_review")

    const orderItems = await findOrderItemsByOrderId(orderId)
    const traceLine = orderItems.find((oi) => oi.designId === designId)
    expect(traceLine).toBeTruthy()
    orderItemDesignId = traceLine!.designId ?? ""
    orderSku = traceLine!.sku ?? ""
    expect(orderItemDesignId).toBe(designId)
    expect(traceLine!.productId).toBe("prod-mailer-box")
    expect(orderSku).toContain("box--")

    // Manual clear replaces the Stripe-triggered clear a live key would run.
    const cleared = await page.evaluate(async ({ backEnd }) => {
      const res = await fetch(`${backEnd}/cart`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      })
      return res.json()
    }, { backEnd: BACKEND })
    expect(cleared.success).toBe(true)
    const afterClear = await findCartItemBySession(sessionId)
    expect(afterClear).toBeNull()

    await page.screenshot({ path: "playwright-report/m7-e-order.png" })
  })

  test("D: exact chain Design.id === CartItem.designId === OrderItem.designId (same SKU)", async () => {
    expect(designId).toBeTruthy()
    expect(designSku).toContain("box--")

    // The Design row survives the cart clear — re-read it live.
    const design = await findDesignBySession(sessionId)
    expect(design).toBeTruthy()
    expect(design!.id).toBe(designId)
    expect(design!.orderId).toBe(orderId)
    expect(design!.productId).toBe("prod-mailer-box")

    // Captured before the cart was cleared in C (clear deletes cart_items rows).
    expect(cartLineDesignId).toBe(designId)
    expect(orderItemDesignId).toBe(designId)

    // One identity across design → cart line → order line.
    expect(cartLineDesignId === designId && orderItemDesignId === designId).toBe(true)

    // Product identity is identical on every hop too.
    expect(cartSku).toBe(designSku)
    expect(orderSku).toBe(designSku)
    expect(cartSku === designSku && orderSku === designSku).toBe(true)
  })

  test("E: final serialized design retains all three face layers semantically", async ({ page }) => {
    expect(sessionId).toMatch(/[0-9a-f-]{36}/)
    await loginViaApi(page)

    const backend = await page.evaluate(async ({ sid, backEnd }) => {
      const res = await fetch(`${backEnd}/designs/session/${sid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
      })
      return res.json()
    }, { sid: sessionId, backEnd: BACKEND })
    expect(backend.success).toBe(true)

    const savedDesign = backend.data?.designData as any
    expect(savedDesign).toBeTruthy()
    expect(savedDesign.product).toMatchObject({ id: "prod-mailer-box", slug: "custom-mailer-box" })
    expect(savedDesign.productConfig?.sku).toContain("box--")
    expect(savedDesign.productConfig?.variantId).toBeTruthy()
    expect(savedDesign.zones?.front).toBeTruthy()

    // Semantic (set-of-truths) content check — immune to JSON key ordering.
    const texts = (savedDesign.layers ?? [])
      .filter((l: any) => l.textProperties?.content)
      .map((l: any) => ({ faceId: l.faceId, content: l.textProperties.content }))
    expect(texts).toContainEqual({ faceId: "front", content: "ORDER FRONT" })
    expect(texts).toContainEqual({ faceId: "top", content: "ORDER TOP" })
    expect(texts).toContainEqual({ faceId: "back", content: "ORDER BACK" })

    await page.screenshot({ path: "playwright-report/m7-e-final-design.png" })
  })
})