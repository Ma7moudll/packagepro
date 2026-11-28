// Batch R PNG renderer (proof only): screenshots each generated SVG in
// headless Chromium at a scale that makes the longer side ≈1400 px.
// Env: DIELINE_OUT (dir with .svg files), PRINT_EXPORT_CHROMIUM_PATH.
import { readdirSync, readFileSync } from "node:fs"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const { chromium } = require("playwright-core")

const outDir = process.env.DIELINE_OUT ?? "dieline-out"
const executablePath =
  process.env.PRINT_EXPORT_CHROMIUM_PATH ??
  "/home/hatch/.cache/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-linux64/chrome-headless-shell"

const files = readdirSync(outDir).filter((f) => f.endsWith(".svg")).sort()
const browser = await chromium.launch({ executablePath })
for (const file of files) {
  const svg = readFileSync(`${outDir}/${file}`, "utf8")
  const vb = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg)
  const wMm = parseFloat(vb[3])
  const hMm = parseFloat(vb[4])
  const pxPerMm = 96 / 25.4
  const scale = 1400 / (Math.max(wMm, hMm) * pxPerMm)
  const page = await browser.newPage({
    viewport: { width: Math.ceil(wMm * pxPerMm), height: Math.ceil(hMm * pxPerMm) },
    deviceScaleFactor: Math.min(scale, 3),
  })
  const { resolve } = await import("node:path")
  await page.goto(`file://${resolve(outDir, file)}`)
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${outDir}/${file.replace(/\.svg$/, ".png")}` })
  await page.close()
  console.log(`rendered ${file}`)
}
await browser.close()
