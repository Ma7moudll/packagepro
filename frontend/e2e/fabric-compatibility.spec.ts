import { test, expect } from '@playwright/test'

// Runs against the actual editor route. No provider or payment action is used.
test('Fabric patched editor retains transforms, exports, guides and remount rendering', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/packagepro/analytics/**', route => route.fulfill({status: 200, body: '{}'}))
  await page.goto('/editor?sku=box--mailer-box--23--cardboard-natural--print-monochrome--foil-none&quantity=30')
  await page.waitForFunction(() => typeof (window as any).__editorSetViewMode === 'function')
  await page.evaluate(() => (window as any).__editorSetViewMode('2d'))
  await page.waitForFunction(() => !!(window as any).__fabricCanvas)
  const id = await page.evaluate(() => {
    const w = window as any
    w.__editorAddText()
    const id = w.__editorState().layers.at(-1).id
    w.__editorUpdateLayer(id, (layer: any) => ({...layer, position: {x: 250, y: 180}, textProperties: {...layer.textProperties, content: 'English العربية'}}))
    return id
  })
  await page.waitForFunction(id => (window as any).__fabricCanvas.getObjects().some((o: any) => o.layerId === id), id)
  await page.evaluate(id => {
    const c = (window as any).__fabricCanvas
    const obj = c.getObjects().find((o: any) => o.layerId === id)
    obj.set({left: 180, top: 170, angle: 25, scaleX: 1.3, scaleY: 1.2})
    c.fire('object:modified', {target: obj})
    c.renderAll()
  }, id)
  const layer = await page.evaluate(id => (window as any).__editorState().layers.find((l: any) => l.id === id), id)
  expect(layer.rotation).toBeCloseTo(25 * Math.PI / 180)
  expect(layer.scale).toEqual({x: 1.3, y: 1.2})
  await page.getByTitle('Grid', {exact: true}).click()
  await page.getByTitle('Grid', {exact: true}).click()
  const output = await page.evaluate(() => {
    const c = (window as any).__fabricCanvas
    return {svg: c.toSVG(), png: c.toDataURL({format: 'png'})}
  })
  expect(output.svg).toContain('English')
  expect(output.png).toMatch(/^data:image\/png/)
  await page.evaluate(() => (window as any).__editorSetViewMode('3d'))
  await page.waitForTimeout(1200)
  await page.evaluate(() => (window as any).__editorSetViewMode('2d'))
  await page.waitForFunction(id => (window as any).__fabricCanvas?.getObjects().some((o: any) => o.layerId === id), id)
  // A CSS background on Fabric's upper selection canvas hides the actual drawing.
  const overlayBackground = await page.locator('canvas.upper-canvas').evaluate(el => getComputedStyle(el).backgroundColor)
  expect(overlayBackground).toBe('rgba(0, 0, 0, 0)')
  expect(errors).toEqual([])
})
