import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { register } from "node:module"

// SEC-03d — Legacy Webhook Decommissioning.
//
// The three legacy frontend webhook routes must be dead ends: every
// method answers 410 Gone, and no payment/order mutation path may be
// reachable from them. The real webhooks live on the Fastify backend
// (POST /webhooks/stripe, POST /webhooks/dhl), which verify signatures
// / re-verify carrier state. The old routes trusted unverified payloads
// and changed order state through mock services:
//   - packagepro/webhooks/stripe  -> handleStripeWebhook (TODO: Verify
//     webhook signature) in lib/packagepro/services/payment-service.ts
//   - packagepro/webhooks/shipping -> proxied to the backend and
//     returned { received: true } even when the proxy failed
//   - payments/webhook -> PaymentService.handleWebhook (mock) +
//     DatabaseService.updateOrderStatus (mock DB)
//
// These tests run under plain node:test (no Next.js runtime), so the
// "next/server" import in the route files is stubbed. Node 24 removed
// mock.module(), so the stub is registered with module.register() using
// an inline data: URL hooks module — no extra file is needed, and the
// route files are imported unchanged (type stripping still applies
// because they are real .ts files on disk).
const NEXT_SERVER_STUB = [
  "export const NextResponse = {",
  "  json: (body, init) => ({ body, status: init?.status ?? 200 }),",
  "};",
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
  "data:text/javascript;base64," +
    Buffer.from(HOOKS_SOURCE).toString("base64"),
)

type GoneResponse = { body: { error: string; message: string }; status: number }

const ROUTES = [
  {
    name: "packagepro/webhooks/stripe",
    path: "../app/api/packagepro/webhooks/stripe/route.ts",
    canonical: "/webhooks/stripe",
  },
  {
    name: "packagepro/webhooks/shipping",
    path: "../app/api/packagepro/webhooks/shipping/route.ts",
    canonical: "/webhooks/dhl",
  },
  {
    name: "payments/webhook",
    path: "../app/api/payments/webhook/route.ts",
    canonical: "/webhooks/stripe",
  },
] as const

// Identifiers that must not appear anywhere in a retired route file:
// any of them would mean a mutation path (mock payment / mock DB /
// unverified handler / backend proxy) is still reachable from the route.
const FORBIDDEN = [
  "PaymentService",
  "DatabaseService",
  "handleStripeWebhook",
  "updateOrderStatus",
  "EmailService",
  "MonitoringService",
  "fetch(",
  "@/",
  "stripe-signature",
  "NEXT_PUBLIC_API_URL",
]

for (const route of ROUTES) {
  test(`${route.name}: POST returns 410 Gone naming the retirement`, async () => {
    const mod = (await import(route.path)) as Record<string, unknown>
    assert.equal(typeof mod.POST, "function", "POST handler must be exported")

    const res = (await (mod.POST as (req: unknown) => Promise<GoneResponse>)(
      {},
    )) as GoneResponse
    assert.equal(res.status, 410)
    assert.equal(res.body.error, "GONE")
    assert.match(res.body.message, /retired/)
    assert.match(res.body.message, /SEC-03d/)
    assert.match(res.body.message, new RegExp(route.canonical.replace("/", "\\/")))
  })

  test(`${route.name}: GET/PUT/DELETE/PATCH also return 410 Gone`, async () => {
    const mod = (await import(route.path)) as Record<string, unknown>
    for (const method of ["GET", "PUT", "DELETE", "PATCH"]) {
      assert.equal(typeof mod[method], "function", `${method} handler must be exported`)
      const res = (await (mod[method] as (req: unknown) => Promise<GoneResponse>)(
        {},
      )) as GoneResponse
      assert.equal(res.status, 410, `${method} must be 410`)
      assert.equal(res.body.error, "GONE")
    }
  })

  test(`${route.name}: module exports only the 410 handlers`, async () => {
    const mod = (await import(route.path)) as Record<string, unknown>
    assert.deepEqual(Object.keys(mod).sort(), [
      "DELETE",
      "GET",
      "PATCH",
      "POST",
      "PUT",
    ])
  })

  test(`${route.name}: source contains no mutation path`, () => {
    const source = readFileSync(new URL(route.path, import.meta.url), "utf8")
    for (const needle of FORBIDDEN) {
      assert.equal(
        source.includes(needle),
        false,
        `retired route must not reference ${needle}`,
      )
    }
    assert.match(source, /410/, "source must return status 410")
    assert.match(source, /GONE/, "source must use the GONE error code")
    assert.match(source, /SEC-03d/, "source must name SEC-03d")
    assert.match(
      source,
      new RegExp(route.canonical.replace("/", "\\/")),
      "source must name the canonical backend webhook",
    )
  })
}
