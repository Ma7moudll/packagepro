import { test, expect } from '@playwright/test'

// Narrow regression for the Fabric upper-canvas CSS cover, not transform syncing.
test('2D artwork is not covered by an opaque Fabric selection canvas after remount', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/api/packagepro/analytics/**', route => route.fulfill({ status: 200, body: '{}' }))
  await page.goto('/editor?sku=box--mailer-box--23--cardboard-natural--print-monochrome--foil-none&quantity=30')
  await page.waitForFunction(() => typeof (window as any).__editorSetViewMode === 'function')
  await page.evaluate(() => (window as any).__editorSetViewMode('2d'))
  await page.waitForFunction(() => !!(window as any).__fabricCanvas && typeof (window as any).__editorAddText === 'function')
  const id = await page.evaluate(() => {
    const w = window as any
    w.__editorAddText()
    const id = w.__editorState().layers.at(-1).id
    // Store update is supported on main and does not depend on object:modified.
    w.__editorUpdateLayer(id, (layer: any) => ({
      ...layer,
      position: { x: 250, y: 180 },
      textProperties: { ...layer.textProperties, content: 'English العربية', color: '#c8143c', fontSize: 40 },
    }))
    return id
  })
  const assertUncovered = async () => {
    await page.waitForFunction(id => {
      const c = (window as any).__fabricCanvas
      return c?.getObjects().some((o: any) => o.layerId === id && o.text === 'English العربية' && o.fill === '#c8143c')
    }, id)
    const upper = page.locator('canvas.upper-canvas')
    await expect(upper).toBeVisible()
    await expect(upper).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    const inkPixels = await page.evaluate(() => {
      const c = (window as any).__fabricCanvas
      c.renderAll()
      const lower = c.lowerCanvasEl as HTMLCanvasElement
      const pixels = lower.getContext('2d')!.getImageData(0, 0, lower.width, lower.height).data
      let ink = 0
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] > 140 && pixels[i + 1] < 80 && pixels[i + 2] < 120 && pixels[i + 3] > 200) ink++
      }
      return ink
    })
    expect(inkPixels).toBeGreaterThan(30)
  }
  await assertUncovered()
  await page.locator('canvas.upper-canvas').screenshot({ path: info.outputPath('2d-before-remount.png') })
  await page.evaluate(() => (window as any).__editorSetViewMode('3d'))
  await page.waitForFunction(() => !(window as any).__fabricCanvas)
  await page.evaluate(() => (window as any).__editorSetViewMode('2d'))
  await assertUncovered()
  await page.locator('canvas.upper-canvas').screenshot({ path: info.outputPath('2d-after-remount.png') })
  expect(errors).toEqual([])
})
