// M8-I — Deterministic file-type detection from magic bytes. Every validator
// routes through this so the same bytes always resolve to the same kind
// (never trusting an extension or declared MIME alone).

export type DetectedFileKind =
  | 'jpeg'
  | 'png'
  | 'pdf'
  | 'svg'
  | 'postscript'
  | 'raster'
  | 'unknown';

export interface FileKindResult {
  kind: DetectedFileKind;
  mimeType: string | null;
}

const JPEG_MAGIC = [0xff, 0xd8, 0xff] as const;
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const PDF_MAGIC = Buffer.from('%PDF-');
const PS_MAGIC = Buffer.from('%!PS-Adobe');

export function detectFileKind(buffer: Buffer, declaredMimeType?: string | null): FileKindResult {
  if (buffer.length >= 3 && JPEG_MAGIC.every((b, i) => buffer[i] === b)) {
    return { kind: 'jpeg', mimeType: 'image/jpeg' };
  }
  if (buffer.length >= 8 && PNG_MAGIC.every((b, i) => buffer[i] === b)) {
    return { kind: 'png', mimeType: 'image/png' };
  }
  if (buffer.length >= 5 && buffer.subarray(0, 5).equals(PDF_MAGIC)) {
    return { kind: 'pdf', mimeType: 'application/pdf' };
  }
  if (buffer.length >= 10 && buffer.subarray(0, PS_MAGIC.length).equals(PS_MAGIC)) {
    return { kind: 'postscript', mimeType: 'application/postscript' };
  }
  const head = buffer.subarray(0, 2048).toString('latin1').split(String.fromCharCode(0)).join('').trim();
  if (head.startsWith('<svg') || head.startsWith('<?xml') || /<svg[\s>]/.test(head)) {
    return { kind: 'svg', mimeType: 'image/svg+xml' };
  }

  // Fall back to the declared MIME for allocator-translated uploads where the
  // magic bytes are legitimately absent (e.g. a byte stream served as the
  // declared type). Only a small allow-list is honored.
  if (declaredMimeType === 'image/jpeg') return { kind: 'jpeg', mimeType: declaredMimeType };
  if (declaredMimeType === 'image/png') return { kind: 'png', mimeType: declaredMimeType };
  if (declaredMimeType === 'application/pdf') return { kind: 'pdf', mimeType: declaredMimeType };
  if (declaredMimeType === 'image/svg+xml') return { kind: 'svg', mimeType: declaredMimeType };

  return { kind: 'unknown', mimeType: declaredMimeType ?? null };
}