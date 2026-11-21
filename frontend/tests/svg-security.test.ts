import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { sanitizeEditorSvg } from '../lib/editor/sanitize-svg.ts'
const require = createRequire(import.meta.url)
const { JSDOM } = require('jsdom')
const window = new JSDOM('').window
Object.defineProperty(globalThis, 'window', { value: window, configurable: true })

test('Fabric SVG export boundary removes injected script, event handlers and foreign HTML', () => {
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><g id="x" onload="bad()"><script>bad()</script><foreignObject><p>injected</p></foreignObject><rect width="10" height="10" fill="white"/></g></svg>'
  const clean = sanitizeEditorSvg(svg)
  const doc = new window.DOMParser().parseFromString(clean, 'image/svg+xml')
  assert.equal(doc.querySelector('script,foreignObject,[onload]'), null)
  assert.ok(doc.querySelector('rect'))
})
test('Fabric SVG boundary rejects unsafe link schemes while retaining normal geometry/styles', () => {
  const clean = sanitizeEditorSvg('<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:bad()"><rect width="20" height="10" style="fill: red; stroke: black"/></a></svg>')
  assert.ok(!clean.includes('javascript:'))
  assert.ok(clean.includes('fill: red'))
  assert.ok(clean.includes('width="20"'))
})
test('all three application Fabric SVG export calls pass through the sanitizer', () => {
  const { readFileSync } = require('node:fs')
  for (const path of ['components/editor/export/ExportDialog.tsx', 'components/design-editor/export/ExportDialog.tsx']) {
    const source = readFileSync(path, 'utf8')
    const calls = source.match(/\.toSVG\(\)/g) || []
    const sanitized = source.match(/sanitizeEditorSvg\([^\n]*\.toSVG\(\)\)/g) || []
    assert.equal(calls.length, sanitized.length)
    assert.ok(calls.length > 0)
  }
})
