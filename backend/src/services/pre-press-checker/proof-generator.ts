// M8-I — Soft proof generator (Reuse). Replaces the pdfkit placeholder with a
// real multi-section soft-proof PDF:
//
//   1. COVER — order metadata, item summary, legal/approval text.
//   2. PER-FACE PLATES — one A4 page per persisted manifest face: trim rect,
//      crop marks, bleed + safe-zone guides, dieline path overlay (from
//      DielineGeometry paths, not panel rectangles — AMENDMENT 2), and a
//      CMYK color/registration bar strip. Watermarked PROOF.
//   3. FLAT ARTWORK — the real print pages: PDF sources have every page
//      copied in; raster sources are embedded trimmed on a page; vector
//      sources get an honest label (never claimed print-perfect).
//
// The endpoint contract (ProofResult / upload / DesignFile record / approval
// token) is unchanged.

import {issueApprovalToken, verifyApprovalToken} from './approval-tokens';
import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { fileUploadService } from '../file-upload/upload.service';
import axios from 'axios';
import {
  PDFDocument,
  StandardFonts,
  PDFFont,
  PDFPage,
  RGB,
  rgb,
} from 'pdf-lib';
import sharp from 'sharp';
import { detectFileKind } from './validators/file-kind';

export interface ProofResult {
  proofUrl: string;
  mockupUrl?: string;
  approvalToken: string;
}

export interface ProofFace {
  w: number;
  h: number;
}

export interface ProofManifestInput {
  faces?: Record<string, ProofFace>;
  prepress?: { bleedMm?: number; safeMm?: number; dpiMin?: number };
  dieline?: unknown;
}

const A4_W = 595.28;
const A4_H = 841.89;
const MM_TO_PT = 72 / 25.4;
const DEFAULT_BLEED_MM = 3;
const DEFAULT_SAFE_MM = 5;

interface DielinePathLike {
  id?: string;
  faceId?: string;
  class?: 'cut' | 'fold' | 'score' | 'glue' | 'perf' | string;
  points?: Array<{ x: number; y: number }>;
}

function readManifest(designData: unknown): ProofManifestInput {
  const d = (designData ?? {}) as any;
  const manifest = d?.manifest ?? {};
  return {
    faces: manifest?.faces ?? {},
    prepress: manifest?.prepress ?? undefined,
    dieline: manifest?.dieline ?? undefined,
  };
}

function mmToPt(v: number): number {
  return v * MM_TO_PT;
}

