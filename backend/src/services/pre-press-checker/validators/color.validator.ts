// M8-I — Color-mode validator.
//
// Sharp reports CMYK JPEGs re-encoded by its pipeline as `srgb`, so sharp's
// reported space is NOT trustworthy for color authority. This validator parses
// the file format itself:
//   - JPEG: SOF component count (1 = grayscale, 3 = YCbCr/RGB, 4 = CMYK) plus
//     the Adobe APP14 DCTEncode transform (0 = CMYK separations).
//   - PNG: IHDR color type (0 grayscale, 2 truecolor, 3 indexed, 6 truecolor
//     + alpha → RGB).
//   - PDF: page resource + image-xobject color spaces; any Separation/DeviceN
//     → Spot, any DeviceCMYK / ICCBased(n=4) → CMYK, else DeviceRGB.
// Unparseable/unresolvable files are UNVERIFIABLE — never a fake PASS.

import { PDFDocument, PDFDict, PDFName, PDFArray, PDFRef, PDFStream } from 'pdf-lib';
import { detectFileKind } from './file-kind';
import { parseJpegTables } from './quality.validator';

export type DetectedColorMode = 'CMYK' | 'RGB' | 'Grayscale' | 'Spot' | 'unknown';

export interface ColorCheckResult {
  valid: boolean;
  colorMode: DetectedColorMode;
  requiredColorMode: 'CMYK' | 'RGB';
  issues: string[];
}

function pngColorType(buffer: Buffer): DetectedColorMode {
  // Signature(8) + length(4) + "IHDR"(4) → bit depth at 24, color type at 25.
  if (buffer.length < 26 || buffer.subarray(12, 16).toString('latin1') !== 'IHDR') {
    return 'unknown';
  }
  const colorType = buffer[25];
  if (colorType === 0 || colorType === 4) return 'Grayscale';
  if (colorType === 2 || colorType === 3 || colorType === 6) return 'RGB';
  return 'unknown';
}

function judgeColorSpace(value: unknown): DetectedColorMode | null {
  if (value instanceof PDFName) {
    const name = value.decodeText();
    if (name === 'DeviceCMYK') return 'CMYK';
    if (name === 'DeviceRGB') return 'RGB';
    if (name === 'DeviceGray' || name === 'DeviceGray1') return 'Grayscale';
    if (name === 'Separation' || name === 'DeviceN' || name === 'Indexed') return 'Spot';
    return null;
  }
  if (value instanceof PDFArray) {
    const first = value.get(0);
    const label = first instanceof PDFName ? first.decodeText() : null;
    if (label === 'ICCBased') {
      const dict = value.get(1) instanceof PDFDict ? (value.get(1) as PDFDict) : null;
      const n = dict?.get(PDFName.of('N'));
      const components = n ? Number(n.toString()) : NaN;
      if (Number.isFinite(components)) return components === 4 ? 'CMYK' : 'RGB';
      return 'RGB';
    }
    if (label === 'Separation' || label === 'DeviceN' || label === 'Indexed') return 'Spot';
    if (label === 'DeviceCMYK') return 'CMYK';
    if (label === 'DeviceRGB') return 'RGB';
    if (label === 'DeviceGray') return 'Grayscale';
  }
  return null;
}

/** Scan every page resource + image XObject color space in a PDF. */
function pdfColorModes(pdf: PDFDocument): { colorSpace: DetectedColorMode | null } {
  const seen = new Set<DetectedColorMode>();
  let colorSpace: DetectedColorMode | null = null;

  const resolve = (value: unknown): unknown =>
    value instanceof PDFRef ? pdf.context.lookup(value) : value;

  const observe = (mode: DetectedColorMode | null) => {
    if (!mode || seen.has(mode)) return;
    seen.add(mode);
    if (mode === 'CMYK' || mode === 'Spot') colorSpace = mode;
    else if (!colorSpace) colorSpace = mode;
  };

  const judge = (value: unknown): DetectedColorMode | null =>
    judgeColorSpace(resolve(value));

  for (const page of pdf.getPages()) {
    const resources = page.node.get(PDFName.of('Resources'));
    if (!(resources instanceof PDFDict)) continue;

    const cs = resources.get(PDFName.of('ColorSpace'));
    if (cs instanceof PDFDict) {
      // /ColorSpace << /Cs1 [ /ICCBased … ] >> subdictionary.
      for (const [, entry] of cs.entries()) {
        observe(judge(entry));
      }
    } else if (cs !== undefined) {
      observe(judge(cs));
    }

    const xobj = resources.get(PDFName.of('XObject'));
    if (!(xobj instanceof PDFDict)) continue;
    for (const [, entry] of xobj.entries()) {
      const obj = resolve(entry);
      // pdf-lib represents image XObjects as PDFStream (raw stream); their
      // dictionary entries (incl. /ColorSpace) live on `obj.dict`.
      const dict = obj instanceof PDFStream && obj.dict instanceof PDFDict ? obj.dict : obj;
      if (!(dict instanceof PDFDict)) continue;
      observe(judge(dict.get(PDFName.of('ColorSpace'))));
    }
  }

  return { colorSpace };
}

export async function detectColorMode(
  buffer: Buffer,
  declaredMimeType?: string | null
): Promise<DetectedColorMode> {
  const { kind } = detectFileKind(buffer, declaredMimeType);

  if (kind === 'jpeg') {
    const { componentCount, adobeApp14Transform } = parseJpegTables(buffer);
    if (componentCount === null) return 'unknown';
    if (componentCount === 1) return 'Grayscale';
    if (componentCount === 4) return 'CMYK';
    if (adobeApp14Transform === 2) return 'CMYK'; // YCCK
    return 'RGB'; // 3 components → YCbCr
  }

  if (kind === 'png') {
    return pngColorType(buffer);
  }

  if (kind === 'pdf') {
    let pdf: PDFDocument;
    try {
      pdf = await PDFDocument.load(buffer, { updateMetadata: false });
    } catch {
      return 'unknown';
    }
    // Some truncated PDFs load but fail to build page graph (missing Trailer
    // /Root) — a scan failure is UNVERIFIABLE, never a crash.
    try {
      return pdfColorModes(pdf).colorSpace ?? 'unknown';
    } catch {
      return 'unknown';
    }
  }

  return 'unknown';
}

export async function checkColorMode(
  buffer: Buffer,
  requiredMode: 'CMYK' | 'RGB' = 'CMYK',
  declaredMimeType?: string | null
): Promise<ColorCheckResult> {
  const colorMode = await detectColorMode(buffer, declaredMimeType);
  const issues: string[] = [];

  if (colorMode === 'unknown') {
    issues.push('Color mode is UNVERIFIABLE for this file');
    return { valid: false, colorMode, requiredColorMode: requiredMode, issues };
  }

  if (colorMode === 'CMYK' || colorMode === 'Spot' || colorMode === 'Grayscale') {
    // Print-safe colorants (a Grayscale file exceeds a CMYK requirement).
    return { valid: true, colorMode, requiredColorMode: requiredMode, issues };
  }

  if (colorMode !== requiredMode) {
    issues.push(
      `Color mode is ${colorMode}, but ${requiredMode} is required for print`
    );
    return { valid: false, colorMode, requiredColorMode: requiredMode, issues };
  }

  return { valid: true, colorMode, requiredColorMode: requiredMode, issues };
}