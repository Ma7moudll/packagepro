import {readFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {approvalContentHash} from '../../backend/src/modules/orders/approval-snapshot'
import { test, expect } from "@playwright/test"
import http from "node:http"
import path from "node:path"
import { loginViaApi, attachQaListeners, assertNoCriticalErrors, BACKEND } from "./helpers"
import { dbSingle, dbQuery, closeDb } from "./db"

const backendDir = path.resolve(__dirname, "../../backend")
const { createRequire } = require("node:module")
const require_ = createRequire(path.join(backendDir, "noop.js"))

/**
 * M8-I — Backend Prepresertation (authoritative) end-to-end (real Postgres).
 *
 *   A  POST /api/prepress/orders/:id/prepress-check evaluates the persisted
 *      manifest geometry AND the server-hosted print/preview assets, upserts
 *      prepress_checks, and returns the four key booleans + fixedAutomatically.
 *   B  GET  /api/prepress/orders/:id/prepress-results returns the persisted
 *      row (idempotent parity).
 *   C  Raw-SQL read-back proves the row leaked nowhere and carries the
 *      proof-time auto-fix (sub-bleed edge → extend_to_bleed).
 *   D  Proof DesignFile read-back using local test storage:
 *      an explicit admin request generates a bound PDF proof
 *      and registers a DesignFile of fileType 'proof' for the order's design.
 */
test.describe.serial("M8-I Prepress certification (real Postgres)", () => {
  let orderId = ""
  let designId = ""
  let sessionId = ""
  let ownerToken = ""
  let server: http.Server
  let jpegUrl = ""
  let previewUrl = ""
  const orderIds: string[] = []
  const userIds: string[] = []

  const rgba = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVR42mP8z8Dwn4GBgYGJgYGBEYhJoYdAiqE4EwQACwADKAA7LKvJAAAAAElFTkSuQmCC",
    "base64"
  )

  function injectJfifDensity(buf: Buffer, density: number): Buffer {
    const dpi = Math.min(65535, Math.max(1, Math.round(density)))
    const app0 = Buffer.from([
      0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
      (dpi >> 8) & 0xff, dpi & 0xff, (dpi >> 8) & 0xff, dpi & 0xff, 0x00, 0x00,
    ])
    return Buffer.concat([buf.subarray(0, 2), app0, buf.subarray(2)])
  }

  /** Sub-bleed right edge (120mm image on a 115mm face) -> fixable warning. */
  function manifestEnvelope() {
    return {
      schemaVersion: 2,
      manifestSource: "blueprint",
      reproducibility: "exact",
      manifest: {
        product: { id: "prod-mailer-box", slug: "custom-mailer-box", boxType: "mailer-box" },
        variant: {
          id: "variant-f42",
          sku: "box--mailer-box--f42--cardboard-natural--print-full-color--foil-none",
          dimensions: { length: 115, width: 70, height: 38, unit: "mm" },
        },
        faces: { front: { w: 115, h: 38 } },
        zones: {},
        prepress: { bleedMm: 3, safeMm: 5, dpiMin: 300, caliperMm: 0.5, fluteType: "E", glueFlapToleranceMm: 1.5 },
        dieline: { schemaVersion: 1, panels: {}, out: "snapshot" },
      },
      canvas: { width: 460, height: 152 },
      layers: [
        { id: "l-photo", type: "image", name: "Photo", faceId: "front", position: { x: -9, y: -9 }, width: 360, height: 135, scale: { x: 1, y: 1 } },
      ],
      product: { id: "prod-mailer-box", slug: "custom-mailer-box", name: "Mailer Box", type: "box" },
    }
  }

  test.beforeAll(async () => {
    const sharp = require_("sharp")
    const cmyk = await sharp({ create: { width: 320, height: 200, channels: 3, background: { r: 200, g: 40, b: 120 } } })
      .toColourspace("cmyk")
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()
    const preview = await sharp({ create: { width: 200, height: 120, channels: 3, background: { r: 20, g: 180, b: 90 } } })
      .jpeg({ quality: 95, mozjpeg: true })
      .toBuffer()

    server = http.createServer((req, res) => {
      if (req.url === "/master-cmyk.jpg") {
        res.writeHead(200, { "Content-Type": "image/jpeg" })
        res.end(injectJfifDensity(cmyk, 300))
        return
      }
      if (req.url === "/preview-rgb.jpg") {
        res.writeHead(200, { "Content-Type": "image/jpeg" })
        res.end(preview)
        return
      }
      res.writeHead(404)
      res.end()
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address() as { port: number }
    jpegUrl = `http://127.0.0.1:${address.port}/master-cmyk.jpg`
    previewUrl = `http://127.0.0.1:${address.port}/preview-rgb.jpg`

    sessionId = crypto.randomUUID()
    const run = Date.now()
    const email = `m8i-e2e-${run}@packagepro.test`
    const { id: userId } = await dbSingle<{ id: string }>(
      `INSERT INTO "users" ("id", "email", "passwordHash", "role", "createdAt", "updatedAt")
       VALUES ($1, $2, 'x', 'CUSTOMER', now(), now()) RETURNING "id"`,
      [crypto.randomUUID(), email]
    ) as { id: string }
    userIds.push(userId)
    ownerToken=require_('jsonwebtoken').sign({userId,email,role:'CUSTOMER',type:'access'},process.env.JWT_SECRET,{issuer:'packagepro-auth',audience:'packagepro-api',subject:userId,expiresIn:'15m'});
    const { id: customerId } = await dbSingle<{ id: string }>(
      `INSERT INTO "customers" ("id", "userId", "createdAt", "updatedAt") VALUES ($1, $2, now(), now()) RETURNING "id"`,
      [crypto.randomUUID(), userId]
    ) as { id: string }
    const order = await dbSingle<{ id: string }>(
      `INSERT INTO "orders" ("id", "customerId", "orderNumber", "status", "subtotal", "tax", "shippingCost", "total", "shippingAddress", "shippingName", "shippingPhone", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'pending_review', '10.00', '0.00', '0.00', '10.00', $4::jsonb, 'Tester', '555', now(), now()) RETURNING "id"`,
      [crypto.randomUUID(), customerId, `M8I-E2E-${run}`, JSON.stringify({ line1: "1 Test St" })]
    ) as { id: string }
    orderId = order.id
    orderIds.push(orderId)

    const design = await dbSingle<{ id: string }>(
      `INSERT INTO "designs" ("id", "orderId", "sessionId", "name", "designData", "status", "lifecycleStatus", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'M8-I E2E', $4::jsonb, 'saved', 'DRAFT', now(), now()) RETURNING "id"`,
      [crypto.randomUUID(), orderId, sessionId, JSON.stringify(manifestEnvelope())]
    ) as { id: string }
    designId = design.id

    const files = [
      { fileType: "print_file", fileName: "master-cmyk.jpg", path: jpegUrl, mime: "image/jpeg" },
      { fileType: "preview", fileName: "preview-rgb.jpg", path: previewUrl, mime: "image/jpeg" },
    ]
    for (const f of files) {
      await dbQuery(
        `INSERT INTO "design_files" ("id", "designId", "fileType", "fileName", "fileUrl", "fileSize", "mimeType", "metadata", "createdAt")
         VALUES ($1, $2, $3, $4, $5, 0, $6, NULL, now())`,
        [crypto.randomUUID(), designId, f.fileType, f.fileName, f.path, f.mime]
      )
    }
  })

  test.beforeEach(async({page})=>{
    // Retired analytics transport is unrelated to this storage/approval test.
    await page.addInitScript(()=>{const original=window.fetch;window.fetch=(input,init)=>new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,location.origin).pathname==='/api/packagepro/analytics/batch'?Promise.resolve(new Response(null,{status:204})):original.call(window,input,init)})
  })
  test.afterAll(async () => {
    try {
      server?.close()
      await dbQuery(`DELETE FROM "orders" WHERE "id" = ANY($1)`, [orderIds])
      await dbQuery(`DELETE FROM "users" WHERE "id" = ANY($1)`, [userIds])
    } finally {
      closeDb()
    }
  })

  test("A/B/C — authoritative check over HTTP, results parity, raw-SQL read-back", async ({ page }) => {
    await loginViaApi(page)
    await page.evaluate(token=>localStorage.setItem("accessToken",token),ownerToken)
    const qa = attachQaListeners(page)

    const check = await page.evaluate(
      async ({ backEnd, oid }) => {
        const res = await fetch(`${backEnd}/orders/${oid}/prepress-check`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
        return { status: res.status, body: await res.json() }
      },
      { backEnd: BACKEND, oid: orderId }
    )
    expect(check.status).toBe(200)
    const data = check.body.data
    // CMYK 300dpi master passes resolution + color; preview RGB is demoted.
    expect(data.resolutionOk).toBe(true)
    expect(data.colorModeOk).toBe(true)
    expect(data.compressionOk).toBe(true)
    // Full-bleed image crosses the 5mm safe line but only its RIGHT edge is
    // sub-bleed — and it is fixable (measured 2mm ≥ 60% of 3mm).
    expect(data.bleedMarginsOk).toBe(true)
    expect(data.safeZoneOk).toBe(false)
    expect(data.passed).toBe(true)
    expect(data.fixedAutomatically).toHaveLength(1)
    expect(data.fixedAutomatically[0]).toMatchObject({
      type: "bleed",
      action: "extend_to_bleed",
      elementId: "l-photo",
      faceId: "front",
    })
    expect(data.issues.some((i: any) => i.severity === "error")).toBe(false)

    const results = await page.evaluate(
      async ({ backEnd, oid }) => {
        const res = await fetch(`${backEnd}/orders/${oid}/prepress-results`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
        return { status: res.status, body: await res.json() }
      },
      { backEnd: BACKEND, oid: orderId }
    )
    expect(results.status).toBe(200)
    expect(results.body.data.issues).toEqual(data.issues)
    expect(results.body.data.fixedAutomatically).toEqual(data.fixedAutomatically)

    const row = await dbSingle<Record<string, unknown>>(
      `SELECT "resolutionOk", "colorModeOk", "bleedMarginsOk", "safeZoneOk", "fontsEmbedded", "passed", "fixedAutomatically", "checkedAt", "checkedBy"
       FROM prepress_checks WHERE "designId" = $1`,
      [designId]
    )
    expect(row).toBeTruthy()
    expect(row!.resolutionOk).toBe(true)
    expect(row!.colorModeOk).toBe(true)
    expect(row!.bleedMarginsOk).toBe(true)
    expect(row!.safeZoneOk).toBe(false)
    expect(row!.passed).toBe(true)
    const fixes = row!.fixedAutomatically as Array<{ action: string; detail: string }>
    expect(fixes[0].action).toBe("extend_to_bleed")
    expect(fixes[0].detail).toMatch(/right edge extended to 3mm bleed/)
    expect((row!.checkedAt as Date).getTime()).toBeLessThanOrEqual(Date.now())
    expect(row!.checkedBy).toBe("system")

    assertNoCriticalErrors(qa)
  })

  test("D — selected current proof DesignFile read-back in local test storage", async ({ page }) => {

    await loginViaApi(page)

    // Test-only admin fixture, real HTTP role gate, no production storage/provider.
    const {randomUUID}=require_('crypto');const adminId=randomUUID();userIds.push(adminId);
    await dbQuery(`INSERT INTO users(id,email,"passwordHash",role,"emailVerified","createdAt","updatedAt") VALUES($1,$2,'unused','ADMIN',true,now(),now())`,[adminId,`m8i-admin-${adminId}@test.local`]);
    const jwt=require_('jsonwebtoken');const adminToken=jwt.sign({userId:adminId,email:`m8i-admin-${adminId}@test.local`,role:'ADMIN',type:'access'},process.env.JWT_SECRET,{issuer:'packagepro-auth',audience:'packagepro-api',subject:adminId,expiresIn:'15m'});
    const design=await dbSingle<any>('SELECT * FROM designs WHERE id=$1',[designId]);const hash=approvalContentHash(design);
    const file=await dbSingle<any>(`SELECT id FROM design_files WHERE "designId"=$1 AND "fileType"='print_file'`,[designId]);await dbQuery('UPDATE design_files SET metadata=$1::jsonb WHERE id=$2',[JSON.stringify({approvalContentHash:hash}),file!.id]);
    const res = await page.request.post(`${BACKEND}/orders/${orderId}/request-approval`, {
      headers: { Authorization: `Bearer ${adminToken}` },data:{printFileId:file!.id,dielineFileId:null},
    })
    expect(res.ok()).toBe(true)

    const proofs = await dbQuery<{ fileName: string; fileUrl: string }>(
      `SELECT "fileName", "fileUrl" FROM design_files WHERE "designId" = $1 AND "fileType" = 'proof'`,
      [designId]
    )
    expect(proofs.length).toBeGreaterThanOrEqual(1)
    expect(proofs[0].fileUrl).toContain("/approval-snapshots/")
    const request=await dbSingle<any>(`SELECT * FROM approval_requests WHERE "orderId"=$1`,[orderId]);expect(request.proofUrl).toBe(proofs[0].fileUrl);const selected=await dbSingle<any>('SELECT "fileUrl" FROM design_files WHERE id=$1',[file!.id]);
    const selectedResponse=await page.request.get(selected!.fileUrl);expect(selectedResponse.status()).toBe(200);const selectedBytes=await selectedResponse.body();
    expect(request.printSha256).toBe(createHash('sha256').update(selectedBytes).digest('hex'));
    const frozenPath=path.join(backendDir,'.data/uploads',request.printSnapshotUrl.replace('/api/files/',''));expect(readFileSync(frozenPath)).toEqual(selectedBytes)
  })
})