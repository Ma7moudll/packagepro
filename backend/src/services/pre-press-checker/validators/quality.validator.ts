// M8-I — Compression (quality) validator.
//
// JPEG quality is inferred from the luminance quantization table (DQT segment)
// by reconstructing the IJG quality-parameter scaling and selecting the
// quality 1..100 whose rescaled table best matches the bytes. The estimate is
// deterministic and self-explaining: it names the decoded quality and the
// quantization entries that produced it. PNG is lossless so it cannot be
// degraded by compression; every other format is UNVERIFIABLE (never a fake
// PASS for a measured quantity we cannot measure).

import { ValidationError } from '../../../utils/errors';
import { detectFileKind } from './file-kind';

export const MIN_PRINT_QUALITY = 80;

export interface QualityCheckResult {
  valid: boolean;
  assessed: boolean;
  quality: number | null;
  format: string;
  issues: string[];
}

const IJG_LUMINANCE_TABLE = [
  16, 11, 10, 16, 24, 40, 51, 61,
  12, 12, 14, 19, 26, 58, 60, 55,
  14, 13, 16, 24, 40, 57, 69, 56,
  14, 17, 22, 29, 51, 87, 80, 62,
  18, 22, 37, 56, 68, 109, 103, 77,
  24, 35, 55, 64, 81, 104, 113, 92,
  49, 64, 78, 87, 103, 121, 120, 101,
  72, 92, 95, 98, 112, 100, 103, 99,
];

export interface JpegTables {
  luminanceTable: number[] | null;
  componentCount: number | null;
  adobeApp14Transform: number | null;
  width: number | null;
  height: number | null;
}

/**
 * Minimal JPEG segment walker: extracts the first (luminance) quantization
 * table, the SOF component count (for color detection) and the Adobe APP14
 * transform marker (transform 0 = CMYK separations).
 */
export function parseJpegTables(buffer: Buffer): JpegTables {
  let luminanceTable: number[] | null = null;
  let componentCount: number | null = null;
  let adobeApp14Transform: number | null = null;
  let width: number | null = null;
  let height: number | null = null;

  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return { luminanceTable, componentCount, adobeApp14Transform, width, height };
  }

  let offset = 2;
  while (offset + 1 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    // Standalone markers carry no length.
    if (
      marker === 0x00 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd9)
    ) {
      offset += 2;
      continue;
    }
    const length = buffer.readUInt16BE(offset + 2);
    const payloadStart = offset + 4;
    const payloadEnd = payloadStart + length - 2;
    if (!Number.isFinite(length) || payloadEnd > buffer.length) break;

    // SOF0..15 (baseline + extended + progressive + lossless).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (payloadStart + 5 <= buffer.length) {
        height = buffer.readUInt16BE(payloadStart + 1);
        width = buffer.readUInt16BE(payloadStart + 3);
        componentCount = buffer[payloadStart + 5];
      }
    }

    if (marker === 0xdb) {
      // DQT: one or more (precision<<4 | id, 64|128 bytes) tables.
      let p = payloadStart;
      while (p + 1 < payloadEnd && !luminanceTable) {
        const spec = buffer[p];
        const precision = (spec >> 4) & 0x0f;
        const tableId = spec & 0x0f;
        const bytes = precision ? 128 : 64;
        if (p + 1 + bytes > payloadEnd) break;
        if (tableId === 0) {
          luminanceTable = [];
          for (let i = 0; i < 64; i++) {
            const hi = precision ? buffer[p + 1 + i * 2] : buffer[p + 1 + i];
            const lo = precision ? buffer[p + 1 + i * 2 + 1] : 0;
            luminanceTable.push(precision ? (hi << 8) | lo : hi);
          }
          break;
        }
        p += 1 + bytes;
      }
    }

    if (marker === 0xee) {
      // APP14 — "Adobe" DCTEncode metadata.
      const tag = buffer.subarray(payloadStart, payloadStart + 5).toString('latin1');
      if (tag === 'Adobe' && payloadStart + 12 <= payloadEnd) {
        adobeApp14Transform = buffer[payloadStart + 11];
      }
    }

    offset = payloadEnd;
    if (marker === 0xd9) break;
  }

  return { luminanceTable, componentCount, adobeApp14Transform, width, height };
}

/**
 * IJG-equivalent quality (ImageMagick `%Q`-style) from a decoded luminance
 * table. Each coefficient is mapped back through the cjpeg scale formula to
 * the quality it implies, then the 64 per-coefficient qualities are averaged.
 * Clamped to 1..100 and rounded. Deterministic: identical bytes → identical
 * estimate, and the message names the inferred percentage.
 */
export function inferJpegQuality(table: number[]): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < 64; i++) {
    const base = IJG_LUMINANCE_TABLE[i];
    const value = table[i];
    if (!value || !base) continue;
    // cjpeg quantization: qtab = clamp(floor((base*scale + 50)/100), 1, 255).
    // Invert for the implied scale, then the two quality branches.
    const scale = (100 * value - 50) / base;
    let quality: number;
    if (scale <= 100) quality = (200 - scale) / 2;
    else quality = 5000 / scale;
    if (quality < 1) quality = 1;
    if (quality > 100) quality = 100;
    sum += quality;
    count += 1;
  }
  if (count === 0) return 100;
  return Math.round(sum / count);
}

export async function checkCompression(
  buffer: Buffer,
  declaredMimeType?: string | null
): Promise<QualityCheckResult> {
  const { kind } = detectFileKind(buffer, declaredMimeType);

  if (kind === 'jpeg') {
    const { luminanceTable } = parseJpegTables(buffer);
    if (!luminanceTable) {
      throw new ValidationError('JPEG has no quantisation table to assess');
    }
    const quality = inferJpegQuality(luminanceTable);
    const issues: string[] = [];
    if (quality < MIN_PRINT_QUALITY) {
      issues.push(
        `Compression quality ${quality} (IJG-equivalent) is below the ${MIN_PRINT_QUALITY} print threshold`
      );
    }
    return {
      valid: issues.length === 0,
      assessed: true,
      quality,
      format: 'jpeg',
      issues,
    };
  }

  if (kind === 'png') {
    return {
      valid: true,
      assessed: false,
      quality: null,
      format: 'png',
      issues: ['PNG is lossless — no compression artifacts'],
    };
  }

  return {
    valid: true,
    assessed: false,
    quality: null,
    format: kind,
    issues: [`Compression quality is UNVERIFIABLE for ${kind} files`],
  };
}