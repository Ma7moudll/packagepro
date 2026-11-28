// M8-I — Backend Prepress (Authoritative). AMENDMENT 4: the backend is the
// production authority for DPI / color / fonts / corruption / compression AND
// geometry against the persisted design manifest + editor layer state.
//
//   A. File checks reuse the existing validators (resolution, color) plus new
//      compressed-quality and font-embedding scans; every verdict is
//      deterministic and self-explaining.
//   B. Bleed/safe/overlap come from `geometry-mirror.ts` (the backend-local
//      mirror of the M8-F algebra) evaluated on the PERSISTED manifest faces
//      and layer state — never on the frontend's display.
//   C. Fixable shortfalls (sub-bleed edges) are recorded in
//      `fixedAutomatically` so the proof can render the correction without
//      ever mutating the source files.
//
// UNVERIFIABLE verdicts are downgraded to warnings: an unknown quantity never
// fakes a PASS and never hard-fails a file we cannot measure.

import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../utils/errors';
import { fileProcessorService } from '../file-processor/processor.service';
import { checkResolution } from './validators/resolution.validator';
import { checkColorMode, DetectedColorMode } from './validators/color.validator';
import { checkCompression } from './validators/quality.validator';
import { checkFonts } from './validators/font.validator';
import { detectFileKind } from './validators/file-kind';
import { analyzeGeometry, AutoFix } from './geometry-mirror';
import { fetchStoredFile, StoredFileFetchError } from '../file-upload/stored-file-fetch';

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface PrePressIssue {
  type: string;
  severity: IssueSeverity;
  message: string;
  elementId?: string;
  faceId?: string;
}

export interface PrePressCheckResult {
  resolutionOk: boolean;
  colorModeOk: boolean;
  bleedMarginsOk: boolean;
  safeZoneOk: boolean;
  fontsEmbedded: boolean;
  compressionOk: boolean;
  passed: boolean;
  issues: PrePressIssue[];
  fixedAutomatically: AutoFix[];
  checkedAt: Date;
}

export class PrePressCheckService {
  async checkOrderDesign(orderId: string): Promise<PrePressCheckResult> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        design: {
          include: {
            files: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order');
    }

    if (!order.design) {
      throw new NotFoundError('Design for this order');
    }

    const issues: PrePressIssue[] = [];
    const designData = (order.design.designData ?? {}) as any;
    const manifest = designData?.manifest ?? {};
    const faces = manifest?.faces;
    const layers = Array.isArray(designData?.layers) ? designData.layers : undefined;
    const prepressCfg = manifest?.prepress;

    // B — manifest geometry (bleed / safe / overlap) + auto-fix plan.
    const geometry = analyzeGeometry(faces, layers, prepressCfg);
    issues.push(...geometry.issues);

    // A — authoritative file checks on the persisted print + preview assets.
    for (const file of order.design.files) {
      if (file.fileType !== 'print_file' && file.fileType !== 'preview') continue;

      let buffer: Buffer;
      try {
        buffer = await fetchStoredFile(file.fileUrl);
      } catch (error) {
        issues.push({
          type: 'file_access',
          severity: 'error',
          message: `Failed to download file ${file.fileName}: ${error instanceof StoredFileFetchError ? error.code : 'DOWNLOAD_FAILED'}`,
        });
        continue;
      }

      const verdict = await assessFileQuality(buffer, file.fileName, {
        fileType: file.fileType,
        declaredMimeType: file.mimeType,
      });
      issues.push(...verdict.issues);
    }

    // Results are authoritative for the design, not the display.
    const resolutionOk = issues.every((i) => i.type !== 'resolution' || i.severity !== 'error');
    const colorModeOk = issues.every((i) => i.type !== 'color_mode' || i.severity !== 'error');
    const bleedMarginsOk = !issues.some((i) => i.type === 'bleed' && i.severity === 'error');
    const safeZoneOk = !issues.some((i) => i.type === 'safe');
    // Fonts and compression are warnings, not blockers — the booleans still
    // report whether the quality gate actually passed (any issue ≠ info).
    const fontsEmbedded = !issues.some((i) => i.type === 'fonts' && i.severity !== 'info');
    const compressionOk = !issues.some((i) => i.type === 'compression' && i.severity !== 'info');
    const passed = issues.every((i) => i.severity !== 'error');

    const checkResult = await prisma.prePressCheck.upsert({
      where: { designId: order.design.id },
      update: {
        resolutionOk,
        colorModeOk,
        bleedMarginsOk,
        safeZoneOk,
        fontsEmbedded,
        passed,
        issues: issues as any,
        fixedAutomatically: geometry.fixedAutomatically as any,
        checkedAt: new Date(),
        checkedBy: 'system',
      },
      create: {
        designId: order.design.id,
        resolutionOk,
        colorModeOk,
        bleedMarginsOk,
        safeZoneOk,
        fontsEmbedded,
        passed,
        issues: issues as any,
        fixedAutomatically: geometry.fixedAutomatically as any,
        checkedAt: new Date(),
        checkedBy: 'system',
      },
    });

    return {
      resolutionOk: checkResult.resolutionOk,
      colorModeOk: checkResult.colorModeOk,
      bleedMarginsOk: checkResult.bleedMarginsOk,
      safeZoneOk: checkResult.safeZoneOk,
      fontsEmbedded: checkResult.fontsEmbedded,
      compressionOk,
      passed: checkResult.passed,
      issues,
      fixedAutomatically: geometry.fixedAutomatically,
      checkedAt: checkResult.checkedAt,
    };
  }

