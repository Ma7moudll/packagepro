// M8-I — Unit suite: authoritative prepress pipeline, pure and database-free.
//
//   A  geometry-mirror: bleed/safe/overlap + auto-fix + zero-area skip, on
//      mm bounds and px layers (mirror parity with m8-f-print-validation).
//   B  file-kind: magic-byte detection + declared-MIME fallback.
//   C  quality: JPEG quant-table quality estimate + PNG/serde UNVERIFIABLE.
//   D  color: marker-level detection (SOF components, Adobe transform, PNG
//      IHDR) — never trusted to sharp.
//   E  fonts: PDF object scan (embedded vs base-14) + SVG text-node rule.
//   F  assessFileQuality: full buffer→verdict matrix incl. severity demotion
//      for preview copies and deterministic UNVERIFIABLE handling.
//
// Mirror semantics are asserted against the exact fixture math of
// frontend/tests/m8-f-print-validation.test.ts (F42 mailer, PX_PER_MM = 3).

import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { PDFDocument, StandardFonts } from 'pdf-lib';

import {
  layerBoundsMm,
  checkElementExtendsBeyondBleed,
  checkElementWithinSafeArea,
  checkForOverlaps,
  analyzeGeometry,
  BLEED_MM,
  SAFE_MM,
  PX_PER_MM,
} from './geometry-mirror';
import { detectFileKind } from './validators/file-kind';
import {
  parseJpegTables,
  inferJpegQuality,
  checkCompression,
  MIN_PRINT_QUALITY,
} from './validators/quality.validator';
import { detectColorMode, checkColorMode } from './validators/color.validator';
import { checkFonts, scanPdfFonts } from './validators/font.validator';
import { assessFileQuality } from './prepress.service';

// ---- Fixture factory (deterministic buffers, no network / no DB) ----

/**
 * Inject a JFIF APP0 segment (units = dots/inch) right after the SOI so the
 * density survives a CMYK pipeline — sharp drops density on colourspace
 * conversion and flattens CMYK→sRGB the moment withMetadata is used.
 */
function injectJfifDensity(buf: Buffer, density: number): Buffer {
  const dpi = Math.min(65535, Math.max(1, Math.round(density)));
  const app0 = Buffer.from([
    0xff, 0xe0, 0x00, 0x10,
    0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
    0x01, 0x01, // version 1.1
    0x01, // units: dots per inch
    (dpi >> 8) & 0xff, dpi & 0xff,
    (dpi >> 8) & 0xff, dpi & 0xff,
    0x00, 0x00, // no thumbnail
  ]);
  if (!buf.subarray(0, 2).equals(Buffer.from([0xff, 0xd8]))) return buf;
  return Buffer.concat([buf.subarray(0, 2), app0, buf.subarray(2)]);
}

async function makeJpeg(
  opts: { quality?: number; density?: number; cmyk?: boolean } = {}
): Promise<Buffer> {
  const { quality = 90, density = 300, cmyk = false } = opts;
  const pipe = sharp({
    create: {
      width: 320,
      height: 200,
      channels: 3,
      background: { r: 200, g: 40, b: 120 },
    },
  });
  if (cmyk) {
    const cmykBuf = await pipe.toColourspace('cmyk').jpeg({ quality, mozjpeg: true }).toBuffer();
    return injectJfifDensity(cmykBuf, density);
  }
  // withMetadata must precede the format stage — a post-jpeg re-encode drops
  // CMYK to sRGB (the exact sharp trap the marker-level validator defeats).
  return pipe
    .withMetadata({ density })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
}

async function makePng(density = 300): Promise<Buffer> {
  return sharp({
    create: { width: 320, height: 200, channels: 3, background: { r: 10, g: 200, b: 30 } },
  })
    .png()
    .withMetadata({ density })
    .toBuffer();
}

