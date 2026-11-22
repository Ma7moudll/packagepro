import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

// Run only against an explicitly started local frontend. No backend or account
// connection is required by the lab. CHROME_PATH can select an installed Chrome.
const origin = process.env.ASSEMBLY_LAB_URL || 'http://127.0.0.1:3033'
const parsed = new URL(origin)
if (!['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname)) throw new Error('Local-only experimental evidence harness')
const output = path.resolve(process.argv[2] || '/tmp/assembly-browser-evidence')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
  headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } })
  const errors = []; page.on('pageerror', e => errors.push(e.message))
  await page.goto(new URL('/editor/experimental-sleeve', origin).href, { waitUntil: 'networkidle', timeout: 120000 })
  await page.getByTestId('assembly-preview').waitFor({ timeout: 90000 })
  await page.waitForTimeout(2000)
  const screenshot = name => page.getByTestId('assembly-lab').screenshot({ path: path.join(output, name) })
  const slider = async (name, value) => { await page.getByLabel(name, { exact: true }).fill(String(value)); await page.waitForTimeout(2000) }
  await screenshot('01-wrapped.png')
  if (!await page.getByLabel('Mailer lid', { exact: true }).isDisabled()) throw new Error('Lid not guarded')
  await slider('Sleeve removal', 50)
  if (await page.getByTestId('assembly-preview').getAttribute('data-open') !== '0') throw new Error('Lid moved at partial removal')
  await screenshot('02-half-removed.png')
  await slider('Sleeve removal', 100); await slider('Mailer lid', 100); await page.waitForTimeout(2000)
  await screenshot('03-removed-open.png')
  await slider('Sleeve removal', 0)
  if (await page.getByLabel('Mailer lid', { exact: true }).inputValue() !== '0') throw new Error('Lid not reset')
  await page.getByRole('combobox').selectOption('length'); await page.waitForTimeout(2000)
  await screenshot('04-other-axis.png')
  await page.getByLabel('Sleeve cross span', { exact: true }).fill('140')
  await page.getByTestId('nominal-comparison').filter({ hasText: 'Nominal overlap' }).waitFor()
  await page.getByLabel('Mailer length', { exact: true }).fill('0')
  await page.getByRole('alert').filter({ hasText: 'Preview blocked:' }).waitFor()
  if (await page.getByTestId('assembly-preview').count()) throw new Error('Stale geometry on invalid input')
  if (!(await page.getByTestId('opening-status').textContent()).includes('Preview blocked')) throw new Error('Invalid controls report an unlocked lid')
  await screenshot('05-invalid-blocked.png')
  await page.getByRole('button', { name: 'Reset illustrative example' }).click()
  await page.getByTestId('assembly-preview').waitFor()
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(2000)
  await screenshot('06-mobile.png')
  const floatingChat = page.locator('button.fixed.bottom-4.right-4')
  if (await floatingChat.count()) {
    const chat = await floatingChat.boundingBox()
    const glue = await page.getByLabel('Glue flap', { exact: true }).boundingBox()
    if (!chat || !glue || glue.x + glue.width > chat.x - 8) throw new Error('Mobile floating chat overlaps the input column')
  }
  const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  if (horizontalOverflow) throw new Error('Mobile horizontal overflow')
  await writeFile(path.join(output, 'results.json'), JSON.stringify({ errors, horizontalOverflow, checks: ['actual local Next route', 'partial/full removal', 'lid guard/reset', 'axis switch', 'nominal overlap warning', 'invalid input removes preview', 'mobile layout and chat clearance'] }, null, 2))
  if (errors.length) throw new Error(`${errors.length} browser page errors, inspect results.json`)
  console.log(`Experimental browser checks passed. Inspect actual pixels in ${output} before treating visual evidence as ready.`)
} finally { await browser.close() }
