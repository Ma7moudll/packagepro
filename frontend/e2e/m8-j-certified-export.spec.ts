import { test, expect } from "@playwright/test"
import http from "node:http"
import path from "node:path"
import { loginViaApi, attachQaListeners, assertNoCriticalErrors, BACKEND } from "./helpers"
import { dbSingle, dbQuery, closeDb } from "./db"

const backendDir = path.resolve(__dirname, "../../backend")
const { createRequire } = require("node:module")
const require_ = createRequire(path.join(backendDir, "noop.js"))

/**
 * M8-J — Certified dieline delivery (authoritative receipt + gates) e2e.
 *
 *   A  POST /api/designs/:id/export { format:"svg" } after a PASSING checked
 *      order returns a synchronous `delivered` receipt with certificationStatus
 *      CERTIFIED, a deterministic file name (dieline-mailer-box.svg) and NO
 *      geometry payload (the server is corroborating only — the frontend is
 *      the byte authority).
 *   B  The gate is active: bumping design.updatedAt past prepress.checkedAt
 *      flips the same receipt to blocked/NOT_CERTIFIED (stale) and refreshing
 *      checkedAt restores Certified — everything reversible, nothing invented.
 *   C  A persisted FAILED result blocks with FAILED, never passing.
 *   D  A persisted UNVERIFIABLE verdict blocks with UNVERIFIABLE — a real M8-I
 *      outcome is never marketed as a pass.
 *   E  No persisted check on record blocks with NOT_CERTIFIED (no fabrication).
 *   F  Raw-SQL read-back: an export never writes a receipt row — prepress_checks
 *      row-count parity across the cycle, and no designs column materializes.
 */