async function makePdfWithFont(
  text: string,
  opts: { withFont?: boolean; fontSize?: number; pageCount?: number } = {}
): Promise<Buffer> {
  const { withFont = true, fontSize = 12, pageCount = 1 } = opts;
  const doc = await PDFDocument.create();
  const fontObj = withFont ? await doc.embedFont(StandardFonts.Helvetica) : null;
  // A real print PDF usually carries an image; embed a small RGB PNG so the
  // page Resources declare an explicit DeviceRGB color space.
  const rgba = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVR42mP8z8Dwn4GBgYGJgYGBEYhJoYdAiqE4EwQACwADKAA7LKvJAAAAAElFTkSuQmCC',
    'base64'
  );
  const png = await doc.embedPng(rgba);
  for (let i = 0; i < pageCount; i++) {
    const page = doc.addPage([320, 200]);
    if (fontObj) {
      page.drawText(text, { x: 20, y: 140, size: fontSize, font: fontObj });
    }
    page.drawImage(png, { x: 20, y: 60, width: 40, height: 40 });
  }
  return Buffer.from(await doc.save());
}

async function makeSvg(text?: string): Promise<Buffer> {
  const body = text
    ? `<text x="10" y="20" ${text}>Hello</text>`
    : '<path d="M0 0 L100 0 L100 50 Z"/>';
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="115" height="38">${body}</svg>`);
}

function layer(
  faceId: string,
  opts: { xMm?: number; yMm?: number; wMm?: number; hMm?: number; id?: string } = {}
) {
  const { xMm = 0, yMm = 0, wMm = 20, hMm = 10, id = 'l' } = opts;
  return {
    id,
    faceId,
    position: { x: xMm * PX_PER_MM, y: yMm * PX_PER_MM },
    width: wMm * PX_PER_MM,
    height: hMm * PX_PER_MM,
    scale: { x: 1, y: 1 },
  };
}

const NO_FACES = {
  front: { w: 115, h: 38 },
};

// ---- A. geometry mirror ----

describe('geometry-mirror — M8-F parity', () => {
  it('A: bleed — edge 2.5mm inside fails, 3.5mm beyond passes (mirror math)', () => {
    const inside = { left: 92.5, top: 10, right: 112.5, bottom: 28 };
    expect(checkElementExtendsBeyondBleed(inside, 115, 38)).toBe(false);
    const beyond = { left: 98.5, top: 10, right: 118.5, bottom: 28 };
    expect(checkElementExtendsBeyondBleed(beyond, 115, 38)).toBe(true);
  });

  it('A: px layers map to mm via PX_PER_MM (same fixture as the FE)', () => {
    const pxLayer = layer('front', { xMm: 30, yMm: 10, wMm: 10, hMm: 10 });
    const bounds = layerBoundsMm(pxLayer);
    expect(bounds).toEqual({ left: 30, top: 10, right: 40, bottom: 20 });
  });

  it('B: safe — crossing the 5mm line fails, 5.5mm passes (mirror math)', () => {
    const onLine = { left: 95, top: 13, right: 110, bottom: 25 };
    expect(checkElementWithinSafeArea(onLine, 115, 38)).toBe(false);
    const inside = { left: 95, top: 13, right: 109.5, bottom: 25 };
    expect(checkElementWithinSafeArea(inside, 115, 38)).toBe(true);
  });

  it('C: overlap — intersecting boxes fail, separated and touching pass', () => {
    const a = { left: 45, top: 14, right: 55, bottom: 24 };
    const b = { left: 48, top: 14, right: 58, bottom: 24 };
    expect(checkForOverlaps([a, b])).toBe(true);
    const separated = { left: 56, top: 14, right: 66, bottom: 24 };
    expect(checkForOverlaps([a, separated])).toBe(false);
    const touching = { left: 55, top: 14, right: 65, bottom: 24 };
    expect(checkForOverlaps([a, touching])).toBe(false);
  });

  it('analyzeGeometry: sub-bleed error, auto-fixable warning, stacked full-bleed error', () => {
    const faces = { front: { w: 115, h: 38 }, back: { w: 115, h: 38 } };
    // Full-bleed layer extended only 1mm → error (below 0.6×3 = 1.8mm band).
    const t1 = layer('front', { xMm: -1, yMm: 0, wMm: 115, hMm: 38, id: 't1' });
    // Extended 4mm on L/R/B but only 2.5mm on top → warning + auto-fix.
    const PX = PX_PER_MM;
    const t2 = {
      id: 't2',
      faceId: 'front',
      position: { x: -4 * PX, y: -2.5 * PX },
      width: 123 * PX,
      height: 45 * PX,
      scale: { x: 1, y: 1 },
    };
    const stacked1 = { ...layer('back', { id: 's1' }), position: { x: 0, y: 0 }, width: 20 * PX, height: 10 * PX };
    const stacked2 = { ...layer('back', { id: 's2' }), position: { x: 0, y: 0 }, width: 20 * PX, height: 10 * PX };
    const g = analyzeGeometry(faces, [t1, t2, stacked1, stacked2]);
    const bleed = g.issues.filter((i) => i.type === 'bleed');
    expect(bleed.some((i) => i.severity === 'error' && i.elementId === 't1')).toBe(true);
    expect(bleed.some((i) => i.severity === 'warning' && i.elementId === 't2')).toBe(true);
    expect(g.fixedAutomatically.some((a) => a.action === 'extend_to_bleed' && a.elementId === 't2')).toBe(true);
    const overlap = g.issues.filter((i) => i.type === 'overlap');
    expect(overlap.some((i) => i.severity === 'error')).toBe(true);
    expect(g.bleedMarginsOk).toBe(false);
    // Full-bleed layers cross the 5mm safe line → warning present.
    expect(g.issues.some((i) => i.type === 'safe' && i.severity === 'warning')).toBe(true);
    expect(g.safeZoneOk).toBe(false);
  });

  it('zero-area point markers are skipped (no bleed/safe/overlap noise)', () => {
    const point = { id: 'p', faceId: 'front', position: { x: 0, y: 0 }, width: 0, height: 0 };
    const g = analyzeGeometry(NO_FACES, [point]);
    expect(g.issues).toEqual([]);
    expect(g.fixedAutomatically).toEqual([]);
  });

  it('inside_* layers resolve through their outer sibling', () => {
    const layers = [layer('inside_front', { xMm: -4, yMm: 0, wMm: 115, hMm: 38, id: 'in' })];
    const g = analyzeGeometry(NO_FACES, layers);
    const bleed = g.issues.filter((i) => i.type === 'bleed');
    expect(bleed.length).toBe(1);
    expect(bleed[0].faceId).toBe('front');
  });

  it('unknown faceId produces a warning, not a crash', () => {
    const g = analyzeGeometry(NO_FACES, [layer('nope', { id: 'x' })]);
    expect(g.issues.some((i) => i.type === 'geometry' && i.severity === 'warning')).toBe(true);
  });
});

// ---- B. file-kind ----

describe('file-kind — magic-byte detection', () => {
  it('detects jpeg/png/pdf/svg/postscript from bytes (ignores wrong extensions)', async () => {
    expect(detectFileKind(await makeJpeg()).kind).toBe('jpeg');
    expect(detectFileKind(await makePng()).kind).toBe('png');
    expect(detectFileKind(await makePdfWithFont('x')).kind).toBe('pdf');
    expect(detectFileKind(await makeSvg()).kind).toBe('svg');
    expect(detectFileKind(Buffer.from('%!PS-Adobe-3.0\n%%Pages: 1')).kind).toBe('postscript');
    expect(detectFileKind(Buffer.from('GIF89a')).kind).toBe('unknown');
  });

  it('falls back to an allow-listed declared MIME only when magic bytes are absent', () => {
    expect(detectFileKind(Buffer.from('nonsense'), 'image/jpeg').kind).toBe('jpeg');
    expect(detectFileKind(Buffer.from('nonsense'), 'application/pdf').kind).toBe('pdf');
    // Outside the allow-list.
    expect(detectFileKind(Buffer.from('nonsense'), 'application/x-tar').kind).toBe('unknown');
  });
});

// ---- C. quality (compression) ----

describe('quality.validator — JPEG quant-table estimate', () => {
  it('parseJpegTables extracts luminance DQT, SOF components and Adobe transform', async () => {
    const rgbJpg = await makeJpeg({ quality: 90 });
    const tables = parseJpegTables(rgbJpg);
    expect(tables.luminanceTable).toHaveLength(64);
    expect(tables.componentCount).toBe(3);
    expect(tables.width).toBe(320);
    expect(tables.height).toBe(200);
    expect(tables.adobeApp14Transform).toBeNull();

    const cmykJpg = await makeJpeg({ quality: 90, cmyk: true });
    expect(parseJpegTables(cmykJpg).componentCount).toBe(4);
  });

  it('inferJpegQuality reproduces the calibrated sharp/mozjpeg mapping', async () => {
    // Calibrated against sharp (mozjpeg) — see M8-I note.
    const expectations: Array<[number, number]> = [
      [95, 93],
      [92, 88],
      [90, 85],
      [85, 77],
      [80, 69],
      [55, 44],
    ];
    for (const [q, expected] of expectations) {
      const buf = await makeJpeg({ quality: q });
      const quality = inferJpegQuality(parseJpegTables(buf).luminanceTable!);
      expect(Math.abs(quality - expected)).toBeLessThanOrEqual(2);
    }
  });

  it('checkCompression: high quality passes, sub-80 warns, PNG lossless, vector unverifiable', async () => {
    const good = await checkCompression(await makeJpeg({ quality: 95 }));
    expect(good.assessed).toBe(true);
    expect(good.valid).toBe(true);

    const low = await checkCompression(await makeJpeg({ quality: 55 }));
    expect(low.assessed).toBe(true);
    expect(low.valid).toBe(false);
    expect(low.quality!).toBeLessThan(MIN_PRINT_QUALITY);

    const png = await checkCompression(await makePng());
    expect(png.valid).toBe(true);
    expect(png.assessed).toBe(false);

    const svg = await checkCompression(await makeSvg());
    expect(svg.assessed).toBe(false);
    expect(svg.issues[0]).toContain('UNVERIFIABLE');
  });
});

// ---- D. color ----

describe('color.validator — marker-level detection', () => {
  it('CMYK JPEG (4 components) is detected CMYK even though sharp says srgb', async () => {
    const cmykJpg = await makeJpeg({ cmyk: true });
    expect(await detectColorMode(cmykJpg)).toBe('CMYK');
    expect(await checkColorMode(cmykJpg, 'CMYK')).toMatchObject({ valid: true, colorMode: 'CMYK' });
  });

  it('RGB JPEG is rejected for a CMYK print requirement', async () => {
    const rgbJpg = await makeJpeg();
    const res = await checkColorMode(rgbJpg, 'CMYK');
    expect(res.colorMode).toBe('RGB');
    expect(res.valid).toBe(false);
    expect(res.issues[0]).toContain('CMYK');
  });

  it('Grayscale PNG passes a CMYK requirement (print-safe colorant)', async () => {
    const gray = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 128, g: 128, b: 128 } },
    })
      .toColourspace('b-w')
      .png()
      .toBuffer();
    expect(await detectColorMode(gray)).toBe('Grayscale');
    expect((await checkColorMode(gray, 'CMYK')).valid).toBe(true);
  });

  it('PDF from pdf-lib with an embedded RGB image resolves to RGB; corrupt PDF is UNVERIFIABLE', async () => {
    const buf = await makePdfWithFont('Order');
    expect(await detectColorMode(buf)).toBe('RGB');
    // Corrupt: truncated header.
    expect(await detectColorMode(Buffer.from('%PDF-1.7\n%trunc'))).toBe('unknown');
  });
});

// ---- E. fonts ----

describe('font.validator — embedding scan', () => {
  it('pdf-lib Helvetica (embedded) scans as embedded, base-named FontFile stream', async () => {
    const buf = await makePdfWithFont('Hello');
    const pdf = await PDFDocument.load(buf);
    const scan = scanPdfFonts(pdf);
    expect(scan.fontsFound).toBeGreaterThanOrEqual(1);
    expect(scan.unembedded).toEqual([]);
    const res = await checkFonts(buf);
    expect(res.valid).toBe(true);
  });

  it('SVG with text but no font-family is unembedded; path-only SVG passes', async () => {
    const withTextNoFamily = await makeSvg('fill="black"');
    expect((await checkFonts(withTextNoFamily)).valid).toBe(false);
    const vectorOnly = await makeSvg();
    expect((await checkFonts(vectorOnly)).valid).toBe(true);
  });

  it('raster files are UNVERIFIABLE (never asserted)', async () => {
    const res = await checkFonts(await makeJpeg());
    expect(res.assessed).toBe(false);
    expect(res.valid).toBe(true);
  });
});

// ---- F. assessFileQuality — full verdict martix ----

describe('assessFileQuality — authoritative verdicts', () => {
  it('300dpi CMYK JPEG at q95: resolution/color/corruption/compression all OK', async () => {
    const verdict = await assessFileQuality(await makeJpeg({ quality: 95, density: 300, cmyk: true }), 'art.jpg');
    expect(verdict.kind).toBe('jpeg');
    expect(verdict.resolution).toMatchObject({ ok: true, dpi: 300 });
    expect(verdict.color.mode).toBe('CMYK');
    expect(verdict.corruption).toMatchObject({ ok: true, severity: 'info' });
    expect(verdict.compression).toMatchObject({ ok: true, severity: 'info' });
    expect(verdict.issues.some((i) => i.severity === 'error')).toBe(false);
  });

  it('72dpi print master FAILS resolution (error)', async () => {
    const verdict = await assessFileQuality(await makeJpeg({ density: 72 }), 'art.jpg');
    expect(verdict.resolution.ok).toBe(false);
    expect(verdict.resolution.severity).toBe('error');
    expect(verdict.issues.some((i) => i.type === 'resolution' && i.severity === 'error')).toBe(true);
  });

  it('RGB print master is REJECTED via color_mode error (CMYK required)', async () => {
    const verdict = await assessFileQuality(await makeJpeg(), 'art.jpg');
    expect(verdict.color.ok).toBe(false);
    expect(verdict.color.mode).toBe('RGB');
    expect(verdict.issues.some((i) => i.type === 'color_mode' && i.severity === 'error')).toBe(true);
  });

  it('CMYK print master passes color even when sharp reports differently', async () => {
    const verdict = await assessFileQuality(await makeJpeg({ cmyk: true }), 'art-cmyk.jpg');
    expect(verdict.color.mode).toBe('CMYK');
    expect(verdict.color.ok).toBe(true);
  });

  it('sub-80 compression print master yields a compression warning, not an error', async () => {
    const verdict = await assessFileQuality(await makeJpeg({ quality: 55 }), 'art.jpg');
    expect(verdict.compression.quality).toBeLessThan(MIN_PRINT_QUALITY);
    expect(verdict.compression.severity).toBe('warning');
    expect(verdict.issues.some((i) => i.type === 'compression' && i.severity === 'warning')).toBe(true);
  });

  it('corrupt/truncated raster: UNVERIFIABLE warnings, never a fake PASS', async () => {
    const good = await makeJpeg();
    const corrupt = good.subarray(0, 48); // header only, no scan data
    const verdict = await assessFileQuality(corrupt, 'art.jpg');
    expect(verdict.issues.some((i) => i.type === 'resolution' && i.severity !== 'info')).toBe(true);
    expect(verdict.issues.some((i) => i.type === 'compression' && i.severity === 'warning')).toBe(true);
  });

  it('PDF artwork is UNVERIFIABLE for DPI (warning) and scanned for fonts', async () => {
    const verdict = await assessFileQuality(await makePdfWithFont('Order #123'), 'print.pdf');
    expect(verdict.resolution.ok).toBe(true);
    expect(verdict.resolution.severity).toBe('warning'); // UNVERIFIABLE
    expect(verdict.corruption.ok).toBe(true);
    expect(verdict, 'fonts assessed as gated').toBeTruthy();
    expect(verdict.issues.some((i) => i.type === 'fonts')).toBe(false); // embedded → info
  });

  it('preview copies demote errors to warnings (display is not the print master)', async () => {
    const verdict = await assessFileQuality(await makeJpeg({ density: 72 }), 'preview.jpg', {
      fileType: 'preview',
    });
    expect(verdict.resolution.severity).toBe('warning');
    expect(verdict.issues.filter((i) => i.severity === 'error')).toEqual([]);
  });

  it('deterministic: identical bytes → identical verdict', async () => {
    const buf = await makeJpeg({ quality: 90, density: 300 });
    const a = await assessFileQuality(buf, 'same.jpg');
    const b = await assessFileQuality(buf, 'same.jpg');
    expect(a).toEqual(b);
  });
});