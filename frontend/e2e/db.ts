import { createRequire } from "node:module"
import { readFileSync } from "node:fs"
import path from "node:path"

// Playwright transpiles specs to CJS; __dirname is the e2e directory.
const backendDir = path.resolve(__dirname, "../../backend")

const require_ = createRequire(path.join(backendDir, "noop.js"))
const { Pool } = require_(require_.resolve("pg"))

function loadDotenv(file: string): Record<string, string> {
  const env: Record<string, string> = {}
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

let pool: InstanceType<typeof Pool> | null = null

function getPool(): InstanceType<typeof Pool> {
  if (pool) return pool
  const dotEnv = loadDotenv(path.join(backendDir, ".env"))
  const url = dotEnv.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL not found in backend/.env")
  pool = new Pool({ connectionString: url, max: 2 })
  return pool
}

export async function dbQuery<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await getPool().connect()
  try {
    const res = await client.query(text, params)
    return res.rows as T[]
  } finally {
    client.release()
  }
}

export async function dbSingle<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await dbQuery<T>(text, params)
  return rows[0] ?? null
}

/* ── Design helpers ─────────────────────────────────────────────── */

export interface DesignRow {
  id: string
  sessionId: string | null
  productId: string | null
  variantId: string | null
  sku: string | null
  orderId: string | null
  designConfig: Record<string, unknown> | null
  designData: Record<string, unknown> | null
}

export async function findDesignBySession(sessionId: string): Promise<DesignRow | null> {
  return dbSingle<DesignRow>(
    `SELECT id, "sessionId", "productId", "variantId", "sku", "orderId", "designConfig", "designData"
     FROM "designs"
     WHERE "sessionId" = $1`,
    [sessionId]
  )
}

/* ── CartItem helpers ────────────────────────────────────────────── */

export interface CartItemRow {
  id: string
  cartId: string
  designId: string | null
  productId: string | null
  variantId: string | null
  sku: string | null
  sessionId: string | null
  config: Record<string, unknown> | null
  quantity: number
}

export async function findCartItemBySession(sessionId: string): Promise<CartItemRow | null> {
  return dbSingle<CartItemRow>(
    `SELECT ci.id, ci."cartId", ci."designId", ci."productId", ci."variantId", ci."sku",
            ci."sessionId", ci."config", ci."quantity"
     FROM "cart_items" ci
     WHERE ci."sessionId" = $1
     ORDER BY ci."createdAt" DESC
     LIMIT 1`,
    [sessionId]
  )
}

/* ── Order helpers ────────────────────────────────────────────────── */

export interface OrderRow {
  id: string
  orderNumber: string
  status: string
}

export async function findOrderByDesignSession(sessionId: string): Promise<OrderRow | null> {
  return dbSingle<OrderRow>(
    `SELECT o.id, o."orderNumber", o.status
     FROM "orders" o
     INNER JOIN "designs" d ON d."orderId" = o.id
     WHERE d."sessionId" = $1
     LIMIT 1`,
    [sessionId]
  )
}

export interface OrderItemRow {
  id: string
  orderId: string
  designId: string | null
  productId: string | null
  variantId: string | null
  sku: string | null
  quantity: number
}

export async function findOrderItemsByOrderId(orderId: string): Promise<OrderItemRow[]> {
  return dbQuery<OrderItemRow>(
    `SELECT id, "orderId", "designId", "productId", "variantId", "sku", "quantity"
     FROM "order_items"
     WHERE "orderId" = $1`,
    [orderId]
  )
}

export async function findCartItemsByDesignId(designId: string): Promise<CartItemRow[]> {
  return dbQuery<CartItemRow>(
    `SELECT id, "cartId", "designId", "productId", "variantId", "sku", "sessionId", "config", "quantity"
     FROM "cart_items"
     WHERE "designId" = $1`,
    [designId]
  )
}

/* ── Cleanup ────────────────────────────────────────────────────── */

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
