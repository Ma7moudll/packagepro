import {approvalContentHash,approvalBytesHash} from '../../backend/src/modules/orders/approval-snapshot'
import { createRequire } from "node:module"
import { readFileSync, mkdirSync, writeFileSync } from "node:fs"
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
  const url = process.env.DATABASE_URL || dotEnv.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is required for disposable E2E fixtures")
  const parsed=new URL(url)
  if(process.env.PACKAGEPRO_DISPOSABLE_E2E_DATABASE!=="yes"||!["localhost","127.0.0.1"].includes(parsed.hostname)||!/(?:^|[_-])(?:test|e2e)(?:[_-]|$)/i.test(decodeURIComponent(parsed.pathname).replace(/^\//,"")))throw new Error("E2E fixtures require an explicitly disposable local test database")
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

/* ── Design lifecycle / M8-H helpers ──────────────────────────────── */

/**
 * Set the design lifecycle state directly (test seam — mirrors the backend
 * transition boundary that would normally perform a validated transition).
 * The Prisma enum is materialized as the PG type "DesignLifecycleStatus"; the
 * cast makes the parameter bind safely against it.
 */
export async function updateDesignLifecycle(sessionId: string, lifecycleStatus: string): Promise<void> {
  await dbQuery(
    `UPDATE "designs" SET "lifecycleStatus" = $1::"DesignLifecycleStatus", "updatedAt" = now() WHERE "sessionId" = $2`,
    [lifecycleStatus, sessionId]
  )
}

/** Read the current lifecycle state of a design. */
export async function findDesignLifecycle(sessionId: string): Promise<string | null> {
  const row = await dbSingle<{ lifecycleStatus: string }>(
    `SELECT "lifecycleStatus" FROM "designs" WHERE "sessionId" = $1`,
    [sessionId]
  )
  return row?.lifecycleStatus ?? null
}

/**
 * Insert a pre-existing legacy (v1) design row — designData carries a raw
 * core-state blob WITHOUT the v2 envelope (no schemaVersion). Used to prove
 * the M8-H migration path: loading such a design and re-saving must produce a
 * v2 envelope with `migrated`/`best_effort` provenance while keeping artwork.
 */
export async function insertLegacyDesignRow(opts: {
  sessionId: string
  productId?: string | null
  designData: Record<string, unknown>
}): Promise<void> {
  const { randomUUID } = require_("crypto")
  await dbQuery(
    `INSERT INTO "designs" ("id", "sessionId", "productId", "designData", "status", "lifecycleStatus", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4::jsonb, 'saved', 'DRAFT', now(), now())
     ON CONFLICT ("sessionId") DO UPDATE
       SET "designData" = EXCLUDED."designData", "status" = 'saved', "updatedAt" = now()`,
    [randomUUID(), opts.sessionId, opts.productId ?? null, JSON.stringify(opts.designData)]
  )
}

export async function deleteDesignBySession(sessionId: string): Promise<void> {
  await dbQuery(`DELETE FROM "designs" WHERE "sessionId" = $1`, [sessionId])
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

/* ── Phase 2 approval / billing fixtures ─────────────────────────── */

export async function findCustomerByEmail(email: string): Promise<{ id: string; userId: string } | null> {
  return dbSingle<{ id: string; userId: string }>(
    `SELECT c.id, c."userId"
     FROM "customers" c
     INNER JOIN "users" u ON u.id = c."userId"
     WHERE u.email = $1`,
    [email]
  )
}

export interface OrderFixture {
  orderId: string
  orderNumber: string
  designId: string
  approvalToken: string
}

/**
 * Seed a disposable order for the Phase 2 customer-experience E2E flows.
 * Inserts Order (+ item), optional Design + proof/preview files, optional
 * Payment's captured row, and an optional Shipment. Deletes on cleanup via
 * the Order→Payment/Shipment/Item/Design ON DELETE CASCADE.
 */
export async function createOrderFixture(opts: {
  customerId: string
  orderNumber: string
  status: string
  withDesign?: boolean
  withProofFiles?: boolean
  withPayment?: boolean
  withShipment?: boolean
  approvalToken?: string
}): Promise<OrderFixture> {
  const { randomUUID } = require_("crypto")
  const orderId = randomUUID()
  const itemId = randomUUID()
  const orderNumber = opts.orderNumber

  await dbQuery(
    `INSERT INTO "orders"
       ("id", "customerId", "orderNumber", "status", "subtotal", "tax", "shippingCost", "total",
        "shippingAddress", "shippingName", "shippingPhone", "shippingEmail",
        "metadata", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4::"OrderStatus", 120.00, 0.00, 15.00, 135.00,
        $5::jsonb, 'QA Tester', '+971500000000', $6,
        '{}'::jsonb, now(), now())`,
    [
      orderId,
      opts.customerId,
      orderNumber,
      opts.status,
      JSON.stringify({
        firstName: 'QA',
        lastName: 'Tester',
        street: '123 Test Street',
        city: 'Dubai',
        state: null,
        postalCode: '00000',
        country: 'AE',
      }),
      "qa-tester@packagepro.test",
    ]
  )

  await dbQuery(
    `INSERT INTO "order_items"
       ("id", "orderId", "productType", "quantity", "dimensions", "material", "unitPrice", "totalPrice",
        "createdAt", "updatedAt")
     VALUES ($1, $2, 'box', 100, $3::jsonb, 'cardboard', 1.20, 120.00, now(), now())`,
    [itemId, orderId, JSON.stringify({ length: 23, width: 15, height: 5, unit: 'cm' })]
  )

  let designId = ""
  if (opts.withDesign) {
    designId = randomUUID()
    await dbQuery(
      `INSERT INTO "designs"
         ("id", "orderId", "name", "status", "lifecycleStatus", "designData", "designConfig", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'saved', 'DRAFT'::"DesignLifecycleStatus", $4::jsonb, $5::jsonb, now(), now())`,
      [
        designId,
        orderId,
        `QA ${opts.orderNumber}`,
        JSON.stringify({ schemaVersion: 2, layers: [], provenance: { source: 'e2e' } }),
        JSON.stringify({ printCoverage: 10, finish: 'matte' }),
      ]
    )

    if (opts.withProofFiles) {
      for (const file of [
        { type: 'preview', name: 'preview.png', url: '/qa-assets/preview.png', mime: 'image/png', size: 1024 },
        { type: 'proof', name: 'proof.pdf', url: '/qa-assets/proof.pdf', mime: 'application/pdf', size: 2048 },
      ]) {
        await dbQuery(
          `INSERT INTO "design_files" ("id", "designId", "fileType", "fileName", "fileUrl", "fileSize", "mimeType", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, now())`,
          [randomUUID(), designId, file.type, file.name, file.url, file.size, file.mime]
        )
      }
    }
  }

  if (opts.withPayment) {
    await dbQuery(
      `INSERT INTO "payments" ("id", "orderId", "amount", "currency", "status", "capturedAt", "createdAt", "updatedAt")
       VALUES ($1, $2, 135.00, 'USD', 'captured'::"PaymentStatus", now(), now(), now())`,
      [randomUUID(), orderId]
    )
  }

  if (opts.withShipment) {
    await dbQuery(
      `INSERT INTO "shipments"
         ("id", "orderId", "dhlTrackingNumber", "status", "estimatedDeliveryDate", "trackingEvents", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'delivered'::"ShipmentStatus", now() + interval '3 days',
          $4::jsonb, now(), now())`,
      [
        randomUUID(),
        orderId,
        `JDQA${orderNumber.replace(/[^A-Z0-9]/gi, '').slice(-9)}`,
        JSON.stringify([
          { status: 'picked_up', description: 'Package picked up by DHL', timestamp: new Date().toISOString() },
        ]),
      ]
    )
  }

  let approvalToken = ""
  if (opts.approvalToken) {
    approvalToken = opts.approvalToken
    if(!designId||!opts.withProofFiles)throw new Error('Approval fixture requires saved design/proof')
    const {createHash}=require_('crypto');const {PDFDocument}=require_('pdf-lib');
    const requestId=randomUUID();const printId=randomUUID();const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
    // This browser fixture uses identical test print/proof bytes and a prebound
    // local snapshot URL. Snapshot separation is exercised by backend real-save tests.
    const folder=path.join(backendDir,'.data/uploads/test-e2e-approval',requestId);mkdirSync(folder,{recursive:true});writeFileSync(path.join(folder,'print.pdf'),bytes);writeFileSync(path.join(folder,'proof.pdf'),bytes);
    const printUrl=`/api/files/test-e2e-approval/${requestId}/print.pdf`,proofUrl=`/api/files/test-e2e-approval/${requestId}/proof.pdf`;
    const design=await dbSingle<any>('SELECT * FROM designs WHERE id=$1',[designId]);const hash=approvalContentHash(design);
    await dbQuery(`INSERT INTO design_files(id,"designId","fileType","fileName","fileUrl","fileSize","mimeType",metadata,"createdAt") VALUES($1,$2,'print_file','print.pdf',$3,$4,'application/pdf',$5::jsonb,now())`,[printId,designId,printUrl,bytes.length,JSON.stringify({approvalContentHash:hash})]);
    const proof=await dbSingle<any>(`SELECT id FROM design_files WHERE "designId"=$1 AND "fileType"='proof' LIMIT 1`,[designId]);await dbQuery('UPDATE design_files SET "fileUrl"=$1 WHERE id=$2',[proofUrl,proof!.id]);
    await dbQuery(`INSERT INTO approval_requests(id,"orderId","designId",status,"contentHash","designSnapshot","printFileId","printSha256","printSnapshotUrl","proofFileId","proofSha256","proofUrl","deliveryState","createdAt","expiresAt") VALUES($1,$2,$3,'pending',$4,$5::jsonb,$6,$7,$8,$9,$7,$10,'sent',$11,$12)`,[requestId,orderId,designId,hash,JSON.stringify({designData:design.designData,designConfig:design.designConfig}),printId,approvalBytesHash(bytes),printUrl,proof!.id,proofUrl,new Date().toISOString(),new Date(Date.now()+7*86400000).toISOString()]);
    await dbQuery(`INSERT INTO order_approval_tokens("tokenHash","orderId","requestId","expiresAt") VALUES($1,$2,$3,now()+interval '7 days')`,[createHash('sha256').update(approvalToken).digest('hex'),orderId,requestId]);
  }

  return { orderId, orderNumber, designId, approvalToken }
}

export async function deleteOrderFixture(orderId: string): Promise<void> {
  await dbQuery(`DELETE FROM "orders" WHERE "id" = $1`, [orderId])
}

/* ── Redis seams (backend ioredis instance, same URL as server) ────── */

let redisClient: InstanceType<any> | null = null

function getRedis(): InstanceType<any> | null {
  if (redisClient) return redisClient
  const dotEnv = loadDotenv(path.join(backendDir, ".env"))
  const url = process.env.REDIS_URL || dotEnv.REDIS_URL
  if (!url) return null
  const Redis = require_(require_.resolve("ioredis"))
  redisClient = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    retryStrategy: () => null,
  })
  return redisClient
}

export async function redisSetJSON(key: string, value: unknown): Promise<void> {
  const client = getRedis()
  if (!client) return
  if (client.status === "wait") {
    try {
      await client.connect()
    } catch {
      return
    }
  }
  try {
    await client.set(key, JSON.stringify(value))
  } catch {
    /* Redis unavailable — approval-token flows are skipped by the caller */
  }
}

export async function redisDel(key: string): Promise<void> {
  const client = getRedis()
  if (!client) return
  if (client.status === "wait") {
    try {
      await client.connect()
    } catch {
      return
    }
  }
  try {
    await client.del(key)
  } catch {
    /* Redis unavailable */
  }
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit()
    } catch {
      /* ignore */
    }
    redisClient = null
  }
}

/* ── Cleanup ────────────────────────────────────────────────────── */

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
  }
}
