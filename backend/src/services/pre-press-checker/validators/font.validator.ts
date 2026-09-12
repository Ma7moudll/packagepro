// M8-I — Font embedding validator.
//
// PDF fonts are inspected at the object level: every font object's
// FontDescriptor (followed through Type0 DescendantFonts) must reference an
// embedded stream (FontFile / FontFile2 / FontFile3). The Standard 14 base
// fonts are exempt — they are guaranteed native to every PDF renderer and are
// never embedded. SVG with text elements must declare a font-family; a fully
// vectorized SVG (paths only, no text nodes) is treated as embedded by
// construction. Raster files cannot carry fonts → UNVERIFIABLE, not asserted.

import { PDFDocument, PDFDict, PDFName, PDFRef, PDFArray } from 'pdf-lib';
import { ValidationError } from '../../../utils/errors';
import { detectFileKind } from './file-kind';

export interface FontCheckResult {
  valid: boolean;
  assessed: boolean;
  fontsFound: number;
  embedded: number;
  unembedded: string[];
  issues: string[];
}

const STANDARD_14 = new Map<string, boolean>(
  ['Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
    'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
    'Symbol', 'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
    'ZapfDingbats'].map((n) => [normalizeFontName(n), true])
);

function normalizeFontName(name: string): string {
  return name.replace(/[-_]/g, '').toLowerCase();
}

function nameOf(value: unknown): string | null {
  if (value instanceof PDFName) return value.decodeText();
  return null;
}

function isStandard14(name: string | null): boolean {
  return !!name && STANDARD_14.has(normalizeFontName(name));
}

/**
 * Scan a PDF for font objects and verify every non-base-14 font has an
 * embedded font stream.
 */
export function scanPdfFonts(pdf: PDFDocument): {
  fontsFound: number;
  embedded: number;
  unembedded: string[];
} {
  const unembedded: string[] = [];
  let fontsFound = 0;
  let embedded = 0;

  for (const ref of pdf.context.enumerateIndirectObjects()) {
    const obj = ref[1];
    if (!(obj instanceof PDFDict)) continue;

    const type = nameOf(obj.get(PDFName.of('Type')));
    const subtype = nameOf(obj.get(PDFName.of('Subtype')));
    const baseFont = nameOf(obj.get(PDFName.of('BaseFont')));
    const isFontObject =
      nameOf(type) === 'Font' ||
      (subtype ?? '').startsWith('CIDFont') ||
      ['Type1', 'TrueType', 'Type0', 'Type3', 'MMType1'].includes(subtype ?? '');

    if (!isFontObject) continue;
    fontsFound += 1;

    const descriptors: PDFDict[] = [];
    const ownDesc = obj.get(PDFName.of('FontDescriptor'));
    if (ownDesc) {
      const resolved = ownDesc instanceof PDFRef ? pdf.context.lookup(ownDesc) : ownDesc;
      if (resolved instanceof PDFDict) descriptors.push(resolved);
    }

    const descendants = obj.get(PDFName.of('DescendantFonts'));
    if (descendants instanceof PDFArray) {
      for (const item of descendants.asArray()) {
        const d = item instanceof PDFRef ? pdf.context.lookup(item) : item;
        if (!(d instanceof PDFDict)) continue;
        const ddDesc = d.get(PDFName.of('FontDescriptor'));
        const resolved = ddDesc instanceof PDFRef ? pdf.context.lookup(ddDesc) : ddDesc;
        if (resolved instanceof PDFDict) descriptors.push(resolved);
      }
    }

    let fontEmbedded =
      descriptors.length > 0 &&
      descriptors.every((desc) =>
        ['FontFile', 'FontFile2', 'FontFile3'].some((key) =>
          desc.get(PDFName.of(key)) !== undefined
        )
      );

    if (descriptors.length === 0) {
      // Type3 glyphs are drawn inline; base-14 fonts are native everywhere.
      fontEmbedded = subtype === 'Type3' || isStandard14(baseFont);
    }

    if (fontEmbedded) {
      embedded += 1;
      continue;
    }

    const unembeddedName =
      descriptors
        .map((desc) => nameOf(desc.get(PDFName.of('FontName'))))
        .find((name) => name) ?? baseFont ?? 'font-without-embedded-stream';
    unembedded.push(unembeddedName);
  }

  const uniqueUnembedded = [...new Set(unembedded)];
  return {
    fontsFound,
    embedded,
    unembedded: uniqueUnembedded,
  };
}

export async function checkFonts(
  buffer: Buffer,
  declaredMimeType?: string | null
): Promise<FontCheckResult> {
  const { kind } = detectFileKind(buffer, declaredMimeType);

  if (kind === 'pdf') {
    try {
      const pdf = await PDFDocument.load(buffer, { updateMetadata: false });
      const { fontsFound, embedded, unembedded } = scanPdfFonts(pdf);
      const issues: string[] = [];
      if (unembedded.length > 0) {
        issues.push(
          `Font${unembedded.length > 1 ? 's' : ''} not embedded: ${unembedded.join(', ')}`
        );
      }
      return { valid: unembedded.length === 0, assessed: true, fontsFound, embedded, unembedded, issues };
    } catch (error) {
      throw new ValidationError(`Failed to parse PDF for font check: ${error}`);
    }
  }

  if (kind === 'svg') {
    const text = buffer.toString('utf8');
    const hasText = /<text\b|<tspan\b/.test(text);
    if (!hasText) {
      return {
        valid: true,
        assessed: true,
        fontsFound: 0,
        embedded: 0,
        unembedded: [],
        issues: ['SVG is fully vectorized — no text nodes to embed'],
      };
    }
    const unembedded: string[] = [];
    for (const m of text.matchAll(/<(?:text|tspan)\b([^>]*)>/g)) {
      if (!/font-family\s*=/.test(m[1])) {
        unembedded.push('text-node-without-font-family');
      }
    }
    return {
      valid: unembedded.length === 0,
      assessed: true,
      fontsFound: unembedded.length,
      embedded: 0,
      unembedded,
      issues:
        unembedded.length > 0
          ? ['SVG text nodes must declare font-family (or be outlined)']
          : [],
    };
  }

  return {
    valid: true,
    assessed: false,
    fontsFound: 0,
    embedded: 0,
    unembedded: [],
    issues: ['Font embedding is UNVERIFIABLE for this file type'],
  };
}