const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const top = () => page.evaluate(() => window.scrollTo(0,0));
  const pin = (az) => page.evaluate((a) => { const s = window.__editorSpinBox; if (s) { s.yOverride = a; } }, az);
  await page.goto('http://localhost:3001/editor', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(9000);

  async function setMaterial(label) {
    if (await page.locator('button[role="combobox"]').count() < 3) {
      await page.locator('text=/^Material$/').first().click();
      await page.waitForTimeout(800);
    }
    await page.locator('button[role="combobox"]').nth(1).click();
    await page.waitForTimeout(700);
    await page.locator(`[role="option"]:has-text("${label}")`).first().click();
    await page.waitForTimeout(2500); await top();
  }

  // 1. kraft closed, pinned 3/4 view
  await pin(0.7); await page.waitForTimeout(500); await top();
  await page.screenshot({ path: '/downloads/p3-kraft-closed.png' });

  // 2. kraft open (corrugated edges) + zoom closeup on the rim
  await page.locator('button:has-text("Closed")').first().click();
  await page.waitForTimeout(2500); await top();
  await page.screenshot({ path: '/downloads/p3-kraft-open.png' });
  const canvas = await page.locator('canvas').first().boundingBox();
  await page.mouse.move(canvas.x + canvas.width/2, canvas.y + canvas.height/2);
  for (let i=0;i<6;i++){ await page.mouse.wheel(0,-240); await page.waitForTimeout(150); }
  await page.waitForTimeout(800);
  await page.screenshot({ path: '/downloads/p3-corrugation-closeup.png' });
  for (let i=0;i<6;i++){ await page.mouse.wheel(0,240); await page.waitForTimeout(100); }

  // 3. close, then the two whites
  await page.locator('button:has-text("Open")').first().click();
  await page.waitForTimeout(2500); await top();
  await setMaterial('White Local (Economic)');
  await pin(0.7); await page.waitForTimeout(400);
  await page.screenshot({ path: '/downloads/p3-egy-white.png' });
  await setMaterial('White Glossy (Imported)');
  await pin(0.7); await page.waitForTimeout(400);
  await page.screenshot({ path: '/downloads/p3-imported-white.png' });

  // 4. back to kraft, upload logo, pin to the face with the logo
  await setMaterial('Kraft Cardboard');
  await page.locator('input[type="file"]').first().setInputFiles('/tmp/test-logo.png');
  await page.waitForTimeout(4000); await top();
  await pin(1.9); await page.waitForTimeout(600);
  await page.screenshot({ path: '/downloads/p3-designed.png' });

  await browser.close();
  console.log('DONE');
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
