// Batch R proof entry (not a route): generates the 12 sample dielines
// (4 types × 3 sizes) as layered SVGs plus their check reports.
// Run: DIELINE_OUT=<dir> node --experimental-strip-types scripts/dieline-gen-proof.ts

import { mkdirSync, writeFileSync } from "node:fs"
import { generateDieline, type BoxSpec, type DielineOptions, type DielineType } from "../lib/dieline-gen/index.ts"
import { checkDieline } from "../lib/dieline-gen/checks.ts"
import { renderDielineSvg } from "../lib/dieline-gen/svg.ts"

const outDir = process.env.DIELINE_OUT ?? "dieline-out"
mkdirSync(outDir, { recursive: true })

interface Case {
  type: DielineType
  size: string
  spec: BoxSpec
  options?: Partial<DielineOptions>
}

const cases: Case[] = [
  { type: "mailer", size: "s", spec: { length: 200, width: 150, height: 50, thickness: 1.5 } },
  { type: "mailer", size: "m", spec: { length: 320, width: 240, height: 80, thickness: 1.5 } },
  { type: "mailer", size: "l", spec: { length: 450, width: 350, height: 120, thickness: 1.5 } },
  { type: "rsc", size: "s", spec: { length: 300, width: 200, height: 200, thickness: 3 } },
  { type: "rsc", size: "m", spec: { length: 400, width: 300, height: 300, thickness: 3 } },
  { type: "rsc", size: "l", spec: { length: 600, width: 400, height: 400, thickness: 3 } },
  { type: "pizza", size: "s", spec: { length: 260, width: 260, height: 40, thickness: 1.5 }, options: { vents: false } },
  { type: "pizza", size: "m", spec: { length: 330, width: 330, height: 45, thickness: 1.5 }, options: { vents: true } },
  { type: "pizza", size: "l", spec: { length: 410, width: 410, height: 50, thickness: 1.5 }, options: { vents: true } },
  { type: "tuck", size: "s", spec: { length: 60, width: 40, height: 120, thickness: 0.5 }, options: { tuckStyle: "straight" } },
  { type: "tuck", size: "m", spec: { length: 80, width: 55, height: 160, thickness: 0.5 }, options: { tuckStyle: "reverse" } },
  { type: "tuck", size: "l", spec: { length: 110, width: 70, height: 210, thickness: 0.5 }, options: { tuckStyle: "straight" } },
]

const reports: Record<string, unknown> = {}
for (const c of cases) {
  const d = generateDieline(c.type, c.spec, c.options)
  const name = `${c.type}-${c.size}`
  writeFileSync(`${outDir}/${name}.svg`, renderDielineSvg(d))
  const report = checkDieline(d)
  reports[name] = { spec: c.spec, options: c.options ?? {}, blank: `${d.blankWidth.toFixed(1)} × ${d.blankHeight.toFixed(1)} mm`, ...report }
  console.log(`${name}: blank ${d.blankWidth.toFixed(1)}×${d.blankHeight.toFixed(1)} checks ok=${report.ok} glue=${Math.round(report.glueOverlapMm2)}mm²`)
}
writeFileSync(`${outDir}/checks.json`, JSON.stringify(reports, null, 1))
console.log(`wrote ${cases.length} SVGs + checks.json to ${outDir}`)
