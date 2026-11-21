import test from "node:test"
import assert from "node:assert/strict"

import { parseImageDpi } from "../lib/editor/services/dpi.ts"

function pngWithPhys(pixelsPerMeter: number, unit: number): ArrayBuffer {
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  const buf = new ArrayBuffer(8 + 12 + 9 + 12)
  const view = new DataView(buf)
  sig.forEach((b, i) => view.setUint8(i, b))

  // pHYs chunk
  let o = 8
  view.setUint32(o, 9)
  view.setUint8(o + 4, 0x70) // p
  view.setUint8(o + 5, 0x48) // H
  view.setUint8(o + 6, 0x59) // Y
  view.setUint8(o + 7, 0x73) // s
  view.setUint32(o + 8, pixelsPerMeter)
  view.setUint32(o + 12, pixelsPerMeter)
  view.setUint8(o + 16, unit)
  // crc left as zeros; the parser does not validate it

  // IEND
  o = 8 + 12 + 9
  view.setUint32(o, 0)
  view.setUint8(o + 4, 0x49) // I
  view.setUint8(o + 5, 0x45) // E
  view.setUint8(o + 6, 0x4e) // N
  view.setUint8(o + 7, 0x44) // D
  return buf
}

function jpegWithJfif(units: number, xDensity: number): ArrayBuffer {
  const buf = new ArrayBuffer(2 + 4 + 16)
  const view = new DataView(buf)
  view.setUint8(0, 0xff)
  view.setUint8(1, 0xd8) // SOI
  view.setUint8(2, 0xff)
  view.setUint8(3, 0xe0) // APP0
  view.setUint16(4, 16) // segment length
  const id = [0x4a, 0x46, 0x49, 0x46, 0x00] // "JFIF\0"
  id.forEach((b, i) => view.setUint8(6 + i, b))
  view.setUint16(11, 0x0102) // version 1.02
  view.setUint8(13, units)
  view.setUint16(14, xDensity)
  view.setUint16(16, xDensity)
  return buf
}

test("PNG with a pHYs chunk returns its DPI", () => {
  // 300 DPI = 300 / 0.0254 ≈ 11811 pixels per meter
  const buf = pngWithPhys(11811, 1)
  assert.equal(parseImageDpi(buf, "image/png"), 300)
})

test("PNG pHYs with unit 0 (aspect ratio only) returns null", () => {
  const buf = pngWithPhys(11811, 0)
  assert.equal(parseImageDpi(buf, "image/png"), null)
})

test("JPEG with JFIF density in dots per inch returns it directly", () => {
  const buf = jpegWithJfif(1, 240)
  assert.equal(parseImageDpi(buf, "image/jpeg"), 240)
})

test("JPEG with JFIF density in dots per cm converts to DPI", () => {
  const buf = jpegWithJfif(2, 100) // 100 dpcm ≈ 254 DPI
  assert.equal(parseImageDpi(buf, "image/jpeg"), 254)
})

test("JPEG with aspect-ratio-only units returns null", () => {
  const buf = jpegWithJfif(0, 1)
  assert.equal(parseImageDpi(buf, "image/jpeg"), null)
})

test("unsupported or empty inputs return null", () => {
  assert.equal(parseImageDpi(new ArrayBuffer(0), "image/png"), null)
  assert.equal(parseImageDpi(new ArrayBuffer(64), "image/gif"), null)
  assert.equal(parseImageDpi(new ArrayBuffer(64), "image/png"), null)
})
