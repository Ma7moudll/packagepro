import { readFileSync } from "node:fs"
import net from "node:net"
import path from "node:path"
import { fileURLToPath } from "node:url"

const BACKEND_ENV = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../backend/.env")

function loadDotenv(file) {
  const env = {}
  let raw = ""
  try {
    raw = readFileSync(file, "utf8")
  } catch {
    return env
  }
  for (const line of raw.split("\n")) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line)
    if (!m) continue
    env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
  return env
}

function tcpCheck(host, port, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      reject(new Error(`connection timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    socket.once("connect", () => {
      clearTimeout(timer)
      socket.destroy()
      resolve()
    })
    socket.once("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

function urlParts(raw) {
  if (!raw) return null
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  return { host: parsed.hostname, port: parsed.port || (parsed.protocol === "redis:" ? "6379" : "5432") }
}

async function main() {
  const required = process.env.PLAYWRIGHT_E2E || "1"
  if (!required) return

  const env = { ...process.env, ...loadDotenv(BACKEND_ENV) }
  const services = [
    { name: "PostgreSQL", url: env.DATABASE_URL, port: "5432" },
    { name: "Redis", url: env.REDIS_URL, port: "6379" },
  ]

  const failures = []
  for (const svc of services) {
    const parts = urlParts(svc.url)
    const host = parts?.host || "localhost"
    const port = parts?.port || svc.port
    try {
      await tcpCheck(host, Number(port))
      console.log(`[e2e-preflight] ${svc.name} reachable at ${host}:${port}`)
    } catch (err) {
      failures.push(`${svc.name} (${host}:${port}) — ${err.message}`)
    }
  }

  if (failures.length) {
    console.error(`[e2e-preflight] BLOCKING: required external services are not reachable:\n  - ${failures.join("\n  - ")}`)
    console.error("Start PostgreSQL and Redis, then re-run the suite.")
    process.exit(1)
  }
  console.log("[e2e-preflight] all external dependencies reachable")
}

main().catch((err) => {
  console.error("[e2e-preflight] unexpected error:", err)
  process.exit(1)
})