/** Deterministic, pure proof assembly — unit-testable without a database. */
export async function composeProofPdf(
  sourceBuffer: Buffer,
  meta: {
    orderNumber: string;
    items?: Array<{ description?: string; quantity?: number }>;
    manifest?: ProofManifestInput;
  }
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { kind } = detectFileKind(sourceBuffer);
  const manifest = meta.manifest ?? readManifest(undefined);
  const faces = manifest.faces ?? {};
  const bleedMm = manifest.prepress?.bleedMm ?? DEFAULT_BLEED_MM;
  const safeMm = manifest.prepress?.safeMm ?? DEFAULT_SAFE_MM;
  const sortedFaceIds = Object.keys(faces).sort();
  const dieline = manifest.dieline as { cutPaths?: DielinePathLike[]; foldPaths?: DielinePathLike[]; gluePaths?: DielinePathLike[] } | undefined;

  // 1 — Cover page.
  addCoverPage(pdfDoc, font, fontBold, meta.orderNumber, meta.items ?? []);

  // 2 — Per-face plates.
  for (const faceId of sortedFaceIds) {
    const dim = faces[faceId];
    const trimW = Number(dim?.w) || 0;
    const trimH = Number(dim?.h) || 0;
    addFacePlatePage(pdfDoc, font, meta.orderNumber, faceId, trimW, trimH, bleedMm, safeMm, dieline, sourceBuffer, kind, sortedFaceIds.length);
  }

  // 3 — Flat artwork (real pixels) section.
  await addArtworkSection(pdfDoc, font, sourceBuffer, kind, sortedFaceIds.length);

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

function addCoverPage(
  pdfDoc: PDFDocument,
  font: PDFFont,
  fontBold: PDFFont,
  orderNumber: string,
  items: Array<{ description?: string; quantity?: number }>
): void {
  const page = pdfDoc.addPage([A4_W, A4_H]);
  page.drawText('SOFT PROOF — APPROVAL REQUIRED', {
    x: 60,
    y: A4_H - 90,
    size: 20,
    font: fontBold,
  });
  page.drawText(`Order Number: ${orderNumber}`, {
    x: 60,
    y: A4_H - 120,
    size: 12,
    font,
  });

  const itemLines = items.map((i, n) => `${n + 1}. ${i.description ?? 'Item'}${i.quantity ? ` × ${i.quantity}` : ''}`);
  page.drawText(itemLines.join('\n') || 'No items on this order.', {
    x: 60,
    y: A4_H - 180,
    size: 10,
    font,
    lineHeight: 16,
  });

  page.drawText(
    [
      'By approving this proof, you confirm that:',
      '1. All colors, text, and images are correct',
      '2. Dimensions and specifications match your requirements',
      '3. You accept responsibility for any errors after approval',
      '4. You understand that changes after approval may incur additional charges',
    ].join('\n'),
    { x: 60, y: 220, size: 10, font, lineHeight: 16 }
  );
  page.drawText('Proof scale on screen; always verify critical dimensions against the A4 plates.', {
    x: 60,
    y: 140,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });
  addWatermark(page, font);
}

function addWatermark(page: PDFPage, font: PDFFont, scale = 1): void {
  page.drawText('PROOF', {
    x: A4_W / 2 - 70 * scale,
    y: A4_H / 2 - 24 * scale,
    size: 48 * scale,
    font,
    color: rgb(0.5, 0.5, 0.5),
    opacity: 0.12,
  });
}

const BLOCK_BLACK = rgb(0, 0, 0);

function drawColorBars(page: PDFPage, x0: number, y0: number): void {
  const stack: Array<{ color: [number, number, number]; label: string }> = [
    { color: [0, 1, 1], label: 'C' },
    { color: [1, 0, 1], label: 'M' },
    { color: [1, 1, 0], label: 'Y' },
    { color: [0, 0, 0], label: 'K' },
    { color: [0, 1, 1], label: 'CM' },
    { color: [1, 0, 1], label: 'MY' },
    { color: [1, 1, 0], label: 'CY' },
    { color: [1, 1, 1], label: 'CMY' },
  ];
  const bw = 24;
  const bh = 34;
  const gap = 6;
  stack.forEach((b, i) => {
    const x = x0 + i * (bw + gap);
    page.drawRectangle({
      x,
      y: y0,
      width: bw,
      height: bh,
      color: rgb(b.color[0], b.color[1], b.color[2]),
      borderColor: rgb(0.25, 0.25, 0.25),
      borderWidth: 0.5,
    });
  });
  // Grayscale wedge 0..100 in 10 steps.
  for (let step = 0; step <= 10; step++) {
    const g = step / 10;
    const x = x0 + stack.length * (bw + gap) + step * (bw - 4);
    page.drawRectangle({
      x,
      y: y0,
      width: bw - 4,
      height: bh,
      color: rgb(g, g, g),
      borderColor: rgb(0.25, 0.25, 0.25),
      borderWidth: 0.5,
    });
  }
  // Registration mark: crosshair inside a circle at the strip left.
  const rx = x0 - 18;
  const ry = y0 + bh / 2;
  page.drawCircle({ x: rx, y: ry, size: 7, borderColor: BLOCK_BLACK, borderWidth: 0.6 });
  page.drawLine({ start: { x: rx, y: ry - 11 }, end: { x: rx, y: ry + 11 }, thickness: 0.6, color: BLOCK_BLACK });
  page.drawLine({ start: { x: rx - 11, y: ry }, end: { x: rx + 11, y: ry }, thickness: 0.6, color: BLOCK_BLACK });
}

function addCropMarks(page: PDFPage, x: number, y: number, w: number, h: number, bleedPt: number): void {
  const ext = Math.max(6, bleedPt);
  const stroke = { thickness: 0.8, color: BLOCK_BLACK };
  const corners: Array<[number, number, 1 | -1, 1 | -1]> = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [cx, cy, dx, dy] of corners) {
    page.drawLine({ start: { x: cx + dx * ext, y: cy }, end: { x: cx + dx * 3, y: cy }, ...stroke });
    page.drawLine({ start: { x: cx, y: cy + dy * ext }, end: { x: cx, y: cy + dy * 3 }, ...stroke });
  }
}

