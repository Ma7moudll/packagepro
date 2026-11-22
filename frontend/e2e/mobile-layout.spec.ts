import { test, expect } from '@playwright/test'

// Deterministic image fixture: the homepage hero uses remote photos through
// next/image. Layout size comes from the width/height attributes and CSS, not the
// bytes, so a local 1x1 PNG keeps this test about layout and independent of
// third-party network availability. Nothing here changes element sizing.
const PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
)

// Narrow-viewport regression for the shared site header and the homepage.
// Frontend-only: no provider, payment or database action. The homepage stats
// call has no backend in CI and simply shows the unavailable state.
const widths = [320, 360, 390]
const pages = ['/', '/login']

for (const lang of ['en', 'ar'] as const) {
  for (const width of widths) {
    for (const path of pages) {
      test(`${path} fits ${width}px (${lang}) and the menu is reachable`, async ({ page }) => {
        await page.route(/(_next\/image|images\.unsplash\.com)/, route =>
          route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL_PNG }),
        )
        await page.setViewportSize({ width, height: 760 })
        await page.addInitScript(l => {
          try { localStorage.setItem('language', l) } catch {}
        }, lang)
        await page.goto(path)
        await page.waitForLoadState('load')
        await expect(page.locator('header')).toBeVisible()

        const widthOf = await page.evaluate(() => document.documentElement.scrollWidth)
        expect(widthOf).toBeLessThanOrEqual(width)

        const menu = page.locator('header button:has(svg.lucide-menu)')
        await expect(menu).toBeVisible()
        const box = await menu.boundingBox()
        expect(box).not.toBeNull()
        expect(box!.x).toBeGreaterThanOrEqual(0)
        expect(box!.x + box!.width).toBeLessThanOrEqual(width)

        await menu.click()
        const links = page.locator('[role=dialog] a')
        await expect(links.first()).toBeVisible()
        expect(await links.count()).toBeGreaterThanOrEqual(8)
      })
    }
  }
}