test.describe.serial("M8-J Certified dieline delivery (real Postgres)", () => {
  let qaUserId = ""
  let server: http.Server
  const orderIds: string[] = []
  const designIds: string[] = []

  // order1/design1 -> real passing prepress check (certified)
  // order2/design2 -> persisted FAILED row
  // order3/design3 -> persisted UNVERIFIABLE row
  // order4/design4 -> no check at all
  let design1 = ""
  const ids: Record<string, string> = {}

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

  test.beforeAll(async () => {
    const sharp = require_("sharp")
    const cmyk = await sharp({ create: { width: 320, height: 200, channels: 3, background: { r: 200, g: 40, b: 120 } } })
      .toColourspace("cmyk")
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()

    server = http.createServer((req, res) => {
      if (req.url === "/master-cmyk.jpg") {
        res.writeHead(200, { "Content-Type": "image/jpeg" })
        res.end(injectJfifDensity(cmyk, 300))
        return
      }
      res.writeHead(404)
      res.end()
    })
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address() as { port: number }
    const jpegUrl = `http://127.0.0.1:${address.port}/master-cmyk.jpg`

    const qa = await dbSingle<{ id: string }>(
      `SELECT "id" FROM "users" WHERE "email" = 'qa-tester@packagepro.test'`
    )
    expect(qa).toBeTruthy()
    qaUserId = qa!.id

    const manifestEnvelope = (boxType: string) => ({
      schemaVersion: 2,
      manifestSource: "blueprint",
      reproducibility: "exact",
      manifest: {
        product: { id: `prod-${boxType}`, slug: `custom-${boxType}`, boxType },
        variant: {
          id: `variant-${boxType}`,
          sku: `box--${boxType}--f42--cardboard-natural--print-full-color--foil-none`,
          dimensions: { length: 115, width: 70, height: 38, unit: "mm" },
        },
        faces: { front: { w: 115, h: 38 } },
        zones: {},
        prepress: { bleedMm: 3, safeMm: 5, dpiMin: 300, caliperMm: 0.5, fluteType: "E", glueFlapToleranceMm: 1.5 },
        dieline: { schemaVersion: 1, spans: [], outline: [], panels: {} },
      },
      canvas: { width: 460, height: 152 },
      layers: [
        { id: "l-photo", type: "image", name: "Photo", faceId: "front", position: { x: -9, y: -9 }, width: 360, height: 135, scale: { x: 1, y: 1 } },
      ],
      product: { id: `prod-${boxType}`, slug: `custom-${boxType}`, name: "Mailer Box", type: "box" },
    })

    const run = Date.now()

    // Ownership identity: the export route calls isDesignOwner(user, designId),
// which asserts design.order.customerId === token.userId (= users.id). So the
// QA customer row is created with customers.id == users.id — ownership holds
// and any pre-existing row for the QA user is reset first (test-db hygiene).
    await dbQuery(`DELETE FROM "orders" WHERE "customerId" IN (SELECT "id" FROM "customers" WHERE "userId" = $1)`, [qaUserId])
    await dbQuery(`DELETE FROM "customers" WHERE "userId" = $1`, [qaUserId])
    await dbQuery(`INSERT INTO "customers" ("id", "userId", "createdAt", "updatedAt") VALUES ($1, $1, now(), now())`, [qaUserId])

    const createOrderDesign = async (
      key: string,
      boxType: string,
      files: { fileType: string; fileName: string; fileUrl: string; mime: string }[]
    ) => {
      const order = await dbSingle<{ id: string }>(
        `INSERT INTO "orders" ("id", "customerId", "orderNumber", "status", "subtotal", "tax", "shippingCost", "total", "shippingAddress", "shippingName", "shippingPhone", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'pending_review', '10.00', '0.00', '0.00', '10.00', $4::jsonb, 'Tester', '555', now(), now()) RETURNING "id"`,
        [crypto.randomUUID(), qaUserId, `M8J-E2E-${run}-${key}`, JSON.stringify({ line1: "1 Test St" })]
      ) as { id: string }
      orderIds.push(order.id)
      const sessionId = crypto.randomUUID()
      const design = await dbSingle<{ id: string }>(
        `INSERT INTO "designs" ("id", "orderId", "sessionId", "name", "designData", "status", "lifecycleStatus", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5::jsonb, 'saved', 'DRAFT', (now() AT TIME ZONE 'UTC') - interval '1 minute', (now() AT TIME ZONE 'UTC') - interval '1 minute') RETURNING "id"`,
        [crypto.randomUUID(), order.id, sessionId, key, JSON.stringify(manifestEnvelope(boxType))]
      ) as { id: string }
      designIds.push(design.id)
      ids[key] = design.id
      for (const f of files) {
        await dbQuery(
          `INSERT INTO "design_files" ("id", "designId", "fileType", "fileName", "fileUrl", "fileSize", "mimeType", "metadata", "createdAt")
           VALUES ($1, $2, $3, $4, $5, 0, $6, NULL, now())`,
          [crypto.randomUUID(), design.id, f.fileType, f.fileName, f.fileUrl, f.mime]
        )
      }
      return { orderId: order.id, designId: design.id }
    }

    const d1 = await createOrderDesign("d1", "mailer-box", [
      { fileType: "print_file", fileName: "master-cmyk.jpg", fileUrl: jpegUrl, mime: "image/jpeg" },
    ])
    design1 = d1.designId
    // NOTE: the file server MUST stay alive — Test A downloads master-cmyk.jpg
    // from it during the prepress check.

    // d2: persisted FAILED check
    const d2 = await createOrderDesign("d2", "folding-carton", [])
    await dbQuery(
      `INSERT INTO "prepress_checks" ("id", "designId", "resolutionOk", "colorModeOk", "bleedMarginsOk", "safeZoneOk", "fontsEmbedded", "passed", "issues", "checkedAt", "checkedBy")
       VALUES ($1, $2, false, false, false, false, false, false, $3::jsonb, now(), 'system')`,
      [crypto.randomUUID(), d2.designId, JSON.stringify([{ type: "resolution", severity: "error", message: "low resolution" }])]
    )

    // d3: persisted UNVERIFIABLE verdict (passed but unverifiable, as M8-I demotes)
    const d3 = await createOrderDesign("d3", "display-box", [])
    await dbQuery(
      `INSERT INTO "prepress_checks" ("id", "designId", "resolutionOk", "colorModeOk", "bleedMarginsOk", "safeZoneOk", "fontsEmbedded", "passed", "issues", "checkedAt", "checkedBy")
       VALUES ($1, $2, true, true, true, true, true, true, $3::jsonb, now(), 'system')`,
      [crypto.randomUUID(), d3.designId, JSON.stringify([{ type: "resolution", severity: "warning", message: "Resolution is UNVERIFIABLE for vector files" }])]
    )

    // d4: no check on record
    await createOrderDesign("d4", "pizza-box", [])
  })

  test.afterAll(async () => {
    try {
      server?.close()
      // orders cascade-delete designs, prepress_checks and design_files
      await dbQuery(`DELETE FROM "orders" WHERE "id" = ANY($1)`, [orderIds])
    } finally {
      closeDb()
    }
  })

  const exportSvg = async (
    page: import("@playwright/test").Page,
    designId: string
  ): Promise<{ status: number; body: any }> => {
    return page.evaluate(
      async ({ backEnd, did }) => {
        const res = await fetch(`${backEnd}/designs/${did}/export`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ format: "svg", options: { dieline: true } }),
        })
        return { status: res.status, body: await res.json() }
      },
      { backEnd: BACKEND, did: designId }
    )
  }

  test("A — certified delivery: synchronous receipt, deterministic name, NO geometry", async ({ page }) => {
    await loginViaApi(page)
    const qa = attachQaListeners(page)

    const check = await page.evaluate(
      async ({ backEnd, oid }) => {
        const res = await fetch(`${backEnd}/orders/${oid}/prepress-check`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
        return { status: res.status, body: await res.json() }
      },
      { backEnd: BACKEND, oid: (await dbSingle<{ orderId: string }>(`SELECT "orderId" FROM "designs" WHERE "id" = $1`, [design1]))!.orderId }
    )
    expect(check.status).toBe(200)
    expect(check.body.data.passed).toBe(true)

    const receipt = await exportSvg(page, design1)
    expect(receipt.status).toBe(200)
    expect(receipt.body.success).toBe(true)
    const d = receipt.body.data
    expect(d.status, `receipt: ${JSON.stringify(d)}`).toBe("delivered")
    expect(d.certificationStatus).toBe("CERTIFIED")
    expect(d.fileName).toBe("dieline-mailer-box.svg")
    expect(d.format).toBe("svg")
    expect(d.dieline).toBe(true)
    expect(typeof d.checkedAt).toBe("string")
    // A receipt is a corroborating record — it never fabricates geometry.
    expect(JSON.stringify(d)).not.toMatch(/<svg|data-face-id|<path/)

    assertNoCriticalErrors(qa)
  })

  test("B — stale gate is live and reversible (design.updatedAt vs checkedAt)", async ({ page }) => {
    await loginViaApi(page)

    // make the design NEWER than the check -> stale -> NOT_CERTIFIED
    await dbQuery(`UPDATE "designs" SET "updatedAt" = (now() AT TIME ZONE 'UTC') + interval '1 hour' WHERE "id" = $1`, [design1])
    const stale = await exportSvg(page, design1)
    expect(stale.status).toBe(200)
    expect(stale.body.data.status).toBe("blocked_certification")
    expect(stale.body.data.certificationStatus).toBe("NOT_CERTIFIED")
    expect(stale.body.data.reason).toMatch(/stale/i)

    // refresh the check -> certified again (nothing fabricated, just current)
    await dbQuery(`UPDATE "prepress_checks" SET "checkedAt" = (now() AT TIME ZONE 'UTC') + interval '2 hours' WHERE "designId" = $1`, [design1])
    const fresh = await exportSvg(page, design1)
    expect(fresh.body.data.status).toBe("delivered")
    expect(fresh.body.data.certificationStatus).toBe("CERTIFIED")
  })

  test("C — persisted FAILED result blocks with FAILED, never a pass", async ({ page }) => {
    await loginViaApi(page)
    const receipt = await exportSvg(page, ids.d2)
    expect(receipt.status).toBe(200)
    expect(receipt.body.data.status).toBe("blocked_certification")
    expect(receipt.body.data.certificationStatus).toBe("FAILED")
  })

  test("D — an UNVERIFIABLE verdict blocks with UNVERIFIABLE", async ({ page }) => {
    await loginViaApi(page)
    const receipt = await exportSvg(page, ids.d3)
    expect(receipt.status).toBe(200)
    expect(receipt.body.data.status).toBe("blocked_certification")
    expect(receipt.body.data.certificationStatus).toBe("UNVERIFIABLE")
  })

  test("E — no check on record blocks with NOT_CERTIFIED (no fabrication)", async ({ page }) => {
    await loginViaApi(page)
    const receipt = await exportSvg(page, ids.d4)
    expect(receipt.status).toBe(200)
    expect(receipt.body.data.status).toBe("blocked_certification")
    expect(receipt.body.data.certificationStatus).toBe("NOT_CERTIFIED")
    expect(receipt.body.data.reason).toMatch(/no prepress certification/i)

    // results endpoint agrees there is nothing on record
    const { orderId } = (await dbSingle<{ orderId: string }>(`SELECT "orderId" FROM "designs" WHERE "id" = $1`, [ids.d4]))!
    const miss = await page.evaluate(
      async ({ backEnd, oid }) => {
        const res = await fetch(`${backEnd}/orders/${oid}/prepress-results`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` },
        })
        return { status: res.status }
      },
      { backEnd: BACKEND, oid: orderId }
    )
    expect(miss.status).toBe(404)
  })

  test("F — exports never persist a receipt (read-only corroboration)", async ({ page }) => {
    await loginViaApi(page)
    const before = await dbSingle<{ n: bigint | string }>(
      `SELECT COUNT(*)::int AS n FROM "prepress_checks" WHERE "designId" = $1`,
      [design1]
    )
    // a whole stale->fresh cycle earlier plus this now-repeated call are all reads
    await exportSvg(page, design1)
    await exportSvg(page, design1)
    const after = await dbSingle<{ n: bigint | string }>(
      `SELECT COUNT(*)::int AS n FROM "prepress_checks" WHERE "designId" = $1`,
      [design1]
    )
    expect(Number(after!.n)).toBe(Number(before!.n))

    // and the designs table never grows a receipt column (it is assertion-only)
    const col = await dbSingle<{ exists: string | boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_name = 'designs' AND column_name = 'dielineReceipt'
       ) AS exists`
    )
    expect(col!.exists).toBe(false)
  })
})