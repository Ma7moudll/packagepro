const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox','--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3001/editor', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.waitForTimeout(4000);
  const combos = await page.locator('button[role="combobox"]').evaluateAll(els => els.map(e => e.textContent.trim().slice(0,60)));
  console.log('COMBOS', JSON.stringify(combos));
  await browser.close();
})().catch(e => { console.error('FAIL', e.message); process.exit(1); });