function pathColor(path: DielinePathLike): { color: RGB; dashArray?: number[]; thickness: number } {
  switch (path.class) {
    case 'cut':
      return { color: BLOCK_BLACK, thickness: 1 };
    case 'fold':
      return { color: rgb(0.4, 0.4, 0.4), dashArray: [4, 3], thickness: 0.7 };
    case 'score':
      return { color: rgb(0.55, 0.55, 0.55), dashArray: [2, 2], thickness: 0.6 };
    case 'glue':
      return { color: rgb(1, 0, 1), dashArray: [4, 2], thickness: 0.7 };
    case 'perf':
      return { color: BLOCK_BLACK, dashArray: [1, 3], thickness: 0.6 };
    default:
      return { color: rgb(0.15, 0.15, 0.15), thickness: 0.6 };
  }
}

function addDielineOverlay(
  page: PDFPage,
  offsetX: number,
  offsetY: number,
  scale: number,
  faceId: string,
  paths: DielinePathLike[] | undefined
): void {
  if (!paths || paths.length === 0) return;
  const ptPerMm = MM_TO_PT * scale;
  for (const path of paths) {
    const pts = path.points ?? [];
    if (pts.length < 2) continue;
    const scope = path.faceId;
    if (scope && scope !== faceId) continue;
    const style = pathColor(path);
    for (let i = 1; i < pts.length; i++) {
      page.drawLine({
        start: {
          x: offsetX + ptPerMm * (Number(pts[i - 1].x) || 0),
          y: offsetY + ptPerMm * (Number(pts[i - 1].y) || 0),
        },
        end: {
          x: offsetX + ptPerMm * (Number(pts[i].x) || 0),
          y: offsetY + ptPerMm * (Number(pts[i].y) || 0),
        },
        thickness: style.thickness,
        color: style.color,
        dashArray: style.dashArray,
      });
    }
  }
}

