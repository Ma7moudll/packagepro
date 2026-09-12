import { Page, expect } from "@playwright/test"

export const QA_EMAIL = "qa-tester@packagepro.test"
export const QA_PASSWORD = "TestPass!2026"
export const BACKEND = "http://localhost:3000/api"

export interface QaConsole {
  pageErrors: string[]
  networkErrors: string[]
  warnings: string[]
}

/** Attach console/network/page-error listeners; returns a snapshot collector. */
export function attachQaListeners(page: Page): QaConsole {
  const qa: QaConsole = { pageErrors: [], networkErrors: [], warnings: [] }

  page.on("pageerror", (err) => qa.pageErrors.push(String(err?.message || err)))
  page.on("console", (msg) => {
    if (msg.type() === "error") qa.networkErrors.push(msg.text())
    if (msg.type() === "warning") qa.warnings.push(msg.text())
  })
  page.on(
    "response",
    (res) => {
      const url = res.url()
      if (!url.includes("/api/")) return
      if (res.status() >= 400) {
        qa.networkErrors.push(`${res.status()} ${res.request().method()} ${url}`)
      }
    }
  )
  page.on("requestfailed", (req) => qa.networkErrors.push(`FAILED ${req.method()} ${req.url()}`))

  return qa
}

/** Seed auth tokens into localStorage by calling the real login endpoint. */
export async function loginViaApi(page: Page, email = QA_EMAIL, password = QA_PASSWORD) {
  const res = await page.request.post(`${BACKEND}/auth/login`, {
    data: { email, password },
  })
  const json = await res.json()
  expect(res.status()).toBe(200)
  expect(json.success).toBe(true)
  const data = json.data as {
    user?: unknown
    tokens: { accessToken: string; refreshToken: string }
  }
  await page.goto("/")
  await page.evaluate(
    ({ accessToken, refreshToken, user }) => {
      localStorage.setItem("accessToken", accessToken)
      localStorage.setItem("refreshToken", refreshToken)
      if (user) localStorage.setItem("user", JSON.stringify(user))
    },
    {
      accessToken: data.tokens?.accessToken,
      refreshToken: data.tokens?.refreshToken,
      user: data.user,
    }
  )
  return data
}

export async function realUiLogin(page: Page) {
  await page.goto("/login")
  await page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i)).fill(QA_EMAIL)
  const pwd = page.getByLabel(/password/i).or(page.getByPlaceholder(/password/i))
  await pwd.fill(QA_PASSWORD)
  await page.getByRole("button", { name: /sign in|log in|تسجيل الدخول/i }).click()
  await page.waitForURL("**/**")
}

/** Wait until the editor store has been hydrated from its async init source (if any). */
async function waitForHydration(page: Page) {
  await page.waitForFunction(
    () => {
      const read = (window as any).__editorState
      if (typeof read !== "function") return false
      const state = read()
      if (!state || !state.model) return false
      const params = new URL(location.href).searchParams
      if (params.has("sessionId")) {
        // Session restore: saved layers reappear (or the design carried a product identity).
        return !!state.product || state.layers.length > 0
      }
      if (params.has("product")) {
        // Catalog-driven entry: product identity + variant config land asynchronously.
        return !!(state.product?.id && state.productConfig?.variantId)
      }
      // SKU/template entries initialize synchronously — nothing more to wait for.
      return true
    },
    { timeout: 30000 }
  )
}

/** Wait until the editor has finished mounting the 2D canvas and hydrated its store. */
export async function waitForEditor(page: Page) {
  await expect(page.getByRole("banner")).toBeVisible({ timeout: 30000 })
  // The store defaults to 3D view; switch to 2D so DesignCanvas2D mounts and the harness hooks register.
  await page.waitForFunction(() => typeof (window as any).__editorSetViewMode === "function", { timeout: 30000 })
  await page.evaluate(() => (window as any).__editorSetViewMode("2d"))
  await page.waitForFunction(() => typeof (window as any).__editorState === "function", { timeout: 30000 })
  await waitForHydration(page)
}

/** Snapshot the design store (model, layers, canvas, camera, ui). */
export function editorState(page: Page) {
  return page.evaluate(() => (window as any).__editorState())
}

export async function addTextLayer(page: Page, content: string, overrides: Record<string, unknown> = {}) {
  await page.evaluate(
    ({ content, overrides }) => {
      const contentSafe = content
      const s = (window as any)
      s.__editorAddText && s.__editorAddText!()
      const st = s.__editorState()
      const id = st.layers[st.layers.length - 1].id
      s.__editorUpdateLayer(id, (l: any) => ({
        ...l,
        ...overrides,
        textProperties: { ...l.textProperties, content: contentSafe },
      }))
    },
    { content, overrides }
  )
  return editorState(page)
}

export async function addImageLayer(page: Page, dataUrl: string, name = "qa-image.png") {
  await page.evaluate(
    ({ dataUrl, name }) => {
      const base64 = dataUrl.split(",")[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const file = new File([bytes], name, { type: "image/png" })
      const s = window as any
      s.__editorAddImage(file)
    },
    { dataUrl, name }
  )
  // Wait a tick for FileReader to complete
  await page.waitForTimeout(500)
  return editorState(page)
}

export function assertNoCriticalErrors(qa: QaConsole) {
  const failures: string[] = []
  for (const err of [...qa.pageErrors, ...qa.networkErrors]) {
    // Ignore 404s on optional background endpoints
    if (/^404\s/.test(err) || /status of 404/.test(err)) continue
    // Ignore failed RSC (React Server Component) fetches from Next.js client nav
    if (/FAILED\s+GET\s+.*_rsc=/.test(err)) continue
    // Ignore Stripe config warnings (empty key in test env)
    if (/Stripe|publishable key/i.test(err)) continue
    // Ignore SSE notification stream CORS errors in test env
    if (/notifications\/stream/i.test(err) && /CORS|ERR_FAILED/i.test(err)) continue
    // Ignore React dev-mode setState-in-render warnings
    if (/Cannot update a component.*while rendering/.test(err)) continue
    failures.push(err)
  }
  expect(failures, `JS/network errors:\n${failures.join("\n")}`).toEqual([])
}

export const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

// Deterministic design title from URL SKU, same computation as the header
export function designTitle(type: string, dims: { length: number; width: number; height: number }) {
  return `${type.replace(/_/g, " ")} ${dims.length}×${dims.width}×${dims.height}mm`
}