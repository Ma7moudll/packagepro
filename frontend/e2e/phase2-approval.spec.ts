import { test, expect, Page } from "@playwright/test"
import {
  loginViaApi,
  attachQaListeners,
  assertNoCriticalErrors,
  QA_EMAIL,
  BACKEND,
} from "./helpers"
import {
  createOrderFixture,
  deleteOrderFixture,
  findCustomerByEmail,
  redisDel,
  closeRedis,
  type OrderFixture,
} from "./db"

/*
 * SPEC-029 Phase 2 — Customer Experience E2E.
 *
 * Covers the proof-approval token flow (Decision A: existing
 * POST /orders/:id/approve, no duplicate API), the real invoice PDF route
 * (Decision B), tracking/reorder UI on the order detail page, and the billing
 * ledger's paid-vs-cancelled projection.
 *
 * Fixtures are seeded directly via SQL (disposable orders keyed to the QA
 * customer) and the approval token is written to Redis exactly as
 * proof-generator does, so the email-link URL `/orders/:id/approve?token=…`
 * is exercised end-to-end.
 */

const APPROVAL_TOKEN = "phase2-e2e-approval-token-1"

function authHeaders(page: Page) {
  return page.evaluate(() => ({
    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
  }))
}

test.describe.serial("Phase 2 — approval, invoice & billing", () => {
  let customerId = ""

  const orders: Record<string, OrderFixture> = {}

  test.beforeAll(async () => {
    const customer = await findCustomerByEmail(QA_EMAIL)
    expect(customer).toBeTruthy()
    customerId = customer!.id

    const stamp = Date.now()
    const awaiting = await createOrderFixture({
      customerId,
      orderNumber: `QA-AWV-${stamp}`,
      status: "awaiting_approval",
      withDesign: true,
      withProofFiles: true,
      withPayment: true,
      approvalToken: APPROVAL_TOKEN,
    })
    const pending = await createOrderFixture({
      customerId,
      orderNumber: `QA-PND-${stamp}`,
      status: "pending_review",
      withDesign: true,
    })
    const delivered = await createOrderFixture({
      customerId,
      orderNumber: `QA-DLV-${stamp}`,
      status: "delivered",
      withDesign: true,
      withPayment: true,
      withShipment: true,
    })
    const cancelled = await createOrderFixture({
      customerId,
      orderNumber: `QA-CXL-${stamp}`,
      status: "cancelled",
      withPayment: true,
    })

    orders.awaiting = awaiting
    orders.pending = pending
    orders.delivered = delivered
    orders.cancelled = cancelled
  })

  test.afterAll(async () => {
    for (const o of Object.values(orders)) {
      await deleteOrderFixture(o.orderId)
    }
    await redisDel(`approval:token:${APPROVAL_TOKEN}`)
    await closeRedis()
  })

  test("unauthenticated visitor is redirected to login from an approval link", async ({ page }) => {
    await page.goto(`/orders/${orders.awaiting.orderId}/approve?token=${APPROVAL_TOKEN}`)
    await page.waitForURL(/\/login/, { timeout: 15_000 })

    const url = page.url()
    expect(decodeURIComponent(url)).toContain(`/orders/${orders.awaiting.orderId}/approve`)
  })

  test("a pending_review order is not approvable (pre-approval guard)", async ({ page }) => {
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    // Approve page should refuse to act on an order that is not awaiting_approval.
    await page.goto(`/orders/${orders.pending.orderId}/approve?token=not-the-right-token`)
    await expect(page.getByText(/nothing to approve|لا يوجد ما يتطلب/i)).toBeVisible({ timeout: 25_000 })

    // The declined branch offers a View Order link back to this order.
    await expect(
      page.getByRole("link", { name: /view order|عرض الطلب/i })
    ).toHaveAttribute("href", `/orders/${orders.pending.orderId}`)

    // Detail page shows the pending_review badge, the order number, and no approval CTA.
    await page.goto(`/orders/${orders.pending.orderId}`)
    await expect(page.getByText(/pending review/i).first()).toBeVisible({ timeout: 25_000 })
    await expect(page.getByText(new RegExp(orders.pending.orderNumber, "i"))).toBeVisible()
    await expect(page.getByRole("link", { name: /review & approve|مراجعة واعتماد/i })).toHaveCount(0)

    assertNoCriticalErrors(qa)
  })

  test("awaiting_approval proofs are approved through the token link", async ({ page }) => {
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    // Detail page surfaces the Review & Approve CTA for awaiting_approval.
    await page.goto(`/orders/${orders.awaiting.orderId}`)
    await expect(page.getByRole("link", { name: /review & approve|مراجعة واعتماد/i })).toBeVisible({
      timeout: 15_000,
    })

    // Follow the email link: /orders/:id/approve?token=…
    await page.goto(`/orders/${orders.awaiting.orderId}/approve?token=${APPROVAL_TOKEN}`)
    await expect(page.getByText(/review your design proof|نموذج التصميم/i)).toBeVisible({
      timeout: 25_000,
    })
    await expect(page.getByText(new RegExp(orders.awaiting.orderNumber, "i"))).toBeVisible()

    // Proof + preview assets are rendered from the seeded design files.
    const preview = page.locator('img[alt="Design preview"]').or(page.locator('img[alt*="preview"]'))
    await expect(preview).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole("link", { name: /download pdf proof|تحميل نموذج/i })).toBeVisible()

    // Approve is gated on the legal confirmation checkbox.
    await page.getByRole("button", { name: /^Approve Design|اعتماد التصميم$/i }).click()
    await expect(page.getByText(/please confirm the details|يرجى تأكيد البيانات/i)).toBeVisible()

    await page.getByRole("checkbox", { name: /confirm design details|تأكيد تفاصيل التصميم/i }).check()
    await page.getByRole("button", { name: /^Approve Design|اعتماد التصميم$/i }).click()

    await expect(page.getByText(/design approved|تمت الموافقة على التصميم/i)).toBeVisible({
      timeout: 15_000,
    })
    await expect(page.getByText(new RegExp(orders.awaiting.orderNumber, "i"))).toBeVisible()

    assertNoCriticalErrors(qa)
  })

  test("approved order moves to ready_for_routing; invoice PDF is streamed", async ({ page }) => {
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    // Verify the approve mutation ran in the DB.
    const status = await page.evaluate(
      async ({ backend, id }) => {
        const res = await fetch(`${backend}/orders/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
        const json = await res.json()
        return json.data?.status
      },
      { backend: BACKEND, id: orders.awaiting.orderId }
    )
    expect(status).toBe("ready_for_routing")

    // Decision B: real invoice PDF streamed from the finance backend.
    const headers = { ...(await authHeaders(page)) }
    const invoice = await page.request.get(`${BACKEND}/orders/${orders.awaiting.orderId}/invoice`, {
      headers,
    })
    expect(invoice.status()).toBe(200)
    expect(invoice.headers()["content-type"]).toContain("application/pdf")
    const body = await invoice.body()
    expect(body.subarray(0, 5).toString()).toBe("%PDF-")

    assertNoCriticalErrors(qa)
  })

  test("order detail surfaces tracking, payment and reorder for a delivered order", async ({ page }) => {
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto(`/orders/${orders.delivered.orderId}`)
    await expect(page.getByText(/shipment tracking|تتبع الشحنة/i)).toBeVisible({ timeout: 15_000 })

    // Shipping info comes from the seeded dhlTrackingNumber + ETA.
    await expect(page.locator("body").getByText(/JDQA/i)).toBeVisible()
    await expect(page.getByText(/succeeded/)).toBeVisible()
    await expect(page.getByText(/stripe/)).toBeVisible()

    // Reorder CTA (P9) is present for a delivered order.
    await expect(page.getByRole("button", { name: /reorder|إعادة الطلب/i })).toBeVisible()

    // Paid order exposes the invoice download.
    await expect(page.getByRole("button", { name: /download invoice|تحميل الفاتورة/i })).toBeVisible()

    assertNoCriticalErrors(qa)
  })

  test("billing ledger includes paid orders and excludes cancelled ones", async ({ page }) => {
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    await page.goto("/billing")
    await expect(page.getByText(/billing & invoices|الفواتير والمدفوعات/i)).toBeVisible({ timeout: 15_000 })

    // Paid orders appear with a captured→succeeded badge.
    const awaitingRow = page.locator("div.divide-y > div", { hasText: orders.awaiting.orderNumber }).first()
    await expect(awaitingRow).toBeVisible({ timeout: 15_000 })
    await expect(awaitingRow.getByText("succeeded")).toBeVisible()

    // Cancelled orders are excluded from the payment-history projection.
    await expect(page.getByText(orders.cancelled.orderNumber)).toHaveCount(0)

    assertNoCriticalErrors(qa)
  })
})