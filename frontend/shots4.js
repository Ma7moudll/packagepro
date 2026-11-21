const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const top = () => page.evaluate(() => window.scrollTo(0,0));
  await page.goto('http://localhost:3001/editor', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(9000);
  await top();
  await page.screenshot({ path: '/downloads/p2-kraft-closed.png' });

  // open box (corrugated edges visible)
  await page.locator('button:has-text("Closed")').first().click();
  await page.waitForTimeout(2500); await top();
  await page.screenshot({ path: '/downloads/p2-kraft-open.png' });

  // close again
  await page.locator('button:has-text("Open")').first().click();
  await page.waitForTimeout(2500); await top();

  // material switch helper (radix select in right sidebar)
  async function setMaterial(label) {
    // expand the collapsed Material section if its select isn't rendered
    if (await page.locator('button[role="combobox"]').count() < 3) {
      await page.locator('text=/^Material$/').first().click();
      await page.waitForTimeout(800);
    }
    await page.locator('button[role="combobox"]').nth(1).click();
    await page.waitForTimeout(700);
    await page.locator(`[role="option"]:has-text("${label}")`).first().click();
    await page.waitForTimeout(2500); await top();
  }
  await setMaterial('White Local (Economic)');
  await page.screenshot({ path: '/downloads/p2-egy-white.png' });
  await setMaterial('White Glossy (Imported)');
  await page.screenshot({ path: '/downloads/p2-imported-white.png' });
  await setMaterial('Kraft Cardboard');

  // upload a design onto the box
  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles('/tmp/test-logo.png');
  await page.waitForTimeout(4000); await top();
  await page.screenshot({ path: '/downloads/p2-designed.png' });

  // price tab (EGP)
  await page.locator('button:has-text("Price")').first().click().catch(()=>{});
  await page.waitForTimeout(3000); await top();
  await page.screenshot({ path: '/downloads/p2-price-egp.png' });

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
