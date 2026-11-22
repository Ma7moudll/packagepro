import { test } from "node:test"
import assert from "node:assert/strict"
import { register } from "node:module"

// Production gate + /api/stats route.
//
// frontend/middleware.ts 410s every legacy /api/* route in production,
// with exactly one allowlist entry: GET /api/stats (exact method, exact
// path — no prefix matching), because that route proxies the real
// backend's GET /api/public/stats and the homepage consumes it.
//
// frontend/app/api/stats/route.ts failures must be a plain generic 502:
// no backend URL/host, no backend status/message, no network detail, and
// no stats payload in the body.
//
// These tests run under plain node:test (no Next.js runtime), so the
// "next/server" import in both modules is stubbed with module.register()
// hooks — the same technique as sec03d-legacy-webhook-routes.test.ts.
const NEXT_SERVER_STUB = [
  "export class NextResponse {",
  "  constructor(body, init) { this.body = body; this.status = init?.status ?? 200 }",
  "  static json(body, init) { return { body, status: init?.status ?? 200, isNext: false } }",
  "  static next() { return { body: null, status: 200, isNext: true } }",
  "}",
  "export class NextRequest {}",
].join("\n")

const HOOKS_SOURCE = [
  "export async function resolve(specifier, context, nextResolve) {",
  '  if (specifier === "next/server") return { url: "node:stub-next-server", shortCircuit: true };',
  "  return nextResolve(specifier, context);",
  "}",
  "export async function load(url, context, nextLoad) {",
  '  if (url === "node:stub-next-server") {',
  "    return { format: \"module\", shortCircuit: true, source: " +
    JSON.stringify(NEXT_SERVER_STUB) +
    " };",
  "  }",
  "  return nextLoad(url, context);",
  "}",
].join("\n")

register(
  "data:text/javascript;base64," + Buffer.from(HOOKS_SOURCE).toString("base64"),
)

type StubResponse = { body: unknown; status: number; isNext: boolean }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { middleware } = (await import("../middleware.ts")) as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const statsRoute = (await import("../app/api/stats/route.ts")) as any

function fakeRequest(method: string, pathname: string) {
  return { method, nextUrl: { pathname }, url: `http://localhost:3001${pathname}` }
}

function withProduction<T>(fn: () => T): T {
  const mutableEnv = process.env as Record<string, string | undefined>
  const prevNodeEnv = process.env.NODE_ENV
  const prevMock = process.env.ENABLE_FRONTEND_MOCK_API
  mutableEnv.NODE_ENV = "production"
  delete mutableEnv.ENABLE_FRONTEND_MOCK_API
  try {
    return fn()
  } finally {
    if (prevNodeEnv === undefined) delete mutableEnv.NODE_ENV
    else mutableEnv.NODE_ENV = prevNodeEnv
    if (prevMock === undefined) delete mutableEnv.ENABLE_FRONTEND_MOCK_API
    else mutableEnv.ENABLE_FRONTEND_MOCK_API = prevMock
  }
}

// ---------------------------------------------------------------------------
// Middleware: allowed
// ---------------------------------------------------------------------------

test("middleware: GET /api/stats is allowed in production", () => {
  const res = withProduction(() => middleware(fakeRequest("GET", "/api/stats"))) as StubResponse
  assert.equal(res.isNext, true)
})

// ---------------------------------------------------------------------------
// Middleware: blocked
// ---------------------------------------------------------------------------

test("middleware: other methods on /api/stats stay 410 in production", () => {
  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    const res = withProduction(() =>
      middleware(fakeRequest(method, "/api/stats")),
    ) as StubResponse
    assert.equal(res.status, 410, `${method} /api/stats must be 410`)
    assert.equal(res.isNext, false)
  }
})

test("middleware: other /api paths stay 410 in production", () => {
  for (const pathname of ["/api/products", "/api/cart", "/api/orders", "/api/projects"]) {
    const res = withProduction(() => middleware(fakeRequest("GET", pathname))) as StubResponse
    assert.equal(res.status, 410, `GET ${pathname} must be 410`)
  }
})

test("middleware: nested paths stay 410 in production (no prefix reopening)", () => {
  const nested: Array<[string, string]> = [
    ["GET", "/api/stats/extra"],
    ["GET", "/api/stats/"],
    ["POST", "/api/payments/webhook"],
    ["GET", "/api/payments/webhook"],
    ["POST", "/api/packagepro/webhooks/stripe"],
  ]
  for (const [method, pathname] of nested) {
    const res = withProduction(() => middleware(fakeRequest(method, pathname))) as StubResponse
    assert.equal(res.status, 410, `${method} ${pathname} must be 410`)
    assert.equal(res.isNext, false)
  }
})

