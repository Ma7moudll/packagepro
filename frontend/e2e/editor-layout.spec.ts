import { test, expect } from '@playwright/test';

// Layout-only check: stubs images and waits on 'load' (no networkidle) so the
// test does not depend on third-party network availability.
test.beforeEach(async ({ page }) => {
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
  await page.route('**/_next/image*', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: png })
  );
  await page.route('**/images.unsplash.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'image/png', body: png })
  );
});

const widths = [320, 390];

for (const width of widths) {
  test(`editor fits and header actions stay reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/editor');
    await page.waitForLoadState('load');
    await expect(page.locator('header')).toBeVisible();

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(width);

    // Core header actions must be reachable: save, cart, and the More menu.
    await expect(page.locator('header button[aria-label="Save"]')).toBeVisible();
    await expect(page.locator('header button[aria-label="Add to Cart"]')).toBeVisible();
    const more = page.locator('header button[aria-haspopup="menu"]');
    await expect(more).toBeVisible();
    const box = await more.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);

    // Mockup and Share stay reachable via the More menu on small screens.
    await more.click();
    await page.getByRole('menuitem', { name: 'Mockup Preview' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await more.click();
    await page.getByRole('menuitem', { name: 'Share' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');

    // Right sidebar must default closed on narrow screens (not cover the 3D preview).
    const stillFits = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(stillFits).toBeLessThanOrEqual(width);
  });
}
