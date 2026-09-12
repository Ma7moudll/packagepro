import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'node:http';
import sharp from 'sharp';
import { prisma } from '../../lib/prisma';
import { prePressCheckService } from './prepress.service';

/**
 * M8-I: Integration test — authoritative prepress against the persisted
 * design manifest + server-hosted assets (real Postgres, local HTTP for
 * axios downloads, same convention as auth/save-gate integration tests).
 *
 *   A  checkOrderDesign evaluates resolution/color/corruption from the
 *      server-hosted print + preview assets AND bleed/safe/overlap from the
 *      persisted manifest; upserts prepress_checks (raw SQL read-back).
 *   B  Sub-bleed edges are recorded in fixedAutomatically (proof-time
 *      correction) without mutating source files.
 *   C  Re-running the check is deterministic (identical issues), and preview
 *      assets demote errors to warnings so the display copy never hard-fails.
 */
describe('prepress — M8-I authoritative check', () => {
  const orderIds: string[] = [];
  const userIds: string[] = [];
  let server: http.Server;
  let baseUrl = '';

  const rgba = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVR42mP8z8Dwn4GBgYGJgYGBEYhJoYdAiqE4EwQACwADKAA7LKvJAAAAAElFTkSuQmCC',
    'base64'
  );

  function injectJfifDensity(buf: Buffer, density: number): Buffer {
    const dpi = Math.min(65535, Math.max(1, Math.round(density)));
    const app0 = Buffer.from([
      0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
      (dpi >> 8) & 0xff, dpi & 0xff, (dpi >> 8) & 0xff, dpi & 0xff, 0x00, 0x00,
    ]);
    return Buffer.concat([buf.subarray(0, 2), app0, buf.subarray(2)]);
  }

  /** Sub-bleed right edge (120mm wide on a 115mm face) -> fixable warning. */
  function manifestEnvelope() {
    return {
      schemaVersion: 2,
      manifestSource: 'blueprint',
      reproducibility: 'exact',
      manifest: {
        product: { id: 'prod-mailer-box', slug: 'custom-mailer-box', boxType: 'mailer-box' },
        variant: {
          id: 'variant-f42',
          sku: 'box--mailer-box--f42--cardboard-natural--print-full-color--foil-none',
          dimensions: { length: 115, width: 70, height: 38, unit: 'mm' },
        },
        faces: { front: { w: 115, h: 38 } },
        zones: {},
        prepress: { bleedMm: 3, safeMm: 5, dpiMin: 300, caliperMm: 0.5, fluteType: 'E', glueFlapToleranceMm: 1.5 },
        dieline: { schemaVersion: 1, panels: {}, out: 'snapshot' },
      },
      canvas: { width: 460, height: 152 },
      // px x=-9 -> -3mm on left (exact bleed), width 360px -> 120mm on the
      // right edge, so the RIGHT edge sticks out 2mm (>= 60% of 3mm) and is
      // auto-fixable while the other three edges are clean.
      layers: [
        { id: 'l-photo', type: 'image', name: 'Photo', faceId: 'front', position: { x: -9, y: -9 }, width: 360, height: 135, scale: { x: 1, y: 1 } },
      ],
      product: { id: 'prod-mailer-box', slug: 'custom-mailer-box', name: 'Mailer Box', type: 'box' },
    };
  }

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/cmyk300.jpg') {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        // CMYK 4-component JPEG, quality 90, density injected to 300dpi.
        sharp({ create: { width: 320, height: 200, channels: 3, background: { r: 200, g: 40, b: 120 } } })
          .toColourspace('cmyk')
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer()
          .then((b) => res.end(injectJfifDensity(b, 300)));
        return;
      }
      if (req.url === '/preview-rgb.jpg') {
        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
        sharp({ create: { width: 200, height: 120, channels: 3, background: { r: 20, g: 180, b: 90 } } })
          .jpeg({ quality: 95, mozjpeg: true })
          .toBuffer()
          .then((b) => res.end(b));
        return;
      }
      if (req.url === '/corrupt.png') {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(rgba.subarray(0, 8)); // truncated
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`;
  });

  afterAll(async () => {
    server.close();
    await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  });

  async function seedOrder(session: string, files: { fileType: string; fileName: string; path: string; mimeType: string }[]) {
    const { id: userId } = await prisma.user.create({
      data: { email: `m8i-${session}@test.local`, passwordHash: 'x', role: 'CUSTOMER' },
    });
    userIds.push(userId);
    const { id: customerId } = await prisma.customer.create({ data: { userId } });
    const order = await prisma.order.create({
      data: {
        customerId,
        orderNumber: `M8I-${session}`,
        subtotal: '10.00',
        tax: '0.00',
        shippingCost: '0.00',
        total: '10.00',
        shippingAddress: { line1: '1 Test St' },
        shippingName: 'Tester',
        shippingPhone: '555',
      },
    });
    orderIds.push(order.id);
    const design = await prisma.design.create({
      data: {
        orderId: order.id,
        sessionId: `m8i-${session}-session`,
        name: `M8-I ${session}`,
        designData: manifestEnvelope() as any,
      },
    });
    for (const f of files) {
      await prisma.designFile.create({
        data: { designId: design.id, fileType: f.fileType, fileName: f.fileName, fileUrl: `${baseUrl}${f.path}`, mimeType: f.mimeType },
      });
    }
    return { designId: design.id, orderId: order.id };
  }

  it('A/B/C — clean CMYK master + preview demotion: upsert, autofix, determinism', async () => {
    const { designId, orderId } = await seedOrder('clean', [
      { fileType: 'print_file', fileName: 'master-cmyk.jpg', path: '/cmyk300.jpg', mimeType: 'image/jpeg' },
      { fileType: 'preview', fileName: 'preview-rgb.jpg', path: '/preview-rgb.jpg', mimeType: 'image/jpeg' },
    ]);

    const first = await prePressCheckService.checkOrderDesign(orderId);

    expect(first.resolutionOk).toBe(true);
    expect(first.colorModeOk).toBe(true); // CMYK master
    expect(first.bleedMarginsOk).toBe(true); // right edge is fixable warning, not error
    expect(first.safeZoneOk).toBe(false); // full-bleed layer crosses the safe line
    expect(first.compressionOk).toBe(true);
    expect(first.passed).toBe(true); // warnings only — preview RGB demoted, sub-bleed autofixable

    expect(first.fixedAutomatically).toHaveLength(1);
    expect(first.fixedAutomatically[0]).toMatchObject({
      type: 'bleed',
      action: 'extend_to_bleed',
      elementId: 'l-photo',
      faceId: 'front',
    });
    // No error-severity issues anywhere (B: no source mutation, C: preview demotion).
    expect(first.issues.some((i) => i.severity === 'error')).toBe(false);
    const previewColor = first.issues.find((i) => i.type === 'color_mode' && i.message.includes('preview-rgb.jpg'));
    expect(previewColor?.severity).toBe('warning');
    const masterColor = first.issues.find((i) => i.type === 'color_mode' && i.message.includes('master-cmyk.jpg'));
    expect(masterColor).toBeUndefined(); // info omitted from issues

    // A: raw SQL read-back proves the prepress_checks row is persisted.
    const stored = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT "resolutionOk", "bleedMarginsOk", "passed", "issues", "fixedAutomatically"
       FROM prepress_checks WHERE "designId" = $1`,
      designId
    );
    expect(stored).toHaveLength(1);
    expect(stored[0].bleedMarginsOk).toBe(true);
    expect(stored[0].passed).toBe(true);
    const fixes = stored[0].fixedAutomatically as Array<{ action: string }>;
    expect(fixes[0].action).toBe('extend_to_bleed');

    // C: idempotent re-check — identical issues, checkedAt refreshed.
    const second = await prePressCheckService.checkOrderDesign(orderId);
    expect(second.issues).toEqual(first.issues);
    expect(second.fixedAutomatically).toEqual(first.fixedAutomatically);
  });

  it('A — corrupt print master records an error verdict and fails the gate', async () => {
    const { orderId } = await seedOrder('corrupt', [
      { fileType: 'print_file', fileName: 'master-broken.png', path: '/corrupt.png', mimeType: 'image/png' },
    ]);

    const result = await prePressCheckService.checkOrderDesign(orderId);

    expect(result.issues.some((i) => i.type === 'corruption' && i.severity === 'error')).toBe(true);
    expect(result.passed).toBe(false);
    // Corrupt raster cannot be measured -> resolution/color/compression are
    // UNVERIFIABLE warnings, never a fake PASS.
    const unverifiable = result.issues.filter((i) => i.message.includes('UNVERIFIABLE'));
    expect(unverifiable.length).toBeGreaterThan(0);
  });
});