function addFacePlatePage(
  pdfDoc: PDFDocument,
  font: PDFFont,
  orderNumber: string,
  faceId: string,
  trimW: number,
  trimH: number,
  bleedMm: number,
  safeMm: number,
  dieline: { cutPaths?: DielinePathLike[]; foldPaths?: DielinePathLike[]; gluePaths?: DielinePathLike[] } | undefined,
  sourceBuffer: Buffer,
  kind: string,
  faceCount: number
): void {
  const page = pdfDoc.addPage([A4_W, A4_H]);
  page.drawText('SOFT PROOF — APPROVAL REQUIRED', {
    x: 60,
    y: A4_H - 60,
    size: 13,
    font,
  });
  const dimsLabel =
    trimW > 0 && trimH > 0
      ? `${trimW}×${trimH}mm · +${bleedMm}mm bleed / ${safeMm}mm safe`
      : 'face dimensions unknown';
  page.drawText(`Order ${orderNumber} · Face ${faceId} · ${dimsLabel}`, {
    x: 60,
    y: A4_H - 82,
    size: 9,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  // Face plate area.
  const areaX = 60;
  const areaW = A4_W - 360; // leave the right side for the bar strip
  const areaTop = A4_H - 120;
  const areaBottom = 150;
  const areaH = areaTop - areaBottom;
  const bleedPt = mmToPt(bleedMm);

  let trimWpt = mmToPt(trimW) || 150;
  let trimHpt = mmToPt(trimH) || 150;
  const scale = Math.min(1, areaW / (trimWpt + bleedPt * 2), areaH / (trimHpt + bleedPt * 2));
  trimWpt *= scale;
  trimHpt *= scale;

  const trimX = areaX + (areaW - trimWpt) / 2;
  const trimY = areaBottom + (areaH - trimHpt) / 2;

  // Bleed + safe guides.
  page.drawRectangle({
    x: trimX - bleedPt * scale,
    y: trimY - bleedPt * scale,
    width: trimWpt + bleedPt * 2 * scale,
    height: trimHpt + bleedPt * 2 * scale,
    borderColor: rgb(0.6, 0.6, 0.6),
    borderWidth: 0.6,
    borderDashArray: undefined,
  });
  const safePt = mmToPt(safeMm) * scale;
  if (safePt < Math.min(trimWpt, trimHpt) / 2) {
    page.drawRectangle({
      x: trimX + safePt,
      y: trimY + safePt,
      width: trimWpt - safePt * 2,
      height: trimHpt - safePt * 2,
      borderColor: rgb(0.75, 0.75, 0.75),
      borderWidth: 0.5,
    });
  }
  // Trim rect.
  page.drawRectangle({
    x: trimX,
    y: trimY,
    width: trimWpt,
    height: trimHpt,
    borderColor: BLOCK_BLACK,
    borderWidth: 1,
  });
  addCropMarks(page, trimX, trimY, trimWpt, trimHpt, bleedPt * scale);

  // Dieline path overlay (scaled with the plate).
  const cutPaths = dieline?.cutPaths ?? [];
  const foldPaths = dieline?.foldPaths ?? [];
  const gluePaths = dieline?.gluePaths ?? [];
  if (cutPaths.length || foldPaths.length || gluePaths.length) {
    addDielineOverlay(page, trimX, trimY, scale, faceId, [...cutPaths, ...foldPaths, ...gluePaths]);
  } else if (kind === 'svg' || kind === 'postscript') {
    page.drawText('No persisted dieline paths for this face — vector artwork shown as trim rect.', {
      x: areaX,
      y: areaBottom - 14,
      size: 7,
      font,
      color: rgb(0.5, 0.3, 0.1),
    });
  }

  // Raster artwork embedded where a single-face source corresponds to it.
  if (faceCount === 1 && (kind === 'jpeg' || kind === 'png')) {
    void sourceBuffer; // embedded in the flat-artwork section for fidelity
  }

  // Color / registration bars.
  drawColorBars(page, 60, 70);
  page.drawText('C M Y K', {
    x: 60,
    y: 52,
    size: 6,
    font,
    color: rgb(0.25, 0.25, 0.25),
  });

  addWatermark(page, font, 0.9);
}

async function addArtworkSection(
  pdfDoc: PDFDocument,
  font: PDFFont,
  sourceBuffer: Buffer,
  kind: string,
  faceCount: number
): Promise<void> {
  if (kind === 'pdf') {
    let source: PDFDocument;
    try {
      source = await PDFDocument.load(sourceBuffer, { updateMetadata: false });
    } catch {
      const page = pdfDoc.addPage([A4_W, A4_H]);
      page.drawText('Artwork could not be parsed — verify the print file before approval.', {
        x: 60,
        y: A4_H - 90,
        size: 12,
        font,
      });
      return;
    }
    const copied = await pdfDoc.copyPages(source, source.getPageIndices());
    for (const p of copied) {
      pdfDoc.addPage(p);
      // Stamp each real page.
      const h = p.getHeight();
      p.drawRectangle({ x: 0, y: h - 26, width: 200, height: 26, color: rgb(0.95, 0.95, 0.95) });
      p.drawText('Flat artwork page', { x: 6, y: h - 20, size: 9, font });
    }
    return;
  }

  const page = pdfDoc.addPage([A4_W, A4_H]);

  if (kind === 'jpeg' || kind === 'png') {
    let png: Buffer;
    try {
      png = await sharp(sourceBuffer).flatten({ background: { r: 255, g: 255, b: 255 } }).png().toBuffer();
    } catch {
      page.drawText('Raster artwork could not be embedded — verify the print file.', {
        x: 60,
        y: A4_H - 90,
        size: 12,
        font,
      });
      return;
    }
    const img = await pdfDoc.embedPng(png);
    const availW = A4_W - 120;
    const availH = A4_H - 200;
    const scale = Math.min(availW / img.width, availH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    page.drawImage(img, { x: (A4_W - drawW) / 2, y: (A4_H - drawH) / 2 + 30, width: drawW, height: drawH });
    page.drawText(
      faceCount > 1
        ? 'Flattened raster artwork — per-face plates above are authoritative for geometry'
        : 'Raster artwork embedded at scale',
      { x: 60, y: 70, size: 9, font, color: rgb(0.3, 0.3, 0.3) }
    );
    return;
  }

  page.drawText(
    kind === 'svg' || kind === 'postscript'
      ? 'Vector artwork (SVG/EPS/AI) — geometry cannot be flattened to pixels here; ' +
        'approve only after confirming the per-face plates and dieline.'
      : 'Unrecognised print file — verify the source before approval.',
    { x: 60, y: A4_H - 90, size: 12, font, color: rgb(0.5, 0.3, 0.1) }
  );
}

export class ProofGeneratorService {
  async generateProof(orderId: string): Promise<ProofResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        design: {
          include: {
            files: true,
          },
        },
        items: true,
        customer: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!order || !order.design) {
      throw new NotFoundError('Order or design not found');
    }

    const printFile = order.design.files.find((f) => f.fileType === 'print_file');
    if (!printFile) {
      throw new NotFoundError('Print file not found');
    }

    const response = await axios.get(printFile.fileUrl, {
      responseType: 'arraybuffer',
    });
    const fileBuffer = Buffer.from(response.data);

    const proofBuffer = await composeProofPdf(fileBuffer, {
      orderNumber: order.orderNumber,
      items: order.items.map((it) => ({ description: it.productType, quantity: it.quantity })),
      manifest: readManifest(order.design.designData),
    });

    const proofUpload = await fileUploadService.uploadFile(
      proofBuffer,
      `proof-${order.orderNumber}.pdf`,
      'application/pdf',
      `proofs/${orderId}`
    );

    await prisma.designFile.create({
      data: {
        designId: order.design.id,
        fileType: 'proof',
        fileName: proofUpload.fileName,
        fileUrl: proofUpload.fileUrl,
        fileSize: proofUpload.fileSize,
        mimeType: proofUpload.mimeType,
      },
    });

    const approvalToken = await issueApprovalToken(orderId);

    return {
      proofUrl: proofUpload.fileUrl,
      approvalToken,
    };
  }

  async getProof(orderId: string): Promise<ProofResult | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        design: {
          include: {
            files: {
              where: { fileType: 'proof' },
            },
          },
        },
      },
    });

    if (!order || !order.design || order.design.files.length === 0) {
      return null;
    }

    const proofFile = order.design.files[0];
    const approvalToken = await issueApprovalToken(orderId);

    return {
      proofUrl: proofFile.fileUrl,
      approvalToken,
    };
  }

  async verifyApprovalToken(token: string): Promise<{ orderId: string } | null> {
    return verifyApprovalToken(token);
  }
}

export const proofGeneratorService = new ProofGeneratorService();