test("middleware: development still passes requests through", () => {
  const mutableEnv = process.env as Record<string, string | undefined>
  const prevNodeEnv = process.env.NODE_ENV
  mutableEnv.NODE_ENV = "development"
  try {
    const res = middleware(fakeRequest("GET", "/api/products")) as StubResponse
    assert.equal(res.isNext, true)
  } finally {
    if (prevNodeEnv === undefined) delete mutableEnv.NODE_ENV
    else mutableEnv.NODE_ENV = prevNodeEnv
  }
})

// ---------------------------------------------------------------------------
// Stats route: happy path + generic failures
// ---------------------------------------------------------------------------

const REAL_SHAPED_BACKEND_PAYLOAD = {
  success: true,
  data: {
    completedDeals: { value: 7 },
    registeredFactories: { value: 3 },
    transactionVolume: { value: 123456 },
    activeTraders: { value: 9 },
    categories: { boxes: 2, bags: 1 },
  },
}

function stubFetch(impl: () => Promise<unknown>) {
  const original = globalThis.fetch
  let calls = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalThis.fetch = (async () => {
    calls += 1
    return impl()
  }) as any
  return {
    calls: () => calls,
    restore: () => {
      globalThis.fetch = original
    },
  }
}

function assertGeneric502(res: StubResponse) {
  assert.equal(res.status, 502)
  assert.deepEqual(res.body, { success: false, error: "Failed to fetch stats" })
  const serialised = JSON.stringify(res.body)
  for (const leak of ["localhost", "127.0.0.1", "internal", "ECONNREFUSED", "401", "stats\":"]) {
    assert.equal(serialised.includes(leak), false, `failure body must not contain ${leak}`)
  }
}

test("stats route: happy path returns the real-shaped stats", async () => {
  const stub = stubFetch(async () => ({
    ok: true,
    status: 200,
    json: async () => REAL_SHAPED_BACKEND_PAYLOAD,
  }))
  try {
    const res = (await statsRoute.GET(
      fakeRequest("GET", "/api/stats"),
    )) as StubResponse & { body: { success: boolean; stats: Record<string, { raw: number }> } }
    assert.equal(res.status, 200)
    assert.equal(res.body.success, true)
    assert.equal(res.body.stats.completedDeals.raw, 7)
    assert.equal(res.body.stats.registeredFactories.raw, 3)
    assert.equal(res.body.stats.transactionVolume.raw, 123456)
    assert.equal(res.body.stats.activeTraders.raw, 9)
  } finally {
    stub.restore()
  }
})

test("stats route: backend unauthorized (401) becomes a generic 502", async () => {
  const stub = stubFetch(async () => ({
    ok: false,
    status: 401,
    json: async () => ({
      success: false,
      message: "Unauthorized for internal backend at http://internal-backend:3000",
    }),
  }))
  try {
    const res = (await statsRoute.GET(fakeRequest("GET", "/api/stats"))) as StubResponse
    assertGeneric502(res)
  } finally {
    stub.restore()
  }
})

test("stats route: backend down (fetch throws) becomes a generic 502", async () => {
  const stub = stubFetch(async () => {
    throw new Error("fetch failed: connect ECONNREFUSED 127.0.0.1:3000")
  })
  try {
    const res = (await statsRoute.GET(fakeRequest("GET", "/api/stats"))) as StubResponse
    assertGeneric502(res)
  } finally {
    stub.restore()
  }
})

test("stats route: backend success:false becomes a generic 502", async () => {
  const stub = stubFetch(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ success: false, message: "db at 10.0.0.5 unreachable" }),
  }))
  try {
    const res = (await statsRoute.GET(fakeRequest("GET", "/api/stats"))) as StubResponse
    assertGeneric502(res)
    assert.equal(JSON.stringify(res.body).includes("10.0.0.5"), false)
  } finally {
    stub.restore()
  }
})

test("stats route: out-of-bounds limit/offset are rejected before any fetch", async () => {
  const stub = stubFetch(async () => {
    throw new Error("fetch must not be called for invalid query params")
  })
  try {
    for (const qs of ["limit=0", "limit=101", "limit=abc", "offset=-1", "offset=10001", "offset=1.5"]) {
      const req = {
        method: "GET",
        nextUrl: { pathname: "/api/stats" },
        url: `http://localhost:3001/api/stats?${qs}`,
      }
      const res = (await statsRoute.GET(req)) as StubResponse
      assert.equal(res.status, 400, `?${qs} must be 400`)
    }
    assert.equal(stub.calls(), 0)
  } finally {
    stub.restore()
  }
})

test("stats route: in-bounds limit/offset are accepted", async () => {
  const stub = stubFetch(async () => ({
    ok: true,
    status: 200,
    json: async () => REAL_SHAPED_BACKEND_PAYLOAD,
  }))
  try {
    const req = {
      method: "GET",
      nextUrl: { pathname: "/api/stats" },
      url: "http://localhost:3001/api/stats?limit=100&offset=0",
    }
    const res = (await statsRoute.GET(req)) as StubResponse
    assert.equal(res.status, 200)
    assert.equal(stub.calls(), 1)
  } finally {
    stub.restore()
  }
})
