// Client-side image DPI extraction.
//
// Print artwork needs ~300 DPI. DPI is embedded metadata: PNG stores it in
// the pHYs chunk (pixels per meter), JPEG in the JFIF APP0 segment (density
// per inch or per cm). Both are readable in the browser without a server,
// so the editor's upload pipeline can warn about low-resolution artwork
// immediately. Returns null when the file carries no density information.

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const INCHES_PER_METER = 39.3701

function parsePngDpi(view: DataView): number | null {
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (view.getUint8(i) !== PNG_SIGNATURE[i]) return null
  }

  let offset = PNG_SIGNATURE.length
  while (offset + 8 <= view.byteLength) {
    const length = view.getUint32(offset)
    const type = String.fromCharCode(
      view.getUint8(offset + 4),
      view.getUint8(offset + 5),
      view.getUint8(offset + 6),
      view.getUint8(offset + 7),
    )

    if (type === "pHYs" && length >= 9 && offset + 8 + 9 <= view.byteLength) {
      const pixelsPerUnitX = view.getUint32(offset + 8)
      const unit = view.getUint8(offset + 16)
      // unit 1 = pixels per meter; unit 0 = aspect ratio only, no density
      if (unit === 1 && pixelsPerUnitX > 0) {
        return Math.round(pixelsPerUnitX / INCHES_PER_METER)
      }
      return null
    }

    // IEND always ends the file; stop there or on a malformed length
    if (type === "IEND" || length > view.byteLength) break
    offset += 12 + length
  }
  return null
}

function parseJpegDpi(view: DataView): number | null {
  if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) return null

  let offset = 2
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) break
    const marker = view.getUint8(offset + 1)

    // Standalone markers without a length field
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2
      continue
    }
    // Start of scan: metadata is over
    if (marker === 0xda) break

    const segmentLength = view.getUint16(offset + 2)
    const dataStart = offset + 4

    if (marker === 0xe0 && segmentLength >= 16 && dataStart + 14 <= view.byteLength) {
      // JFIF APP0: "JFIF\0", version(2), units(1), Xdensity(2), Ydensity(2)
      const id =
        String.fromCharCode(
          view.getUint8(dataStart),
          view.getUint8(dataStart + 1),
          view.getUint8(dataStart + 2),
          view.getUint8(dataStart + 3),
          view.getUint8(dataStart + 4),
        )
      if (id === "JFIF\0") {
        const units = view.getUint8(dataStart + 7)
        const xDensity = view.getUint16(dataStart + 8)
        if (xDensity === 0) return null
        if (units === 1) return xDensity // dots per inch
        if (units === 2) return Math.round(xDensity * 2.54) // dots per cm
        return null // unit 0 = aspect ratio only
      }
    }

    if (segmentLength < 2) break
    offset += 2 + segmentLength
  }
  return null
}

/**
 * Extract the horizontal DPI embedded in a PNG or JPEG file, or null when
 * the file does not declare one (common for screenshots and web images).
 */
export function parseImageDpi(buffer: ArrayBuffer, mimeType: string): number | null {
  if (buffer.byteLength < 16) return null
  const view = new DataView(buffer)
  try {
    if (mimeType === "image/png") return parsePngDpi(view)
    if (mimeType === "image/jpeg") return parseJpegDpi(view)
    return null
  } catch {
    return null
  }
}
