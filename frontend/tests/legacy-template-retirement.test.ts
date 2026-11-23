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


const routes = ["", "/[id]", "/[id]/ratings", "/popular", "/search", "/slug/[slug]"]
for (const route of routes) {
  test(`legacy templates${route} remains retired for every method`, async () => {
    const module = await import(`../app/api/packagepro/templates${route}/route.ts`)
    for (const env of ["development", "production"]) {
      const prior = process.env.NODE_ENV; const flag = process.env.ENABLE_FRONTEND_MOCK_API
      Object.assign(process.env, {NODE_ENV:env, ENABLE_FRONTEND_MOCK_API:"true"})
      try {
        for (const method of ["GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"]) {
          let read=false
          const response = await module[method]({json:()=>{read=true;throw new Error("must not read body")}}, {params:Promise.resolve({id:"test",slug:"test"})})
          assert.equal(response.status,410);assert.equal(read,false)
        }
      } finally {
        if(prior===undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV; else Object.assign(process.env,{NODE_ENV:prior})
        if(flag===undefined) delete process.env.ENABLE_FRONTEND_MOCK_API; else process.env.ENABLE_FRONTEND_MOCK_API=flag
      }
    }
  })
}