  async getPrePressResults(orderId: string): Promise<PrePressCheckResult | null> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        design: {
          include: {
            prepressCheck: true,
          },
        },
      },
    });

    if (!order || !order.design || !order.design.prepressCheck) {
      return null;
    }

    const check = order.design.prepressCheck;
    const storedIssues = ((check.issues as unknown as PrePressIssue[]) || []) as PrePressIssue[];

    return {
      resolutionOk: check.resolutionOk,
      colorModeOk: check.colorModeOk,
      bleedMarginsOk: check.bleedMarginsOk,
      safeZoneOk: check.safeZoneOk,
      fontsEmbedded: // Persisted column; equal to the warning-inclusive aggregate.
        check.fontsEmbedded,
      compressionOk: !storedIssues.some(
        (i) => i.type === 'compression' && i.severity !== 'info'
      ),
      passed: check.passed,
      issues: storedIssues,
      fixedAutomatically: ((check.fixedAutomatically as unknown as AutoFix[]) || []) as AutoFix[],
      checkedAt: check.checkedAt,
    };
  }
}

export interface FileQualityVerdict {
  kind: ReturnType<typeof detectFileKind>['kind'];
  mimeType: string | null;
  resolution: { ok: boolean; severity: IssueSeverity; dpi: number | null; detail: string };
  color: { ok: boolean; severity: IssueSeverity; mode: DetectedColorMode; detail: string };
  fonts: { ok: boolean; severity: IssueSeverity; detail: string };
  corruption: { ok: boolean; severity: IssueSeverity; detail: string };
  compression: { ok: boolean; severity: IssueSeverity; quality: number | null; detail: string };
  issues: PrePressIssue[];
}

/**
 * Pure file-assessment pipeline — every buffer-to-verdict mapping a unit test
 * can exercise without a database. `fileType` controls severity: `print_file`
 * is authoritative (RGB/DPI/corruption are errors), `preview` assets are
 * informational (warnings) — they are display copies, not the print master.
 */
