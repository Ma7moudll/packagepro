import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Rect, Gradient, Pattern, FabricImage, version } from 'fabric'
import { JSDOM } from 'jsdom'

const hostile = '\"><script data-attack="yes">throw 1</script><g onload="throw 1'
function safeMarkup(svg: string) {
  const doc = new JSDOM(`<svg xmlns="http://www.w3.org/2000/svg">${svg}</svg>`).window.document
  assert.equal(doc.querySelectorAll('script, img, foreignObject, [onload], [onerror]').length, 0, svg)
}

test('Fabric dependency is a release patched for both SVG advisories', () => {
  const [major, minor] = version.split('.').map(Number)
  assert.ok(major > 7 || (major === 7 && minor >= 4), version)
})
test('upstream serializer escapes object IDs without relying on application sanitization', () => {
  const shape = new Rect({ width: 100, height: 50 })
  Object.assign(shape, { id: hostile })
  safeMarkup(shape.toSVG())
  assert.match(shape.toSVG(), /&quot;/)
})
test('upstream serializer neutralizes gradient color and ID injection', () => {
  const shape = new Rect({ width: 100, height: 50 })
  const fill = new Gradient({ type: 'linear', coords: {x1: 0, y1: 0, x2: 100, y2: 0}, colorStops: [{offset: 0, color: hostile}, {offset: 1, color: 'blue'}] })
  Object.assign(fill, { id: hostile })
  shape.fill = fill
  safeMarkup(shape.toSVG())
})
test('upstream serializer escapes pattern IDs and image URLs', () => {
  const pattern = new Pattern({ source: {src: hostile, width: 20, height: 20} as HTMLImageElement })
  Object.assign(pattern, { id: hostile })
  const svg = pattern.toSVG({ width: 100, height: 100 })
  safeMarkup(svg)
  assert.match(svg, /&quot;/)
})

test('upstream image serializer escapes source URLs', () => {
  const image = new FabricImage({width: 20, height: 20, src: hostile, classList: {add() {}}} as unknown as HTMLImageElement)
  safeMarkup(image.toSVG())
  assert.match(image.toSVG(), /&quot;/)
})