export async function assessFileQuality(
  buffer: Buffer,
  fileName: string,
  opts?: { fileType?: string; declaredMimeType?: string | null }
): Promise<FileQualityVerdict> {
  const fileType = opts?.fileType ?? 'print_file';
  const declaredMimeType = opts?.declaredMimeType ?? null;
  const { kind, mimeType } = detectFileKind(buffer, declaredMimeType);

  // Resolution: raster (JPEG/PNG) is measured from density metadata; PDF uses
  // its declared density when present (vector content is otherwise immune);
  // SVG/PostScript are UNVERIFIABLE (warning) — they have no raster DPI.
  let resolution: FileQualityVerdict['resolution'];
  try {
    const res = await checkResolution(buffer, 300);
    if (kind === 'pdf' && !res.valid && res.dpi === 72) {
      // A flat 72 from sharp on a PDF is a missing-density default, not a
      // measured raster DPI — treat as UNVERIFIABLE (warning), not a fail.
      resolution = {
        ok: true,
        severity: 'warning',
        dpi: null,
        detail: 'Resolution is UNVERIFIABLE for vector PDF (no raster DPI)',
      };
    } else if (kind === 'svg' || kind === 'postscript') {
      resolution = {
        ok: true,
        severity: 'warning',
        dpi: null,
        detail: 'Resolution is UNVERIFIABLE for vector files',
      };
    } else {
      resolution = {
        ok: res.valid,
        severity: res.valid ? 'info' : fileType === 'print_file' ? 'error' : 'warning',
        dpi: res.dpi,
        detail: res.issues[0] ?? 'Resolution OK',
      };
    }
  } catch {
    resolution = {
      ok: true,
      severity: 'warning',
      dpi: null,
      detail: 'Resolution is UNVERIFIABLE for this file',
    };
  }

  // Color: marker-level detection (CMYK 4-component JPEG / Adobe transform 0,
  // PNG IHDR, PDF color spaces). RGB is REJECTED for the print master.
  const color = await checkColorMode(buffer, 'CMYK', declaredMimeType);
  const colorSeverity: IssueSeverity =
    color.colorMode === 'unknown'
      ? 'warning'
      : color.colorMode === 'CMYK' ||
        color.colorMode === 'Spot' ||
        color.colorMode === 'Grayscale'
        ? 'info'
        : 'error';
  const colorOk = color.valid || color.colorMode === 'unknown';

  // Corruption: PDF parses via pdf-lib; raster parses via sharp metadata.
  let corruption: FileQualityVerdict['corruption'];
  if (kind === 'pdf') {
    const pdf = await fileProcessorService.validatePDF(buffer);
    corruption = {
      ok: pdf.valid,
      severity: pdf.valid ? 'info' : 'error',
      detail: pdf.valid
        ? `PDF parses (${pdf.pageCount} page${pdf.pageCount === 1 ? '' : 's'})`
        : pdf.errors.join('; '),
    };
  } else if (kind === 'jpeg' || kind === 'png') {
    try {
      const meta = await fileProcessorService.getImageMetadata(buffer);
      corruption = {
        ok: !!meta,
        severity: meta ? 'info' : 'error',
        detail: meta ? `Raster parses (${meta.width}×${meta.height})` : 'Raster fails to parse',
      };
    } catch {
      corruption = { ok: false, severity: 'error', detail: 'Raster fails to parse' };
    }
  } else {
    corruption = {
      ok: true,
      severity: 'warning',
      detail: `Corruption is UNVERIFIABLE for ${kind} files`,
    };
  }

  // Compression quality: JPEG measured from its quant tables; PNG is lossless.
  let compression: FileQualityVerdict['compression'];
  try {
    const assessed = await checkCompression(buffer, declaredMimeType);
    const compressionSeverity: IssueSeverity =
      assessed.assessed && assessed.quality !== null && assessed.quality < 80
        ? 'warning'
        : 'info';
    compression = {
      ok: assessed.valid,
      severity: compressionSeverity,
      quality: assessed.quality,
      detail: assessed.issues[0] ?? 'OK',
    };
  } catch {
    // Not enough bytes to assess (truncated file) — UNVERIFIABLE, not a PASS.
    compression = {
      ok: false,
      severity: 'warning',
      quality: null,
      detail: 'Compression quality is UNVERIFIABLE for this file',
    };
  }

  // Fonts: PDF font-descriptor scan; SVG text nodes; raster UNVERIFIABLE.
  let fonts: FileQualityVerdict['fonts'];
  try {
    const assessed = await checkFonts(buffer, declaredMimeType);
    const fontsSeverity: IssueSeverity = assessed.assessed && !assessed.valid ? 'warning' : 'info';
    fonts = {
      ok: assessed.valid,
      severity: fontsSeverity,
      detail: assessed.issues[0] ?? 'OK',
    };
  } catch {
    fonts = {
      ok: false,
      severity: 'warning',
      detail: 'Font embedding is UNVERIFIABLE for this file',
    };
  }

  const issues: PrePressIssue[] = [];

  const addIssue = (type: string, severity: IssueSeverity, detail: string) => {
    if (severity === 'info') return;
    const effective: IssueSeverity = fileType === 'preview' && severity === 'error' ? 'warning' : severity;
    issues.push({ type, severity: effective, message: `${fileName}: ${detail}` });
  };

  addIssue('resolution', resolution.severity, resolution.detail);
  addIssue('color_mode', colorSeverity, color.issues[0] ?? `Color mode ${color.colorMode}`);
  addIssue('corruption', corruption.severity, corruption.detail);
  addIssue('compression', compression.severity, compression.detail);
  addIssue('fonts', fonts.severity, fonts.detail);

  return {
    kind,
    mimeType,
    resolution,
    color: { ok: colorOk, severity: colorSeverity, mode: color.colorMode, detail: color.issues[0] ?? `Color mode ${color.colorMode}` },
    fonts,
    corruption,
    compression,
    issues,
  };
}

export const prePressCheckService = new PrePressCheckService();